let Hapi = require('hapi')
var Inert = require('inert')
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

var server = new Hapi.Server()
server.connection({ port: config.port })
server.register(Inert, function () {})

// dynamic routes
server.route(
  [
    common.heartBeat,
    common.root
  ].concat(routes)
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
