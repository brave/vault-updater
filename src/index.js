/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

let Hapi = require('hapi')

let logger = require('logfmt')
let Inert = require('@hapi/inert')
let assert = require('assert')
let setGlobalHeader = require('hapi-set-header')
let _ = require('underscore')
let h2o2 = require('@hapi/h2o2')

let profile = process.env.NODE_ENV || 'development'
let config = require('../config/config.' + profile + '.js')

let db = require('./db')
let setup = require('./setup')
let common = require('./common')
let mq = require('./mq')

// Read in the channel / platform releases meta-data
let releases = setup.readReleases('data')
let extensions = setup.readExtensions()

if (process.env.DEBUG) {
  console.log(_.keys(releases))
}

// setup connection to MongoDB
mq.setup((senders) => {
  // message queue senders for each product
  let muonSender = senders.muon
  let braveCoreSender = senders.braveCore

  db.setup(muonSender, braveCoreSender, async (mongo) => {
    let runtime = {
      'mongo': mongo,
      'sender': muonSender
    }

    // POST, DEL and GET /1/releases/{platform}/{version}
    let releaseRoutes = require('./controllers/releases').setup(runtime, releases)
    let extensionRoutes = require('./controllers/extensions').setup(runtime, extensions)
    let crashes = require('./controllers/crashes').setup(runtime)

    // GET /1/usage/[ios|android|brave-core]
    let androidRoutes = require('./controllers/android').setup(runtime)
    let iosRoutes = require('./controllers/ios').setup(runtime)
    let braveCoreRoutes = require('./controllers/braveCore').setup(runtime)

    // GET /1/installerEvent
    let installerEventsCollectionRoutes = require('./controllers/installer-events').setup(runtime)

    // promotional proxy
    let promoProxy = require('./controllers/promo').setup(runtime, releases)

    let server = new Hapi.Server({
      host: config.host,
      port: config.port
    })

    await server.register(h2o2)
    await server.register(require('blipp'))

    // Routes
    server.route(
      [
        common.root
      ].concat(releaseRoutes, extensionRoutes, crashes, androidRoutes, iosRoutes, braveCoreRoutes, promoProxy, installerEventsCollectionRoutes)
    )

    await server.start()
  })
})
