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

let db = require('./db')
let setup = require('./setup')
let common = require('./common')
let mq = require('./mq')

// Read in the channel / platform releases meta-data
let releases = setup.readReleases('data')

if (process.env.DEBUG) {
  console.log(_.keys(releases))
}

// setup connection to MongoDB
mq.setup((sender) => {
  db.setup(sender, (mongo) => {
    let runtime = {
      'mongo': mongo,
      'sender': sender
    }

    // POST, DEL and GET /1/releases/{platform}/{version}
    let routes = require('./controllers/releases').setup(runtime, releases)
    let crashes = require('./controllers/crashes').setup(runtime)
    let monitoring = require('./controllers/monitoring').setup(runtime)

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

    // Handle the boom response as well as all other requests (cache control for telemetry)
    setGlobalHeader(server, 'Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0')
    setGlobalHeader(server, 'Pragma', 'no-cache')
    setGlobalHeader(server, 'Expires', 0)

    serv.listener.once('clientError', function (e) {
      console.error(e)
    })

    // Routes
    server.route(
      [
        common.root
      ].concat(routes, crashes, monitoring)
    )

    server.start((err) => {
      assert(!err, `error starting service ${err}`)
      console.log('update service started')
    })
  })
})
