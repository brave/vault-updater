const Joi = require('@hapi/joi')
const boom = require('@hapi/boom')
const moment = require('moment')
const uap = require('user-agent-parser')
const storage = require('../storage')

const WEBCOMPAT_COLLECTION = process.env.WEBCOMPAT_COLLECTION || 'webcompat'

const validator = {
  payload: {
    domain: Joi.string().required(),
    api_key: Joi.string().required()
  }
}

const platformFromUA = (userAgent) => {
  const ua = uap(userAgent)

  // userAgents such as curl do not have an OS component
  if (!ua.os || !ua.os.name) return 'unknown'

  if (ua.os.name.match(/iOS/)) return 'ios'
  if (ua.os.name.match(/Android/)) return 'androidbrowser'
  if (ua.os.name.match(/^Mac/)) return 'osx-bc'
  if (ua.cpu && ua.cpu.architecture && ua.cpu.architecture.match(/64/)) return 'winx64-bc'
  if (ua.cpu && ua.cpu.architecture && ua.cpu.architecture.match(/32/)) return 'winia32-bc'
  return 'other'
}

const versionFromUA = (userAgent) => {
  const ua = uap(userAgent)

  // userAgents such as curl do not have a version component
  if (!ua.browser || !ua.browser.version) return 'unknown'

  return ua.browser.version
}

const buildStorageObject = (domain, userAgent) => {
  return {
    ts: (new Date()).getTime(),
    ymd: moment().format('YYYY-MM-DD'),
    domain: domain,
    platform: platformFromUA(userAgent),
    version: versionFromUA(userAgent)
  }
}

const domainIsValid = (domain) => {
  return domain.match(/^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+/gm)
}

const successResult = (runtime) => {
  return {
    status: 'ok',
    ts: (new Date()).getTime()
  }
}

exports.setup = (runtime) => {
  const routes = []

  routes.push({
    method: 'POST',
    path: '/1/webcompat',
    handler: async (request, h) => {
      try {
        // exit early if malformed domain
        if (!domainIsValid(request.payload.domain)) return boom.badRequest('invalid domain')

        // phase 2 - to be implemented - rate limit on IP address

        // phase 2 - to be implemented - callout to referral server to verify api key

        // build event
        const storageObject = buildStorageObject(request.payload.domain, request.headers['user-agent'])

        // abstract storage mechanism
        await storage.storeObjectOrEvent(runtime, WEBCOMPAT_COLLECTION, storageObject)

        // return success
        return h.response(successResult(runtime))
      } catch (e) {
        return h.response(boom.badImplementation(e.toString()))
      }
    },
    options: {
      description: '* Record webcompat issue',
      validate: validator
    }
  })

  return routes
}

exports.buildStorageObject = buildStorageObject
exports.domainIsValid = domainIsValid
exports.versionFromUA = versionFromUA
exports.successResult = successResult
