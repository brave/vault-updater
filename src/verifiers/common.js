// does the request tls signature match a set of known signatures
const doesTLSMatch = (request, tlsSignatures) => {
  // TODO - add tls verification
}

// does the api_key exist and match a known set
const doesAPIKeyMatch = (request, apiKeys) => {
  return !!apiKeys.find((key) => { return request.headers.api_key === key })
}

module.exports = {
  doesTLSMatch,
  doesAPIKeyMatch
}
