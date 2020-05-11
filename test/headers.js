const tap = require('tap')
const headers = require('../src/lib/headers')

tap.test("custom Brave header handling", (t) => {
  let usage, request

  // ensure env var is not set
  delete process.env.STORE_BRAVE_HEADERS

  usage = {}
  request = { headers: { 'x-brave-req-from-dc': 'true' } }
  usage = headers.potentiallyStoreBraveHeaders(request, usage)
  t.ok(typeof usage.braveDataCenter === 'undefined', 'braveDataCenter not set if STORE_BRAVE_HEADERS not set')

  process.env.STORE_BRAVE_HEADERS = true

  usage = {}
  request = { headers: {} }
  usage = headers.potentiallyStoreBraveHeaders(request, usage)
  t.ok(usage.braveDataCenter === false, 'braveDataCenter not set if missing header')

  usage = {}
  request = { headers: { 'x-brave-req-from-dc': 'false' } }
  usage = headers.potentiallyStoreBraveHeaders(request, usage)
  t.ok(usage.braveDataCenter === false, 'braveDataCenter not set if false')

  usage = {}
  request = { headers: { 'x-brave-req-from-dc': 'true' } }
  usage = headers.potentiallyStoreBraveHeaders(request, usage)
  t.ok(usage.braveDataCenter === true, 'braveDataCenter set if true')

  usage = {}
  request = { headers: { } }
  usage = headers.potentiallyStoreBraveHeaders(request, usage)
  t.ok(usage.braveAPIKeyStatus === 'missing', 'api key match status set to missing')

  usage = {}
  request = { headers: { 'x-brave-api-key': 'INVALID' } }
  usage = headers.potentiallyStoreBraveHeaders(request, usage)
  t.ok(usage.braveAPIKeyStatus === 'invalid', 'api key match status set to invalid')

  usage = {}
  request = { headers: { 'x-brave-api-key': 'b' } }
  usage = headers.potentiallyStoreBraveHeaders(request, usage)
  t.equal(usage.braveAPIKeyStatus, 'matched', 'api key match status set to matched')

  t.end()
})
