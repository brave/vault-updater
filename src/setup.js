/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

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
  ['aomjjhallfgjeglblehebfpbcfeobpgk', '4.6.1.90', 'e1c67d1505ccfb8d14879ab02355c7bfaa376054fe9c918dbd5397f7e1755bbe'],
  // PDFJS
  ['jdbefljfgobbmcidnmpjamcbhnbphjnb', '1.5.444', '25689984431ca8a60f087c761f472e500a7fe8a9065a4a47e92559237bcd1d6d'],
  // Obsolete PDFJS (only kept for 0.12.3RC1 requests, we can remove when we build 0.12.3RC2)
  ['oemmndcbldboiebfnladdacbdfmadadm', '1.5.294', '499e05d5cde9a1e735e29fa49af7839690f34eb27a3d952b8e4396ea50c77526'],
  // Dashlane
  ['fdjamakpfbbddfjaooikfcpapjohcfmg', '4.2.4', '0be29a787290db4c554fd7c77e5c45939d2161688b6cb6b51d39cdedb9cc69d4'],
  // LastPass
  ['hdokiejnpimakedhajhdlcegeplioahd', '4.1.28', '1e94a15dfaa59afd8ceb8b8cace7194aea3cc718d9a77fcff812eac918246e80'],
  // Pocket
  ['niloccemoadcdkdjlinkgdfekeahmflj', '2.1.11', 'c2f67e8caa9247c36dba4052989c6bf3c8d1e0e76b7d828f49aadaeb5e3a71e6']
]
