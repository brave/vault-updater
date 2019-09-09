let randomstring = require('randomstring')

exports.setup = (runtime) => {
  let braveCorePost = {
    method: 'POST',
    path: '/1/bc-crashes',
    config: {
      description: "* Record crash for Brave Core",
      handler: function (request, reply) {
        let crash_id = randomstring.generate({
          length: 16,
          charset: 'hex'
        })
        const payload = request.payload
        payload.ts = (new Date()).getTime()
        payload.crash_id = crash_id
        delete payload.guid
        runtime.mongo.models.insertCrash(payload, 'braveCore', (err, results) => {
          console.log(`crash recorded for version ${payload.ver}`)
        })
        return crash_id
      }
    }
  }

  return [
    braveCorePost
  ]
}
