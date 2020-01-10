const tap = require('tap')
const nock = require('nock')
const promo = require('../src/controllers/promo')

const SERVICES_HOST = process.env.SERVICES_HOST || 'localhost'
const SERVICES_PORT = process.env.SERVICES_PORT || 8194
const SERVICES_PROTOCOL = process.env.SERVICES_PROTOCOL || 'http'

tap.test('custom-headers integration', async (t) => {
  nock(`${SERVICES_PROTOCOL}://${SERVICES_HOST}:${SERVICES_PORT}`)
    .get('/api/1/promo/custom-headers')
    .reply(200, [{"domains":["foo.com"],"headers":{"X-Brave-Partner":"foo"},"cookieNames":[],"expiration":31536000000} ])

  results = await promo.customHeadersCacheFunc()
  t.equals(results[0].domains[0], 'foo.com', 'domain returned')

  nock(`${SERVICES_PROTOCOL}://${SERVICES_HOST}:${SERVICES_PORT}`)
    .get('/api/1/promo/custom-headers')
    .reply(200, [{"domains":["bar.com"],"headers":{"X-Brave-Partner":"bar"},"cookieNames":[],"expiration":31536000000} ])

  results = await promo.customHeadersCacheFunc()
  t.equals(results[0].domains[0], 'foo.com', 'same domain returned')

  t.end()
})
