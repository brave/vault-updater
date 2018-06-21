/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

let assert = require('assert')
let moment = require('moment')

const Joi = require('joi')
const MongoClient = require('mongodb').MongoClient
const s3 = require('./s3')

const mongoURL = process.env.MLAB_URI
if (!mongoURL) throw new Error('MLAB_URI must be set in environment')

const usageSchema = Joi.object().keys({
  daily: Joi.boolean(),
  weekly: Joi.boolean(),
  monthly: Joi.boolean(),
  first: Joi.boolean(),
  platform: Joi.string(),
  version: Joi.string(),
  channel: Joi.string(),
  woi: Joi.string(),
  ref: Joi.string()
})
.with('daily', 'weekly', 'monthly')

exports.setup = (amqpSender, done) => {
  MongoClient.connect(mongoURL, (err, connection) => {
    assert.equal(null, err)
    console.log(`connection to Mongo established at ${mongoURL}`)

    const usageCollection = connection.collection('usage')
    const androidUsageCollection = connection.collection('android_usage')
    const iosUsageCollection = connection.collection('ios_usage')
    const braveCoreUsageCollection = connection.collection('brave_core_usage')
    const crashesCollection = connection.collection('crashes')

    // install a series of model data handlers on connection
    connection.models = {

      retrieveStats: (done) => {
        connection.stats(done)
      },

      // insert Laptop usage record
      insertUsage: (usage, done) => {
        if (usage) {
          const invalid = Joi.validate(usage, usageSchema)
          if (invalid.error) {
            done(invalid, null)
          } else {
            // store the current timestamp in epoch seconds
            usage.ts = (new Date()).getTime()
            usage.year_month_day = moment().format('YYYY-MM-DD')
            // store as a useful backup
            console.log(JSON.stringify(usage))
            usageCollection.insertOne(usage, done)
          }
        } else {
          // Null usage indicates no values passed
          done(null, {})
        }
      },

      // insert Android usage record
      insertAndroidUsage: (usage, done) => {
        if (usage) {
          const invalid = Joi.validate(usage, usageSchema)
          if (invalid.error) {
            done(invalid, null)
          } else {
            // store the current timestamp in epoch seconds
            usage.ts = (new Date()).getTime()
            usage.year_month_day = moment().format('YYYY-MM-DD')
            // store as a useful backup
            console.log(JSON.stringify(usage))
            androidUsageCollection.insertOne(usage, done)
          }
        } else {
          // Null usage indicates no values passed
          done(null, {})
        }
      },

      // insert brave core usage record
      insertBraveCoreUsage: (usage, done) => {
        if (usage) {
          const invalid = Joi.validate(usage, usageSchema)
          if (invalid.error) {
            done(invalid, null)
          } else {
            // store the current timestamp in epoch seconds
            usage.ts = (new Date()).getTime()
            usage.year_month_day = moment().format('YYYY-MM-DD')
            // store as a useful backup
            console.log(JSON.stringify(usage))
            braveCoreUsageCollection.insertOne(usage, done)
          }
        } else {
          // Null usage indicates no values passed
          done(null, {})
        }
      },

      // insert iOS usage record
      insertIOSUsage: (usage, done) => {
        if (usage) {
          const invalid = Joi.validate(usage, usageSchema)
          if (invalid.error) {
            done(invalid, null)
          } else {
            // store the current timestamp in epoch seconds
            usage.ts = (new Date()).getTime()
            usage.year_month_day = moment().format('YYYY-MM-DD')
            // store as a useful backup
            console.log(JSON.stringify(usage))
            iosUsageCollection.insertOne(usage, done)
          }
        } else {
          // Null usage indicates no values passed
          done(null, {})
        }
      },

      // Insert crash record
      insertCrash: (crash, done) => {
        // Timestamp the crash
        crash.ts = (new Date()).getTime()
        crash.year_month_day = moment().format('YYYY-MM-DD')
        // Save the miniDump data for S3 storage
        var miniDump = crash.upload_file_minidump || null
        delete crash.upload_file_minidump
        // Insert into Mongo
        crashesCollection.insertOne(crash, (err, results) => {
          let id = results.ops[0]._id
          if (miniDump) {
            // Record the mongoId (also the S3 id)
            crash.mongoId = id
            // Log the crash
            console.log(JSON.stringify(crash))
            // Insert miniDump into S3
            s3.storeCrashReport(id, miniDump, function() {
              console.log('minidump stored in S3')
              setTimeout(function () {
                // Send rabbitmq message
                amqpSender(crash)
                done(null)
              }, 500)
            })
          }
        })
      }
    }
    done(connection)
  })
}
