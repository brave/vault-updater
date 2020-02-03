const semver = require('semver')

const common = require('./common')

// earliest version in which api_key is send for ios
const IOS_API_KEY_VERSION = process.env.IOS_API_KEY_VERSION || '1.0.0'

module.exports.apiKey = {
  shouldVerify: (request, usage) => {
    if (usage.platform !== 'ios') return false
    if (!semver.gte(usage.version, IOS_API_KEY_VERSION)) return false
    return true
  },
  isValid: (request, usage, apiKeys, tlsSignatures) => {
    const apiKey = request.headers.api_key || 'missing'
    return common.doesAPIKeyMatch(request, apiKeys)
  },
}
