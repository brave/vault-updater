/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

let Joi = require('joi')

let verification = require('../verification')
let common = require('../common')
const headers = require('../lib/headers')

let platforms = ['osx-bc', 'winia32-bc', 'winx64-bc', 'linux-bc', 'android-bc']
let channels = ['dev', 'release', 'nightly', 'beta', 'stable']
let booleanString = ['true', 'false']

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
      handler: (request, reply) => {
        let usage = buildUsage(request)
        usage = headers.potentiallyStoreBraveHeaders(request, usage)
        if (verification.isUsagePingValid(request, usage, [], [])) {
          runtime.mongo.models.insertBraveCoreUsage(usage, (err, results) => {
            if (err) {
              console.log(err.toString())
              reply({ ts: (new Date()).getTime(), status: 'error', message: err }).code(500)
            } else {
              reply({ ts: (new Date()).getTime(), status: 'ok' })
            }
          })
        } else {
          verification.writeFilteredUsagePing(runtime.mongo, usage, (err, results) => {
            reply({ ts: (new Date()).getTime(), status: 'ok' })
          })
        }
      },
      validate: validator
    }
  }

  return [get]
}

exports.validator = validator
