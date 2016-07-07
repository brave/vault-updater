var tap = require('tap')
var _ = require('underscore')

var common = require('../dist/common')

tap.ok(common.comparableVersion('0.10.1') > common.comparableVersion('0.9.0'), 'version compare correctly')
