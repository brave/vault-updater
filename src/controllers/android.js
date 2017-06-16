/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const common = require('../common')
const ipLimit = require('../IPLimit')

// Build a usage object if query parameters passed in
let buildUsage = (request) => {
  if (request.query.daily) {
    return {
      daily: request.query.daily === 'true',
      weekly: request.query.weekly === 'true',
      monthly: request.query.monthly === 'true',
      platform: 'android',
      version: request.query.version || 'unknown',
      first: request.query.first === 'true',
      channel: request.query.channel || 'unknown'
    }
  } else {
    return null
  }
}

exports.setup = (runtime) => {
  const get = {
    method: 'GET',
    path: '/1/usage/android',
    config: {
      handler: function (request, reply) {
        if (process.env.IPLIMIT) {
          var ipAddress = common.ipAddressFrom(request)
          if (!ipLimit.shouldRecord(ipAddress)) {
            console.log('*** cache hit, not recording')
            return reply({ ts: (new Date()).getTime(), status: 'ok' })
          }
        }
        var usage = buildUsage(request)
        runtime.mongo.models.insertAndroidUsage(usage, (err, results) => {
          if (err) {
            console.log(err.toString())
            reply({ ts: (new Date()).getTime(), status: 'error' }).code(500)
          } else {
            reply({ ts: (new Date()).getTime(), status: 'ok' })
          }
        })
      }
    }
  }

  return [get]
}
