#!/usr/bin/env node

var assert = require('assert')
var fs = require('fs')
var path = require('path')
var pgc = require('../src/pgc')
var _ = require('underscore')
var async = require('async')

var args = require('yargs')
    .usage('Load release file info into Postgres\n\nnode $0  --channel=[channel] data_dir=./data')
    .demand(['channel'])
    .default('data_dir', './data')
    .argv

// Connect to testing database if in the test environment
if (process.env.NODE_ENV === 'test') {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
}

var extensionContents = JSON.parse(fs.readFileSync(path.join(args.data_dir, args.channel, 'extensions', 'extensionManifest.json'), 'utf-8'))
console.log(extensionContents.length + ' extensions')
assert(extensionContents.length > 0)

var extensionInserter = function (client, extension) {
  return function (cb) {
    var params = [
      args.channel,
      extension[0],
      extension[1],
      extension[2],
      extension[3]
    ]
    var sql = 'INSERT INTO extensions (channel, id, version, hash, name) VALUES ($1, $2, $3, $4, $5)'
    console.log(params)
    client.query(sql, params, cb)
  }
}

pgc.setup(function (err, pg) {
  assert(err === null, err ? err.toString() : null)
  var funcs = _.map(extensionContents, function (extension) {
    return extensionInserter(pg, extension)
  })
  // Insert rows
  async.series(funcs, function (err, results) {
    assert(err === null, err ? err.toString() : null)
    console.log('Done')
    pg.end()
  })
})
