/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

let assert = require('assert')
let Joi = require('joi').extend(require('joi-extension-semver'))
let common = require('../common')
let _ = require('underscore')
let qs = require('querystring')
let semver = require('semver')
let boom = require('boom')

let releasesAccess = require('../releasesAccess')
let extensionsAccess = require('../extensionsAccess')

let channelNames = _.keys(common.channelData)
let platformNames = _.keys(common.platformData)

let channelPlatformParams = {
  platform: Joi.string().required(),
  channel: Joi.string().valid(channelNames).required()
}

let channelParams = {
  channel: Joi.string().valid(channelNames).required()
}

let channelPlatformVersionParams = {
  platform: Joi.valid(platformNames).required(),
  channel: Joi.valid(channelNames).required(),
  version: Joi.semver().valid().required()
}

let channelVersionParams = {
  channel: Joi.valid(channelNames).required(),
  version: Joi.semver().valid().required()
}

export function setup(runtime) {
  let put_refresh = {
    method: 'PUT',
    path: '/api/1/releases/refresh',
    config: {
      auth: 'simple',
      handler: async function (request, reply) {
        try {
          await releasesAccess.readReleasesFromDatabase()
          await extensionsAccess.readFromDatabase()
          reply('ok')
        } catch (err) {
          reply(err).code(500)
        }
      }
    }
  }

  let put_promote = {
    method: 'PUT',
    path: '/api/1/releases/{channel}/{platform}/{version}/promote',
    config: {
      auth: 'simple',
      handler: function (request, reply) {
        releasesAccess.promote(request.params.channel, request.params.platform, request.params.version, request.payload.notes, (err, result) => {
          if (err) return reply(boom.create(400, 'release could not be promoted: ' + err.toString()))
          reply(result)
        })
      },
      validate: {
        params: channelPlatformVersionParams
      }
    }
  }

  let put_promote_all_platforms = {
    method: 'PUT',
    path: '/api/1/releases/{channel}/{version}/promote',
    config: {
      auth: 'simple',
      handler: function (request, reply) {
        releasesAccess.promoteAllPlatforms(request.params.channel, request.params.version, request.payload.notes, (err, result) => {
          if (err) return reply(boom.create(400, 'releases could not be promoted: ' + err.toString()))
          reply(result)
        })
      },
      validate: {
        params: channelVersionParams
      }
    }
  }

  let delete_release = {
    method: 'DELETE',
    path: '/api/1/releases/{channel}/{platform}/{version}',
    config: {
      auth: 'simple',
      handler: function (request, reply) {
        releasesAccess.revert(request.params.channel, request.params.platform, request.params.version, (err, results) => {
          if (err) return reply(boom.create(400, 'Release could not be reverted: ' + err.toString()))
          reply(results)
        })
      },
      validate: {
        params: channelPlatformVersionParams
      }
    }
  }

  let delete_release_all_platforms = {
    method: 'DELETE',
    path: '/api/1/releases/{channel}/{version}',
    config: {
      auth: 'simple',
      handler: function (request, reply) {
        releasesAccess.revertAllPlatforms(request.params.channel, request.params.version, (err, results) => {
          if (err) return reply(boom.create(400, 'Release could not be reverted: ' + err.toString()))
          reply(results)
        })
      },
      validate: {
        params: channelVersionParams
      }
    }
  }

  let post_releases = {
    method: 'POST',
    path: '/api/1/releases/{channel}/{platform}',
    config: {
      auth: 'simple',
      handler: function (request, reply) {
        request.payload.name = 'Brave ' + request.payload.version,
        request.payload.pub_date = (new Date()).toISOString()
        request.payload.url = request.payload.url || null
        releasesAccess.insert(request.params.channel, request.params.platform, request.payload, (err, results) => {
          if (err) return reply(boom.create(400, 'Release could not be inserted: ' + err.toString()))
          reply(request.payload)
        })
      },
      validate: {
        params: channelPlatformParams,
        payload: {
          notes: Joi.string().required(),
          version: Joi.semver().valid().required(),
          preview: Joi.boolean().required(),
          url: Joi.string().optional()
        }
      }
    }
  }

  let get = {
    method: 'GET',
    path: '/api/1/releases/{channel}/{platform}',
    config: {
      handler: function (request, reply) {
        reply(releasesAccess.all()[request.params.channel + ':' + request.params.platform])
      },
      validate: {
        params: channelPlatformParams
      }
    }
  }

  let get_all = {
    method: 'GET',
    path: '/api/1/releases/{channel}',
    config: {
      handler: function (request, reply) {
        reply(releasesAccess.allForChannel(request.params.channel))
      },
      validate: {
        params: channelParams
      }
    }
  }

  let get_latest_for_channel = {
    method: 'GET',
    path: '/api/1/releases/{channel}/latest',
    config: {
      handler: function (request, reply) {
        reply(releasesAccess.latestForChannel(request.params.channel))
      },
      validate: {
        params: channelParams
      }
    }
  }

  let put_extension = {
    method: "PUT",
    path: '/api/1/extensions/{channel}',
    config: {
      auth: 'simple',
      handler: async (request, reply) => {
        try {
          var extension = _.pick(request.payload, ['id', 'version', 'hash', 'name'])
          extension.channel = request.params.channel
          await extensionsAccess.insertOrUpdate(extension)
          return reply(extension)
        } catch (err) {
          return reply(boom.create(400, err))
        }
      },
      validate: {
        params: channelParams,
        payload: {
          id: Joi.string().required(),
          version: Joi.string().required(),
          hash: Joi.string().required(),
          name: Joi.string().required()
        }
      }
    }
  }

  let put_pause = {
    method: "PUT",
    path: '/api/1/control/releases/pause',
    config: {
      auth: 'simple',
      handler: async (request, reply) => {
        releasesAccess.pause((err, results) => {
          if (err) return reply(boom.create(400, err))
          reply(results)
        })
      }
    }
  }

  let put_pause_channel = {
    method: "PUT",
    path: '/api/1/control/releases/pause/{channel}',
    config: {
      auth: 'simple',
      handler: async (request, reply) => {
        releasesAccess.pauseChannel(request.params.channel, (err, results) => {
          if (err) return reply(boom.create(400, err))
          reply(results)
        })
      },
      validate: {
        params: channelParams
      }
    }
  }

  let put_resume = {
    method: "PUT",
    path: '/api/1/control/releases/resume',
    config: {
      auth: 'simple',
      handler: async (request, reply) => {
        releasesAccess.resume((err, results) => {
          if (err) return reply(boom.create(400, err))
          reply(results)
        })
      }
    }
  }

  let put_resume_channel = {
    method: "PUT",
    path: '/api/1/control/releases/resume/{channel}',
    config: {
      auth: 'simple',
      handler: async (request, reply) => {
        releasesAccess.resumeChannel(request.params.channel, (err, results) => {
          if (err) return reply(boom.create(400, err))
          reply(results)
        })
      },
      validate: {
        params: channelParams
      }
    }
  }

  let get_status = {
    method: "GET",
    path: '/api/1/control/status',
    config: {
      auth: 'simple',
      handler: async (request, reply) => {
        var statuses = {}
        _.each(channelNames, (channelName) => {
          var releases = releasesAccess.latestForChannel(channelName)
          console.log(channelName, releases)
          statuses[channelName] = Object.keys(releases).length === 0 ? 'paused' : 'active'
        })
        var response = {
          statuses: statuses
        }
        reply(response)
      }
    }
  }

  return [put_pause, put_resume, get_status, put_refresh, post_releases, put_promote, put_promote_all_platforms, get_all, get, get_latest_for_channel, put_extension, delete_release, delete_release_all_platforms, put_pause_channel, put_resume_channel]
}
