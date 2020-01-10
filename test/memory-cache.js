const MC = require('../src/memory-cache')
const tap = require('tap')
const uuid = require('uuid/v4')

const snooze = ms => new Promise(resolve => setTimeout(resolve, ms))

tap.test('memory cache', async (t) => {
  const cacheFunc = MC.create(1, async () => { return uuid() })
  let value1 = await cacheFunc()
  t.ok(value1, 'value returned on first call')
  let value2 = await cacheFunc()
  t.equal(value1, value2, 'same value returned on second call')
  await snooze(1500)
  value2 = await cacheFunc()
  t.notequal(value1, value2, 'different value returned on third call')
  t.end()
})
