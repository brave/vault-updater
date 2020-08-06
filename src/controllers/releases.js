let assert = require('assert')
let Joi = require('@hapi/joi')
let common = require('../common')
let _ = require('underscore')
let qs = require('querystring')
let semver = require('semver')
let boom = require('@hapi/boom')

let channelData = require('../common').channelData
let platformData = require('../common').platformData

// Valid platform identifiers
let platforms = _.keys(platformData)

let commonValidator = {
  params: {
    platform: Joi.valid(...platforms),
    channel: Joi.string(),
    version: Joi.string()
  }
}

// Default download location
let BASE_URL = process.env.BASE_URL || 'https://brave-download.global.ssl.fastly.net/multi-channel/releases'

// Default Windows URL pattern
var windowsDownloadURLPattern = BASE_URL + '/CHANNEL/VERSION/PLATFORM/'

// Modify the release to be returned to the client
let responseFormatter = (release, channel, platform) => {
  let response = _.clone(release)
  if (platform && platform.match(/^win/)) {
    // define a URL to the folder containing the RELEASES file for Windows
    // the key is defined as braveURL to not conflict in the future with 'url' attribute
    response.braveURL = windowsDownloadURLPattern
      .replace('CHANNEL', channel)
      .replace('VERSION', response.version)
      .replace('PLATFORM', platform)
  }
  return response
}

// Build a usage object if query parameters passed in
let buildUsage = (request) => {
  if (request.query.daily) {
    return {
      daily: request.query.daily === 'true',
      weekly: request.query.weekly === 'true',
      monthly: request.query.monthly === 'true',
      platform: request.params.platform || 'unknown',
      version: request.params.version || 'unknown',
      first: request.query.first === 'true',
      channel: request.params.channel || 'unknown',
      woi: request.query.woi || '2016-01-04',
      ref: request.query.ref || 'none',
      country_code: common.countryCodeFrom(request)
    }
  } else {
    return null
  }
}

// Build release notes from multiple versions greater than the passed in version number
let buildReleaseNotes = (potentials) => {
  return potentials.map((release) => release.notes).join('\n\n')
}

// This function checks for the following conditions:
//
//  * The currently installed release is a preview build
//  * Assumes that accept_preview=false checked already
//
var specialPreviewUpgrade = (releases, version, channel, platform) => {
  var release = releases[channel + ':' + platform].find((rel) => { return rel.version === version })
  if (release) {
    return release.preview
  }
  return false
}

// Build list of releases potentially available for upgrade
var potentialReleases = (releases, channel, platform, version, accept_preview) => {
  return _.filter(
    releases[channel + ':' + platform],
    (rel) => {
      if (accept_preview === 'true') {
        return semver.gt(rel.version, version)
      } else {
        return (semver.gt(rel.version, version) && !rel.preview) ||
               (semver.gt(rel.version, version) && specialPreviewUpgrade(releases, version, channel, platform))
      }
    }
  )
}

// filter out preview releases
function releasesWithoutPreviews (releases) {
  return _.filter(releases, (release) => {
    return !release.preview
  })
}

var setup = (runtime, releases) => {
  /*

  Format similar to:

    {
      "url": "http://mycompany.com/myapp/releases/myrelease",
      "name": "My Release Name",
      "notes": "Theses are some release notes innit",
      "pub_date": "2013-09-18T12:29:53+01:00",
    }

  */

  console.log(`Base URL: ${BASE_URL}`)

  const braveCoreBase = 'https://brave-browser-downloads.s3.brave.com/latest/'
  let braveCoreRedirects = {
    'osx': 'Brave-Browser[CHANNEL].dmg',
    'winia32': 'BraveBrowser[CHANNEL]Setup32.exe',
    'winx64': 'BraveBrowser[CHANNEL]Setup.exe'
  }
  const braveCoreChannelIdentifiers = {
    'release': '',
    'beta': 'Beta',
    'dev': 'Dev',
    'nightly': 'Nightly'
  }
  const LINUX_REDIRECT_URL = 'https://brave-browser.readthedocs.io/en/latest/installing-brave.html#linux'

  let latestBraveCore = {
    method: 'GET',
    path: '/latest/{platform}/{channel?}',
    handler: function(request, h) {
      request.params.channel = request.params.channel || 'release'
      if (!braveCoreChannelIdentifiers.hasOwnProperty(request.params.channel)) {
        console.log('unknown channel')
        return h.response("unknown channel").code(404)
      }
      if (request.params.platform && braveCoreRedirects[request.params.platform]) {
        let url = braveCoreRedirects[request.params.platform]
        let channelSuffix = braveCoreChannelIdentifiers[request.params.channel]
        if (request.params.platform === 'osx' && request.params.channel !== 'release') channelSuffix = '-' + channelSuffix
        url = braveCoreBase + url.replace('[CHANNEL]', channelSuffix)
        return h.redirect(url)
      } else {
        return h.redirect(LINUX_REDIRECT_URL)
      }
    },
    options: {
      description: '* Return redirect to latest binary for a platform and channel'
    }
  }

  // Handle legacy update requests
  // Example: maps /1/releases/osx/0.7.11 -> /1/releases/dev/0.7.11/osx
  let legacy_get = {
    method: 'GET',
    path: '/1/releases/{platform}/{version}',
    handler: function (request, h) {
      let url = `/1/releases/dev/${request.params.version}/${request.params.platform}?${qs.stringify(request.query)}`
      console.log("redirecting to " + url)
      return h.redirect(url)
    },
    options: {
      description: "* LEGACY MUON"
    }
  }

  // Find the latest release for this channel / platform AFTER the version passed to this handler
  let get = {
    method: 'GET',
    path: '/1/releases/{channel}/{version}/{platform}',
    handler: function (request, h) {
      // Handle undefined platforms
      if (request.params.platform === 'undefined') {
        request.params.platform = 'unknown'
      }

      let channel = request.params.channel
      let platform = request.params.platform
      let version = request.params.version

      if (!semver.valid(version)) return h.response(boom.badRequest("Invalid version " + version))
      if (!channelData[channel]) return h.response(boom.badRequest("Invalid channel " + channel))

      // Build the usage record (for Mongo)
      let usage = buildUsage(request)

      // Array of potential releases
      let potentials = potentialReleases(
        releases,
        channel,
        platform,
        version,
        request.query.accept_preview
      )

      let targetRelease = null
      if (!_.isEmpty(potentials)) {
        // Most current release
        targetRelease = _.clone(potentials[0])
        // Concatenate the release notes for all potential updates
        targetRelease.notes = buildReleaseNotes(potentials)
      }

      // Insert usage record if not null
      runtime.mongo.models.insertUsage(usage, (err, results) => {
        assert.equal(err, null)
        request.log([], 'get')
      })

      if (targetRelease) {
        var response = responseFormatter(targetRelease, channel, platform)
        console.log(response)
        return h.response(response)
      } else {
        return h.response('No Content').code(204)
      }
    },
    options: {
      description: '* LEGACY MUON',
      validate: commonValidator
    }
  }

  return [
    legacy_get,
    get,
    latestBraveCore
  ]
}

module.exports = {
  setup,
  potentialReleases,
  releasesWithoutPreviews
}
