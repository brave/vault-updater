const request = require('request')
const {getResponseComponents} = require('../src/controllers/extensions')
const {readComponentsForVersionUpgradesOnly} = require('../src/setup')
const s3 = require('s3')
const fs = require('fs')
const path = require('path')
const args = require('yargs')
    .usage('node $0 --chromium=X.X.X.X [--download]')
    .demand(['chromium'])
    // Whether or not to download from the chromium server when it is outdated
    .default('download', false)
    // Whether or not to upload to brave's s3 when it is downloaded (download must also be set)
    .default('upload', false)
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

const client = s3.createClient({
  maxAsyncS3: 20,
  s3RetryCount: 3,
  s3RetryDelay: 1000,
  multipartUploadThreshold: 20971520,
  multipartUploadSize: 15728640,
  // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#constructor-property
  s3Options: {}
})

const braveComponents = readComponentsForVersionUpgradesOnly()
const components = braveComponents
  // Skip PDFJS since we maintain our own and Google doesn't know anything about it
  .filter((component) => component[0] !== 'jdbefljfgobbmcidnmpjamcbhnbphjnb')

const body = getRequestBody('niloccemoadcdkdjlinkgdfekeahmflj', args.chromium, components)
const mkdir = (path) => !fs.existsSync(path) && fs.mkdirSync(path)

const uploadFile = (filePath, componentId, componentFilename) => {
  return new Promise((resolve, reject) => {
    var params = {
      localFile: filePath,
      // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property
      s3Params: {
        Bucket: 'brave-extensions',
        Key: `release/${componentId}/${componentFilename}`,
        ACL: 'public-read'
      }
    }
    const uploader = client.uploadFile(params)
    uploader.on('error', function (err) {
      console.error('Unable to upload:', err.stack, 'Do you have ~/.aws/credentials filled out?')
      reject()
    })
    uploader.on('end', function (params) {
      resolve()
    })
  })
}

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
      request(url)
        .pipe(fs.createWriteStream(outputPath))
        .on('finish', function () {
          console.log(`Downloaded ${outputPath} from Google's server`)
          if (args.upload) {
            uploadFile(outputPath, componentId, filename).then(() => {
              console.log(`Uploaded ${outputPath} to s3`)
            })
          }
        });
    })
  }
})
