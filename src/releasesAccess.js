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

function allForChannel (channel) {
  var channels = {}
  var releaseChannel, releasePlatform
  _.each(all(), function (v, k) {
    [releaseChannel, releasePlatform] = k.split(':')
    if (channel === releaseChannel) {
      channels[releasePlatform] = v
    }
  })
  return channels
}

async function livePreview () {
  var channels = {}
  var releaseChannel, releasePlatform
  console.log(releasesFromDatabase())
  var releases = await releasesFromDatabase()
  _.each(releases, function (v, k) {
    [releaseChannel, releasePlatform] = k.split(':')
    channels[releaseChannel] = channels[releaseChannel] || {}
    channels[releaseChannel][releasePlatform] = {}
    var mostRecent = v.sort((a, b) => { return b.pub_date - a.pub_date })[0]
    var mostRecentLive = v.filter((release) => { return !release.preview }).sort((a, b) => { return b.pub_date.localeCompare(a.pub_date) })[0]
    var mostRecentPreview = v.filter((release) => { return release.preview }).sort((a, b) => { return b.pub_date.localeCompare(a.pub_date) })[0]
    channels[releaseChannel][releasePlatform].recent = mostRecent
    channels[releaseChannel][releasePlatform].live = mostRecentLive
    channels[releaseChannel][releasePlatform].preview = mostRecentPreview
  })
  return channels
}

function latestForChannel (channel) {
  var channels = {}
  var releaseChannel, releasePlatform
  _.each(all(), function (v, k) {
    [releaseChannel, releasePlatform] = k.split(':')
    if (channel === releaseChannel) {
      channels[releasePlatform] = v[0]
    }
  })
  return channels
}

async function foo () {

}

// Read release info from database and optionally apply chanel/platform
// pauses. This method does NOT install the releases in the package
// variable 'rawReleases'
async function releasesFromDatabase (applyPauses) {
  var QUERY = `SELECT releases.channel AS channel, platform, version, name, pub_date, notes, preview, url, channels.status
    FROM
      releases JOIN
      channels ON releases.channel = channels.channel
    WHERE channels.status = 'active'
    ORDER BY releases.channel, releases.platform
    `
  var results = await pg.query(QUERY, [])
  var releases = _.groupBy(results.rows, (row) => {
    return row.channel + ':' + row.platform
  })

  if (applyPauses) {
    // remove channels and platforms that are explicitly paused
    var channelPlatformPauses = (await pg.query("SELECT channel, platform FROM channel_platform_pauses", [])).rows || []
    _.each(channelPlatformPauses, (channelPlatformPause) => {
      delete releases[channelPlatformPause.channel + ':' + channelPlatformPause.platform]
    })
  }
  _.each(_.keys(releases), (k) => {
    releases[k] = releases[k].map((release) => {
      var modifiedRelease = _.pick(release, ['version', 'name', 'pub_date', 'notes', 'preview', 'url', 'channel'])
      if (!modifiedRelease.url) delete modifiedRelease.url
      return modifiedRelease
    }).sort(function (a, b) {
      return semver.compare(b.version, a.version)
    })
  })
  return releases
}

async function readReleasesFromDatabase () {
  var releases = await releasesFromDatabase(true)
  rawReleases = releases
  return releases
}

async function promote (channel, platform, version, notes, cb) {
  pg.query("SELECT * FROM releases WHERE channel = $1 AND platform = $2 AND version = $3", [channel, platform, version], (selectErr, results) => {
    if (selectErr) return cb(selectErr, null)
    if (results.rows.length === 0) return cb(new Error("release not found", null))
    var release = results.rows[0]
    if (!release.preview) return cb(new Error("release already promoted"), null)
    pg.query("UPDATE releases SET preview = false, notes = COALESCE($4, notes) WHERE channel = $1 AND platform = $2 AND version = $3", [channel, platform, version, notes], async (updateErr, results) => {
      if (updateErr) return cb(selectErr, null)
      var release = await pg.query("SELECT * FROM releases WHERE channel = $1 AND platform = $2 AND version = $3", [channel, platform, version])
      cb(null, release)
    })
  })
}

function revert (channel, platform, version, cb) {
  pg.query("DELETE FROM releases WHERE channel = $1 AND platform = $2 AND version = $3", [channel, platform, version], (deleteErr, results) => {
    if (deleteErr) return cb(selectErr, null)
    if (results.rowCount === 0) return cb(new Error("release not found", null))
    cb(null, "ok")
  })
}

