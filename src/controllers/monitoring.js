
exports.setup = (runtime) => {

  let stats = {
    method: 'GET',
    path: '/api/1/stats',
    config: {
      handler: function(request, reply) {
        runtime.mongo.models.retrieveStats((err, stats) => {
          var obj = {
            mongo: {
              allocated: stats.fileSize,
              used: stats.dataSize + stats.indexSize,
              ratio: ( stats.dataSize + stats.indexSize ) / stats.fileSize,
              status: 'ok'
            }
          }
          if (obj.ratio > 0.8) {
            obj.mongo.status = 'warning'
          }
          reply(obj)
        })
      }
    }
  }

  return [
    stats
  ]
}
