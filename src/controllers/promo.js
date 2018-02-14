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

const S3_DOWNLOAD_BUCKET = process.env.S3_DOWNLOAD_BUCKET || 'brave-download-staging'
const S3_DOWNLOAD_REGION = process.env.S3_DOWNLOAD_REGION || 'us-east-1'

if (!process.env.S3_DOWNLOAD_KEY || !process.env.S3_DOWNLOAD_SECRET) {
  throw new Error('S3_DOWNLOAD_KEY and S3_DOWNLOAD_SECRET should be set to the S3 account credentials for storing crash reports')
}

var DOWNLOAD_TEMPLATES = {
  osx: 'multi-channel/releases/dev/VERSION/osx/Brave-VERSION.pkg',
  winx64: 'multi-channel/releases/dev/VERSION/winx64/BraveSetup-x64.exe',
  winia32: 'multi-channel/releases/dev/VERSION/winia32/BraveSetup-ia32.exe'
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

  const android_download_get = {
    method: 'GET',
    path: '/download/android/{referral_code}',
    config: {
      description: "Redirect download to Play store",
      tags: ['api'],
      handler: async function (request, reply) {
        const url = PLAY_URL.replace('REFERRAL_CODE', request.params.referral_code)
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
          const request_options = {
            method: 'PUT',
            uri: `${SERVICES_PROTOCOL}://${SERVICES_HOST}:${SERVICES_PORT}/api/1/promo/initialize/ua`,
            json: true,
            body: body
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
            body: body
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
          const body = {
            ip_address: ip_address,
            referral_code: request.params.referral_code,
            platform: 'ios'
          }
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

  const redirect_download = {
    method: 'GET',
    path: '/download/desktop/{referral_code}',
    config: {
      description: "Download a promo renamed desktop binary for a platform",
    },
    handler: async function (request, reply) {
      let ua = parseUserAgent(request.headers['user-agent'])
      let filename, k
      if (ua.os.name.match(/^Mac/)) {
        filename = `Brave-${request.params.referral_code}.pkg`
        k = DOWNLOAD_TEMPLATES.osx.replace(/VERSION/g, latestVersionNumber)
      } else {
        if (ua.cpu.architecture.match(/64/)) {
          k = DOWNLOAD_TEMPLATES.winx64.replace(/VERSION/g, latestVersionNumber)
          filename = `BraveSetup-x64-${request.params.referral_code}.exe`
        } else {
          k = DOWNLOAD_TEMPLATES.winia32.replace(/VERSION/g, latestVersionNumber)
          filename = `BraveSetup-ia32-${request.params.referral_code}.exe`
        }
      }
      const url = s3.getSignedUrl('getObject', {
        Bucket: S3_DOWNLOAD_BUCKET,
        Key: k,
        Expires: 10,
        ResponseContentDisposition: 'attachment; filename="' + filename + '"'
      })
      reply().redirect(url)
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
        if (ua.os.name.match(/iOS/)) {
          return reply().redirect(`/download/ios/${referral_code}`)
        }
        if (ua.os.name.match(/Android/)) {
          return reply().redirect(`/download/android/${referral_code}`)
        }
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

  return proxyRoutes.concat([
    android_download_get,
    redirect_download,
    ios_download_get,
    redirect_get,
    ios_initialize_put,
    nonua_initialize_put
  ])
}
