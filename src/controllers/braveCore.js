/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

let Joi = require('@hapi/joi')

let platforms = ['osx-bc', 'winia32-bc', 'winx64-bc', 'linux-bc']
let channels = ['dev', 'release', 'nightly', 'beta']
let booleanString = ['true', 'false']
let common = require('../common')

let validator = {
  query: {
    platform: Joi.valid(platforms).required(),
    channel: Joi.valid(channels).required(),
    version: Joi.string().required(),
    daily: Joi.valid(booleanString).required(),
    weekly: Joi.valid(booleanString).required(),
    monthly: Joi.valid(booleanString).required(),
    first: Joi.valid(booleanString).required(),
    woi: Joi.string(),
    ref: Joi.string()
  }
}

// Build a usage object if query parameters passed in
let buildUsage = (request) => {
  if (request.query.daily) {
    return {
      daily: request.query.daily === 'true',
      weekly: request.query.weekly === 'true',
      monthly: request.query.monthly === 'true',
      platform: request.query.platform || 'unknown',
      version: request.query.version || 'unknown',
      first: request.query.first === 'true',
      channel: request.query.channel || 'unknown',
      woi: request.query.woi || '2016-01-04',
      ref: request.query.ref || 'none',
      country_code: common.countryCodeFrom(request)
    }
  } else {
    return null
  }
}

exports.setup = (runtime) => {
  const get = {
    method: 'GET',
    path: '/1/usage/brave-core',
    config: {
      description: "* Record Brave Core usage record",
      handler: async (request, h) => {
        try {
          const usage = buildUsage(request)
          await runtime.mongo.models.insertBraveCoreUsage(usage)
          return h.response({ ts: (new Date()).getTime(), status: 'ok' })
        } catch (err) {
          return h.response({ ts: (new Date()).getTime(), status: 'error', message: err }).code(500)
        }
      },
      validate: validator
    }
  }

  return [get]
}
