/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

let _ = require('underscore')
let semver = require('semver')

var pg = null
let rawReleases = {}

function setup (runtime) {
  pg = runtime.pg
}

function all () {
  // access control to the raw releases info
  return rawReleases
}

function readReleasesFromDatabase (cb) {
  pg.query('SELECT channel, platform, version, name, pub_date, notes, preview, url FROM releases ORDER BY channel, platform', [], (err, results) => {
    if (err) return cb(err, null)
    var releases = _.groupBy(results.rows, (row) => {
      return row.channel + ':' + row.platform
    })
    _.each(_.keys(releases), (k) => {
      releases[k] = releases[k].map((release) => {
        var modifiedRelease = _.pick(release, ['version', 'name', 'pub_date', 'notes', 'preview', 'url'])
        if (!modifiedRelease.url) delete modifiedRelease.url
        return modifiedRelease
      }).sort(function (a, b) {
        return semver.compare(b.version, a.version)
      })
    })
    rawReleases = releases
    console.log('Releases read from database')
    cb(null, releases)
  })
}

function promote (channel, platform, version, cb) {
  pg.query("SELECT * FROM releases WHERE channel = $1 AND platform = $2 AND version = $3", [channel, platform, version], (selectErr, results) => {
    if (selectErr) return cb(selectErr, null)
    if (results.rows.length === 0) return cb(new Error("release not found", null))
    var release = results.rows[0]
    if (!release.preview) return cb(new Error("release already promoted"), null)
    pg.query("UPDATE releases SET preview = false WHERE channel = $1 AND platform = $2 AND version = $3", [channel, platform, version], (updateErr, results) => {
      if (updateErr) return cb(selectErr, null)
      cb(null, "ok")
    })
  })
}

function promoteAllPlatforms (channel, version, cb) {
  pg.query("SELECT * FROM releases WHERE channel = $1 AND version = $2", [channel, version], (selectErr, results) => {
    if (selectErr) return cb(selectErr, null)
    if (results.rows.length === 0) return cb(new Error("releases not found", null))
    var release = results.rows[0]
    if (!release.preview) return cb(new Error("releases already promoted"), null)
    pg.query("UPDATE releases SET preview = false WHERE channel = $1 AND version = $2", [channel, version], (updateErr, results) => {
      if (updateErr) return cb(selectErr, null)
      cb(null, "ok")
    })
  })
}

function insert (channel, platform, release, cb) {
  console.log(release)
  // validation
  var releases = rawReleases[channel + ':' + platform]
  if (releases) {
    if (semver.lte(release.version, releases[0].version)) return cb(new Error('Version less than or equal to latest version'))
  }

  // database insert
  var params = [
    channel,
    platform,
    release.version,
    release.name,
    release.pub_date,
    release.notes,
    release.preview,
    release.url
  ]
  pg.query('INSERT INTO releases (channel, platform, version, name, pub_date, notes, preview, url ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', params, cb)
}

module.exports = {
  setup,
  all,
  readReleasesFromDatabase,
  insert,
  promote,
  promoteAllPlatforms
}
