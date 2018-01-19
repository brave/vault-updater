const r = require('request')

exports.root = {
  method: 'GET',
  path: '/',
  config:
  { handler: function (request, reply) {
    request.log([], 'Auto updater')
    reply('Auto updater')
  },
    validate: undefined
  }
}

/* Converts a version string to something that can be compared
 * with comparison operators.
 * For 4 component versions, this is only guaranteed to work with
 * versions of the form: 9007.1992.5474.0991 and lower because
 * Number.MAX_SAFE_INTEGER is 9007199254740991
 *
 * Note: This is still required for four numeric digits extensions,
 * as semver is defined as a three element tuple separated by periods.
 */
exports.comparableVersion = (version) =>
  version.split('.')
    .map((x) => parseInt(x, 10))
    .reduce((prevValue, currentValue) =>
      Math.pow(10, 4) * prevValue + currentValue, 0)

exports.channelData = {
  dev: {},
  beta: {},
  stable: {},
  developer: {},
  nightly: {}
}

exports.platformData = {
  'osx': {},
  'winx64': {},
  'winia32': {},
  'linux64': {},
  'ubuntu64': {},
  'debian64': {},
  'fedora64': {},
  'openSUSE64': {},
  'redhat64': {},
  'mint64': {},
  'undefined': {},
  'linux': {}
}

/*
  return ip address from the request, taking into consideration the Heroku request headers
*/
exports.ipAddressFrom = function (request) {
  if (request.headers['X-Forwarded-For']) return request.headers['X-Forwarded-For'].split(',')[0]
  if (request.info.remoteAddress) return request.info.remoteAddress
  return
}

exports.userAgentFrom = function (request) {
  return request.headers['user-agent']
}

// promisified request
exports.prequest = function (url) {
  return new Promise((resolve, reject) => {
    r(url, (err, results, body) => {
      if (err) return reject(err)
      else return resolve(body)
    })
  })
}

exports.nope = function (msg) {
  console.log(msg)
  process.exit(1)
}
