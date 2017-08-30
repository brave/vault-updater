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

tap.test("Integration", async function (ot) {
  // utility functions
  async function pr (options) {
    return new Promise((resolve, reject) => {
      r(options, (err, response, body) => {
        if (err) {
          reject(err)
        } else {
          resolve(response)
        }
      })
    })
  }

  // simple GET to URL (Promised)
  async function prg (url) {
    return new Promise((resolve, reject) => {
      r.get(url, (err, response, body) => {
        if (response.body) {
          response.body = JSON.parse(body)
        }
        if (err) {
          reject(err)
        } else {
          resolve(response)
        }
      })
    })
  }

  async function refresh () {
    await pr(common.refreshOptions())
  }

  async function auditHistory () {
    var options = common.standardOptions()
    options.url = common.standardURL() + '/api/1/control/releases/audit_history'
    var response = await pr(options)
    return response.body
  }

  // tests start here
  ot.test("Insert first release", async function (t) {
    var results = await pr(options)
    t.equal(results.statusCode, 200, "200 returned")
    t.equal(results.body.version, '0.5.0', "object returned")
    var audit = await auditHistory()
    t.equal(audit.length, 1, 'single entry in audit history')
    t.equal(audit[0].operation, 'insert', 'audit operation is insert')
    t.equal(audit[0].type, 'release', 'audit type is release')
    t.equal(audit[0].data.channel, 'dev', 'audit channel is dev')
    t.end()
  })

  ot.test("Insert new channel release", async function (t) {
    var options = common.standardOptions()
    options.url = options.url + '/beta/winia32'
    options.method = "POST"
    options.body = {
      notes: "notes",
      version: "0.4.0",
      url: "http://localhost/",
      preview: false
    }
    var response = await pr(options)
    t.equal(response.statusCode, 200, "200 returned")
    t.equal(response.body.version, '0.4.0', "beta/winia32 object returned")
    var audit = await auditHistory()
    t.equal(audit[0].operation, 'insert', 'audit operation is insert')
    t.equal(audit[0].type, 'release', 'audit type is release')
    t.equal(audit[0].data.channel, 'beta', 'audit channel is beta')
    t.equal(audit[0].data.preview, false, 'audit preview is false')
    t.end()
  })

  ot.test("Read first release", async (t) => {
    options = common.standardOptions()
    options.url = options.url + '/dev/osx'
    await refresh()
    var response = await pr(options)
    t.equal(response.statusCode, 200, "200 returned")
    t.equal(response.body.length, 1, "One release returned")
    t.end()
  })

  ot.test("Insert preview release", async (t) => {
    var options = common.standardOptions()
    options.url = options.url + '/dev/osx'
    options.method = "POST"
    options.body = {
      notes: "notes",
      version: "0.6.0",
      url: "http://localhost/",
      preview: true
    }
    var response = await pr(options)
    t.equal(response.statusCode, 200, "200 returned")
    var audit = await auditHistory()
    t.equal(audit[0].operation, 'insert', 'audit operation is insert')
    t.equal(audit[0].type, 'release', 'audit type is release')
    t.equal(audit[0].data.platform, 'osx', 'audit platform is osx')
    t.equal(audit[0].data.preview, true, 'audit preview is true')
    t.end()
  })

  ot.test("Read second release", async (t) => {
    options = common.standardOptions()
    options.url = options.url + '/dev/osx'
    await refresh()
    var response = await pr(options)
    t.equal(response.statusCode, 200, "200 returned")
    t.equal(response.body.length, 2, "Two releases returned")
    t.end()
  })

  ot.test("Check for update without preview", async (t) => {
    options = common.standardOptions()
    options.url = 'http://localhost:9000/1/releases/dev/0.1.0/osx'
    var response = await pr(options)
    t.equal(response.body.version, '0.5.0', 'Live release returned')
    t.end()
  })

  ot.test("Check for update with preview", async (t) => {
    options = common.standardOptions()
    options.url = 'http://localhost:9000/1/releases/dev/0.1.0/osx?accept_preview=true'
    var response = await pr(options)
    t.equal(response.body.version, '0.6.0', 'Preview release returned')
    t.end()
  })

  ot.test("Check for non-existent release", async (t) => {
    options = common.standardOptions()
    options.url = 'http://localhost:9000/1/releases/dev/0.7.0/osx'
    var response = await pr(options)
    t.equal(response.statusCode, 204, "204 returned")
    t.ok(response.body === undefined, "No release found")
    t.end()
  })

  ot.test("Promote preview with notes", async (t) => {
    var options = common.standardOptions()
    options.url = common.standardURL() + '/api/1/control/releases/promote/dev/0.6.0'
    options.method = "PUT"
    options.body = {
      notes: "foo the bar"
    }
    var response = await pr(options)
    t.equal(response.statusCode, 200, "200 returned")
    t.equal(response.body.length, 1, "One release returned")
    t.equal(response.body[0].preview, false, "returned release is promoted")
    var audit = await auditHistory()
    t.equal(audit[0].operation, 'promote', 'audit operation is promote')
    t.equal(audit[0].type, 'release', 'audit type is release')
    t.equal(audit[0].data.notes, 'foo the bar', 'notes modified')
    t.end()
  })

  ot.test("Check for update post promote with notes", async (t) => {
    options = common.standardOptions()
    options.url = 'http://localhost:9000/1/releases/dev/0.1.0/osx'
    await refresh()
    var response = await pr(options)
    t.equal(response.statusCode, 200, "200 returned")
    t.ok(response.body.notes.match(/foo the bar/), 'promoted notes returned')
    t.end()
  })

  ot.test("Insert winx64 release", async (t) => {
    var options = common.standardOptions()
    options.url = options.url + '/dev/winx64'
    options.method = "POST"
    options.body = {
      notes: "notes",
      version: "0.6.0",
      url: "http://localhost/",
      preview: false
    }
    var response = await pr(options)
    t.equal(response.statusCode, 200, "200 returned")
    t.equal(response.body.version, '0.6.0', "dev/winx64 object returned")
    t.end()
  })

  ot.test("Check releases for channel", async (t) => {
    options = common.standardOptions()
    options.url = options.url + '/dev'
    await refresh()
    var response = await pr(options)
    var body = response.body
    t.equal(response.statusCode, 200, "200 returned")
    t.ok(_.isArray(body.osx), 'osx found')
    t.equal(body.osx.length, 2, 'two osx releases found')
    t.ok(_.isArray(body.winx64), 'winx64 found')
    t.equal(body.winx64.length, 1, 'one winx64 release found')
    t.end()
  })

  ot.test("Check latest releases for channel", async (t) => {
    options = common.standardOptions()
    options.url = options.url + '/dev/latest'
    await refresh()
    var response = await pr(options)
    var body = response.body
    t.equal(response.statusCode, 200, "200 returned")
    t.ok(_.isObject(body.osx), 'osx found')
    t.equal(body.osx.version, '0.6.0', 'correct version found')
    t.ok(_.isObject(body.winx64), 'winx64 found')
    t.equal(body.winx64.version, '0.6.0', 'correct version found')
    t.end()
  })

  ot.test("Revert winx64 release", async (t) => {
    var options, response, opts
    options = common.standardOptions()
    options.url = common.standardURL() + '/api/1/control/releases/dev/winx64/0.5.12'
    options.method = "DELETE"
    response = await pr(options)
    t.equal(response.statusCode, 400, "revert not found - 400 returned")
    opts = common.standardOptions()
    opts.url = common.standardURL() + '/api/1/control/releases/dev/winx64/0.6.0'
    opts.method = "DELETE"
    response = await pr(opts)
    t.equal(response.statusCode, 200, "revert - 200 returned")
    await refresh()
    options = common.standardOptions()
    options.url = options.url + '/dev/latest'
    response = await pr(options)
    t.equal(response.statusCode, 200, "200 returned")
    t.ok(response.body.winx64 == null, 'winx64 version removed')
    var audit = await auditHistory()
    t.equal(audit[0].operation, 'revert', 'audit operation is revert')
    t.equal(audit[0].type, 'release', 'audit type is release')
    t.end()
  })

  async function latestReleasesForChannel (channel) {
    var options = common.standardOptions()
    options.url += '/' + channel + '/latest'
    options.method = 'GET'
    var response = await pr(options)
    return response.body
  }

  async function currentStatus () {
    var options = common.standardOptions()
    options.url = "http://localhost:9000/api/1/control/status"
    options.method = 'GET'
    var response = await pr(options)
    return response.body
  }

  ot.test("Global pause / resume", async (t) => {
    await refresh()
    var latest = await latestReleasesForChannel('dev')
    t.ok(Object.keys(latest).length > 0, 'latest releases available')
    var status = await currentStatus()
    t.equal(status.statuses.dev, 'active', 'active status')
    var options = common.standardOptions()
    options.url = "http://localhost:9000/api/1/control/releases/pause",
    options.method = 'PUT'
    var response = await pr(options)
    t.equal(response.statusCode, 200, 'pause returned 200')
    t.equal(response.body, 'ok', 'pause returned ok in body')
    status = await currentStatus()
    t.equal(status.statuses.dev, 'paused', 'paused status')
    t.equal(Object.keys(status.statuses).filter((channel) => { return status.statuses[channel] === 'active' }).length, 0, 'all channels paused')
    latest = await latestReleasesForChannel('dev')
    t.equal(Object.keys(latest).length, 0, 'no latest releases')
    options = common.standardOptions()
    options.url = "http://localhost:9000/api/1/control/releases/resume",
    options.method = 'PUT'
    response = await pr(options)
    t.equal(response.statusCode, 200, 'resume returned 200')
    t.equal(response.body, 'ok', 'resume returned ok in body')
    status = await currentStatus()
    t.equal(status.statuses.dev, 'active', 'status reset to active')
    latest = await latestReleasesForChannel('dev')
    t.equal(Object.keys(latest).length, 1, 'latest releases available after resume')
    t.end()
  })

  async function pauseSingleChannel (channel, t) {
    var response, body
    var options = common.standardOptions()
    options.url = "http://localhost:9000/api/1/control/releases/pause/" + channel,
    options.method = 'PUT'
    try {
      response = await pr(options)
      t.equal(response.statusCode, 200, 'pause channel returned 200')
      t.equal(response.body.status, 'paused', 'pause channel ok')
      var audit = await auditHistory()
      t.equal(audit[0].operation, 'pause', 'audit operation is pause')
      t.equal(audit[0].type, 'channel_pause', 'audit type channel_pause')
      t.equal(audit[0].data.channel, channel, 'correct channel paused')
      return response.body
    } catch (err) {
      console.log(err)
      process.exit("error:" + err)
    }
  }

  async function resumeSingleChannel (channel, t) {
    var response, body
    var options = common.standardOptions()
    options.url = "http://localhost:9000/api/1/control/releases/resume/" + channel,
    options.method = 'PUT'
    try {
      response = await pr(options)
      t.equal(response.statusCode, 200, 'resume channel returned 200')
      t.equal(response.body.status, 'active', 'resume channel ok')
      var audit = await auditHistory()
      t.equal(audit[0].operation, 'resume', 'audit operation is resume')
      t.equal(audit[0].type, 'channel_pause', 'audit type channel_pause')
      t.equal(audit[0].data.channel, channel, 'correct channel resumed')
      return response.body
    } catch (err) {
      console.log(err)
      process.exit("error:" + err)
    }
  }

  ot.test("Pause / resume single channel", async (t) => {
    var response, body
    var latest = await latestReleasesForChannel('dev')
    t.ok(Object.keys(latest).length > 0, 'latest releases available')
    var status = await currentStatus()
    t.equal(status.statuses.dev, 'active', 'active status for single channel')
    response = await pauseSingleChannel('dev', t)
    status = await currentStatus()
    latest = await latestReleasesForChannel('dev')
    t.ok(Object.keys(latest).length === 0, 'dev channel paused from latest')
    latest = await latestReleasesForChannel('beta')
    t.ok(Object.keys(latest).length > 0, 'beta channel unaffected')
    t.equal(status.statuses.dev, 'paused', 'paused status for single channel')
    response = await resumeSingleChannel('dev', t)
    status = await currentStatus()
    latest = await latestReleasesForChannel('dev')
    t.ok(Object.keys(latest).length > 0, 'dev channel resumed from latest')
    t.equal(status.statuses.dev, 'active', 'active status for single channel')
    t.end()
  })

  var standardExtension = {
    id: 'abcd',
    version: '1.0.0.0',
    hash: 'a1b2',
    name: 'Test extension'
  }

  ot.test("Add initial extension", async (t) => {
    var options = common.standardOptions()
    options.url = common.standardURL() + '/api/1/extensions/stable'
    options.method = 'PUT'
    options.json = true
    options.body = standardExtension
    var response = await pr(options)
    t.ok(response.statusCode === 200, '200 returned')
    t.equal(response.body.id, 'abcd', 'Extension returned in body')
    t.end()
  })

  ot.test("Check extension", async (t) => {
    var xml = `<?xml version="1.0" encoding="UTF-8"?>
      <request protocol="3.0" version="chrome-55.0.2883.87" prodversion="55.0.2883.87" requestid="{b4f77b70-af29-462b-a637-8a3e4be5ecd9}" lang="" updaterchannel="stable" prodchannel="stable" os="mac" arch="x64" nacl_arch="x86-64">
        <hw physmemory="16"/>
        <os platform="Mac OS X" version="10.11.6" arch="x86_64"/>
        <app appid="abcd" version="0.0.0.0" installsource="ondemand">
          <updatecheck />
          <ping rd="-2" ping_freshness="" />
        </app>
      </request>`
    await refresh()
    var response = await pr({
      method: 'POST',
      url: common.standardURL() + '/extensions',
      body: xml,
      headers: {
        'Content-Type': 'application/xml'
      }
    })
    var body = response.body
    const doc = new xmldoc.XmlDocument(body)
    var appid = doc.descendantWithPath('app').attr.appid
    var version = doc.descendantWithPath('app.updatecheck.manifest').attr.version
    t.equal(appid, standardExtension.id, 'id matches')
    t.equal(version, standardExtension.version, 'version matches')
    t.end()
  })

  ot.test("Update initial extension", async (t) => {
    var options = common.standardOptions()
    options.url = common.standardURL() + '/api/1/extensions/stable'
    options.method = 'PUT'
    options.json = true
    standardExtension.name = 'new name'
    options.body = standardExtension
    var response = await pr(options)
    t.ok(response.statusCode === 200, '200 returned')
    t.equal(response.body.name, 'new name', 'extension updated with same version')
    t.end()
  })

  ot.test("Update initial extension with lower version number", async (t) => {
    var options = common.standardOptions()
    options.url = common.standardURL() + '/api/1/extensions/stable'
    options.method = 'PUT'
    options.json = true
    options.body = _.clone(standardExtension)
    options.body.version = '0.9.9.9'
    var response = await pr(options)
    t.equal(response.statusCode, 400, '400 returned')
    t.equal(response.body.message, 'Version is less than current', 'rejected because version is less than current')
    t.end()
  })

  ot.test("Insert extension with invalid data", async (t) => {
    var options = common.standardOptions()
    options.url = common.standardURL() + '/api/1/extensions/stable'
    options.method = 'PUT'
    options.json = true
    options.body = _.clone(standardExtension)
    options.body.hash = '@#$!'
    var response = await pr(options)
    t.equal(response.statusCode, 400, '400 returned')
    t.end()
  })

  ot.test("Install a nightly release", async (t) => {
    var options = common.standardOptions()
    options.url = options.url + '/nightly/osx'
    options.method = "POST"
    options.body = {
      notes: "notes",
      version: "0.6.0",
      url: "http://localhost/",
      preview: false
    }
    var response = await pr(options)
    t.equal(response.statusCode, 200, "200 returned")
    t.equal(response.body.channel, 'nightly', 'nightly channel embedded in returned structure')
    t.end()
  })

  ot.test("Install a nightly / winx64 release", async (t) => {
    var options = common.standardOptions()
    options.url = options.url + '/nightly/winx64'
    options.method = "POST"
    options.body = {
      notes: "notes",
      version: "0.6.0",
      url: "http://localhost/",
      preview: false
    }
    var response = await pr(options)
    t.equal(response.statusCode, 200, "200 returned")
    t.equal(response.body.channel, 'nightly', 'nightly channel embedded in returned structure')
    t.end()
  })

  ot.test("Retrieve channel / platform history", async (t) => {
    var response
    await refresh()
    var options = common.standardOptions()
    options.url = common.standardURL() + '/api/1/control/releases/history/dev/osx'
    var response = await pr(options)
    t.equal(response.statusCode, 200, '200 returned')
    t.equal(response.body.length, 2, '2 releases returned')
    t.end()
  })

  ot.test("Pause a platform on a channel", async (t) => {
    var response
    await refresh()
    response = await prg(common.standardURL() + '/1/releases/dev/0.4.0/osx')
    t.equal(response.body.version, '0.6.0', "dev/osx release returned")
    response = await prg(common.standardURL() + '/1/releases/nightly/0.4.0/osx')
    t.equal(response.body.version, '0.6.0', "nightly/osx release returned")
    response = await prg(common.standardURL() + '/1/releases/nightly/0.4.0/winx64')
    t.equal(response.body.version, '0.6.0', "nightly/winx64 release returned")

    let options = common.standardOptions()
    options.url = common.standardURL() + '/api/1/control/releases/channel_platform_pauses'
    options.method = 'GET'
    var response = await pr(options)
    t.equal(response.body.length, 0, "initally no channel platform pauses defined")

    // install a channel pause
    options = common.standardOptions()
    options.url = common.standardURL() + '/api/1/control/releases/pause/dev/osx'
    options.method = 'PUT'
    response = await pr(options)
    t.same(response.body, { channel: 'dev', platform: 'osx' }, 'expected response')
    var audit = await auditHistory()
    t.equal(audit[0].operation, 'pause', 'audit operation is pause')
    t.equal(audit[0].type, 'channel_platform_pause', 'audit type channel_platform_pause')
    t.equal(audit[0].data.channel, 'dev', 'correct channel paused')
    t.equal(audit[0].data.platform, 'osx', 'correct platform paused')

    options = common.standardOptions()
    options.url = common.standardURL() + '/api/1/control/releases/channel_platform_pauses'
    options.method = 'GET'
    response = await pr(options)
    t.equal(response.body.length, 1, "one channel platform pause defined")
    t.same(response.body, [ { channel: 'dev', platform: 'osx' } ], "body format is correct")

    await refresh()
    response = await prg(common.standardURL() + '/1/releases/dev/0.4.0/osx')
    t.equal(response.statusCode, 204, "dev/osx release NOT returned - 204 status code - paused!")
    response = await prg(common.standardURL() + '/1/releases/nightly/0.4.0/osx')
    t.equal(response.body.version, '0.6.0', "nightly/osx release returned")
    response = await prg(common.standardURL() + '/1/releases/nightly/0.4.0/winx64')
    t.equal(response.body.version, '0.6.0', "nightly/winx64 release returned")

    // remove a channel pause
    options = common.standardOptions()
    options.url = common.standardURL() + '/api/1/control/releases/resume/dev/osx'
    options.method = 'PUT'
    response = await pr(options)
    t.same(response.body, {}, 'expected response')
    var audit = await auditHistory()
    t.equal(audit[0].operation, 'resume', 'audit operation is resume')
    t.equal(audit[0].type, 'channel_platform_pause', 'audit type channel_platform_pause')
    t.equal(audit[0].data.channel, 'dev', 'correct channel paused')
    t.equal(audit[0].data.platform, 'osx', 'correct platform paused')

    options = common.standardOptions()
    options.url = common.standardURL() + '/api/1/control/releases/channel_platform_pauses'
    options.method = 'GET'
    response = await pr(options)
    t.equal(response.body.length, 0, "zero channel platform pause defined")

    await refresh()
    response = await prg(common.standardURL() + '/1/releases/dev/0.4.0/osx')
    t.equal(response.body.version, '0.6.0', "dev/osx release returned")
    response = await prg(common.standardURL() + '/1/releases/nightly/0.4.0/osx')
    t.equal(response.body.version, '0.6.0', "nightly/osx release returned")
    response = await prg(common.standardURL() + '/1/releases/nightly/0.4.0/winx64')
    t.equal(response.body.version, '0.6.0', "nightly/winx64 release returned")

    t.end()
  })

  ot.test("Revert all releases on a channel for a version", async (t) => {
    response = await prg(common.standardURL() + '/1/releases/nightly/0.4.0/osx')
    t.equal(response.body.version, '0.6.0', "nightly/osx release returned")
    response = await prg(common.standardURL() + '/1/releases/nightly/0.4.0/winx64')
    t.equal(response.body.version, '0.6.0', "nightly/winx64 release returned")

    var options = common.standardOptions()
    options.url = common.standardURL() + '/api/1/control/releases/nightly/0.6.0'
    options.method = 'DELETE'

    var response = await pr(options)
    t.equal(response.body, 'ok', 'revert returned ok')
    var audit = await auditHistory()
    t.equal(audit[0].operation, 'revert', 'audit operation is revert')
    t.equal(audit[0].type, 'release', 'audit type releases')
    t.equal(audit[1].operation, 'revert', 'audit operation is revert')
    t.equal(audit[1].type, 'release', 'audit type releases')

    await refresh()
    response = await prg(common.standardURL() + '/1/releases/nightly/0.4.0/osx')
    t.equal(response.statusCode, 204, "nightly/osx release not returned")
    response = await prg(common.standardURL() + '/1/releases/nightly/0.4.0/winx64')
    t.equal(response.statusCode, 204, "nightly/winx64 release not returned")
    t.end()
  })

  ot.end()
})
