const builder = require('xmlbuilder')
const xmldoc = require('xmldoc')
const {comparableVersion} = require('../common')
const braveBaseExtensionUrl = process.env['BRAVE_BASE_EXTENSION_URL'] || 'https://s3.amazonaws.com/brave-extensions/release'

/**
 * Extracts an array of requested extensions along with their version
 *
 * @param @requestXML - The input extension request XML protocol 3.0
 * @return undefined if there was an error parsing the document, or an array of
 *   [extensionId, extensionVersion] if successful.
 */
const getRequestedExtensions = (requestXML) => {
  const doc = new xmldoc.XmlDocument(requestXML)
  if (doc.attr.protocol !== '3.0') {
    console.error('Only protocol v3 is supproted')
    return undefined
  }
  const extensions = doc.childrenNamed('app')
      .map((app) => [app.attr.appid, app.attr.version])
  return extensions
}

/**
 * Extracts an array of components along with their version from response XML
 *
 * @param @responseXML - The update check response XML protocol 3.0
 * @return undefined if there was an error parsing the document, or an array of
 *   [componentId, componentVersion] if successful.
 */
const getResponseComponents = (responseXML) => {
  const doc = new xmldoc.XmlDocument(responseXML)
  if (doc.attr.protocol !== '3.0') {
    console.error('Only protocol v3 is supproted')
    return undefined
  }
  const extensions = doc.childrenNamed('app')
      .map((app) => {
        return [app.attr.appid, app.descendantWithPath('updatecheck.manifest').attr.version]
      })
  return extensions
}

/**
 * Filters out to only the availableExtensions that should be updated for the request.
 * For example some extensions may not be requested, and some may already have a fully
 * updated, or even newer versions.
 */
const getExtensionsWithUpdates = (availableExtensions, requestedExtensions) =>
  requestedExtensions.reduce((resultExtensions, requestedExtension) => {
    const foundExtension = availableExtensions.find((extension) => extension[0] === requestedExtension[0])
    if (foundExtension) {
      if (comparableVersion(foundExtension[1]) > comparableVersion(requestedExtension[1])) {
        resultExtensions.push(foundExtension)
      }
    }
    return resultExtensions
  }, [])

const getExtensionsResponse = (baseCRXUrl, extensions) => {
  const doc = builder
    .create('response')
      .att('protocol', '3.0')
      .att('server', 'prod')
  extensions.forEach(([extensionId, extensionVersion, extensionSHA256]) => {
    doc.ele('app')
      .att('appid', extensionId)
      .ele('updatecheck')
        .att('status', 'ok')
        .ele('urls')
          .ele('url')
            .att('codebase', `${baseCRXUrl}/${extensionId}/extension_${extensionVersion.replace(/\./g, '_')}.crx`)
          .up()
        .up()
      .ele('manifest')
        .att('version', extensionVersion)
        .ele('packages')
          .ele('package')
            .att('name', `extension_${extensionVersion.replace(/\./g, '_')}.crx`)
            .att('hash_sha256', extensionSHA256)
            .att('required', true)
          .up()
        .up()
      .up()
  })
  return doc.toString({ pretty: true })
}

const setup = (runtime, availableExtensions) => {
  let extensionsRoute = {
    method: ['POST'],
    path: '/extensions',
    config: {
      handler: function (request, reply) {
        const requestedExtensions = getRequestedExtensions(request.payload.toString())
        const extensionsWithUpdates = getExtensionsWithUpdates(availableExtensions, requestedExtensions)
        reply(getExtensionsResponse(braveBaseExtensionUrl, extensionsWithUpdates))
          .type('application/xml')
      },
      payload: {
        parse: false,
        allow: 'application/xml'
      }
    }
  }

  return [
    extensionsRoute
  ]
}

module.exports = {
  getRequestedExtensions,
  getResponseComponents,
  getExtensionsWithUpdates,
  getExtensionsResponse,
  setup
}
