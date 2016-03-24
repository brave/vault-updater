let fs = require('fs')
let path = require('path')
let _ = require('underscore')

let common = require('./common')

let channelData = common.channelData
let channels = _.keys(channelData)

let platformData = common.platformData
let platforms = _.keys(platformData)

// Aliases allow us to re-use platform configuration .json files for different identifiers
let aliases = {
  debian64: 'linux64',
  ubuntu64: 'linux64',
  fedora64: 'linux64',
  openSUSE64: 'linux64',
  redhat64: 'linux64',
  mint64: 'linux64'
}

// Read in the release files by channel / platform
exports.readReleases = (directory) => {
  let releases = {}

  _.each(channels, (channel) => {
    _.each(platforms, (platform) => {
      if (platform !== 'undefined') {
        // Check for aliases
        let aliased = aliases[platform] || platform
        // Read in configuration
        let filename = path.join(__dirname, '..', 'data', channel, aliased + '.json')
        let contents = JSON.parse(fs.readFileSync(filename, 'utf-8'))
        _.each(contents, (release) => {
          // integer for version comparison
          release.comparable_version = common.comparableVersion(release.version)
        })
        releases[`${channel}:${platform}`] = contents
      }
    })
  })
  // Log out configured release keys
  console.log(_.keys(releases))

  return releases
}
