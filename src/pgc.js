/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const pg = require('pg')

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL must be set to the Postgres connection URL')
}

function setup (cb) {
  console.log('Connecting to Postgres at ' + DATABASE_URL)
  // Connect to Postgres
  pg.connect(DATABASE_URL, function (err, client) {
    if (err) {
      throw new Error(err)
    }
    cb(err, client)
  })
}

function connectToURL (url, cb) {
  console.log('Connecting to Postgres at ' + url)
  // Connect to Postgres
  pg.connect(url, function (err, client) {
    if (err) {
      throw new Error(err)
    }
    cb(err, client)
  })
}

module.exports = {
  setup: setup,
  connectToURL: connectToURL
}
