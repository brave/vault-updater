// Build a usage object if query parameters passed in
let buildUsage = (request) => {
  if (request.query.daily) {
    return {
      daily: request.query.daily === 'true',
      weekly: request.query.weekly === 'true',
      monthly: request.query.monthly === 'true',
      platform: 'ios',
      version: request.query.version || 'unknown',
      first: request.query.first === 'true',
      channel: request.query.channel || 'unknown'
    }
  } else {
    return null
  }
}

exports.setup = (runtime) => {
  const get = {
    method: 'GET',
    path: '/1/usage/ios',
    config: {
      handler: function (request, reply) {
        var usage = buildUsage(request)
        runtime.mongo.models.insertIOSUsage(usage, (err, results) => {
          if (err) {
            console.log(err.toString())
            reply({ ts: (new Date()).getTime(), status: 'error' }).code(500)
          } else {
            reply({ ts: (new Date()).getTime(), status: 'ok' })
          }
        })
      }
    }
  }

  return [get]
}
