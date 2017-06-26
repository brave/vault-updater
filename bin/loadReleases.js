#!/usr/bin/env node

var assert = require('assert')
var fs = require('fs')
var path = require('path')
var pgc = require('../src/pgc')
var _ = require('underscore')
var async = require('async')

var args = require('yargs')
    .usage('Load release file info into Postgres\n\nnode $0 --platform=[platform] --channel=[channel] data_dir=./data --overwrite')
    .demand(['channel', 'platform'])
    .default('overwrite', false)
    .default('data_dir', './data')
    .argv

// Connect to testing database if in the test environment
if (process.env.NODE_ENV === 'test') {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
}

var platformFilename = args.platform + '.json'
if (args.platform === 'linux') {
  platformFilename = args.platform + '64.json'
}

var releaseContents = JSON.parse(fs.readFileSync(path.join(args.data_dir, args.channel, platformFilename), 'utf-8'))
console.log(releaseContents.length + ' releases')
assert(releaseContents.length > 0)

var releaseInserter = function (client, release) {
  return function (cb) {
    var params = [
      args.channel,
      args.platform,
      release.version,
      release.name,
      release.pub_date,
      release.notes,
      !!release.preview,
      release.url
    ]
    var sql = 'INSERT INTO releases (channel, platform, version, name, pub_date, notes, preview, url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)'
    client.query(sql, params, cb)
  }
}

pgc.setup(function (err, pg) {
  assert(err === null, err ? err.toString() : null)
  var funcs = _.map(releaseContents, function (release) {
    return releaseInserter(pg, release)
  })
  // Insert rows
  async.series(funcs, function (err, results) {
    assert(err === null, err ? err.toString() : null)
    console.log('Done')
    pg.end()
  })
})
