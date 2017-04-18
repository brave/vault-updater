var tap = require('tap')
var rewire = require('rewire')
var common = require('../dist/common')
var releasesController = rewire('../dist/controllers/releases')

var releases = {
  'dev:osx': [
    {
      "version": "0.14.2",
      "name": "Brave 0.14.2",
      "pub_date": "2017-04-14T01:41:38.779Z",
      "notes": "magic notes",
      "preview": true,
      "url": "https://brave-download.global.ssl.fastly.net/multi-channel/releases/dev/0.14.2/osx/Brave-0.14.2.zip"
    },
    {
      "version": "0.14.1",
      "name": "Brave 0.14.1",
      "pub_date": "2017-04-01T06:00:15.036Z",
      "notes": "Fixed a copy and paste issue, fixed the lion badge position, and improved security. More details: https://github.com/brave/browser-laptop/releases/tag/v0.14.1dev",
      "url": "https://brave-download.global.ssl.fastly.net/multi-channel/releases/dev/0.14.1/osx/Brave-0.14.1.zip"
    }
  ]
}

tap.test('no preview', function (t) {
  var comparableVer
  var rel = releasesController.potentialReleases(
    releases,
    'dev',
    'osx',
    '0.14.0',
    'false'
  )
  t.equal(rel.length, 1, 'one potential releases accepted')
  t.equal(rel[0].version, '0.14.1', 'correct potential release accepted')
  t.end()
})

tap.test('preview', function (t) {
  var comparableVer
  var rel = releasesController.potentialReleases(
    releases,
    'dev',
    'osx',
    '0.14.0',
    'true'
  )
  t.equal(rel.length, 2, 'two potential releases accepted')
  t.equal(rel[0].version, '0.14.2', 'correct potential release accepted')
  t.end()
})
