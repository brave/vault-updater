/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const SERVICES_HOST = process.env.SERVICES_HOST || 'localhost'
const SERVICES_PORT = process.env.SERVICES_PORT || 8194
const SERVICES_PROTOCOL = process.env.SERVICES_PROTOCOL || 'http'

const Boom = require('boom')
const Joi = require('joi')
const uap = require('user-agent-parser')
const semver = require('semver')

const common = require('../common')

const S3_DOWNLOAD_BUCKET = process.env.S3_DOWNLOAD_BUCKET || 'brave-download-staging'
const S3_DOWNLOAD_REGION = process.env.S3_DOWNLOAD_REGION || 'us-east-1'

if (!process.env.S3_DOWNLOAD_KEY || !process.env.S3_DOWNLOAD_SECRET) {
  throw new Error('S3_DOWNLOAD_KEY and S3_DOWNLOAD_SECRET should be set to the S3 account credentials for storing crash reports')
}

var DOWNLOAD_TEMPLATES = {
  osx: 'multi-channel/releases/dev/VERSION/osx/Brave-VERSION.dmg',
  winx64: 'multi-channel/releases/dev/VERSION/winx64/BraveSetup-x64.exe',
  winia32: 'multi-channel/releases/dev/VERSION/winia32/BraveSetup-ia32.exe'
}

const parseUserAgent = (ua) => {
  return uap(ua)
}

exports.setup = (runtime, releases) => {

  let latestVersionNumber = releases['dev:winx64']
    .filter((rel) => { return !rel.preview })
    .sort((a, b) => { semver.compare(a.version, b.version) })[0].version
  console.log("Serving promo download for version: " + latestVersionNumber)

  // method, local uri, remote uri, description
  const proxyForwards = [
    ['PUT', '/promo/initialize/nonua', '/api/1/promo/initialize/nonua', 'Called on first connection with browser'],
    ['PUT', '/promo/initialize/ua', '/api/1/promo/initialize/ua', 'Called on first connection with browser containing IP and UA'],
    ['PUT', '/promo/activity', '/api/1/promo/activity', 'Called on periodic check-in and finalization from browser']
  ]

  const proxyRoutes = proxyForwards.map((definition) => {
    return {
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

  const ios_download_get = {
    method: 'GET',
    path: '/download/ios/{referral_code}',
    config: {
      description: "Redirect download to App Store",
      tags: ['api'],
      handler: async function (request, reply) {
        try {
        const ip_address = common.ipAddressFrom(request)
        const user_agent = common.userAgentFrom(request) || 'unknown'
        const body = {
          ip_address: ip_address,
          user_agent: user_agent,
          referral_code: request.params.referral_code,
          platform: "ios"
        }
        let results = await common.prequest({
          method: 'POST',
          uri: `${SERVICES_PROTOCOL}://${SERVICES_HOST}:${SERVICES_PORT}/api/1/promo/download`,
          json: true,
          body: body
        })
          console.log(results)
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

  const streaming_download = {
    method: 'GET',
    path: '/download/desktop/{referral_code}',
    config: {
      description: "Download a promo renamed desktop binary for platform",
    },
    handler: {
      s3: {
        bucket: S3_DOWNLOAD_BUCKET,
        mode: 'attachment',
        accessKeyId: process.env.S3_DOWNLOAD_KEY,
        secretAccessKey: process.env.S3_DOWNLOAD_SECRET,
        region: S3_DOWNLOAD_REGION,
        sslEnabled: true,
        filename: function(request) {
          let ua = parseUserAgent(request.headers['user-agent'])
          let filename
          if (ua.os.name.match(/^Mac/)) {
            filename = `Brave-${request.params.referral_code}.pkg`
          } else {
            filename = `BraveSetup-${request.params.referral_code}.exe`
          }
          return Promise.resolve(filename)
        },
        key: function(request) {
          let ua = parseUserAgent(request.headers['user-agent'])
          let k
          if (ua.os.name.match(/^Mac/)) {
            k = DOWNLOAD_TEMPLATES.osx.replace(/VERSION/g, latestVersionNumber)
          } else {
            if (ua.cpu.architecture.match(/64/)) {
              k = DOWNLOAD_TEMPLATES.winx64.replace(/VERSION/g, latestVersionNumber)
            } else {
              k = DOWNLOAD_TEMPLATES.winia32.replace(/VERSION/g, latestVersionNumber)
            }
          }
          return Promise.resolve(k)
        }
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
        if (ua.os.name.match(/iOS/)) {
          return reply().redirect(`/download/ios/${referral_code}`)
        }
        if (ua.os.name.match(/Android/)) {
          return reply().redirect(`/download/android/${referral_code}`)
        }
        return reply().redirect(`/download/desktop/${referral_code}`)
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
    streaming_download,
    ios_download_get,
    redirect_get
  ])
}
