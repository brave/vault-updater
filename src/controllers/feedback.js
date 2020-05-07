const Joi = require('joi')
const Boom = require('boom')
const moment = require('moment')
const storage = require('../storage')
const uuid = require('uuid/v4')
const verification = require('../verification')

const FEEDBACK_COLLECTION = process.env.FEEDBACK_COLLECTION || 'feedback'

// feedback validator
const validator = {
  payload: {
    selection: Joi.any().required(),
    platform: Joi.string().required(),
    os_version: Joi.string().required(),
    phone_make: Joi.string().required(),
    phone_model: Joi.string().required(),
    phone_arch: Joi.string().required(),
    app_version: Joi.string().required(),
    user_feedback: Joi.string().max(1024).optional(),
    api_key: Joi.string().required(),
  }
}

// build object to be stored from feedback
const buildStorageObject = (payload) => {
  return {
    id: uuid(),
    ts: (new Date()).getTime(),
    ymd: moment().format('YYYY-MM-DD'),
    selection: payload.selection,
    platform: payload.platform,
    os_version: payload.os_version,
    phone_make: payload.phone_make,
    phone_model: payload.phone_model,
    phone_arch: payload.phone_arch,
    version: payload.app_version,
    user_feedback: payload.user_feedback,
  }
}

// build return result object
const successResult = (id) => {
  return {
    id: id,
    status: 'ok',
    ts: (new Date()).getTime()
  }
}

exports.setup = (runtime) => {
  const routes = []

  routes.push({
    method: 'POST',
    path: '/1/feedback',
    config: {
      description: '* Record feedback',
      handler: async (request, reply) => {
        try {
          // phase 2 - to be implemented - rate limit on IP address

          // verify API key
          if (!verification.isValidAPIKey(request.payload.api_key)) {
            return reply(Boom.notAcceptable('invalid api key'))
          }

          // build event
          const storageObject = buildStorageObject(request.payload)

          // abstract storage mechanism
          await storage.storeObjectOrEvent(runtime, FEEDBACK_COLLECTION, storageObject)

          // return success
          return reply(successResult(storageObject.id))
        } catch (e) {
          return reply(Boom.badImplementation(e.toString()))
        }
      },
      validate: validator
    }
  })

  return routes
}

exports.buildStorageObject = buildStorageObject
exports.successResult = successResult
