var fs = require('fs')
var path = require('path')

var channelData = require('../dist/common').channelData

var args = require('yargs')
    .usage('Promote preview version to release\n\nNote: Will not replace data files unless --overwrite flag set\n\nnode $0 --overwrite --channel=dev')
    .demand(['channel'])
    .default('overwrite', false)
    .argv

// check the channel names
if (!channelData[args.channel]) {
  throw new Error('Invalid channel ' + args.channel)
}

var platforms = ['osx', 'winia32', 'winx64', 'linux64']
var json = {}

platforms.forEach((platformName) => {
  json[platformName] = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', args.channel, platformName + '.json')))
  var metadata = json[platformName][0]
  if (!!!metadata.preview) {
    console.log("Error: version " + metadata.version + " of " + platformName + " already promoted to release version")
    process.exit(1)
  } else {
    metadata.preview = false
  }
  console.log(metadata)
  if (args.overwrite) {
    fs.writeFileSync(path.join(__dirname, '..', 'data', args.channel, platformName + '.json'), JSON.stringify(json[platformName], null, 2))
  }
})

if (!args.overwrite) {
  console.log("Warning: nothing written to disk. Use --overwrite flag to write changes.")
}
console.log("Done")
