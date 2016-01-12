let assert = require('assert')
let Joi = require('joi')
let common = require('../common')
let _ = require('underscore')

// valid platform identifiers
exports.platforms = ['winx64', 'osx']

let commonValidator = {
  params: {
    platform: Joi.valid(exports.platforms),
    version: Joi.string().regex(/[\d]+\.[\d]+\.[\d]+/)
  }
}

// modify the release to be returned to the client
let responseFormatter = (release) => {
  let response = _.clone(release)
  delete response.comparable_version
  return response
}

// build a usage object is query parameters passed in
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

  // find the latest release for this platform AFTER the version passed to this handler
  let get = {
    method: 'GET',
    path: '/1/releases/{platform}/{version}',
    config: {
      handler: function (request, reply) {
        // integer version for comparison
        let cv = common.comparableVersion(request.params.version)

        console.log(cv)

        // build the usage record (for Mongo)
        let usage = buildUsage(request)

        // potential releases
        let potentials = _.filter(
          releases[request.params.platform],
          (rel) => rel.comparable_version > cv
        )

        let targetRelease = null
        if (!_.isEmpty(potentials)) {
          // most current release
          targetRelease = _.max(
            potentials,
            (rel) => rel.comparable_version
          )
        }

        // insert usage record if not null
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
