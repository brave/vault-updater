let Hapi = require('hapi')
let Inert = require('inert')
let assert = require('assert')

let profile = process.env.NODE_ENV || 'development'
let config = require('../config/config.' + profile + '.js')

let setup = require('./setup')
let common = require('./common')

// confirm release directories exist
setup.confirm(profile)
let releases = setup.readReleases('data')

if (process.env.DEBUG) {
  console.log(releases)
}

let runtime = {}

// POST, DEL and GET /1/releases/{platform}/{version}
let routes = require('./controllers/releases').setup(runtime, releases)
let crashes = require('./controllers/crashes').setup()

let server = new Hapi.Server()
let connection = server.connection({
  host: config.host,
  port: config.port
})
server.register(Inert, function () {})

connection.listener.once('clientError', function (e) {
  console.error(e)
})

// dynamic routes
server.route(
  [
    common.heartBeat,
    common.root
  ].concat(routes).concat(crashes)
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
