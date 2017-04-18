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
        releases[`${channel}:${platform}`] = contents
      }
    })
  })
  // Log out configured release keys
  console.log(_.keys(releases))

  return releases
}

exports.extensionManifestPath = path.join('data', 'stable', 'extensions', 'extensionManifest.json')

// I'm not sure how we'll organize this in the future, but for now just pass along static data
// Format is: [extensionId, version, hash]
exports.readExtensions = () => JSON.parse(fs.readFileSync(exports.extensionManifestPath))

// Components are all extensions plus some other things like Widevine
exports.readComponentsForVersionUpgradesOnly = () => [...module.exports.readExtensions(),
  // This should always be served from Google servers for licensing reasons
  // and this is only used for purposes of reporting.  We don't actually serve this file.
  ['oimompecagnajdejgnnjijobebaeigek', '1.4.8.903', '', 'Widevine']
]
