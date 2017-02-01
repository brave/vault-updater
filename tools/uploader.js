#!/usr/bin/env node

/*
 *  Amazon S3 updater
 *
 *  This script handles the transfer of assets from the local machine to Amazon's S3 buckets.
 *
 *  To operate the following environment variables need to be set:
 *
 *    S3_KEY    - Amazon user access key
 *    S3_SECRET - Amazon secret user access key
 *    S3_REGION - Region identifier [us-east-1]
 *    S3_BUCKET - Bucket name
 *
 *  The S3_KEY and S3_SECRET are available from the IAM console in AWS
 */

var fs = require('fs')
var path = require('path')
var async = require('async')

var AWS = require('aws-sdk')

var channelData = require('../dist/common').channelData

var args = require('yargs')
    .usage('node tools/uploader.js --source=/full/directory/to/browser-laptop --send')
    .demand(['channel'])
    .describe('channel', 'channel identifier { dev, beta, release }')
    .default('source', '../browser-laptop')
    .describe('source', 'directory containing release files in dist/ folder')
    .default('os', null)
    .describe('os', 'operating system identifier { osx, linux, windows, winx64, winia32 }')
    .default('send', false)
    .describe('send', 'send files to S3')
    .argv

if (!channelData[args.channel]) {
  throw new Error(`Invalid channel ${args.channel}`)
}

if (args.os && ['windows', 'winx64', 'winia32', 'osx', 'linux'].indexOf(args.os) === -1) {
  throw new Error(`Invalid os ${args.os}`)
}

// Default bucket and region
const S3_BUCKET = process.env.S3_BUCKET || 'brave-download'
const S3_REGION = process.env.S3_REGION || 'us-east-1'

// Check that the source directory for the binary assets exists
if (!fs.existsSync(args.source)) {
  throw new Error(args.source + ' does not exist')
}

// Read in package.json
var pack = JSON.parse(fs.readFileSync(path.join(args.source, 'package.json'), 'utf-8'))
var version = pack.version

// index names for recipe slots
var LOCAL_LOCATION = 0
var REMOTE_LOCATION = 1
var OS_IDENTIFIER = 2

// Recipe tuples containing local relative paths to files, key locations on S3, and an os identifier
var recipes = [
  ['dist/Brave.tar.bz2', 'multi-channel/releases/CHANNEL/VERSION/linux64', 'linux'],
  ['dist/brave_VERSION_amd64.deb', 'multi-channel/releases/CHANNEL/VERSION/debian64', 'linux'],
  ['dist/brave-VERSION.x86_64.rpm', 'multi-channel/releases/CHANNEL/VERSION/fedora64', 'linux'],

  ['dist/Brave-VERSION.zip', 'multi-channel/releases/CHANNEL/VERSION/osx', 'osx'],
  ['dist/Brave.dmg', 'multi-channel/releases/CHANNEL/VERSION/osx', 'osx'],

  ['dist/x64/BraveSetup-x64.exe', 'multi-channel/releases/CHANNEL/VERSION/winx64', 'winx64'],
  ['dist/x64/BraveSetup-x64.exe', 'multi-channel/releases/CHANNEL/winx64', 'winx64'],
  ['dist/x64/RELEASES', 'multi-channel/releases/CHANNEL/winx64', 'winx64'],
  ['dist/x64/brave-VERSION-full.nupkg', 'multi-channel/releases/CHANNEL/winx64', 'winx64'],

  ['dist/ia32/BraveSetup-ia32.exe', 'multi-channel/releases/CHANNEL/VERSION/winia32', 'winia32'],
  ['dist/ia32/BraveSetup-ia32.exe', 'multi-channel/releases/CHANNEL/winia32', 'winia32'],
  ['dist/ia32/RELEASES', 'multi-channel/releases/CHANNEL/winia32', 'winia32'],
  ['dist/ia32/brave-VERSION-full.nupkg', 'multi-channel/releases/CHANNEL/winia32', 'winia32']
]

