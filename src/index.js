let Hapi = require('hapi')
let Inert = require('inert')
let assert = require('assert')
let fs = require('fs')

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

let tls = {
  key: fs.readFileSync('/Users/aubrey/repos/vault-updater/ssl/server.key', 'utf-8'),
  cert: fs.readFileSync('/Users/aubrey/repos/vault-updater/ssl/server.crt', 'utf-8'),
  ca: fs.readFileSync('/Users/aubrey/repos/vault-updater/ssl/server.csr', 'utf-8'),
  ciphers: [
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'DHE-RSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES128-SHA256',
    'DHE-RSA-AES128-SHA256',
    'ECDHE-RSA-AES256-SHA384',
    'DHE-RSA-AES256-SHA384',
    'ECDHE-RSA-AES256-SHA256',
    'DHE-RSA-AES256-SHA256',
    'HIGH',
    '!aNULL',
    '!eNULL',
    '!EXPORT',
    '!DES',
    '!RC4',
    '!MD5',
    '!PSK',
    '!SRP',
    '!CAMELLIA'
  ].join(':'),
  honorCipherOrder: true
}

// POST, DEL and GET /1/releases/{platform}/{version}
let routes = require('./controllers/releases').setup(runtime, releases)

let server = new Hapi.Server()
let connection = server.connection({
  host: config.host,
  port: config.port,
  tls: tls
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
