/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

var tap = require('tap')

var {getRequestedExtensions, getExtensionsWithUpdates} = require('../src/controllers/extensions')

const request = (appId) => (version) => `
<?xml version="1.0" encoding="UTF-8"?>
<request protocol="3.0" version="chrome-53.0.2785.116" prodversion="53.0.2785.116" requestid="{b4f77b70-af29-462b-a637-8a3e4be5ecd9}" lang="" updaterchannel="stable" prodchannel="stable" os="mac" arch="x64" nacl_arch="x86-64">
  <hw physmemory="16"/>
  <os platform="Mac OS X" version="10.11.6" arch="x86_64"/>
  <app appid="${appId}" version="${version}" installsource="ondemand">
    <updatecheck />
    <ping rd="-2" ping_freshness="" />
  </app>
</request>`
const onePasswordRequest = request('aomjjhallfgjeglblehebfpbcfeobpgk')
const unknownExtensionRequest = request('this-is-a-fake-id')
const onePasswordAndPDFJSRequest = (onePasswordVersion, pdfJSVersion) => `
<?xml version="1.0" encoding="UTF-8"?>
<request protocol="3.0" version="chrome-53.0.2785.116" prodversion="53.0.2785.116" requestid="{b4f77b70-af29-462b-a637-8a3e4be5ecd9}" lang="" updaterchannel="stable" prodchannel="stable" os="mac" arch="x64" nacl_arch="x86-64">
  <hw physmemory="16"/>
  <os platform="Mac OS X" version="10.11.6" arch="x86_64"/>
  <app appid="aomjjhallfgjeglblehebfpbcfeobpgk" version="${onePasswordVersion}" installsource="ondemand">
    <updatecheck />
    <ping rd="-2" ping_freshness="" />
  </app>
  <app appid="jdbefljfgobbmcidnmpjamcbhnbphjnb" version="${pdfJSVersion}" installsource="ondemand">
    <updatecheck />
    <ping rd="-2" ping_freshness="" />
  </app>
</request>`
const noUpdatesRequest = `
<?xml version="1.0" encoding="UTF-8"?>
<request protocol="3.0" version="chrome-53.0.2785.116" prodversion="53.0.2785.116" requestid="{b4f77b70-af29-462b-a637-8a3e4be5ecd9}" lang="" updaterchannel="stable" prodchannel="stable" os="mac" arch="x64" nacl_arch="x86-64">
  <hw physmemory="16"/>
  <os platform="Mac OS X" version="10.11.6" arch="x86_64"/>
</request>`
const unsupportedProtocolRequest = `
<?xml version="1.0" encoding="UTF-8"?>
<request protocol="2.0" version="chrome-53.0.2785.116" prodversion="53.0.2785.116" requestid="{b4f77b70-af29-462b-a637-8a3e4be5ecd9}" lang="" updaterchannel="stable" prodchannel="stable" os="mac" arch="x64" nacl_arch="x86-64">
  <app appid="aomjjhallfgjeglblehebfpbcfeobpgk">
    <updatecheck codebase="https://s3.amazonaws.com/brave-extensions/release/aomjjhallfgjeglblehebfpbcfeobpgk/extension_4_5_9_90.crx" version="4.5.9.90"/>
  </app>
</request>`

const availableExtensions = [
  ['aomjjhallfgjeglblehebfpbcfeobpgk', '4.5.9.90', 'f75d7808766429ec63ec41d948c1cb6a486407945d604961c6adf54fe3f459b7'],
  // PDFJS
  ['jdbefljfgobbmcidnmpjamcbhnbphjnb', '1.5.444', '25689984431ca8a60f087c761f472e500a7fe8a9065a4a47e92559237bcd1d6d'],
  // Dashlane
  ['fdjamakpfbbddfjaooikfcpapjohcfmg', '4.2.4', '0be29a787290db4c554fd7c77e5c45939d2161688b6cb6b51d39cdedb9cc69d4'],
  // LastPass
  ['hdokiejnpimakedhajhdlcegeplioahd', '4.1.28', '1e94a15dfaa59afd8ceb8b8cace7194aea3cc718d9a77fcff812eac918246e80']
]

tap.test('Extracts extension information from requests', (test) => {
  tap.same(getRequestedExtensions(onePasswordRequest('0.0.0.0')), [['aomjjhallfgjeglblehebfpbcfeobpgk', '0.0.0.0']])
  tap.same(getRequestedExtensions(onePasswordRequest('4.5.9.90')), [['aomjjhallfgjeglblehebfpbcfeobpgk', '4.5.9.90']])
  tap.same(getRequestedExtensions(onePasswordAndPDFJSRequest('4.5.9.90', '1.5.444')), [['aomjjhallfgjeglblehebfpbcfeobpgk', '4.5.9.90'], ['jdbefljfgobbmcidnmpjamcbhnbphjnb', '1.5.444']])
  tap.equal(getRequestedExtensions(unsupportedProtocolRequest), undefined)
  test.end()
})

tap.test('Initial update for an extension works', (test) => {
  tap.same(getExtensionsWithUpdates(availableExtensions, getRequestedExtensions(onePasswordRequest('0.0.0.0'))),
    [
      ['aomjjhallfgjeglblehebfpbcfeobpgk', '4.5.9.90', 'f75d7808766429ec63ec41d948c1cb6a486407945d604961c6adf54fe3f459b7']
    ])
  test.end()
})

tap.test('No updates returned for same version', (test) => {
  tap.same(getExtensionsWithUpdates(availableExtensions, getRequestedExtensions(onePasswordRequest('4.5.9.90'))), [])
  test.end()
})

tap.test('No updates returned for unknown extension ID', (test) => {
  tap.same(getExtensionsWithUpdates(availableExtensions, getRequestedExtensions(unknownExtensionRequest('0.0.0.0'))), [])
  test.end()
})

tap.test('No updates returned for newer extension ID', (test) => {
  tap.same(getExtensionsWithUpdates(availableExtensions, getRequestedExtensions(onePasswordRequest('9.5.9.90'))), [])
  test.end()
})

tap.test('Blank update request returns no updates', (test) => {
  tap.same(getExtensionsWithUpdates(availableExtensions, getRequestedExtensions(noUpdatesRequest)), [])
  test.end()
})

tap.test('Update for multiple extensions works', (test) => {
  tap.same(getExtensionsWithUpdates(availableExtensions, getRequestedExtensions(onePasswordAndPDFJSRequest('0.0.0.0', '0.0.0.0'))),
    [
      ['aomjjhallfgjeglblehebfpbcfeobpgk', '4.5.9.90', 'f75d7808766429ec63ec41d948c1cb6a486407945d604961c6adf54fe3f459b7'],
      ['jdbefljfgobbmcidnmpjamcbhnbphjnb', '1.5.444', '25689984431ca8a60f087c761f472e500a7fe8a9065a4a47e92559237bcd1d6d']
    ])
  test.end()
})

