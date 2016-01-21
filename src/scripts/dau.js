/*
 * Simple script to return number of active users by day / platform
 */

var db = require('../db')
var reporting = require('../lib/reporting')
var assert = require('assert')

db.setup((mongo) => {
  reporting.dailyActiveUsersGrouped(mongo, (err, dau) => {
    assert.equal(err, null)
    console.log(dau)
    mongo.close()
  })
})
