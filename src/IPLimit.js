/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const IP_TIMEOUT = process.env.IP_TIMEOUT || 60 * 5 * 1000 // 5 minutes
const ips = {}

// IP Rate limiting
module.exports.shouldRecord = function (ip, ts) {
  ts = ts || (new Date()).getTime()
  // if we have seen the ip before
  if (ips[ip]) {
    if ((ts - ips[ip]) > IP_TIMEOUT) {
      ips[ip] = ts
      return true
    } else {
      ips[ip] = ts
      return false
    }
  } else {
    ips[ip] = ts
    return true
  }
}
