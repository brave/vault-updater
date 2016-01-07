var AWS = require('aws-sdk')

AWS.config.region = process.env.AWS_REGION || 'us-west-2'
var bucketName = process.env.AWS_BUCKET_NAME || 'brave-laptop-crash-reports'
var s3 = new AWS.S3()

exports.setup = () => {
  let post = {
    method: 'POST',
    path: '/1/crashes',
    config: {
      handler: function (request, reply) {
        // TODO format and send crash report to S3
        var payload = {
          Bucket: bucketName,
          Key: 'some-key',
          Body: 'This is the body'
        }
        s3.upload(payload, (err, results) => {
          console.log('Crash ' + request)
          if (err) {
            console.log(err.toString())
            console.log(results)
            reply(err.toString()).code(500)
          } else {
            reply('OK')
          }
        })
      }
    }
  }

  return [
    post
  ]
}