function revertAllPlatforms (channel, version, cb) {
  pg.query("DELETE FROM releases WHERE channel = $1 AND version = $2", [channel, version], (deleteErr, results) => {
    if (deleteErr) return cb(deleteErr, null)
    if (results.rowCount === 0) return cb(new Error("release not found", null))
    cb(null, "ok")
  })
}

async function promoteAllPlatforms (channel, version, notes) {
  var results = await pg.query("SELECT * FROM releases WHERE channel = $1 AND version = $2", [channel, version])
  if (results.rows.length === 0) return cb(new Error("releases not found", null))
  var release = results.rows[0]
  if (!release.preview) return cb(new Error("releases already promoted"), null)
  results = await pg.query("UPDATE releases SET preview = false, notes = COALESCE($3, notes) WHERE channel = $1 AND version = $2", [channel, version, notes])
  var rows = (await pg.query("SELECT * FROM releases WHERE channel = $1 AND version = $2", [channel, version])).rows
  return rows
}

async function insert (channel, platform, release, cb) {
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
  var result = await pg.query('INSERT INTO releases (channel, platform, version, name, pub_date, notes, preview, url ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', params)
  var release = (await pg.query("SELECT * FROM releases WHERE channel = $1 AND platform = $2 AND version = $3", [channel, platform, release.version])).rows[0]
  return release
}

async function pause (cb) {
  try {
    await pg.query("UPDATE channels SET status = 'paused'")
    await readReleasesFromDatabase()
    cb(null, 'ok')
  } catch (e) {
    cb(e, null)
  }
}

async function resume (cb) {
  try {
    await pg.query("UPDATE channels SET status = 'active'")
    await readReleasesFromDatabase()
    cb(null, 'ok')
  } catch (e) {
    cb(e, null)
  }
}

async function pauseChannel (channel, cb) {
  try {
    await pg.query("UPDATE channels SET status = 'paused' WHERE channel = $1", [channel])
    await readReleasesFromDatabase()
    var channelRow = (await pg.query("SELECT * FROM channels WHERE channel = $1", [channel])).rows[0]
    cb(null, channelRow)
  } catch (e) {
    cb(e, null)
  }
}

async function pauseChannelPlatform (channel, platform, cb) {
  console.log("HERE 2")
  try {
    console.log(channel, platform)
    await pg.query("INSERT INTO channel_platform_pauses ( channel, platform ) VALUES ($1, $2)", [channel, platform])
    await readReleasesFromDatabase()
    var row = (await pg.query("SELECT * FROM channel_platform_pauses WHERE channel = $1 AND platform = $2", [channel, platform])).rows[0]
    cb(null, row)
  } catch (e) {
    cb(e, null)
  }
}

async function resumeChannel (channel, cb) {
  try {
    await pg.query("UPDATE channels SET status = 'active' WHERE channel = $1", [channel])
    await readReleasesFromDatabase()
    var channelRow = (await pg.query("SELECT * FROM channels WHERE channel = $1", [channel])).rows[0]
    cb(null, channelRow)
  } catch (e) {
    cb(e, null)
  }
}

async function resumeChannelPlatform (channel, platform, cb) {
  try {
    var results = await pg.query("DELETE FROM channel_platform_pauses WHERE channel = $1 AND platform = $2", [channel, platform])
    await readReleasesFromDatabase()
    if (results.rowCount !== 1) throw new Error("Channel platform pause was not removed")
    cb(null, {})
  } catch (e) {
    cb(e, null)
  }
}

async function channelPlatformPauses (cb) {
  try {
    var rows = (await pg.query("SELECT channel, platform  from channel_platform_pauses ORDER BY channel, platform", {})).rows
    cb(null, rows)
  } catch (e) {
    cb(e, null)
  }
}

async function history (channelId, platformId) {
  var releases = await pg.query("SELECT * FROM releases WHERE channel = $1 AND platform = $2 ORDER BY pub_date DESC", [channelId, platformId])
  return releases.rows
}

async function auditHistory (n) {
  var entries = await pg.query("SELECT * FROM audit_entries ORDER BY ts DESC LIMIT $1", [n])
  return entries.rows
}

module.exports = {
  setup,
  all,
  readReleasesFromDatabase,
  insert,
  promote,
  promoteAllPlatforms,
  allForChannel,
  latestForChannel,
  revert,
  revertAllPlatforms,
  pause,
  resume,
  pauseChannel,
  pauseChannelPlatform,
  resumeChannel,
  resumeChannelPlatform,
  livePreview,
  channelPlatformPauses,
  history,
  auditHistory
}
