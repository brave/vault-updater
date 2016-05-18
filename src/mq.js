/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
var amqp = require('amqplib/callback_api')

const MQ_HOST = process.env.MQ_HOST || 'localhost'
const MQ_PORT = process.env.MQ_PORT || '5672'
const MQ_QUEUE = process.env.MQ_QUEUE || 'crashes'

// Initiate connection to RabbitMQ
exports.setup = (done) => {
  var amqpConnectionString = 'amqp://' + MQ_HOST + ':' + MQ_PORT
  console.log('Connecting to AMQP server at ' + amqpConnectionString)
  amqp.connect(amqpConnectionString, (err, conn) => {
    if (err != null) {
      throw new Error(err)
    }
    console.log('AMQP connection established')
    // Open channel with queue name MQ_QUEUE
    var on_open = (err, ch) => {
      console.log(`AMQP connected to channel ${MQ_QUEUE}`)
      if (err != null) {
        throw new Error(err)
      }
      ch.assertQueue(MQ_QUEUE)
      // Builder function used to send messages
      var sender = (msg) => {
        console.log(`Message sent to queue`)
        ch.sendToQueue(
          MQ_QUEUE,
          Buffer(JSON.stringify(msg)),
          { persistent: true }
        )
      }
      done(sender)
    }
    conn.createChannel(on_open)
  })
}
