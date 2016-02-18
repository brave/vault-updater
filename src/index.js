let Hapi = require('hapi')
let assert = require('assert')
let setGlobalHeader = require('hapi-set-header')
let _ = require('underscore')

let profile = process.env.NODE_ENV || 'development'
let config = require('../config/config.' + profile + '.js')

let db = require('./db')
let setup = require('./setup')
let common = require('./common')

// Read in the channel / platform releases meta-data
let releases = setup.readReleases('data')

if (process.env.DEBUG) {
  console.log(_.keys(releases))
}

// setup connection to MongoDB
db.setup((mongo) => {
  let runtime = {
    'mongo': mongo
  }

  // POST, DEL and GET /1/releases/{platform}/{version}
  let routes = require('./controllers/releases').setup(runtime, releases)
  let crashes = require('./controllers/crashes').setup(runtime)

  let server = new Hapi.Server()
  let connection = server.connection({
    host: config.host,
    port: config.port
  })

  // Handle the boom response as well as all other requests (cache control for telemetry)
  setGlobalHeader(server, 'Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0')
  setGlobalHeader(server, 'Pragma', 'no-cache')
  setGlobalHeader(server, 'Expires', 0)

  connection.listener.once('clientError', function (e) {
    console.error(e)
  })

  // dynamic routes
  server.route(
    [
      common.root
    ].concat(routes).concat(crashes)
  )

  server.start((err) => {
    assert(!err, `error starting service ${err}`)
    console.log('update service started')
  })
})
