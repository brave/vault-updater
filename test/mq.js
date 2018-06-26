const mq = require('../src/mq')
const tap = require('tap')

tap.test('Message queue selection', function (t) {
  ch = {
    sendToQueue: (queueName, contents, obj) => {
      t.equal(queueName, 'crashes-bc', 'correct queue')
      t.ok(contents, 'has contents')
      t.equal(obj.persistent, true, 'persistent set')
    }
  }
  let braveCoreSender = mq.buildSender(ch, 'crashes-bc')
  braveCoreSender({ A: 1 })
  t.done()
})
