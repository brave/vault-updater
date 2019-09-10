const tap = require('tap')
const storage = require('../src/storage')

tap.test('Storage', async (t) => {
  const runtimeMock = {
    mongo: {
      collection: (col) => {
        t.equal(col, 'testCollection', 'correct collection selected')
        return {
          insertOne: async (obj) => {
            t.equal(obj.a, 1, 'correct object passed')
          }
        }
      }
    }
  }
  await storage.storeObjectOrEvent(runtimeMock, 'testCollection', { a: 1 } , 2)
  t.plan(2)
  t.done()
})
