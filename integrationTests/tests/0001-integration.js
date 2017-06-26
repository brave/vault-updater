#!/usr/bin/env node

var r = require('request')
var config = require('../../config/config.test.js')
var common = require('../common')
var tap = require('tap')

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

  function promotePreview (cb) {
    var options = common.standardOptions()
    options.url = options.url + '/dev/0.6.0/promote'
    options.method = "PUT"
    r(options, function (err, results, body) {
      t.equal(results.statusCode, 200, "200 returned")
      t.equal(body, "ok", "ok returned")
      cb(err)
    })
  }

  function checkForUpdatePostPromote (cb) {
    options = common.standardOptions()
    options.url = 'http://localhost:9000/1/releases/dev/0.1.0/osx'
    r(options, function (err, results, body) {
      t.equal(results.statusCode, 200, "200 returned")
      t.equal(body.version, '0.6.0', 'promoted version returned')
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
    promotePreview,
    refresh,
    checkForUpdatePostPromote,
    insertWinx64Release,
    refresh,
    checkReleasesForChannel,
    checkLatestReleasesForChannel
  ], function (err) {
    t.end()
  })
})
