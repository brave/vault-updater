var tap = require('tap')

var ipLimit = require('../dist/IPLimit')
const IPa = '1.1.1.1'
const IPb = '2.2.2.2'

const ts = (new Date()).getTime()

tap.test('IP rate limiting', function (t) {
  t.ok(ipLimit.shouldRecord(IPa, ts), 'first should be ok')
  t.ok(!ipLimit.shouldRecord(IPa, ts + 20000), 'second within timeout should not be ok')
  t.ok(ipLimit.shouldRecord(IPa, ts + 60 * 6 * 1000), 'third after timeout should be ok')

  t.ok(ipLimit.shouldRecord(IPb), 'first should be ok')
  t.ok(!ipLimit.shouldRecord(IPb), 'first should not be ok')
  t.end()
})
