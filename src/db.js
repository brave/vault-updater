let assert = require('assert')

const Joi = require('joi')
const MongoClient = require('mongodb').MongoClient

const mongoURL = process.env.MONGOLAB_URI
if (!mongoURL) throw new Error('MONGOLAB_URI must be set in environment')

const usageSchema = Joi.object().keys({
  daily: Joi.boolean(),
  weekly: Joi.boolean(),
  monthly: Joi.boolean(),
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
            usageCollection.insertOne(usage, done)
          }
        } else {
          // a null usage indicates no values passed
          done(null, {})
        }
      },

      // insert crash record
      insertCrash: (crash, done) => {
        crash.ts = (new Date()).getTime()
        crashesCollection.insertOne(crash, done)
      }
    }

    done(connection)
  })
}
