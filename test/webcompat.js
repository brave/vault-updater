const tap = require('tap')
const moment = require('moment')

const webcompat = require('../src/controllers/webcompat')

tap.test('webcompat', (t) => {
  let results = webcompat.buildStorageObject('https://www.cnn.com', 'Google Chrome Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36')
  t.equal(results.platform, 'winx64-bc', 'platform detected')
  t.equal(results.version, '58.0.3029.110', 'version detected')
  t.equal(results.ymd, moment().format('YYYY-MM-DD'), 'ymd inserted')
  t.equal(results.domain, 'https://www.cnn.com', 'domain recorded')
  t.ok(results.ts, 'timestamp inserted')

  t.ok(webcompat.domainIsValid('https://www.cnn.com/'), 'domain is valid')
  t.notok(webcompat.domainIsValid('htt://www.cnn.com/'), 'domain is invalid')

  t.equal(webcompat.versionFromUA('Google Chrome Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'), '58.0.3029.110', 'correct version extracted')

  t.equal(webcompat.successResult().status, 'ok', 'ok result well formed')

  t.done()
})
