/*
  Update metadata for release
 */

var fs = require('fs')
var path = require('path')
var _ = require('underscore')

var channelData = require('../dist/common').channelData

var args = require('yargs')
    .usage('Update version files\n\nNote: Will not replace data files unless --overwrite flag set\n\nnode $0 --version=X.X.X --notes="release notes" --overwrite --channel=dev --channel=stable')
    .demand(['version', 'notes'])
    .default('overwrite', false)
    .array('channel')
    .default('channel', ['dev'])
    .argv

// check the channel names
_.each(args.channel, function(channel) {
  if (!channelData[channel]) {
    throw new Error('Invalid channel ' + channel)
  }
})

if (!args.version.match(/^[0-9]+\.[0-9]+\.[0-9]+$/)) {
  throw "Invalid version format. Must be X.X.X"
}

const OSX_TEMPLATE = 'https://brave-download.global.ssl.fastly.net/releases/VERSION/osx/Brave-VERSION.zip'

var winx64_entry = {
  version: args.version,
  name: 'Brave ' + args.version,
  pub_date: (new Date()).toISOString(),
  notes: args.notes
}

var osx_entry = _.clone(winx64_entry)
osx_entry.url = OSX_TEMPLATE
osx_entry.url = osx_entry.url.replace(/VERSION/g, args.version)

_.each(args.channel, function (channel) {

  var winx64_json = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', channel, 'winx64.json')))
  var osx_json = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', channel, 'osx.json')))

  winx64_json.unshift(winx64_entry)
  osx_json.unshift(osx_entry)

  console.log("Contents for channel " + channel)
  console.log(winx64_json)
  console.log(osx_json)

  if (args.overwrite) {
    console.log("Writing data files for channel " + channel)
    fs.writeFileSync(path.join(__dirname, '..', 'data', channel, 'winx64.json'), JSON.stringify(winx64_json, null, 2))
    fs.writeFileSync(path.join(__dirname, '..', 'data', channel, 'osx.json'), JSON.stringify(osx_json, null, 2))
  }

})
  
console.log("Done")
