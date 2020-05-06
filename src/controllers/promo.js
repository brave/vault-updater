/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const SERVICES_HOST = process.env.SERVICES_HOST || 'localhost'
const SERVICES_PORT = process.env.SERVICES_PORT || 8194
const SERVICES_PROTOCOL = process.env.SERVICES_PROTOCOL || 'http'

const Boom = require('boom')
const Joi = require('joi')
const ProxyAgent = require('proxy-agent')
const semver = require('semver')
const uap = require('user-agent-parser')

const common = require('../common')
const promo = require('../lib/promo')
const MC = require('../memory-cache')

const S3_DOWNLOAD_BUCKET = process.env.S3_DOWNLOAD_BUCKET || 'brave-browser-downloads'
const S3_DOWNLOAD_REGION = process.env.S3_DOWNLOAD_REGION || 'us-east-1'

if (!process.env.S3_DOWNLOAD_KEY || !process.env.S3_DOWNLOAD_SECRET) {
  throw new Error('S3_DOWNLOAD_KEY and S3_DOWNLOAD_SECRET should be set to the S3 account credentials for storing crash reports')
}

let AWS = require('aws-sdk')
AWS.config.update({
  accessKeyId: process.env.S3_DOWNLOAD_KEY,
  secretAccessKey: process.env.S3_DOWNLOAD_SECRET
})
AWS.config.region = S3_DOWNLOAD_REGION
let s3 = new AWS.S3()

const parseUserAgent = (ua) => {
  return uap(ua)
}

const referralDetails = async (referralCode) => {
  const request_options = {
    method: 'GET',
    uri: `${SERVICES_PROTOCOL}://${SERVICES_HOST}:${SERVICES_PORT}/api/2/promo/referral_code/${referralCode}`,
    json: true,
    headers: {
      Authorization: 'Bearer ' + process.env.AUTH_TOKEN
    }
  }
  if (process.env.FIXIE_URL) {
    request_options.proxy = process.env.FIXIE_URL
  }
  let results = await common.prequest(request_options)
  if (results.statusCode === 404) {
    console.log(`Referral code ${referralCode} not found, creating default`)
    // referral code is not found, create a default
    return {
      installer_type: 'standard'
    }
  }
  return results
}

const customHeadersCacheFunc = MC.create(parseInt(process.env.CUSTOM_HEADERS_CACHE_TIMEOUT || 30), async () => {
  const requestOptions = {
    method: 'GET',
    uri: `${SERVICES_PROTOCOL}://${SERVICES_HOST}:${SERVICES_PORT}/api/1/promo/custom-headers`,
    json: true,
    headers: {
      Authorization: 'Bearer ' + process.env.AUTH_TOKEN
    }
  }
  if (process.env.FIXIE_URL) {
    requestOptions.proxy = process.env.FIXIE_URL
  }
  return await common.prequest(requestOptions)
})

