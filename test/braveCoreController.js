/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var tap = require('tap')
var _ = require('underscore')
var ctrl = require('../src/controllers/braveCore')
let Joi = require('joi')

var query = {
  daily: 'true',
  weekly: 'true',
  monthly: 'true',
  version: '1.2.3',
  first: 'true',
  channel: 'dev',
  platform: 'winia32-bc'
}

var expected = {
  daily: true,
  weekly: true,
  monthly: true,
  version: '1.2.3',
  first: true,
  channel: 'dev',
  platform: 'winia32-bc',
  ref: 'none',
  woi: '2016-01-04',
  country_code: 'UNKNOWN',
  braveDataCenter: false,
  braveAPIKeyStatus: 'invalid',
}

tap.test('Brave Core Controller', function (t) {
  var runtimeMock = {
    mongo: {
      models: {
        insertBraveCoreUsage: function (usage, cb) {
          t.ok(_.isObject(usage), 'usage is an object')
          t.same(usage, expected, 'usage built correctly')
          cb(null, 'ok')
        }
      }
    }
  }
  var replyMock = function (obj) {
    t.ok(obj.ts, 'timestamp returned')
    t.ok(obj.status === 'ok', 'status ok')
  }
  var requestMock = {
    query: query,
    info: {
      remoteAddress: '1.1.1.1'
    },
    headers: {
      'x-brave-api-key': 'invalid_key',
    }
  }
  var endpoints = ctrl.setup(runtimeMock)
  endpoints[0].config.handler(requestMock, replyMock)

  let queryAndroidBC = _.clone(query)
  queryAndroidBC.platform = 'android-bc'
  t.doesNotThrow(() => { return Joi.validate(queryAndroidBC, ctrl.validator.query) }, 'android-bc validates')

  t.plan(5)
})
