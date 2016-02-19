let Hapi = require('hapi')
let Inert = require('inert')
let assert = require('assert')
let setGlobalHeader = require('hapi-set-header')

let profile = process.env.NODE_ENV || 'development'
let config = require('../config/config.' + profile + '.js')

let db = require('./db')
let setup = require('./setup')
let common = require('./common')

// confirm release directories exist
setup.confirm(profile)
let releases = setup.readReleases('data')

if (process.env.DEBUG) {
  console.log(releases)
}

// setup connection to MongoDB
db.setup((mongo) => {
  let runtime = {
    'mongo': mongo
  }

  // POST, DEL and GET /1/releases/{platform}/{version}
  let routes = require('./controllers/releases').setup(runtime, releases)
  let crashes = require('./controllers/crashes').setup(runtime)
  let monitoring = require('./controllers/monitoring').setup(runtime)

  let server = new Hapi.Server()
  let connection = server.connection({
    host: config.host,
    port: config.port
  })
  server.register(Inert, function () {})

  // Handle the boom response as well as all other requests (cache control for telemetry)
  setGlobalHeader(server, 'Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0')
  setGlobalHeader(server, 'Pragma', 'no-cache')
  setGlobalHeader(server, 'Expires', 0)

  connection.listener.once('clientError', function (e) {
    console.error(e)
  })

  // Routes
  server.route(
    [
      common.heartBeat,
      common.root
    ].concat(routes, crashes, monitoring)
  )

  // static release file handling (dev)
  server.route({
    method: 'GET',
    path: '/releases/{param*}',
    handler: {
      directory: {
        path: 'releases',
        listing: true
      }
    }
  })

  server.start((err) => {
    assert(!err, `error starting service ${err}`)
    console.log('update service started')
  })
})