// For the dev channel we need to upload files to the legacy location. This will move them on to the dev
// mainline code where they will update from /multi-channel/releases/CHANNEL/winx64
if (args.channel === 'dev') {
  recipes = recipes.concat([
    ['dist/x64/BraveSetup-x64.exe', 'releases/winx64', 'winx64'],
    ['dist/x64/RELEASES', 'releases/winx64', 'winx64'],
    ['dist/x64/brave-VERSION-full.nupkg', 'releases/winx64', 'winx64']
  ])
}

// filter the recipes based on the 'os' command line argument
var osFilter = (recipe) => { return true }
if (args.os) {
  if (args.os === 'winx64') osFilter = function (recipe) { return recipe[OS_IDENTIFIER] === 'winx64' }
  if (args.os === 'winia32') osFilter = function (recipe) { return recipe[OS_IDENTIFIER] === 'winia32' }
  if (args.os === 'windows') osFilter = function (recipe) { return recipe[OS_IDENTIFIER] === 'winia32' || recipe[OS_IDENTIFIER] === 'winx64' }
  if (args.os === 'osx') osFilter = function (recipe) { return recipe[OS_IDENTIFIER] === 'osx' }
  if (args.os === 'linux') osFilter = function (recipe) { return recipe[OS_IDENTIFIER] === 'linux' }
  // note: fall through (invalid) case handled in args validation
}
recipes = recipes.filter(osFilter)

// Replace VERSION in the recipes with the package version
recipes = recipes.map((recipe) => {
  var dist = recipe[LOCAL_LOCATION].replace('VERSION', version)
  dist = dist.replace('CHANNEL', args.channel)

  var multi = recipe[REMOTE_LOCATION].replace('VERSION', version)
  multi = multi.replace('CHANNEL', args.channel)

  return [dist, multi]
})

console.log(`Working with version: '${version}' on channel '${args.channel}'. Sending to bucket '${S3_BUCKET}'.`)

// Check for S3 env variables
if (!process.env.S3_KEY || !process.env.S3_SECRET) {
  throw new Error('S3_KEY or S3_SECRET environment variables not set')
}

AWS.config.update({
  accessKeyId: process.env.S3_KEY,
  secretAccessKey: process.env.S3_SECRET,
  region: S3_REGION,
  sslEnabled: true
})

// Return a function used to transfer a file to S3
var makeS3Uploader = (filename, s3Key) => {
  return (cb) => {
    // Check to see that the file exists
    if (fs.existsSync(filename)) {
      // Transfer parameters
      var params = {
        localFile: filename,
        s3Params: {
          Bucket: S3_BUCKET,
          Key: s3Key + '/' + path.basename(filename),
          ACL: 'public-read'
        }
      }
      console.log(params)

      var body = fs.createReadStream(filename)
      var s3obj = new AWS.S3({
        params: {
          Bucket: S3_BUCKET,
          Key: s3Key + '/' + path.basename(filename),
          ACL: 'public-read'
        }
      })

      var lastPercent = 0
      s3obj.upload({Body: body}).
        on('httpUploadProgress', function(evt) {
          var percent = Math.round(evt.loaded / evt.total * 100)
          if (lastPercent !== percent) {
            process.stdout.write(percent + '% ')
            lastPercent = percent
          }
        }).
        send((err, data) => {
          console.log('Done')
          console.log(data)
          cb(err)
        })

    } else {
      console.log('IGNORING - ' + filename + ' does not exist')
      cb(null)
    }
  }
}

// Return a function used to report on the status of a file
var makeReporter = (filename, recipe) => {
  return (cb) => {
    if (fs.existsSync(filename)) {
      console.log('OK       - ' + filename + ' exists -> ' + recipe)
    } else {
      console.log('IGNORING - ' + filename + ' does not exist')
    }
    cb(null)
  }
}

// Create array of function handlers
var recipeHandlers = recipes.map((recipe) => {
  var fullFilename = path.join(args.source, recipe[LOCAL_LOCATION])
  if (args.send) {
    return makeS3Uploader(fullFilename, recipe[REMOTE_LOCATION])
  } else {
    return makeReporter(fullFilename, recipe[REMOTE_LOCATION])
  }
})

// Call the function handlers
async.series(recipeHandlers, (err, handler) => {
  if (err) {
    throw new Error(err)
  }
  console.log("* Process complete")
})
