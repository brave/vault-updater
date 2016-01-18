/*
  Verification checks for updater configuration and file location / status
*/

var assert = require('assert')
var fs = require('fs')
var glob = require('glob')
var path = require('path')
var request = require('request')
var url = require('url')

// Verify (via HEAD call) that a file exists at a url, throw if not
var verifyUrl = (url, msg) => {
  request.head(url, (err, response, body) => {
    assert.equal(err, null)
    if (response.statusCode === 200) {
      console.log('  OK ... ' + url)
    } else {
      throw new Error(msg)
    }
  })
}

process.stdout.write('[1] Verifying data files have identical most current version numbers ... ')

// Read data files
var files = glob.sync(path.join(__dirname, '..', 'data', '*'))
var contents = files.map((filename) => {
  return JSON.parse(fs.readFileSync(filename, 'utf-8'))
})

// Are the last version numbers identical?
var versions = {}
contents.forEach((json) => {
  versions[json[0].version] = true
})

versions = Object.keys(versions)
if (versions.length !== 1) {
  throw new Error(`Multiple most recent versions ${versions}`)
}
console.log('OK')

// Verify files from json url
console.log('[2] Verifying file location and status')
contents.forEach((json) => {
  if (json[0].url && json[0].version) {
    verifyUrl(json[0].url, json[0].url + ' could not be found')
    var parsed = url.parse(json[0].url)
    var urlPath = parsed.path.split('/')
    urlPath = urlPath.slice(0, urlPath.length - 1).join('/')
    verifyUrl(parsed.protocol + '//' + parsed.hostname + urlPath + '/Brave.dmg', 'Brave.dmg not found')
  }
})

// Verify Windows files
var winx64_url = 'https://brave-download.global.ssl.fastly.net/releases/winx64'
request.get(winx64_url + '/RELEASES', (err, response, body) => {
  assert.equal(err, null)
  if (response.statusCode === 200) {
    console.log('  OK ... ' + winx64_url + '/RELEASES')
    var filename = body.split(' ')[1]
    verifyUrl(winx64_url + '/' + filename, 'Windows update file ' + filename + ' is not available at ' + winx64_url + '/' + filename)
  } else {
    throw new Error(winx64_url + ' could not be found')
  }
})
verifyUrl(winx64_url + '/BraveSetup.exe', 'BraveSetup.exe not found')
