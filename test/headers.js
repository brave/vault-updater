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

  t.end()
})
