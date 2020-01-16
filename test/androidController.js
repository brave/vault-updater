/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var tap = require('tap')
var _ = require('underscore')
var ios = require('../src/controllers/android')

var query = {
  daily: 'true',
  weekly: 'true',
  monthly: 'true',
  version: '1.2.3',
  first: 'true',
  channel: 'dev'
}

var expected = {
  daily: true,
  weekly: true,
  monthly: true,
  version: '1.2.3',
  first: true,
  channel: 'dev',
  platform: 'android',
  ref: 'none',
  woi: '2016-01-04',
  country_code: 'UNKNOWN',
  braveAPIKeyStatus: 'missing',
  braveDataCenter: false,
}

tap.test('Android Controller', function (t) {
  var runtimeMock = {
    mongo: {
      models: {
        insertAndroidUsage: function (usage, cb) {
          t.ok(_.isObject(usage), 'usage is an object')
          t.same(usage, expected, 'usage built correctly')
          cb(null, 'ok')
        }
      }
    }
  }

  var hMock = {
    response: function (obj) {
      t.ok(obj.ts, 'timestamp returned')
      t.ok(obj.status === 'ok', 'status ok')
    }
  }
  var requestMock = {
    query: query,
    info: {
      remoteAddress: '1.1.1.1'
    },
    headers: {}
  }

  var endpoints = ios.setup(runtimeMock)
  endpoints[0].handler(requestMock, hMock)
  t.plan(4)
})
