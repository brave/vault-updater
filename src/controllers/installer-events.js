/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const Joi = require('joi')

let platforms = ['winia32-bc', 'winx64-bc']
let channels = ['dev', 'release', 'nightly', 'beta']

let validator = {
  query: {
    platform: Joi.valid(platforms).required(),
    channel: Joi.valid(channels).required(),
    version: Joi.string().required(),
    ref: Joi.string(),
    event: Joi.string().required()
  }
}

exports.buildEventObject = (request) => {
  return {
    platform: request.query.platform || 'unknown',
    version: request.query.version || 'unknown',
    channel: request.query.channel || 'unknown',
    ref: request.query.ref || 'none',
    event: request.query.event || 'unknown'
  }
}

exports.setup = (runtime) => {
  const get = {
    method: 'GET',
    path: '/1/installerEvent',
    config: {
      handler: async (request, reply) => {
        var evt = exports.buildEventObject(request)
        try {
          await runtime.mongo.models.insertInstallerEvent(evt)
          reply({ ts: (new Date()).getTime(), status: 'ok' })
        } catch (e) {
          console.log(e.toString())
          reply({ ts: (new Date()).getTime(), status: 'error', message: e }).code(500)
        }
      },
      validate: validator
    }
  }

  return [get]
}

