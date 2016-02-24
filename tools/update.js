/*
  Update metadata for release
 */

var fs = require('fs')
var path = require('path')
var _ = require('underscore')

var args = require('yargs')
    .usage('Update version files\n\nNote: Will not replace data files unless --overwrite flag set\n\nnode $0 --version=X.X.X --notes="release notes" --overwrite')
    .demand(['version', 'notes'])
    .default('overwrite', false)
    .argv

if (!args.version.match(/^[0-9]+\.[0-9]+\.[0-9]+$/)) {
  throw "Invalid version format. Must be X.X.X"
}

const OSX_TEMPLATE = 'https://brave-download.global.ssl.fastly.net/releases/VERSION/osx/Brave-VERSION.zip'
const LINUX64_TEMPLATE = 'https://brave-download.global.ssl.fastly.net/releases/VERSION/linux64/Brave.tar.bz2'

var winx64_entry = {
  version: args.version,
  name: 'Brave ' + args.version,
  pub_date: (new Date()).toISOString(),
  notes: args.notes
}

var osx_entry = _.clone(winx64_entry)
osx_entry.url = OSX_TEMPLATE
osx_entry.url = osx_entry.url.replace(/VERSION/g, args.version)

var linux64_entry = _.clone(winx64_entry)
linux64_entry.url = LINUX64_TEMPLATE
linux64_entry.url = linux64_entry.url.replace(/VERSION/g, args.version)

var winx64_json = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'winx64.json')))
var osx_json = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'osx.json')))
var linux64_json = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'linux64.json')))

winx64_json.unshift(winx64_entry)
osx_json.unshift(osx_entry)
linux64_json.unshift(linux64_entry)

console.log("Contents")
console.log(winx64_json)
console.log(osx_json)
console.log(linux64_json)

if (args.overwrite) {
  console.log("Writing data files")
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'winx64.json'), JSON.stringify(winx64_json, null, 2))
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'osx.json'), JSON.stringify(osx_json, null, 2))
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'linux64.json'), JSON.stringify(linux64_json, null, 2))
  console.log("Done")
}
