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
  mint64: 'linux64',
  linux: 'linux64'
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

// I'm not sure how we'll organize this in the future, but for now just pass along static data
// Format is: [extensionId, version, hash]
exports.readExtensions = () => [
  // 1Password
  ['aomjjhallfgjeglblehebfpbcfeobpgk', '4.5.9.90', 'f75d7808766429ec63ec41d948c1cb6a486407945d604961c6adf54fe3f459b7'],
  // PDFJS
  ['oemmndcbldboiebfnladdacbdfmadadm', '1.5.294', '499e05d5cde9a1e735e29fa49af7839690f34eb27a3d952b8e4396ea50c77526'],
  // Dashlane
  ['fdjamakpfbbddfjaooikfcpapjohcfmg', '4.2.4', '0be29a787290db4c554fd7c77e5c45939d2161688b6cb6b51d39cdedb9cc69d4'],
  // LastPass
  ['hdokiejnpimakedhajhdlcegeplioahd', '4.1.28', '1e94a15dfaa59afd8ceb8b8cace7194aea3cc718d9a77fcff812eac918246e80']
]
