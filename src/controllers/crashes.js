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
        console.log(payload)
        runtime.mongo.models.insertCrash(payload, (err, results) => {
          assert.equal(err, null)
          console.log(`crash recorded for version ${payload.ver}`)
          reply('OK')
        })
      }
    }
  }

  return [
    post
  ]
}
