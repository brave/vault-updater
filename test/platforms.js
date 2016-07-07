var tap = require('tap')
var _ = require('underscore')

var common = require('../dist/common')

tap.ok(common.platformData.linux, 'linux platform configured')
