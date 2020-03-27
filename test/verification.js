const tap = require('tap')
const verification = require('../src/verification')

const IOS_API_KEY_VERSION = process.env.IOS_API_KEY_VERSION || '1.0.0'

tap.test('verification', (t) => {
  const apiKeys = ['1', '2']

  t.ok(verification.isUsagePingValid({}, { platform: 'foobar' }), 'no platform match for verifiers')

  /* to be re-introduced with ios API KEY verification

   t.ok(verification.isUsagePingValid({}, { platform: 'ios', version: '0.9.1' }), 'version too low')

  t.ok(verification.isUsagePingValid({
    headers: { api_key: '1' }
  }, { platform: 'ios', version: '1.0.0' }, apiKeys), 'header match')

  t.notok(verification.isUsagePingValid({
    headers: { api_key: '9' }
  }, { platform: 'ios', version: '1.0.0' }, apiKeys), 'header mismatch')

  t.notok(verification.isUsagePingValid({
    headers: {  }
  }, { platform: 'ios', version: '1.0.0' }, apiKeys), 'header missing')

  */

  t.notok(verification.isUsagePingValid({
    headers: {  }
  }, { platform: 'linux-bc', version: '1.0.0', first: true }, apiKeys), 'platform=linux-bc,version=1.0.0,first=true is rejected')

  t.notok(verification.isUsagePingValid({
    headers: {  }
  }, { platform: 'linux-bc', version: '1.5.113', first: true }, apiKeys), 'platform=linux-bc,version=1.5.113,first=true is rejected')

  t.notok(verification.isUsagePingValid({
    headers: {  }
  }, { platform: 'linux-bc', version: '0.73.29', first: true }, apiKeys), 'platform=linux-bc,version=1.5.113,first=true is rejected')

  t.ok(verification.isUsagePingValid({
    headers: {  }
  }, { platform: 'linux-bc', version: '1.0.1', first: true }, apiKeys), 'platform=linux-bc,version=1.0.1,first=true is stored')

  const mgMock = {
    collection: () => {
      return {
        insertOne: (obj, cb) => {
          t.ok(obj.ts, 'timestamp inserted into filtered usage ping')
          t.ok(obj.ts, 'year_month_day inserted into filtered usage ping')
        }
      }
    }
  }

  verification.writeFilteredUsagePing(mgMock, {
    platform: 'foobar'
  })

  t.plan(7)
  t.end()
})
