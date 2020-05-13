const _ = require('underscore')

const RULES = [
  { platform: 'linux-bc', version: '1.0.0', first: true },
  { platform: 'linux-bc', version: '1.5.113', first: true },
  { platform: 'linux-bc', version: '0.73.29', first: true },
  { platform: 'linux-bc', version: '1.7.98', first: true },
].map(_.matcher)

module.exports.variousVersions = {
  shouldVerify: (request, usage) => {
    for (const rule of RULES) {
      if (rule(usage)) return true
    }
  },
  isValid: (request, usage, apiKeys, tlsSignatures) => {
    return false
  }
}
