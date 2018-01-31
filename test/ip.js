/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var tap = require('tap')
var _ = require('underscore')
var common = require('../src/common')

tap.test('retrieve IP address', function (t) {
  var requestMock
  requestMock = {
    headers: {
      'x-forwarded-for': '1.1.1.1,2.2.2.2'
    }
  }
  t.ok(common.ipAddressFrom(requestMock) === '2.2.2.2', 'retrieve forwarded ip address')
  requestMock = {
    headers: {},
    info: {
      remoteAddress: '9.9.9.9'
    }
  }
  t.ok(common.ipAddressFrom(requestMock) === '9.9.9.9', 'retrieve remote ip address')
  t.end()
})
