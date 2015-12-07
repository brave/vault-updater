let fs = require('fs')
let path = require('path')
let glob = require('glob')

let common = require('./common')

// setup directories if in dev
exports.confirm = (profile) => {
  if (profile === 'development') {
    // check for release directories
    if (!fs.existsSync(path.join(__dirname, '..', 'releases'))) {
      console.log('release directories do not exist - creating')
      fs.mkdirSync(path.join(__dirname, '..', 'releases'))
      fs.mkdirSync(path.join(__dirname, '..', 'releases', 'osx'))
      fs.mkdirSync(path.join(__dirname, '..', 'releases', 'x64'))
    }
  } else {
    // prod - use the cdn
  }
}

// read in the release files by platform
exports.readReleases = (directory) => {
  let files = glob.sync(path.join(__dirname, '..', directory, '*.json'))
  let releases = {}
  files.forEach((filename) => {
    let contents = JSON.parse(fs.readFileSync(filename, 'utf-8'))
    contents.forEach((release) => {
      // integer for version comparison
      release.comparable_version = common.comparableVersion(release.version)
    })
    releases[path.basename(filename, '.json')] = contents
  })
  return releases
}
