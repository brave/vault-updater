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

exports.channelData = {
  'dev': {},
  'beta': {},
  'stable': {}
}

exports.platformData = {
  'osx': {},
  'winx64': {},
  'linux64': {},
  'ubuntu64': {},
  'debian64': {},
  'fedora64': {},
  'openSUSE64': {},
  'redhat64' :{},
  'mint64' :{},
  'undefined': {}
}
