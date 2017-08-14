/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

let _ = require('underscore')
let comparableVersion = require('./common').comparableVersion

var pg = null
let rawExtensions = []

function setup (runtime) {
  pg = runtime.pg
}

function all () {
  return rawExtensions
}

function allForChannel (channel) {
  if (rawExtensions[channel]) {
    return rawExtensions[channel]
  } else {
    throw "Extensions not found for channel " + channel
  }
}

async function readFromDatabase () {
  var extensions = (await pg.query("SELECT * FROM extensions ORDER BY channel", [])).rows
  rawExtensions = _.groupBy(extensions, (extension) => { return extension.channel })
  _.each(rawExtensions, (v, k) => {
    rawExtensions[k] = rawExtensions[k].map((extension) => {
      return [extension.id, extension.version, extension.hash, extension.name]
    })
  })
  console.log(rawExtensions)
  return rawExtensions
}

async function insertOrUpdate (extension) {
  // check that the version is newer than the one in the database
  var results = await pg.query("SELECT * FROM extensions WHERE channel = $1 AND id = $2", [extension.channel, extension.id])
  if (results.rows.length === 0) {
    await pg.query("INSERT INTO extensions (channel, id, version, hash, name) VALUES ($1, $2, $3, $4, $5)", [extension.channel, extension.id, extension.version, extension.hash, extension.name])
  } else {
    var current = results.rows[0]
    if (comparableVersion(current.version) <= comparableVersion(extension.version)) {
      await pg.query("UPDATE extensions SET version = $1, hash = $2, name = $3 WHERE channel = $4 AND id = $5", [extension.version, extension.hash, extension.name, extension.channel, extension.id])
    } else {
      throw "Version is less than current"
    }
  }
}

module.exports = {
  setup,
  all,
  allForChannel,
  readFromDatabase,
  insertOrUpdate
}
