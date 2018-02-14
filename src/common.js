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

exports.ipAddressFrom = (request) => {
  // https://en.wikipedia.org/wiki/X-Forwarded-For    X-Forwarded-For: client, proxy1, proxy2
  // Since it is easy to forge an X-Forwarded-For field the given information should be used with care.
  // The last IP address is always the IP address that connects to the last proxy, which means it is the most reliable source of information.

  const forwardedFor = request.headers['x-forwarded-for']
  if (forwardedFor) {
    const forwardedIps = forwardedFor.split(',')
    if (process.env.BEHIND_FASTLY) {
      return forwardedIps[forwardedIps.length - 2].trim() || request.info.remoteAddress
    } else {
      return forwardedIps[forwardedIps.length - 1].trim() || request.info.remoteAddress
    }
  } else {
    return request.info.remoteAddress
  }
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
