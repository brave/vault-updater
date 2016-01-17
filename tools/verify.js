/*
  Verification checks for updater configuration
*/

var fs = require('fs')
var glob = require('glob')
var path = require('path')
var request = require('request')

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
console.log('[2] Verifying urls')
contents.forEach(function(json) {
  if (json[0].url) {
    request.head(json[0].url, (err, response, body) => {
      if (response.statusCode === 200) {
        console.log('  OK ... ' + json[0].url)
      } else {
        throw new Error(json[0].url + ' could not be found')
      }
    })
  }
})

var winx64_url = 'https://brave-download.global.ssl.fastly.net/releases/winx64/RELEASES'
request.head(winx64_url, (err, response, body) => {
  if (response.statusCode === 200) {
    console.log('  OK ... ' + winx64_url)
  } else {
    throw new Error(winx64_url + ' could not be found')
  }
});
