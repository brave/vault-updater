/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

let assert = require('assert')
let moment = require('moment')

const Joi = require('joi')
const MongoClient = require('mongodb').MongoClient

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
  dtoi: Joi.string().optional(),
  ref: Joi.string(),
  country_code: Joi.string(),
  braveDataCenter: Joi.boolean(),
  braveAPIKeyStatus: Joi.string(),
})
.with('daily', 'weekly', 'monthly')

exports.setup = (amqpSender, amqpBraveCoreSender, done) => {
  MongoClient.connect(mongoURL, (err, client) => {
    assert.equal(null, err)
    console.log(`connection to Mongo established at ${mongoURL}`)

    const db = client.db()

    const usageCollection = db.collection('usage')
    const androidUsageCollection = db.collection('android_usage')
    const iosUsageCollection = db.collection('ios_usage')
    const braveCoreUsageCollection = db.collection('brave_core_usage')
    const crashesCollection = db.collection('crashes')
    const installerEventCollection = db.collection('installer_events')

    // install a series of model data handlers on connection
    db.models = {

      retrieveStats: (done) => {
        db.stats(done)
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

      // insert an installation event
      insertInstallerEvent: async (evt) => {
        // note: validation happens at the API level
        evt.ts = (new Date()).getTime()
        evt.year_month_day = moment().format('YYYY-MM-DD')
        console.log(JSON.stringify(evt))
        await installerEventCollection.insertOne(evt)
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
      }
    }
    done(db)
  })
}
