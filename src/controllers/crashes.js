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
          assert.equal(err, null)
          console.log(`crash recorded for version ${payload.ver}`)
          reply('OK')
        })
      },
      validate: {
        payload: {
          ver: Joi.string().required(),
          platform: Joi.string().required(),
          process_type: Joi.string().required(),
          guid: Joi.string().required(),
          _version: Joi.string().required(),
          _productName: Joi.string().required(),
          prod: Joi.string().required(),
          _companyName: Joi.string().required()
        }
      }
    }
  }

  return [
    post
  ]
}
