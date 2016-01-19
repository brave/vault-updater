let assert = require('assert')
let Joi = require('joi')
let common = require('../common')
let _ = require('underscore')

// Valid platform identifiers
exports.platforms = ['winx64', 'osx']

let commonValidator = {
  params: {
    platform: Joi.valid(exports.platforms),
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
      monthly: request.query.monthly === 'true'
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

  // Find the latest release for this platform AFTER the version passed to this handler
  let get = {
    method: 'GET',
    path: '/1/releases/{platform}/{version}',
    config: {
      handler: function (request, reply) {
        // Integer version for comparison
        let cv = common.comparableVersion(request.params.version)

        console.log(cv)

        // Build the usage record (for Mongo)
        let usage = buildUsage(request)

        // Potential releases
        let potentials = _.filter(
          releases[request.params.platform],
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
    get
  ]
}
