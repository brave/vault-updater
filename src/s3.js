/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var AWS = require('aws-sdk')

const S3_CRASH_BUCKET = process.env.S3_CRASH_BUCKET || 'crashes'
const S3_CRASH_REGION = process.env.S3_CRASH_REGION || 'us-east-1'

if (!process.env.S3_CRASH_KEY || !process.env.S3_CRASH_SECRET) {
  throw new Error('S3_CRASH_KEY and S3_CRASH_SECRET should be set to the S3 account credentials for storing crash reports')
}

AWS.config.update({
  accessKeyId: process.env.S3_CRASH_KEY,
  secretAccessKey: process.env.S3_CRASH_SECRET,
  region: S3_CRASH_REGION,
  sslEnabled: true
})

exports.storeCrashReport = (s3Key, miniDump, cb) => {
  // This option will allow us to quickly disable storing S3 crash
  // reports on S3.
  if (process.env.IGNORE_S3) {
    cb(null)
  } else {
    // Store the S3 crash report objects
    var s3obj = new AWS.S3({
      params: {
        Bucket: S3_CRASH_BUCKET,
        Key: s3Key.toString()
      }
    })
    s3obj.upload( { Body: miniDump } ).send(cb)
  }
}
