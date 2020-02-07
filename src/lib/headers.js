const _ = require('underscore')

const potentiallyInspectBraveHeaders = (request) => {
  if (!process.env.INSPECT_BRAVE_HEADERS) return
  _.each(request.headers, (v, k) => {
    if (k.match(/^x-brave-/)) {
      console.log(`${k}=${v}`)
    }
  })
}

const potentiallyStoreBraveHeaders = (request, usage) => {
  if (!process.env.STORE_BRAVE_HEADERS) return
  // todo - store brave headers
}

module.exports = {
  potentiallyInspectBraveHeaders,
  potentiallyStoreBraveHeaders,
}
