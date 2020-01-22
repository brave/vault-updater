#!/usr/bin/env node

let _ = require('underscore')
let rp = require('request-promise')
let common = require('../src/common')

let url = process.env.UPDATES_URI  || 'https://laptop-updates-staging.brave.com'

const extensionsXML = [
`
  <?xml version="1.0" encoding="UTF-8"?>
  <request protocol="3.0" version="chrome-53.0.2785.116" prodversion="53.0.2785.116" requestid="{b4f77b70-af29-462b-a637-8a3e4be5ecd9}" lang="" updaterchannel="stable" prodchannel="stable" os="mac" arch="x64" nacl_arch="x86-64">
    <hw physmemory="16"/>
    <os platform="Mac OS X" version="10.11.6" arch="x86_64"/>
  </request>`
]

const randInterval = function(min, max) {
  return Math.floor(Math.random() * max) + min
}

// GET /1/usage/brave-core
// GET /1/usage/ios
// GET /1/usage/android
const usagePings = function() {
  const corePlatforms = ['osx-bc', 'winia32-bc', 'winx64-bc', 'linux-bc', 'android-bc']
  const channels = ['dev', 'release', 'nightly', 'beta', 'stable']
  const booleanString = ['true', 'false']

  let platform = _.sample(['android', 'ios', 'brave-core'])
  const path = `/1/usage/${platform}`
  const endpoint = `${url}${path}`

  if (platform === 'brave-core') {
    platform = _.sample(corePlatforms)
  }

  const channel = _.sample(channels)
  const daily = _.sample(booleanString)
  const weekly = _.sample(booleanString)
  const monthly = _.sample(booleanString)
  const first = 'true'
  version = '1.2.3'

  const options = {
    url: endpoint,
    qs: {
      channel: channel,
      platform: platform,
      daily: daily,
      weekly: weekly,
      monthly: monthly,
      first: 'false',
      version: version,
      woi: '2019-08-12',
    }
  }

  console.log(`Queuing request for ${path}`)
  return rp.get(options)
}

// POST /1/crashes
// POST /1/bc-crashes
const crashReport = function() {
  const crashVersion = _.sample(['crashes', 'bc-crashes'])
  const path = `/1/${crashVersion}`
  const endpoint = `${url}${path}`

  const options = {
    url: endpoint,
    // TODO: Change this to make JSON blobs vary in size?
    json: {
      "test": "test"
    }
  }

  console.log(`Queueing request for ${path}`)
  return rp.post(options)
}

// POST /extensions
const reportExtensions = function() {
  const path = '/extensions'
  const endpoint = `${url}${path}`

  const options = {
    url: endpoint,
    headers: {
      'Content-Type': 'application/xml'
    },
    body: _.sample(extensionsXML)
  }

  console.log(`Queueing request for ${path}`)
  return rp.post(options)
}

// GET /1/installerEvent
const installerEvents = function() {
  const platforms = ['winia32-bc', 'winx64-bc']
  const channels = ['dev', 'release', 'nightly', 'beta']
  const events = ['startup', 'download-complete', 'installer-run']

  const path = '/1/installerEvent'
  const endpoint = `${url}${path}`

  const options = {
    url: endpoint,
    qs: {
      platform: _.sample(platforms),
      version: '1.2.3',
      channel: _.sample(channels),
      event: _.sample(events)
    }
  }

  console.log(`Queueing request for ${path}`)
  return rp.get(options)
}

// GET /1/releases/{channel}/{version}/{platform}
const getRelease = function() {
  const platforms = _.keys(common.platformData)
  const channels = [
    'dev',
    'beta',
    'stable',
    'developer',
    'nightly'
  ]

  const version = '1.2.3'
  const channel = _.sample(channels)
  const platform = _.sample(platforms)
  const path = `/1/releases/${channel}/${version}/${platform}`
  const endpoint = `${url}${path}`

  console.log(`Queueing request for ${path}`)
  return rp.get(endpoint)
}

const run = async function() {

  weightedFuncs = [
    usagePings,
    crashReport,
    reportExtensions,
    installerEvents,
    getRelease,
  ]

  reqCount = randInterval(5, 30)
  let reqs = []

  for (let i = 0; i < reqCount; i++) {
    let f = _.sample(weightedFuncs)
    reqs.push(f())
  }

  let responses = await Promise.all(reqs)
  _.each(responses, (resp) => console.log("Response: " + resp))
}

setInterval(run, randInterval(1000, 4000))
