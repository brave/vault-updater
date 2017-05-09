/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var tap = require('tap')
var _ = require('underscore')

var common = require('../src/common')

tap.ok(common.platformData.linux, 'linux platform configured')
