const tap = require('tap')
const moment = require('moment')

const feedback = require('../src/controllers/feedback')
const verification = require('../src/verification')

tap.test('feedback', (t) => {
  let results = feedback.buildStorageObject({
    selection: 'no',
    platform: 'androidbrowser',
    os_version: 'os',
    phone_make: 'make',
    phone_model: 'model',
    phone_arch: 'arch',
    app_version: '1.2.3',
    user_feedback: 'feedback'
  })
  t.equal(results.platform, 'androidbrowser', 'platform captured')
  t.ok(results.ts, 'timestamp inserted')
  t.ok(results.ymd, 'ymd inserted')
  t.ok(results.id, 'id inserted')

  t.equal(feedback.successResult('1').status, 'ok', 'ok result well formed')
  t.ok(feedback.successResult('1').id, 'ok result has id')

  t.ok(verification.isValidAPIKey('a'), 'verification key found')
  t.notok(verification.isValidAPIKey('z'), 'verification key not found')

  t.done()
})
