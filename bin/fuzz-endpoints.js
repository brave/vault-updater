#!/usr/bin/env node

let _ = require('underscore')
let rp = require('request-promise')
let common = require('../src/common')

let url = process.env.UPDATES_URI  || 'https://laptop-updates-pre.brave.com/'
let api_key = process.env.API_KEY  || 'key'
let minRequests = process.env.REQUESTS_MIN || 5
let maxRequests = process.env.REQUESTS_MAX || 30

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

const braveUA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36"

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

// GET /download/desktop/{referral_code}
// GET /download/android/{referral_code}
// GET /download/ios/{referral_code}
const downloads = function() {
  const codes = [ 'wts071', 'ABC123', 'BRV001', 'CLU884' ]
  const platforms = [ 'desktop', 'android', 'ios' ]

  const referralCode = _.sample(codes)
  const platform = _.sample(platforms)
  const path = `/download/${platform}/${referralCode}`
  const endpoint = `${url}${path}`
  console.log(`Queuing request for ${path}`)
  const options = {
    url: endpoint,
    headers: {
      'User-Agent': braveUA
    }
  }
  return rp.get(options)
}

// PUT /promo/initialize/nonua
const installation = function() {
  const codes = [ 'wts071', 'ABC123', 'BRV001', 'CLU884' ]
  const platforms = [ 'desktop', 'android', 'ios' ]

  const referralCode = _.sample(codes)
  const platform = _.sample(platforms)
  const path = 'promo/initialize/nonua'
  console.log(`Queuing request for ${path}`)
  const endpoint = `${url}${path}`

  const options = {
    url: endpoint,
    json: true,
    body: {
      referral_code: referralCode,
      platform: platform,
      api_key: api_key
    }
  }
  return rp.put(options)
}

// POST /1/crashes
// POST /1/bc-crashes
const crashReport = function() {
  const crashVersion = _.sample(
    [
      //'crashes',
      'bc-crashes'
    ])
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
    [ usagePings, 9 ],
    [ downloads, 9 ],
    [ installation, 5 ],
    [ installerEvents, 5 ],
    [ getRelease, 3 ],
    [ reportExtensions, 2 ],
    [ crashReport, 1 ],
  ]

  const weightedSample = function() {
    let sum = 0
    let cumWeights = []

    _.each(weightedFuncs, (func) => {
      sum += func[1]
      cumWeights.push([func[0], sum])
    })

    let r = randInterval(0, sum)
    return _.find(cumWeights, (x) => x[1] > r)[0]
  }

  reqCount = randInterval(minRequests, maxRequests)
  let reqs = []

  for (let i = 0; i < reqCount; i++) {
    let f = weightedSample()
    reqs.push(f())
  }

  let responses = await Promise.all(reqs)
  _.each(responses, (resp) => console.log("Response: " + resp))
}

if (minRequests > maxRequests || maxRequests < 1 || minRequests < 1) {
  console.log('You are only hurting yourself')
  process.exit(1)
}

setInterval(run, randInterval(1000, 4000))
