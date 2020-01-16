/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

if (process.env.NEWRELIC_LICENSE_KEY) {
  require('newrelic')
}
let Hapi = require('@hapi/hapi')
let Boom = require('@hapi/boom')
let Joi = require('@hapi/joi')

let logger = require('logfmt')
let assert = require('assert')
let _ = require('underscore')

let profile = process.env.NODE_ENV || 'development'
let config = require('../config/config.' + profile + '.js')

let db = require('./db')
let setup = require('./setup')
let common = require('./common')
let mq = require('./mq')
let headers = require('./lib/headers')

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

  db.setup(muonSender, braveCoreSender, (mongo) => {
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
    let promoProxy = []
    if (process.env.FEATURE_REFERRAL_PROMO) {
      console.log("Configuring promo proxy [FEATURE_REFERRAL_PROMO]")
      promoProxy = require('./controllers/promo').setup(runtime, releases)
    }

    // webcompat collection routes
    let webcompatRoutes = require('./controllers/webcompat').setup(runtime, releases)

    // feedback collection routes
    let feedbackRoutes = require('./controllers/feedback').setup(runtime, releases)

    const init = async () => {
      let server = null

      // Output request headers to aid in osx crash storage issue
      if (process.env.LOG_HEADERS) {
        server = new Hapi.Server({
          host: config.host,
          port: config.port,
        })
      } else {
        server = new Hapi.Server({
          host: config.host,
          port: config.port,
        })
      }

      if (process.env.INSPECT_BRAVE_HEADERS) {
        server.events.on('request', (request, event, tags) => {
          headers.inspectBraveHeaders(request)
        })
      }
      server.validator(Joi)

      await server.register({ plugin: require('@hapi/h2o2'), options: { passThrough: true } })
      await server.register({ plugin: require('blipp') })

      // Output request headers to aid in osx crash storage issue
      if (process.env.LOG_HEADERS) {
        server.events.on('request', (request, event, tags) => {
          logger.log(request.headers)
        })
      }

      server.ext('onPreResponse', (request, h) => {
        const response = request.response;
        if (request.response.isBoom) {
          response.output.headers['cache-control'] = 'no-cache, no-store, must-revalidate, private, max-age=0'
          response.output.headers['pragma'] = 'no-cache'
          response.output.headers['expires'] =  0
        } else if (!('cache-control' in response.headers)) {
          response.header('cache-control', 'no-cache, no-store, must-revalidate, private, max-age=0')
          response.header('pragma', 'no-cache')
          response.header('expires', 0)
        }
        return h.continue;
      });

      // Routes
      server.route(
        [
          common.root
        ].concat(
          braveCoreRoutes,
          androidRoutes,
          iosRoutes,
          crashes,
          extensionRoutes,
          installerEventsCollectionRoutes,
          releaseRoutes,
          webcompatRoutes,
          promoProxy
        )
      )

      await server.start((err) => {
        assert(!err, `error starting service ${err}`)
        console.log('update service started')
      })
    }

    init()
  })
})
