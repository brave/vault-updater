/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

let Hapi = require('hapi')

process.env.NEW_RELIC_NO_CONFIG_FILE = true
if (process.env.NEW_RELIC_APP_NAME && process.env.NEW_RELIC_LICENSE_KEY) {
  var newrelic = require('newrelic')
} else {
  console.log("Warning: New Relic not configured!")
}

let logger = require('logfmt')
let Inert = require('inert')
let assert = require('assert')
let setGlobalHeader = require('hapi-set-header')
let _ = require('underscore')

let profile = process.env.NODE_ENV || 'development'
let config = require('../config/config.' + profile + '.js')

console.log("Running in '" + profile + "' mode")

let db = require('./db')
let setup = require('./setup')
let common = require('./common')
let mq = require('./mq')
let pgc = require('./pgc')
let releasesAccess = require('./releasesAccess')
let extensionsAccess = require('./extensionsAccess')

var extensions, releases

function configureRoutes (runtime, releases, extensions) {
  // POST, DEL and GET /1/releases/{platform}/{version}
  let releaseRoutes = require('./controllers/releases').setup(runtime)
  let extensionRoutes = require('./controllers/extensions').setup(runtime, extensions)
  let crashes = require('./controllers/crashes').setup(runtime)
  let monitoring = require('./controllers/monitoring').setup(runtime)

  // GET /1/usage/[ios|android]
  let androidRoutes = require('./controllers/android').setup(runtime)
  let iosRoutes = require('./controllers/ios').setup(runtime)

  // read / write API
  let apiRoutes = require('./controllers/api').setup(runtime)

  return [releaseRoutes, extensionRoutes, crashes, monitoring, androidRoutes, iosRoutes, apiRoutes]
}

mq.setup((sender) => {
  db.setup(sender, (mongo) => {
    pgc.connectToURL(config.database_url, async (err, pg) => {
      assert(mongo && sender && pg)
      if (err) throw new Error(err.toString())
      let runtime = {
        mongo,
        sender,
        pg
      }

      // read configuration from database
      try {
        releasesAccess.setup(runtime)
        extensionsAccess.setup(runtime)
        releases = await releasesAccess.readReleasesFromDatabase()
        extensions = (await extensionsAccess.readFromDatabase()).stable
        var allRoutes = configureRoutes(runtime, releases, extensions)
      } catch (err) {
        console.log(err)
        process.exit(1)
      }

      let server = null

      // Output request headers to aid in osx crash storage issue
      if (process.env.LOG_HEADERS) {
        server = new Hapi.Server({
          debug: {
            request: ['error', 'received', 'handler'],
            log: ['error']
          }
        })
      } else {
        server = new Hapi.Server()
      }

      let serv = server.connection({
        host: config.host,
        port: config.port
      })

      // Output request headers to aid in osx crash storage issue
      if (process.env.LOG_HEADERS) {
        serv.listener.on('request', (request, event, tags) => {
          logger.log(request.headers)
        })
      }

      // API access control
      server.register(require('hapi-auth-bearer-token'), (err) => {
        server.auth.strategy('simple', 'bearer-access-token', {
          allowQueryToken: true,              // optional, false by default
          allowMultipleHeaders: false,        // optional, false by default
          accessTokenName: 'access_token',    // optional, 'access_token' by default
          validateFunc: function (token, callback) {
            if (token === process.env.AUTH_TOKEN) {
              return callback(null, true, { token: token });
            }
            return callback(null, false, { token: token })
          }
        })
      })

      server.register(require('blipp'), (err) => {} )

      // Handle the boom response as well as all other requests (cache control for telemetry)
      setGlobalHeader(server, 'Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0')
      setGlobalHeader(server, 'Pragma', 'no-cache')
      setGlobalHeader(server, 'Expires', 0)

      serv.listener.once('clientError', function (e) {
        console.error(e)
      })

      try {
        // Routes
        server.route([common.root].concat(_.flatten(allRoutes)))
        server.start((err) => {
          assert(!err, `error starting service ${err}`)
          console.log('update service started')
        })
      } catch (err) {
        console.log(err)
      }
    })
  })
})
