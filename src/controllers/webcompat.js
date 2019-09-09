const Joi = require('@hapi/joi')
const Boom = require('@hapi/boom')
const moment = require('moment')
const uap = require('user-agent-parser')

const WEBCOMPAT_COLLECTION = process.env.WEBCOMPAT_COLLECTION || 'webcompat'

const validator = {
  payload: {
    domain: Joi.string().required(),
    ip_address: Joi.string().required(),
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

  // userAgents such as curl do not have an OS component
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

exports.setup = (runtime) => {
  const routes = []

  routes.push({
    method: 'POST',
    path: '/1/webcompat',
    config: {
      description: '* Record webcompat issue',
      handler: async (request, h) => {
        try {
          // exit early if malformed domain
          if (!domainIsValid(request.payload.domain)) return Boom.badRequest('invalid domain')

          // phase 2 - to be implemented - rate limit on IP address

          // build and store event
          const storageObject = buildStorageObject(request.payload.domain, request.headers['user-agent'])
          await runtime.mongo.collection(WEBCOMPAT_COLLECTION).insertOne(storageObject)
          return {
            status: 'ok',
            ts: (new Date()).getTime()
          }
        } catch (e) {
          return Boom.badImplementation(e.toString())
        }
      },
      validate: validator
    }
  })

  return routes
}

exports.buildStorageObject = buildStorageObject
exports.domainIsValid = domainIsValid
exports.versionFromUA = versionFromUA
