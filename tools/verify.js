/*
  Verification checks for updater configuration
*/

var fs = require('fs')
var glob = require('glob')
var path = require('path')

process.stdout.write('[1] Verifying data files have identical most current version numbers ... ')

var files = glob.sync(path.join(__dirname, '..', 'data', '*'))
var contents = files.map(function(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf-8'))
})

var versions = {}
contents.forEach(function(json) {
  versions[json[0].version] = true
})

versions = Object.keys(versions)
if (versions.length !== 1) {
  throw new Error(`Multiple most recent versions ${versions}`)
}
console.log('OK')

// TODO - add verification check by downloading files listed in meta data etc...
