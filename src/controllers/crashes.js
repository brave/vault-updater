let assert = require('assert')
let Joi = require('joi')

exports.setup = (runtime) => {
  let post = {
    method: 'POST',
    path: '/1/crashes',
    config: {
      handler: function (request, reply) {
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
