exports.heartBeat = {
  method: 'GET',
  path: '/heartbeat',
  config:
  { handler: function (request, reply) {
    request.log([], 'OK')
    reply('OK')
  },
    validate: undefined
  }
}

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

exports.comparableVersion = (version) => {
  let components = version.split('.').map((x) => parseInt(x, 10))
  return components[0] * 10000000 + components[1] * 10000 + components[2]
}
