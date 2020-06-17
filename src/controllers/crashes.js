const common = require('../common')

let assert = require('assert')
let Joi = require('joi')
let logger = require('logfmt')
let semver = require('semver')
let randomstring = require('randomstring')

exports.setup = (runtime) => {
  const braveCorePost = {
    method: 'POST',
    path: '/1/bc-crashes',
    config: {
      description: "Proxy crash reports to Fastly endpoint",
      handler: {
        proxy: {
          uri: process.env.CRASH_PROXY,
          passThrough: true,
          timeout: 30000
        }
      }
    }
  }

  return [
    braveCorePost
  ]
}
