/*
  Verification checks for updater configuration and file location / status
*/

var assert = require('assert')
var fs = require('fs')
var glob = require('glob')
var path = require('path')
var request = require('request')
var url = require('url')

// The warn flag will continue checking for files and not throw an error for the first verification error
var args = require('yargs')
    .demand(['channel'])
    .default('warn', false)
    .argv

var channelData = require('../dist/common').channelData

if (!channelData[args.channel]) {
  throw new Error('Invalid channel ' + args.channel)
}

// Verify (via HEAD call) that a file exists at a url, throw if not
var verifyUrl = (url, msg) => {
  request.head(url, (err, response, body) => {
    assert.equal(err, null)
    if (response.statusCode === 200) {
      console.log('  OK ... ' + url)
    } else {
      console.log('HTTP Status code: ' + response.statusCode, 'url: ', url)
      if (args.warn) {
        console.log('  FAILED ... ' + msg + ' : ' + url)
      } else {
        throw new Error(msg + ' : ' + url)
      }
    }
  })
}

process.stdout.write('[1] Verifying data files have identical most current version numbers ... ')

// Read data files
var files = glob.sync(path.join(__dirname, '..', 'data', args.channel, '*'))
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
    // osx
    if (json[0].url.match(/osx/)) {
      var parsed = url.parse(json[0].url)
      var urlPath = parsed.path.split('/')
      urlPath = urlPath.slice(0, urlPath.length - 1).join('/')
      verifyUrl(parsed.protocol + '//' + parsed.hostname + urlPath + '/Brave-' + json[0].version + '.dmg', 'Brave dmg not found')
    }
  }
})

// Set allowing override for testing
var BASE_URL = process.env.BASE_URL || 'https://brave-download.global.ssl.fastly.net/multi-channel/releases'
var BASE_LEGACY_URL = process.env.BASE_LEGACY_URL || 'https://brave-download.global.ssl.fastly.net/releases'

// Verify Windows x64 files
var winx64_url = BASE_URL + '/' + args.channel + '/' + 'winx64'
request.get(winx64_url + '/RELEASES', (err, response, body) => {
  assert.equal(err, null)
  console.log(body)
  if (response.statusCode === 200) {
    console.log('  OK ... ' + winx64_url + '/RELEASES')
    var filename = body.split(' ')[1]
    verifyUrl(winx64_url + '/' + filename, 'Windows update file ' + filename + ' is not available at ' + winx64_url + '/' + filename)
  } else {
    throw new Error(winx64_url + ' could not be found')
  }
})
verifyUrl(winx64_url + '/BraveSetup-x64.exe', 'BraveSetup-x64.exe not found')

// Verify Windows ia32 files
var winia32_url = BASE_URL + '/' + args.channel + '/' + 'winia32'
request.get(winia32_url + '/RELEASES', (err, response, body) => {
  assert.equal(err, null)
  console.log(body)
  if (response.statusCode === 200) {
    console.log('  OK ... ' + winia32_url + '/RELEASES')
    var filename = body.split(' ')[1]
    verifyUrl(winia32_url + '/' + filename, 'Windows update file ' + filename + ' is not available at ' + winia32_url + '/' + filename)
  } else {
    throw new Error(winia32_url + ' could not be found')
  }
})
verifyUrl(winia32_url + '/BraveSetup-ia32.exe', 'BraveSetup-ia32.exe not found')

// Verify Legacy Windows files
var winx64_url = BASE_LEGACY_URL + '/' + 'winx64'
request.get(winx64_url + '/RELEASES', (err, response, body) => {
  assert.equal(err, null)
  console.log(body)
  if (response.statusCode === 200) {
    console.log('  OK ... ' + winx64_url + '/RELEASES')
    var filename = body.split(' ')[1]
    verifyUrl(winx64_url + '/' + filename, 'Windows update file ' + filename + ' is not available at ' + winx64_url + '/' + filename)
  } else {
    throw new Error(winx64_url + ' could not be found')
  }
})

// Verify the versioned Windows x64 files
var version = versions[0]
var winx64_version_url = BASE_URL + '/' + args.channel + '/' + version + '/winx64/'
verifyUrl(winx64_version_url + 'BraveSetup-x64.exe', 'Versioned BraveSetup-x64.exe not found for winx64 version ' + version)

// Verify the versioned Windows ia32 files
var version = versions[0]
var winia32_version_url = BASE_URL + '/' + args.channel + '/' + version + '/winia32/'
verifyUrl(winia32_version_url + 'BraveSetup-ia32.exe', 'Versioned BraveSetup-ia32.exe not found for ia32 version ' + version)

// Verify the versioned Linux files
var version = versions[0]
var linux64_version_url = BASE_URL + '/' + args.channel + '/' + version
verifyUrl(linux64_version_url + '/debian64/brave_' + version + '_amd64.deb', 'debian file not found for version ' + version)
verifyUrl(linux64_version_url + '/fedora64/brave-' + version + '.x86_64.rpm', 'fedora file not found for version ' + version)
