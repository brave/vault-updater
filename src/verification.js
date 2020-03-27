const moment = require('moment')

// verification libraries
const ios = require('./verifiers/ios')
const linuxCore = require('./verifiers/linux-bc')

const FILTERED_COLLECTION = 'filtered' || process.env.FILTERED_COLLECTION

// array of verifiers. A verifier is compose of a shouldVerify function and an
// isValid function.
const verifiers = [
  linuxCore.variousVersions,
]

// public function to determine is a request should be verified, and if so,
// if the usage ping is valid (by iterating over a set of verifiers)
const isUsagePingValid = (request, usage, apiKeys = [], tlsSignatures = []) => {
  for (let v of verifiers) {
    if (!v.shouldVerify(request, usage)) continue
    if (!v.isValid(request, usage, apiKeys, tlsSignatures)) {
      console.error(`invalid usage ping for ${usage.platform} ${usage.version}`)
      return false
    }
  }
  return true
}

// write filtered usage ping to separate collection for later analysis
const writeFilteredUsagePing = (mg, usage, cb) => {
  usage.ts = (new Date()).getTime()
  usage.year_month_day = moment().format('YYYY-MM-DD')
  const filteredCollection = mg.collection(FILTERED_COLLECTION)
  filteredCollection.insertOne(usage, cb)
}

module.exports = {
  isUsagePingValid,
  writeFilteredUsagePing
}
