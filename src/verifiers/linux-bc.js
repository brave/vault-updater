module.exports.onePointZeroFirst = {
  shouldVerify: (request, usage) => {
    if (usage.platform === 'linux-bc' &&
      usage.version === '1.0.0' &&
      usage.first) return true
  },
  isValid: (request, usage, apiKeys, tlsSignatures) => {
    return false
  }
}
