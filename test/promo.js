const tap = require('tap')

const promo = require('../src/lib/promo')

tap.test('mobile redirect', (t) => {
  let url = promo.redirectURLForMobileGet('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.54 Safari/537.36', 'ABC123')
  t.equal(url, 'https://www.brave.com', 'correct default redirect')
  url = promo.redirectURLForMobileGet('Mozilla/5.0 (iPad; CPU OS 9_3_2 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13F69 Safari/601.1', 'ABC123')
  t.equal(url, '/download/ios/ABC123', 'correct iOS redirect')
  url = promo.redirectURLForMobileGet('Mozilla/5.0 (Linux; <Android Version>; <Build Tag etc.>) AppleWebKit/<WebKit Rev> (KHTML, like Gecko) Chrome/<Chrome Rev> Mobile Safari/<WebKit Rev>', 'ABC123')
  t.equal(url, '/download/android/ABC123', 'correct android redirect')
  t.end()
})
