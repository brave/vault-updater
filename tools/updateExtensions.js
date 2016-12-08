const request = require('request')
const {getResponseComponents} = require('../src/controllers/extensions')
const {readComponentsForVersionUpgradesOnly} = require('../src/setup')
const fs = require('fs')
const path = require('path')
const args = require('yargs')
    .usage('node $0 --chromium=X.X.X.X [--download]')
    .demand(['chromium'])
    .default('download', false)
    .argv

const googleUpdateServerBaseUrl = 'https://clients2.google.com/service/update2'
const getRequestBody = (componentId, chromiumVersion, components) =>
  `<?xml version="1.0" encoding="UTF-8"?>
  <request protocol="3.0" version="chrome-${chromiumVersion}" prodversion="${chromiumVersion}" requestid="{b4f77b70-af29-462b-a637-8a3e4be5ecd9}" lang="" updaterchannel="stable" prodchannel="stable" os="mac" arch="x64" nacl_arch="x86-64">
    <hw physmemory="16"/>
    <os platform="Mac OS X" version="10.11.6" arch="x86_64"/>` +
  components.reduce((responseXML, component) => {
    return responseXML +
       `<app appid="${component[0]}" version="0.0.0.0" installsource="ondemand">
          <updatecheck />
          <ping rd="-2" ping_freshness="" />
        </app>`
  }, '') +
  '</request>'

const braveComponents = readComponentsForVersionUpgradesOnly()
const components = braveComponents
  // Skip PDFJS since we maintain our own and Google doesn't know anything about it
  .filter((component) => component[0] !== 'jdbefljfgobbmcidnmpjamcbhnbphjnb')

const body = getRequestBody('niloccemoadcdkdjlinkgdfekeahmflj', args.chromium, components)
const mkdir = (path) => !fs.existsSync(path) && fs.mkdirSync(path)

request.post({
  url: googleUpdateServerBaseUrl,
  body: body
}, function optionalCallback (err, httpResponse, body) {
  if (err) {
    return console.error('failed:', err)
  }
  const responseComponents = getResponseComponents(body)
  if (responseComponents.length === 0) {
    console.log('All components up to date')
  }

  console.log('Outdated components:\n--------------------')
  console.log(responseComponents
    // Add in the Brave info for each component
    .map((component) => [...component, ...braveComponents.find((braveComponent) => braveComponent[0] === component[0])])
    // Filter out components with the same Brave versions as Google version
    .filter((component) => component[1] !== component[3])
    // And reduce to a string that we print out
    .reduce((result, component) => result + `Component: ${component[5]} (${component[0]})\nChrome store: ${component[1]}\nBrave store: ${component[3]}\n\n`, ''))

  if (args.download) {
    mkdir('out')
    console.log('Downloading...')
    responseComponents.forEach(([componentId, componentVersion]) => {
      const dir = path.join('out', componentId)
      const filename = `extension_${componentVersion.replace(/\./g,'_')}.crx`
      mkdir(dir)
      const outputPath = path.join(dir, filename)
      var file = fs.createWriteStream(outputPath)
      const url = `${googleUpdateServerBaseUrl}/crx?response=redirect&prodversion=${args.chromium}&x=id%3D${componentId}%26uc`
      console.log(url)
      request(url).pipe(fs.createWriteStream(outputPath))
    })
  }
})
