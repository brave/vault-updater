const verifications = require('../verification')

const _ = require('underscore')

const inspectBraveHeaders = (request) => {
  _.each(request.headers, (v, k) => {
    if (k.startsWith('x-brave-')) {
      console.log(`${k}=${v}`)
    }
  })
}

const storeDataCenterFlag = (headers, usage) => {
  usage.braveDataCenter = headers.hasOwnProperty('x-brave-req-from-dc') && headers['x-brave-req-from-dc'] === "true"
  return usage
}

const storeAPIKeyValidation = (headers, usage) => {
  if (headers['x-brave-api-key']) {
    usage.braveAPIKeyStatus = verifications.isValidAPIKey(headers['x-brave-api-key']) ? 'matched' : 'invalid'
  } else {
    usage.braveAPIKeyStatus = 'missing'
  }
  return usage
}

const potentiallyStoreBraveHeaders = (request, usage) => {
  if (!process.env.STORE_BRAVE_HEADERS) {
    return usage
  }

  // data center
  usage = storeDataCenterFlag(request.headers, usage)
  // api key
  usage = storeAPIKeyValidation(request.headers, usage)

  return usage
}

module.exports = {
  inspectBraveHeaders,
  potentiallyStoreBraveHeaders,
}
