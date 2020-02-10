const _ = require('underscore')

const potentiallyInspectBraveHeaders = (request) => {
  if (!process.env.INSPECT_BRAVE_HEADERS) return
  _.each(request.headers, (v, k) => {
    if (k.match(/^x-brave-/)) {
      console.log(`${k}=${v}`)
    }
  })
}

const storeDataCenterFlag = (headers, usage) => {
  usage.braveDataCenter = headers.hasOwnProperty('x-brave-req-from-dc') && headers['x-brave-req-from-dc']
  return usage
}

const potentiallyStoreBraveHeaders = (request, usage) => {
  if (!process.env.STORE_BRAVE_HEADERS) return usage
  // first brave flag to test is data center
  usage = storeDataCenterFlag(request.headers, usage)
  // todo add other brave flags
  return usage
}

module.exports = {
  potentiallyInspectBraveHeaders,
  potentiallyStoreBraveHeaders,
}
