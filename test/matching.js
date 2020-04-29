const tap = require('tap')
const common = require('../src/common')

tap.test('iOS matching signals', (t) => {
  const ua1 = 'Mozilla/5.0 (iPad; CPU OS 7_0 like Mac OS X) AppleWebKit/537.51.1 (KHTML, like Gecko) CriOS/30.0.1599.12 Mobile/11A465 Safari/8536.25 (3B92C18B-D9DE-4CB7-A02A-22FD2AF17C8F)'
  const ua2 = 'Mozilla/5.0 (iPhone; CPU iPhone OS 6_1_4 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10B350 Safari/8536.25'
  const ua3 = 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_3_2 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Brave/1.2.7 Mobile/13F69 Safari/601.1.46'
  let signals = common.signalsFromRequest({
    headers: {
      'user-agent': ua1,
      'x-brave-country-code': 'CA',
    }
  })
  t.same(signals, { osVersion: '7.0', model: 'iPad', countryCode: 'CA' }, "Safari with country code")
  signals = common.signalsFromRequest({
    headers: {
      'user-agent': ua2
    }
  })
  t.same(signals, { osVersion: '6.1.4', model: 'iPhone', countryCode: 'unknown' }, "Safari iphone")
  signals = common.signalsFromRequest({
    headers: {
      'user-agent': ua3
    }
  })
  t.same(signals, { osVersion: '9.3.2', model: 'iPhone', countryCode: 'unknown' }, 'Brave')
  t.end()
})
