const tap = require('tap')
const _ = require('underscore')

const ios = require('../src/controllers/ios')
const common = require('../src/common')

var query = {
  daily: 'true',
  weekly: 'true',
  monthly: 'true',
  version: '1.2.3',
  first: 'true',
  channel: 'dev',
  woi: '2019-1-7'
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
  woi: '2019-01-07',
  country_code: 'UNKNOWN',
  braveDataCenter: true,
  braveAPIKeyStatus: 'matched',
}

tap.test('iOS Controller', function (t) {
  var runtimeMock = {
    mongo: {
      models: {
        insertIOSUsage: function (usage, cb) {
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
    headers: {
      'X-Forwarded-For': '1.1.1.1',
      'x-brave-req-from-dc': 'true',
      'x-brave-api-key': 'c',
    }
  }
  var endpoints = ios.setup(runtimeMock)
  endpoints[0].config.handler(requestMock, replyMock)
  t.plan(4)
})

tap.test('ios date', (t) => {
  t.equal(common.reformatANSIDate('2019-01-01'), '2019-01-01', 'correct date formats continue to work')
  t.equal(common.reformatANSIDate('2019-11-11'), '2019-11-11', 'correct date formats continue to work')
  t.equal(common.reformatANSIDate('2019-1-01'), '2019-01-01', 'incorrect month is fixed')
  t.equal(common.reformatANSIDate('2019-01-1'), '2019-01-01', 'incorrect day is fixed')
  t.equal(common.reformatANSIDate('2019-1-1'), '2019-01-01', 'incorrect day and month is fixed')
  t.end()
})
