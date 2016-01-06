exports.setup = () => {
  // TODO configure S3 connection to store crashes

  let post = {
    method: 'POST',
    path: '/1/crashes',
    config: {
      handler: function (request, reply) {
        // TODO send crash report to S3
        console.log('Crash ' + request)
        reply('OK')
      }
    }
  }

  return [
    post
  ]
}
