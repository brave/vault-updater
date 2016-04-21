/*
  Update metadata for release
 */

var fs = require('fs')
var path = require('path')
var _ = require('underscore')
var util = require('util')

var channelData = require('../dist/common').channelData

var args = require('yargs')
    .usage('Update version files\n\nNote: Will not replace data files unless --overwrite flag set\n\nnode $0 --version=X.X.X --notes="release notes" --overwrite --channel=dev')
    .demand(['version', 'notes', 'channel'])
    .default('overwrite', false)
    .argv

// check the channel names
if (!channelData[args.channel]) {
  throw new Error('Invalid channel ' + args.channel)
}

if (!args.version.match(/^[0-9]+\.[0-9]+\.[0-9]+$/)) {
  throw "Invalid version format. Must be X.X.X"
}

const BASE_URL = process.env.BASE_URL || 'https://brave-download.global.ssl.fastly.net/multi-channel/releases'

const OSX_TEMPLATE = BASE_URL + '/CHANNEL/VERSION/osx/Brave-VERSION.zip'
const LINUX64_TEMPLATE = BASE_URL + '/CHANNEL/VERSION/linux64/Brave.tar.bz2'

var winx64_entry = {
  version: args.version,
  name: 'Brave ' + args.version,
  pub_date: (new Date()).toISOString(),
  notes: args.notes
}
var winia32_entry = _.clone(winx64_entry)

var osx_entry = _.clone(winx64_entry)
osx_entry.url = OSX_TEMPLATE
osx_entry.url = osx_entry.url.replace(/VERSION/g, args.version)
osx_entry.url = osx_entry.url.replace(/CHANNEL/g, args.channel)

var linux64_entry = _.clone(winx64_entry)
linux64_entry.url = LINUX64_TEMPLATE
linux64_entry.url = linux64_entry.url.replace(/VERSION/g, args.version)
linux64_entry.url = linux64_entry.url.replace(/CHANNEL/g, args.channel)

var winia32_json = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', args.channel, 'winia32.json')))
var winx64_json = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', args.channel, 'winx64.json')))
var osx_json = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', args.channel, 'osx.json')))
var linux64_json = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', args.channel, 'linux64.json')))

winia32_json.unshift(winia32_entry)
winx64_json.unshift(winx64_entry)
osx_json.unshift(osx_entry)
linux64_json.unshift(linux64_entry)

var inspectContents = function (label, last) {
  return '*** ' + label + ' *** \n' + util.inspect(last) + '\n'
}

console.log("Latest contents for channel " + args.channel)
console.log(inspectContents('winia32', winia32_json[0]))
console.log(inspectContents('winx64', winx64_json[0]))
console.log(inspectContents('osx', osx_json[0]))
console.log(inspectContents('linux64', linux64_json[0]))

if (args.overwrite) {
  console.log("Writing data files for channel " + args.channel)
  fs.writeFileSync(path.join(__dirname, '..', 'data', args.channel, 'winia32.json'), JSON.stringify(winia32_json, null, 2))
  fs.writeFileSync(path.join(__dirname, '..', 'data', args.channel, 'winx64.json'), JSON.stringify(winx64_json, null, 2))
  fs.writeFileSync(path.join(__dirname, '..', 'data', args.channel, 'osx.json'), JSON.stringify(osx_json, null, 2))
  fs.writeFileSync(path.join(__dirname, '..', 'data', args.channel, 'linux64.json'), JSON.stringify(linux64_json, null, 2))
}
  
console.log("Done")
