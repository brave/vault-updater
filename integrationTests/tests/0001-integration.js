#!/usr/bin/env node

var r = require('request')
var config = require('../../config/config.test.js')
var common = require('../common')
var tap = require('tap')
var xmldoc = require('xmldoc')

var _ = require('underscore')
var async = require('async')

var options = common.standardOptions()
options.url = options.url + '/dev/osx'
options.method = "POST"
options.body = {
  notes: "notes",
  version: "0.5.0",
  url: "http://localhost/",
  preview: false
}

tap.test("Integration", function (t) {
  function insertFirstRelease (cb) {
    r(options, function (err, results, body) {
      t.equal(results.statusCode, 200, "200 returned")
      t.equal(body.version, '0.5.0', "object returned")
      cb(err)
    })
  }

  function insertNewChannelRelease (cb) {
    var options = common.standardOptions()
    options.url = options.url + '/beta/winia32'
    options.method = "POST"
    options.body = {
      notes: "notes",
      version: "0.4.0",
      url: "http://localhost/",
      preview: false
    }
    r(options, function (err, results, body) {
      t.equal(results.statusCode, 200, "200 returned")
      t.equal(body.version, '0.4.0', "beta/winia32 object returned")
      cb(err)
    })
  }

  function refresh (cb) {
    r(common.refreshOptions(), function (err, results, body) {
      t.equal(results.statusCode, 200, '200 returned')
      cb(err)
    })
  }

  function readFirstRelease (cb) {
    options = common.standardOptions()
    options.url = options.url + '/dev/osx'
    r(options, function (err, results, body) {
      t.equal(results.statusCode, 200, "200 returned")
      t.equal(body.length, 1, "One release returned")
      cb(err)
    })
  }

  function insertPreviewRelease (cb) {
    var options = common.standardOptions()
    options.url = options.url + '/dev/osx'
    options.method = "POST"
    options.body = {
      notes: "notes",
      version: "0.6.0",
      url: "http://localhost/",
      preview: true
    }
    r(options, function (err, results, body) {
      t.equal(results.statusCode, 200, "200 returned")
      cb(err)
    })
  }

  function readSecondRelease (cb) {
    options = common.standardOptions()
    options.url = options.url + '/dev/osx'
    r(options, function (err, results, body) {
      t.equal(results.statusCode, 200, "200 returned")
      t.equal(body.length, 2, "Two releases returned")
      cb(err)
    })
  }

  function checkForUpdateNoPreview (cb) {
    options = common.standardOptions()
    options.url = 'http://localhost:9000/1/releases/dev/0.1.0/osx'
    r(options, function (err, results, body) {
      t.equal(body.version, '0.5.0', 'Live release returned')
      cb(err)
    })
  }

  function checkForUpdatePreview (cb) {
    options = common.standardOptions()
    options.url = 'http://localhost:9000/1/releases/dev/0.1.0/osx?accept_preview=true'
    r(options, function (err, results, body) {
      t.equal(body.version, '0.6.0', 'Preview release returned')
      cb(err)
    })
  }

  function checkForNonExistentRelease (cb) {
    options = common.standardOptions()
    options.url = 'http://localhost:9000/1/releases/dev/0.7.0/osx'
    r(options, function (err, results, body) {
      t.equal(results.statusCode, 204, "204 returned")
      t.ok(body === undefined, "No release found")
      cb(err)
    })
  }

  function promotePreviewWithNotes (cb) {
    var options = common.standardOptions()
    options.url = options.url + '/dev/0.6.0/promote'
    options.method = "PUT"
    options.body = {
      notes: "foo the bar"
    }
    r(options, function (err, results, body) {
      t.equal(results.statusCode, 200, "200 returned")
      t.equal(body, "ok", "ok returned")
      cb(err)
    })
  }

  function checkForUpdatePostPromoteWithNotes (cb) {
    options = common.standardOptions()
    options.url = 'http://localhost:9000/1/releases/dev/0.1.0/osx'
    r(options, function (err, results, body) {
      t.equal(results.statusCode, 200, "200 returned")
      t.ok(body.notes.match(/foo the bar/), 'promoted notes returned')
      cb(err)
    })
  }

  function insertWinx64Release (cb) {
    var options = common.standardOptions()
    options.url = options.url + '/dev/winx64'
    options.method = "POST"
    options.body = {
      notes: "notes",
      version: "0.6.0",
      url: "http://localhost/",
      preview: false
    }
    r(options, function (err, results, body) {
      t.equal(results.statusCode, 200, "200 returned")
      t.equal(body.version, '0.6.0', "dev/winx64 object returned")
      cb(err)
    })
  }

  function checkReleasesForChannel (cb) {
    options = common.standardOptions()
    options.url = options.url + '/dev'
    r(options, function (err, results, body) {
      t.equal(results.statusCode, 200, "200 returned")
      t.ok(_.isArray(body.osx), 'osx found')
      t.equal(body.osx.length, 2, 'two osx releases found')
      t.ok(_.isArray(body.winx64), 'winx64 found')
      t.equal(body.winx64.length, 1, 'one winx64 release found')
      cb(err)
    })
  }

  function checkLatestReleasesForChannel (cb) {
    options = common.standardOptions()
    options.url = options.url + '/dev/latest'
    r(options, function (err, results, body) {
      t.equal(results.statusCode, 200, "200 returned")
      t.ok(_.isObject(body.osx), 'osx found')
      t.equal(body.osx.version, '0.6.0', 'correct version found')
      t.ok(_.isObject(body.winx64), 'winx64 found')
      t.equal(body.winx64.version, '0.6.0', 'correct version found')
      cb(err)
    })
  }

  function revertWinx64Release (cb) {
    var options = common.standardOptions()
    options.url = options.url + '/dev/winx64/0.5.12'
    options.method = "DELETE"
    r(options, function (err, results, body) {
      t.equal(results.statusCode, 400, "revert - 400 returned")
      var opts = common.standardOptions()
      opts.url = opts.url + '/dev/winx64/0.6.0'
      opts.method = "DELETE"
      r(opts, function (err, results, body) {
        t.equal(results.statusCode, 200, "revert - 200 returned")
        refresh((refreshErr) => {
          options = common.standardOptions()
          options.url = options.url + '/dev/latest'
          r(options, function (err, results, body) {
            t.equal(results.statusCode, 200, "200 returned")
            t.ok(body.winx64 == null, 'winx64 version removed')
            cb(err)
          })
        })
      })
    })
  }

  async function pr (options) {
    return new Promise((resolve, reject) => {
      r(options, (err, response, body) => {
        if (err) reject(err)
        else resolve([response, body])
      })
    })
  }

  async function latestReleases (channel) {
    return new Promise((resolve, reject) => {
      var options = common.standardOptions()
      options.url += '/' + channel + '/latest'
      options.method = 'GET'
      r(options, function (err, results, body) {
        if (err) return reject(err)
        resolve(body)
      })
    })
  }

  async function currentStatus () {
    return new Promise((resolve, reject) => {
      var options = common.standardOptions()
      options.url = "http://localhost:9000/api/1/control/status"
      options.method = 'GET'
      r(options, function (err, results, body) {
        if (err) return reject(err)
        resolve(body)
      })
    })
  }

  async function pauseResume (cb) {
    var latest = await latestReleases('dev')
    t.ok(Object.keys(latest).length > 0, 'latest releases available')
    var status = await currentStatus()
    t.equal(status.statuses.dev, 'active', 'active status')
    var options = common.standardOptions()
    options.url = "http://localhost:9000/api/1/control/releases/pause",
    options.method = 'PUT'
    r(options, async function (err, results, body) {
      t.equal(results.statusCode, 200, 'pause returned 200')
      t.equal(body, 'ok', 'pause returned ok in body')
      status = await currentStatus()
      t.equal(status.statuses.dev, 'paused', 'paused status')
      t.equal(Object.keys(status.statuses).filter((channel) => { return status.statuses[channel] === 'active' }).length, 0, 'all channels paused')
      latest = await latestReleases('dev')
      t.equal(Object.keys(latest).length, 0, 'no latest releases')
      options = common.standardOptions()
      options.url = "http://localhost:9000/api/1/control/releases/resume",
      options.method = 'PUT'
      r(options, async function (err, results, body) {
        t.equal(results.statusCode, 200, 'resume returned 200')
        t.equal(body, 'ok', 'resume returned ok in body')
        status = await currentStatus()
        t.equal(status.statuses.dev, 'active', 'status reset to active')
        latest = await latestReleases('dev')
        t.equal(Object.keys(latest).length, 1, 'latest releases available after resume')
        cb(err)
      })
    })
  }

  async function pauseSingleChannel (channel) {
    var response, body
    var options = common.standardOptions()
    options.url = "http://localhost:9000/api/1/control/releases/pause/" + channel,
    options.method = 'PUT'
    try {
      [response, body] = await pr(options)
      t.equal(response.statusCode, 200, 'pause channel returned 200')
      t.equal(body, 'ok', 'pause channel ok')
      return [response, body]
    } catch (err) {
      process.exit("error:" + err)
    }
  }

  async function resumeSingleChannel (channel) {
    var response, body
    var options = common.standardOptions()
    options.url = "http://localhost:9000/api/1/control/releases/resume/" + channel,
    options.method = 'PUT'
    try {
      [response, body] = await pr(options)
      t.equal(response.statusCode, 200, 'resume channel returned 200')
      t.equal(body, 'ok', 'resume channel ok')
      return [response, body]
    } catch (err) {
      process.exit("error:" + err)
    }
  }

  async function pauseResumeChannel (cb) {
    var response, body
    var latest = await latestReleases('dev')
    t.ok(Object.keys(latest).length > 0, 'latest releases available')
    var status = await currentStatus()
    t.equal(status.statuses.dev, 'active', 'active status for single channel')

    [response, body] = await pauseSingleChannel('dev')
    status = await currentStatus()
    latest = await latestReleases('dev')
    t.ok(Object.keys(latest).length === 0, 'dev channel paused from latest')
    latest = await latestReleases('beta')
    t.ok(Object.keys(latest).length > 0, 'beta channel unaffected')
    t.equal(status.statuses.dev, 'paused', 'paused status for single channel')

    [response, body] = await resumeSingleChannel('dev')
    status = await currentStatus()
    latest = await latestReleases('dev')
    t.ok(Object.keys(latest).length > 0, 'dev channel resumed from latest')
    t.equal(status.statuses.dev, 'active', 'active status for single channel')

    cb(null)
  }

  var standardExtension = {
    id: 'abcd',
    version: '1.0.0.0',
    hash: 'a1b2',
    name: 'Test extension'
  }

  function addInitialExtension (cb) {
    var options = common.standardOptions()
    options.url = common.standardURL() + '/api/1/extensions/stable'
    options.method = 'PUT'
    options.json = true
    options.body = standardExtension
    r(options, function (err, response, body) {
      t.ok(response.statusCode === 200, '200 returned')
      cb(err)
    })
  }

  function checkExtension (cb) {
    var xml = `<?xml version="1.0" encoding="UTF-8"?>
      <request protocol="3.0" version="chrome-55.0.2883.87" prodversion="55.0.2883.87" requestid="{b4f77b70-af29-462b-a637-8a3e4be5ecd9}" lang="" updaterchannel="stable" prodchannel="stable" os="mac" arch="x64" nacl_arch="x86-64">
        <hw physmemory="16"/>
        <os platform="Mac OS X" version="10.11.6" arch="x86_64"/>
        <app appid="abcd" version="0.0.0.0" installsource="ondemand">
          <updatecheck />
          <ping rd="-2" ping_freshness="" />
        </app>
      </request>`
    r.post({
      url: common.standardURL() + '/extensions',
      body: xml,
      headers: {
        'Content-Type': 'application/xml'
      }
    }, 
      function (err, results, body) {
        if (err) console.log(err)
        const doc = new xmldoc.XmlDocument(body)
        var appid = doc.descendantWithPath('app').attr.appid
        var version = doc.descendantWithPath('app.updatecheck.manifest').attr.version
        t.equal(appid, standardExtension.id, 'id matches')
        t.equal(version, standardExtension.version, 'version matches')
        cb(err)
      }
    )
  }

  function updateInitialExtension (cb) {
    var options = common.standardOptions()
    options.url = common.standardURL() + '/api/1/extensions/stable'
    options.method = 'PUT'
    options.json = true
    standardExtension.name = 'new name'
    options.body = standardExtension
    r(options, function (err, response, body) {
      t.ok(response.statusCode === 200, '200 returned')
      t.equal(body.name, 'new name', 'extension updated with same version')
      cb(err)
    })
  }

  function updateInitialExtensionWithLowerVersion (cb) {
    var options = common.standardOptions()
    options.url = common.standardURL() + '/api/1/extensions/stable'
    options.method = 'PUT'
    options.json = true
    options.body = _.clone(standardExtension)
    options.body.version = '0.9.9.9'
    r(options, function (err, response, body) {
      t.equal(response.statusCode, 400, '400 returned')
      t.equal(body.message, 'Version is less than current', 'rejected because version is less than current')
      cb(err)
    })
  }

  function insertExtensionWithInvalidData (cb) {
    var options = common.standardOptions()
    options.url = common.standardURL() + '/api/1/extensions/stable'
    options.method = 'PUT'
    options.json = true
    options.body = _.clone(standardExtension)
    options.body.hash = '@#$!'
    r(options, function (err, response, body) {
      t.equal(response.statusCode, 400, '400 returned')
      cb(err)
    })
  }

  async.series([
    insertFirstRelease,
    insertNewChannelRelease,
    refresh,
    readFirstRelease,
    insertPreviewRelease,
    refresh,
    readSecondRelease,
    checkForUpdateNoPreview,
    checkForUpdatePreview,
    checkForNonExistentRelease,
    promotePreviewWithNotes,
    refresh,
    checkForUpdatePostPromoteWithNotes,
    insertWinx64Release,
    refresh,
    checkReleasesForChannel,
    checkLatestReleasesForChannel,
    revertWinx64Release,
    pauseResume,
    refresh,
    pauseResumeChannel,
    addInitialExtension,
    refresh,
    checkExtension,
    updateInitialExtension,
    refresh,
    updateInitialExtensionWithLowerVersion,
    insertExtensionWithInvalidData
  ], function (err) {
    t.end()
  })
})
