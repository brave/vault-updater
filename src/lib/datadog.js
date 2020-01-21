var Datadog = exports;

Datadog.register = function (server, options, next) {
  let statsd = options.statsd;

  server.on('response', function(request) {
    let tags = Datadog.makeTags(request)
    let responseTime = Datadog.responseTime(request)
    let statusCode = Datadog.statusCode(request)

    statsd.increment('http.request.count', 1, 0.25, tags)
    statsd.histogram('http.response.time.milliseconds', responseTime, 0.25, tags)
    statsd.histogram('http.response.status.buckets', statusCode, 0.25, tags)
  })

  next()
}

Datadog.makeTags = function(request) {
  let tags = {}

  const route = request.route

  tags.status = Datadog.statusCode(request)

  if (route) {
    tags.path = route.path
    tags.method = route.method
  } else {
    tags.path = 'unknown'
    tags.method = 'unknown'
  }
  return tags
}

Datadog.responseTime = function(request) {
  if (!request.info) {
    return Infinity
  }

  return request.info.responded - request.info.received
}

Datadog.statusCode = function(request) {
  const response = request.response

  return !response ? 'unknown' : response.statusCode
}

Datadog.register.attributes = {
  name: 'datadog',
  version: '1.0.0'
}
