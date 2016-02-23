/*
  Update metadata for release
 */

var fs = require('fs')
var path = require('path')
var _ = require('underscore')

var channelData = require('../dist/common').channelData

var args = require('yargs')
    .usage('Update version files\n\nNote: Will not replace data files unless --overwrite flag set\n\nnode $0 --version=X.X.X --notes="release notes" --overwrite --channel=dev')
    .demand(['version', 'notes'])
    .default('overwrite', false)
    .default('channel', 'dev')
    .argv

// check the channel names
if (!channelData[args.channel]) {
  throw new Error('Invalid channel ' + args.channel)
}

if (!args.version.match(/^[0-9]+\.[0-9]+\.[0-9]+$/)) {
  throw "Invalid version format. Must be X.X.X"
}

const OSX_TEMPLATE = 'https://brave-download.global.ssl.fastly.net/multi-channel/releases/CHANNEL/VERSION/osx/Brave-VERSION.zip'

var winx64_entry = {
  version: args.version,
  name: 'Brave ' + args.version,
  pub_date: (new Date()).toISOString(),
  notes: args.notes
}

var osx_entry = _.clone(winx64_entry)
osx_entry.url = OSX_TEMPLATE
osx_entry.url = osx_entry.url.replace(/VERSION/g, args.version)
osx_entry.url = osx_entry.url.replace(/CHANNEL/g, args.channel)

var winx64_json = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', args.channel, 'winx64.json')))
var osx_json = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', args.channel, 'osx.json')))

winx64_json.unshift(winx64_entry)
osx_json.unshift(osx_entry)

console.log("Contents for channel " + args.channel)
console.log(winx64_json)
console.log(osx_json)

if (args.overwrite) {
  console.log("Writing data files for channel " + args.channel)
  fs.writeFileSync(path.join(__dirname, '..', 'data', args.channel, 'winx64.json'), JSON.stringify(winx64_json, null, 2))
  fs.writeFileSync(path.join(__dirname, '..', 'data', args.channel, 'osx.json'), JSON.stringify(osx_json, null, 2))
}
  
console.log("Done")
