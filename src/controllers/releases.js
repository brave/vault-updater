let assert = require('assert')
let Joi = require('joi')
let common = require('../common')
let _ = require('underscore')
let qs = require('querystring')

let channelData = require('../common').channelData
let platformData = require('../common').platformData

// Valid platform identifiers
let platforms = _.keys(platformData)

let commonValidator = {
  params: {
    platform: Joi.valid(platforms),
    channel: Joi.string(),
    version: Joi.string().regex(/[\d]+\.[\d]+\.[\d]+/)
  }
}

// Modify the release to be returned to the client
let responseFormatter = (release) => {
  let response = _.clone(release)
  delete response.comparable_version
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
      channel: request.params.channel || 'unknown'
    }
  } else {
    return null
  }
}

// Build release notes from multiple versions greater than the passed in version number
let buildReleaseNotes = (potentials) => {
  return potentials.map((release) => release.notes).join('\n\n')
}

exports.setup = (runtime, releases) => {
  /*

  Format similar to:

    {
      "url": "http://mycompany.com/myapp/releases/myrelease",
      "name": "My Release Name",
      "notes": "Theses are some release notes innit",
      "pub_date": "2013-09-18T12:29:53+01:00",
    }

  */

  let BASE_URL = process.env.BASE_URL || 'https://brave-download.global.ssl.fastly.net/multi-channel/releases'
  console.log(`Base URL: ${BASE_URL}`)

  // Redirect URLs for latest installer files
  let platformLatest = {
    winx64: BASE_URL + '/CHANNEL/VERSION/winx64/BraveSetup-x64.exe',
    winia32: BASE_URL + '/CHANNEL/VERSION/winia32/BraveSetup-ia32.exe',
    osx: BASE_URL + '/CHANNEL/VERSION/osx/Brave.dmg',
    linux64: BASE_URL + '/CHANNEL/VERSION/linux64/Brave.tar.bz2',
    debian64: BASE_URL + '/CHANNEL/VERSION/debian64/brave_VERSION_amd64.deb',
    ubuntu64: BASE_URL + '/CHANNEL/VERSION/debian64/brave_VERSION_amd64.deb',
    fedora64: BASE_URL + '/CHANNEL/VERSION/fedora64/brave-VERSION.amd64.rpm',
    openSUSE64: BASE_URL + '/CHANNEL/VERSION/fedora64/brave-VERSION.amd64.rpm',
    redhat64: BASE_URL + '/CHANNEL/VERSION/fedora64/brave-VERSION.amd64.rpm',
    mint64: BASE_URL + '/CHANNEL/VERSION/debian64/brave_VERSION_amd64.deb'
  }

  // Handle pre-channel implementation browser requests
  let legacy_latest = {
    method: 'GET',
    path: '/latest/{platform}',
    config: {
      handler: function(request, reply) {
        var url = `/latest/dev/${request.params.platform}`
        reply().redirect(url)
      }
    }
  }

  let latest = {
    method: 'GET',
    path: '/latest/{channel}/{platform}',
    config: {
      handler: function(request, reply) {
        var channel = request.params.channel
        var platform = request.params.platform
        if (platformLatest[platform] && channelData[channel]) {
          if (releases[channel + ':' + platform][0]) {
            let url = platformLatest[platform]
            let version = releases[channel + ':' + platform][0].version
            url = url.replace('CHANNEL', channel)
            url = url.replace(new RegExp('VERSION', 'g'), version)
            console.log(`Redirect: ` + url)
            reply().redirect(url)
          } else {
            reply(`No current version for ${channel} / ${platform}`)
          }
        } else {
          console.log(`Invalid request for latest build ${channel} ${platform}`)
          let response = reply('Unknown platform / channel')
          response.code(204)
        }
      }
    }
  }

  // Handle legacy update requests
  // Example: maps /1/releases/osx/0.7.11 -> /1/releases/dev/0.7.11/osx
  let legacy_get = {
    method: 'GET',
    path: '/1/releases/{platform}/{version}',
    config: {
      handler: function (request, reply) {
        let url = `/1/releases/dev/${request.params.version}/${request.params.platform}?${qs.stringify(request.query)}`
        console.log("redirecting to " + url)
        reply().redirect(url)
      }
    }
  }

  // Find the latest release for this channel / platform AFTER the version passed to this handler
  let get = {
    method: 'GET',
    path: '/1/releases/{channel}/{version}/{platform}',
    config: {
      handler: function (request, reply) {
        // Handle undefined platforms
        if (request.params.platform === 'undefined') {
          request.params.platform = 'unknown'
        }

        // Integer version for comparison
        let cv = common.comparableVersion(request.params.version)
        let channel = request.params.channel
        
        // Build the usage record (for Mongo)
        let usage = buildUsage(request)

        // Potential releases
        let potentials = _.filter(
          releases[channel + ':' + request.params.platform],
          (rel) => rel.comparable_version > cv
        )

        let targetRelease = null
        if (!_.isEmpty(potentials)) {
          // Most current release
          targetRelease = _.clone(_.max(
            potentials,
            (rel) => rel.comparable_version
          ))
          // Concatenate the release notes for all potential updates
          targetRelease.notes = buildReleaseNotes(potentials)
        }

        // Insert usage record if not null
        runtime.mongo.models.insertUsage(usage, (err, results) => {
          assert.equal(err, null)
          request.log([], 'get')
          if (targetRelease) {
            console.log(responseFormatter(targetRelease))
            reply(responseFormatter(targetRelease))
          } else {
            let response = reply('No Content')
            response.code(204)
          }
        })
      },
      validate: commonValidator
    }
  }

  return [
    legacy_get,
    get,
    legacy_latest,
    latest
  ]
}
