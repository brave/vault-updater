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
  t.equal(common.ipAddressFrom(requestMock), '1.1.1.1', 'retrieve forwarded ip address')
  requestMock = {
    headers: {},
    info: {
      remoteAddress: '9.9.9.9'
    }
  }
  t.ok(common.ipAddressFrom(requestMock) === '9.9.9.9', 'retrieve remote ip address')

  requestMock = {
    headers: {
      'x-forwarded-for': '1.1.1.1, 2.2.2.2, 3.3.3.3'
    }
  }
  t.ok(common.ipAddressFrom(requestMock) === '1.1.1.1', 'first ip is client address')

  requestMock = {
    headers: {
      'x-forwarded-for': ','
    },
    info: {
      remoteAddress: '9.9.9.9'
    }
  }
  t.ok(common.ipAddressFrom(requestMock) === '9.9.9.9', 'Use remote address on malformed header')

  process.env.X_FORWARDED_NONSTANDARD = 1
  /* Note that BEHIND_FASTLY is set as part of the testing environment */
  requestMock = {
    headers: {
      'x-forwarded-for': '1.1.1.1, 2.2.2.2, 3.3.3.3'
    }
  }
  t.ok(common.ipAddressFrom(requestMock) === '2.2.2.2', 'second ip is client address')
  delete process.env.X_FORWARDED_NONSTANDARD
  t.end()
})
