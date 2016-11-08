var tap = require('tap')
var _ = require('underscore')
var ios = require('../dist/controllers/android')

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
  platform: 'android'
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
  var replyMock = function (obj) {
    t.ok(obj.ts, 'timestamp returned')
    t.ok(obj.status === 'ok', 'status ok')
  }
  var requestMock = {
    query: query
  }
  var endpoints = ios.setup(runtimeMock)
  endpoints[0].config.handler(requestMock, replyMock)
  t.plan(4)
})
