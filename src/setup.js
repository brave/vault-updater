let fs = require('fs')
let path = require('path')
let _ = require('underscore')

let common = require('./common')
let channelData = require('./common').channelData
let channels = _.keys(channelData)
let platforms = ['osx', 'winx64']

// Read in the release files by channel / platform
exports.readReleases = (directory) => {
  let releases = {}

  _.each(channels, (channel) => {
    _.each(platforms, (platform) => {
      let filename = path.join(__dirname, '..', 'data', channel, platform + '.json')
      let contents = JSON.parse(fs.readFileSync(filename, 'utf-8'))
      _.each(contents, (release) => {
        // integer for version comparison
        release.comparable_version = common.comparableVersion(release.version)
      })
      releases[`${channel}:${platform}`] = contents
    })
  })
  
  return releases
}
