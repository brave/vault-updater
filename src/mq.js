/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
var amqp = require('amqplib/callback_api')

const MQ_QUEUE = process.env.MQ_QUEUE || 'crashes'
const MQ_BC_QUEUE = process.env.MQ_BC_QUEUE || 'crashes-bc'
const MQ_URL = process.env.CLOUDAMQP_URL || process.env.AMQP_URL || 'amqp://localhost:5672'

let buildSender = exports.buildSender = (channel, queueName) => {
  return (msg) => {
    console.log(`Message sent to queue ${queueName}`)
    channel.sendToQueue(
      queueName,
      Buffer(JSON.stringify(msg)),
      { persistent: true }
    )
  }
}

// Initiate connection to RabbitMQ
exports.setup = (done) => {
  console.log('Connecting to AMQP server at ' + MQ_URL)
  amqp.connect(MQ_URL, (err, conn) => {
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
      ch.assertQueue(MQ_BC_QUEUE)

      // Builder function used to send messages
      var senders = {
        muon: buildSender(ch, MQ_QUEUE),
        braveCore: buildSender(ch, MQ_BC_QUEUE)
      }
      done(senders)
    }
    conn.createChannel(on_open)
  })
}