exports.setup = (runtime, releases) => {

  const previewFilter = process.env.TESTING ?
    function (rel) { return true } :
    function (rel) { return !rel.preview }

  let latestVersionNumber = releases['dev:winx64']
    .filter(previewFilter)
    .sort((a, b) => { semver.compare(a.version, b.version) })[0].version
  console.log("Serving promo download for version: " + latestVersionNumber)


  // method, local uri, remote uri, description
  const proxyForwards = [
    ['PUT', '/promo/activity', '/api/1/promo/activity', 'Called on periodic check-in and finalization from browser'],
    ['GET', '/promo/publisher/{referral_code}', '/api/1/promo/publishers/{referral_code}', 'Retrieve details about publisher referral']
  ]

  const customHeadersGet = {
    method: 'GET',
    path: '/promo/custom-headers',
    config: {
      description: "Retrieve custom headers from referral",
      tags: ['api'],
      handler: async (request, reply) => {
        reply(await customHeadersCacheFunc())
      }
    }
  }

  const proxyRoutes = proxyForwards.map((definition) => {
    let route = {
      method: definition[0],
      path: definition[1],
      config: {
        tags: ['api'],
        description: definition[3],
        handler: {
          proxy: {
            uri: `${SERVICES_PROTOCOL}://${SERVICES_HOST}:${SERVICES_PORT}${definition[2]}`
          }
        }
      }
    }
    if (process.env.FIXIE_URL) {
      route.config.handler.proxy.agent = new ProxyAgent(process.env.FIXIE_URL)
    }
    return route
  })

  const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.brave.browser&referrer=urpc%3DREFERRAL_CODE'
  const FF_PLAY_URL = 'market://details?id=com.brave.browser&referrer=urpc%3DREFERRAL_CODE'

  const isFFOnAndroid = (ua) => {
    return ua.engine && ua.engine.name === 'Gecko' &&
      ua.browser && ua.browser.name === 'Firefox'
  }

  const android_download_get = {
    method: 'GET',
    path: '/download/android/{referral_code}',
    config: {
      description: "Redirect download to Play store",
      tags: ['api'],
      handler: async function (request, reply) {
        let url
        const ip_address = common.ipAddressFrom(request)
        await sendRetrievalSignalToReferralServer(request.params.referral_code, common.platformIdentifiers.ANDROID, ip_address, request)
        const ua = parseUserAgent(common.userAgentFrom(request))
        if (isFFOnAndroid(ua)) {
          // FireFox on Android
          url = FF_PLAY_URL.replace('REFERRAL_CODE', request.params.referral_code)
        } else {
          // all others
          url = PLAY_URL.replace('REFERRAL_CODE', request.params.referral_code)
        }
        reply().redirect(url)
      },
      validate: {
        params: {
          referral_code: Joi.string().required()
        }
      }
    }
  }

  const APP_STORE_URL = 'https://itunes.apple.com/us/app/brave-browser-fast-adblocker/id1052879175?mt=8'

  const ios_initialize_put = {
    method: 'PUT',
    path: '/promo/initialize/ua',
    config: {
      description: "Called on first connection with browser containing IP and UA",
      tags: ['api'],
      handler: async (request, reply) => {
        try {
          const ip_address = common.ipAddressFrom(request)
          const body = {
            ip_address: ip_address,
            api_key: request.payload.api_key
          }
          const signals = common.signalsFromRequest(request)
          if (signals) body.signals = Buffer.from(JSON.stringify(signals)).toString('base64')
          const request_options = {
            method: 'PUT',
            uri: `${SERVICES_PROTOCOL}://${SERVICES_HOST}:${SERVICES_PORT}/api/1/promo/initialize/ua`,
            json: true,
            body: body,
            headers: {}
          }
          if (request.headers['x-brave-country-code']) {
            request_options.headers['x-brave-country-code'] = request.headers['x-brave-country-code']
          }
          if (process.env.FIXIE_URL) {
            request_options.proxy = process.env.FIXIE_URL
          }
          let results = await common.prequest(request_options)
          reply(results)
        } catch (e) {
          console.log(e.toString())
          reply(new Boom(e.toString()))
        }
      },
      validate: {
        payload: {
          api_key: Joi.string().required()
        }
      }
    }
  }

  const nonua_initialize_put = {
    method: 'PUT',
    path: '/promo/initialize/nonua',
    config: {
      description: "Called on first connection with browser",
      tags: ['api'],
      handler: async (request, reply) => {
        try {
          const ip_address = common.ipAddressFrom(request)
          const body = {
            ip_address: ip_address,
            api_key: request.payload.api_key,
            referral_code: request.payload.referral_code,
            platform: request.payload.platform
          }
          const request_options = {
            method: 'PUT',
            uri: `${SERVICES_PROTOCOL}://${SERVICES_HOST}:${SERVICES_PORT}/api/1/promo/initialize/nonua`,
            json: true,
            body: body,
            headers: {}
          }
          if (request.headers['x-brave-country-code']) {
            request_options.headers['x-brave-country-code'] = request.headers['x-brave-country-code']
          }
          if (process.env.FIXIE_URL) {
            request_options.proxy = process.env.FIXIE_URL
          }
          let results = await common.prequest(request_options)
          reply(results)
        } catch (e) {
          console.log(e.toString())
          reply(new Boom(e.toString()))
        }
      },
      validate: {
        payload: {
          api_key: Joi.string().required(),
          referral_code: Joi.string().required(),
          platform: Joi.string().required()
        }
      }
    }
  }

  const ios_download_get = {
    method: 'GET',
    path: '/download/ios/{referral_code}',
    config: {
      description: "Redirect download to App Store",
      tags: ['api'],
      handler: async function (request, reply) {
        try {
          const ip_address = common.ipAddressFrom(request)
          await sendRetrievalSignalToReferralServer(request.params.referral_code, common.platformIdentifiers.IOS, ip_address, request)
          const body = {
            ip_address: ip_address,
            referral_code: request.params.referral_code,
            platform: 'ios'
          }
          const signals = common.signalsFromRequest(request)
          if (signals) body.signals = Buffer.from(JSON.stringify(signals)).toString('base64')
          const request_options = {
            method: 'POST',
            uri: `${SERVICES_PROTOCOL}://${SERVICES_HOST}:${SERVICES_PORT}/api/1/promo/download`,
            json: true,
            body: body
          }
          if (process.env.FIXIE_URL) {
            request_options.proxy = process.env.FIXIE_URL
          }
          let results = await common.prequest(request_options)
          reply().redirect(APP_STORE_URL)
        } catch (e) {
          console.log(e.toString())
          reply(new Boom(e.toString()))
        }
      },
      validate: {
        params: {
          referral_code: Joi.string().required()
        }
      }
    }
  }

  const FASTLY_DOWNLOAD_HOST = process.env.FASTLY_DOWNLOAD_HOST || common.nope('FASTLY_DOWNLOAD_HOST required')
  console.log(`Serving referral downloads from ${FASTLY_DOWNLOAD_HOST}`)

  const referralExceptions = {
    'ABC128': 'latest/BraveBrowserStandaloneSetup1.exe',
    'ABC129': 'latest/BraveBrowserStandaloneSetup2.exe'
  }

  const braveCoreRedirects = {
    'osx': 'Brave-Browser[CHANNEL].dmg',
    'winia32': 'BraveBrowser[CHANNEL]Setup32.exe',
    'winx64': 'BraveBrowser[CHANNEL]Setup.exe'
  }

  const braveCoreChannelIdentifiers = {
    'release': '',
    'beta': 'Beta',
    'dev': 'Dev',
    'nightly': 'Nightly'
  }

  const redirect_channel_download = {
    method: 'GET',
    path: '/download/desktop/{channel}/{referral_code}',
    config: {
      description: "Download a promo renamed desktop binary for a platform and channel",
    },
    handler: async function (request, reply) {
      let ua = parseUserAgent(request.headers['user-agent'])
      let k
      const ip_address = common.ipAddressFrom(request)
      if (ua.os.name.match(/^Mac/)) {
        await sendRetrievalSignalToReferralServer(request.params.referral_code, common.platformIdentifiers.OSX, ip_address, request)
        k = 'latest/Brave-Browser[CHANNEL].pkg'
      } else {
        let refDetails = await referralDetails(request.params.referral_code)
        if (ua.cpu && ua.cpu.architecture && ua.cpu.architecture.match(/64/)) {
          await sendRetrievalSignalToReferralServer(request.params.referral_code, common.platformIdentifiers.WINDOWS_64, ip_address, request)
          if (refDetails.installer_type === 'silent') {
            k = 'latest/BraveBrowserSilentSetup.exe'
          } else {
            k = 'latest/BraveBrowser[CHANNEL]Setup.exe'
          }
        } else {
          await sendRetrievalSignalToReferralServer(request.params.referral_code, common.platformIdentifiers.WINDOWS_32, ip_address, request)
          if (refDetails.installer_type === 'silent') {
            k = 'latest/BraveBrowserSilentSetup32.exe'
          } else {
            k = 'latest/BraveBrowser[CHANNEL]Setup32.exe'
          }
        }
      }
      let upperReferralCode = request.params.referral_code.toUpperCase()
      if (referralExceptions[upperReferralCode]) {
        k = referralExceptions[upperReferralCode]
      }
      let channelSuffix = braveCoreChannelIdentifiers[request.params.channel]
      if (ua.os.name.match(/Mac/) && request.params.channel !== 'release') {
        channelSuffix = '-' + channelSuffix
      }
      k = k.replace('[CHANNEL]', channelSuffix)
      let url = `https://${FASTLY_DOWNLOAD_HOST}/${k}/${request.params.referral_code}`
      reply().redirect(url)
    }
  }

  const redirect_download = {
    method: 'GET',
    path: '/download/desktop/{referral_code}',
    config: {
      description: "Download a promo renamed desktop binary for a platform",
    },
    handler: async function (request, reply) {
      let ua = parseUserAgent(request.headers['user-agent'])
      let k
      const ip_address = common.ipAddressFrom(request)
      if (ua.os.name.match(/^Mac/)) {
        await sendRetrievalSignalToReferralServer(request.params.referral_code, common.platformIdentifiers.OSX, ip_address, request)
        k = 'latest/Brave-Browser.pkg'
      } else {
        let refDetails = await referralDetails(request.params.referral_code)
        if (ua.cpu && ua.cpu.architecture && ua.cpu.architecture.match(/64/)) {
          await sendRetrievalSignalToReferralServer(request.params.referral_code, common.platformIdentifiers.WINDOWS_64, ip_address, request)
          if (refDetails.installer_type === 'silent') {
            k = 'latest/BraveBrowserSilentSetup.exe'
          } else {
            k = 'latest/BraveBrowserSetup.exe'
          }
        } else {
          await sendRetrievalSignalToReferralServer(request.params.referral_code, common.platformIdentifiers.WINDOWS_32, ip_address, request)
          if (refDetails.installer_type === 'silent') {
            k = 'latest/BraveBrowserSilentSetup32.exe'
          } else {
            k = 'latest/BraveBrowserSetup32.exe'
          }
        }
      }
      let upperReferralCode = request.params.referral_code.toUpperCase()
      if (referralExceptions[upperReferralCode]) {
        k = referralExceptions[upperReferralCode]
      }
      let url = `https://${FASTLY_DOWNLOAD_HOST}/${k}/${request.params.referral_code}`
      reply().redirect(url)
    }
  }

  const sendRetrievalSignalToReferralServer = async (referral_code, platform, ip_address, request) => {
    try {
      const request_options = {
        method: 'POST',
        uri: `${SERVICES_PROTOCOL}://${SERVICES_HOST}:${SERVICES_PORT}/api/2/promo/retrievals`,
        json: true,
        body: {
          referral_code: referral_code,
          platform: platform,
          ip_address: ip_address
        },
        headers: {
          Authorization: 'Bearer ' + process.env.AUTH_TOKEN
        }
      }
      if (request.headers['x-brave-country-code']) {
        request_options.headers['x-brave-country-code'] = request.headers['x-brave-country-code']
      }
      if (process.env.FIXIE_URL) {
        request_options.proxy = process.env.FIXIE_URL
      }
      let results = await common.prequest(request_options)
    } catch (e) {
      console.log(e.toString())
    }
  }

  const buildSuperReferrerResponse = (referralCode) => {
    return `
    <html>
      <body>
        <script>
           // is iOS (iPhone and iPad)
           var isIOS = (/iPad|iPhone|iPod/.test(navigator.platform) ||
             (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) &&
             !window.MSStream
           if (isIOS) {
             window.location = '${process.env.SUPER_REFERRER_REDIRECT}/${referralCode}'
           } else {
             window.location = '/download/${referralCode}'
           }
        </script>
      </body>
    </html>
    `
  }

  const redirectSuperReferrerGet = {
    method: 'GET',
    path: '/super/{referral_code}',
    config: {
      tags: ['api'],
      description: "Redirect to platform specific download handler",
      handler: async function (request, reply) {
        reply(buildSuperReferrerResponse(request.params.referral_code))
      }
    }
  }

  const redirect_get = {
    method: 'GET',
    path: '/download/{referral_code}',
    config: {
      tags: ['api'],
      description: "Redirect to platform specific download handler",
      handler: async function (request, reply) {
        let referral_code = request.params.referral_code
        let ua = parseUserAgent(common.userAgentFrom(request))
        let refDetails = await referralDetails(referral_code)

        // mobile redirect handlers
        if (ua.os.name.match(/iOS/)) {
          return reply().redirect(`/download/ios/${referral_code}`)
        }
        if (ua.os.name.match(/Android/)) {
          return reply().redirect(`/download/android/${referral_code}`)
        }

        // short circuit request if installer type is 'mobile'
        if (refDetails.installer_type === 'mobile') {
          console.log(`Referral code ${referral_code} only supports mobile downloads`)
          return reply().redirect(process.env.MOBILE_DESKTOP_REDIRECT_URL || 'https://www.brave.com')
        }

        // desktop redirect handlers
        if (ua.os.name.match(/Windows/) || ua.os.name.match(/Mac/)) {
          return reply().redirect(`/download/desktop/${referral_code}`)
        }
        return reply().redirect(`/latest/linux64`)
      },
      validate: {
        params: {
          referral_code: Joi.string().required()
        }
      }
    }
  }

  const redirectMobileGET = {
    method: 'GET',
    path: '/mobile/{referral_code}',
    config: {
      tags: ['api'],
      description: "Redirect to platform specific download handler - noop on desktop",
      handler: async function (request, reply) {
        const redirectURL = promo.redirectURLForMobileGet(
          common.userAgentFrom(request),
          request.params.referral_code
        )
        reply().redirect(redirectURL)
      },
      validate: {
        params: {
          referral_code: Joi.string().required()
        }
      }
    }
  }

  return proxyRoutes.concat([
    android_download_get,
    redirect_download,
    ios_download_get,
    redirect_get,
    ios_initialize_put,
    nonua_initialize_put,
    redirectMobileGET,
    redirect_channel_download,
    customHeadersGet,
    redirectSuperReferrerGet
  ])
}

exports.customHeadersCacheFunc = customHeadersCacheFunc
