/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

let assert = require('assert')
let moment = require('moment')

const Joi = require('joi')
const MongoClient = require('mongodb').MongoClient
const s3 = require('./s3')

const mongoURL = process.env.MONGOLAB_URI
if (!mongoURL) throw new Error('MONGOLAB_URI must be set in environment')

const usageSchema = Joi.object().keys({
  daily: Joi.boolean(),
  weekly: Joi.boolean(),
  monthly: Joi.boolean(),
  first: Joi.boolean(),
  platform: Joi.string(),
  version: Joi.string()
})
.with('daily', 'weekly', 'monthly')

exports.setup = (done) => {
  MongoClient.connect(mongoURL, (err, connection) => {
    assert.equal(null, err)
    console.log('connection to Mongo established')

    const usageCollection = connection.collection('usage')
    const crashesCollection = connection.collection('crashes')

    // install a series of model data handlers on connection
    connection.models = {
      // insert usage record
      insertUsage: (usage, done) => {
        if (usage) {
          const invalid = Joi.validate(usage, usageSchema)
          if (invalid.error) {
            done(invalid, null)
          } else {
            // store the current timestamp in epoch seconds
            usage.ts = (new Date()).getTime()
            usage.year_month_day = moment().format('YYYY-MM-DD')
            usageCollection.insertOne(usage, done)
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
        // Log the crash
        console.log(JSON.stringify(crash))
        // Insert into Mongo
        crashesCollection.insertOne(crash, (err, results) => {
          let id = results.ops[0]._id
          if (miniDump) {
            // Insert miniDump into S3
            s3.storeCrashReport(id, miniDump, done)
          } else {
            // If no miniDump then return a valid condition
            done(null)
          }
        })
      }
    }
    done(connection)
  })
}
