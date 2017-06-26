#!/usr/bin/env node

var assert = require('assert')
var pgc = require('../src/pgc')
var _ = require('underscore')
var util = require('util')
var semver = require('semver')

var args = require('yargs')
    .usage('Export release file info from Postgres\n\nnode $0 --platform=[platform] --channel=[channel] --overwrite')
    .demand(['channel', 'platform'])
    .default('overwrite', false)
    .argv

pgc.setup(function (err, pg) {
  assert(err === null, err ? err.toString() : null)
  pg.query('SELECT * FROM releases WHERE channel = $1 AND platform = $2', [args.channel, args.platform], function (err, results) {
    assert(err === null, err ? err.toString() : null)
    var rows = _.map(results.rows, function (row) {
      return _.pick(row, ['version', 'name', 'pub_date', 'notes', 'preview', 'url'])
    }).sort(function (a, b) {
      return semver.compare(b.version, a.version)
    })
    console.log(util.inspect(rows, null, 2))
    pg.end()
  })
})
