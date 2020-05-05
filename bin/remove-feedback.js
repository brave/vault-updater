#!/usr/bin/env node

const assert = require('assert')
const moment = require('moment')

const MongoClient = require('mongodb').MongoClient
const mongoURL = process.env.MLAB_URI
if (!mongoURL) throw new Error('MLAB_URI must be set in environment')

const FEEDBACK_COLLECTION = process.env.FEEDBACK_COLLECTION || 'feedback'

const args = require('yargs')
  .describe('id', 'remove a single item by id')
  .describe('interval', 'remove all feedback created before this interval')
  .argv

const main = async (args) => {
  MongoClient.connect(mongoURL, (err, client) => {
    const db = client.db()

    const collection = db.collection(FEEDBACK_COLLECTION);
    if (args.id) {
      collection.deleteOne({ id : args.id }, (err, result) => {
        assert.equal(err, null)
        if (result.result.n === 0) {
          console.log(`Feedback with id ${args.id} not found`)
        } else {
          console.log(`Feedback with id ${args.id} removed`)
        }
        client.close()
      })
    } else if (args.interval) {
      let [num, period] = args.interval.split(' ')
      num = parseInt(num)
      assert(typeof(period) === 'string')
      const targetYMD = moment().subtract(num, period).format('YYYY-MM-DD')
      console.log(`This will remove all feedback before ${targetYMD}. Run again with -f to accept`)
      if (targetYMD && args.f) {
        console.log(`removing all feedback before ${targetYMD}`)
        collection.deleteMany({ ymd: { $lt: targetYMD }}, (err, result) => {
          assert.equal(err, null)
          console.log(`${result.result.n} feedback records removed`)
          client.close()
        })
      } else {
        client.close()
      }
    } else {
      client.close()
    }
  })
}

main(args)
