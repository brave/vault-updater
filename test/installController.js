/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var tap = require('tap')
var _ = require('underscore')
var ctrl = require('../src/controllers/installer-events')

var query = {
  platform: 'winx64-bc',
  version: '1.2.3',
  channel: 'dev',
  ref: null,
  event: 'install'
}

var expected = {
  version: '1.2.3',
  channel: 'dev',
  platform: 'winx64-bc',
  ref: 'none',
  event: 'install'
}

tap.test('Installer Controller', async (t) => {
  var runtimeMock = {
    mongo: {
      models: {
        insertInstallerEvent: function (evt) {
          t.ok(_.isObject(evt), 'evt is an object')
          t.same(evt, expected, 'evt built correctly')
        }
      }
    }
  }
  var hMock = {
    response: function(obj) {
      t.ok(obj.ts, 'timestamp returned')
      t.ok(obj.status === 'ok', 'status ok')
    }
  }
  var requestMock = {
    query: query,
    info: {
      remoteAddress: '1.1.1.1'
    },
    headers: {}
  }
  var endpoints = ctrl.setup(runtimeMock)
  await endpoints[0].handler(requestMock, hMock)
  t.end()
})
