var tap = require('tap')
var _ = require('underscore')
var ios = require('../src/controllers/ios')

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
  platform: 'ios',
  ref: 'none',
  woi: '2016-01-04',
  country_code: 'UNKNOWN'
}

tap.test('iOS Controller', async (t) => {
  var runtimeMock = {
    mongo: {
      models: {
        insertIOSUsage: function (usage) {
          t.ok(_.isObject(usage), 'usage is an object')
          t.same(usage, expected, 'usage built correctly')
        }
      }
    }
  }
  var replyMock = {
    response: async (obj) => {
      t.ok(obj.ts, 'timestamp returned')
      t.ok(obj.status === 'ok', 'status ok')
    }
  }
  var requestMock = {
    query: query,
    headers: {
      'X-Forwarded-For': '1.1.1.1'
    }
  }
  var endpoints = ios.setup(runtimeMock)
  await endpoints[0].config.handler(requestMock, replyMock)
  t.plan(4)
})
