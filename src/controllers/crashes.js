let assert = require('assert')
let Joi = require('joi')
let logger = require('logfmt')

exports.setup = (runtime) => {
  let post = {
    method: 'POST',
    path: '/1/crashes',
    config: {
      handler: function (request, reply) {
        logger.log(request.headers)
        console.log('Crash report start of processing')
        reply('OK')
        const payload = request.payload
        payload.ts = (new Date()).getTime()
        runtime.mongo.models.insertCrash(payload, (err, results) => {
          console.log(`crash recorded for version ${payload.ver}`)
        })
      }
    }
  }

  return [
    post
  ]
}
