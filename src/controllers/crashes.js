let assert = require('assert')
let Joi = require('joi')
let logger = require('logfmt')
let semver = require('semver')
let randomstring = require('randomstring')

exports.setup = (runtime) => {
  let post = {
    method: 'POST',
    path: '/1/crashes',
    config: {
      handler: function (request, reply) {
        let crash_id = 'OK'
        try {
          if (request.payload && request.payload['muon-version'] && semver.gt(request.payload['muon-version'], '4.7.3')) {
            crash_id = randomstring.generate({
              length: 16,
              charset: 'hex'
            })
          }
        } catch (e) {
          // most likely invalid muon version - ignore and send OK
        }
        reply(crash_id)
        const payload = request.payload
        payload.ts = (new Date()).getTime()
        payload.crash_id = crash_id
        delete payload.guid
        runtime.mongo.models.insertCrash(payload, 'muon', (err, results) => {
          console.log(`crash recorded for version ${payload.ver}`)
        })
      }
    }
  }

  let braveCorePost = {
    method: 'POST',
    path: '/1/bc-crashes',
    config: {
      handler: function (request, reply) {
        let crash_id = randomstring.generate({
          length: 16,
          charset: 'hex'
        })
        reply(crash_id)
        const payload = request.payload
        payload.ts = (new Date()).getTime()
        payload.crash_id = crash_id
        delete payload.guid
        runtime.mongo.models.insertCrash(payload, 'braveCore', (err, results) => {
          console.log(`crash recorded for version ${payload.ver}`)
        })
      }
    }
  }

  return [
    post,
    braveCorePost
  ]
}
