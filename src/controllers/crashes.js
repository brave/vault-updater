let assert = require('assert')
let Joi = require('joi')

exports.setup = (runtime) => {
  let post = {
    method: 'POST',
    path: '/1/crashes',
    config: {
      handler: function (request, reply) {
        const payload = request.payload
        payload.ts = (new Date()).getTime()
        runtime.mongo.models.insertCrash(payload, (err, results) => {
          console.log(`crash recorded for version ${payload.ver}`)
        })
        console.log('Crash response sent')
        reply('OK')
      }
    }
  }

  return [
    post
  ]
}
