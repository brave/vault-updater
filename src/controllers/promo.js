/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const SERVICES_HOST = process.env.SERVICES_HOST || 'localhost'
const SERVICES_PORT = process.env.SERVICES_PORT || 8194
const SERVICES_PROTOCOL = process.env.SERVICES_PROTOCOL || 'http'

exports.setup = (runtime) => {
  // method, local uri, remote uri, description
  const proxyForwards = [
    ['PUT', '/promo/initialize/nonua', '/api/1/promo/initialize/nonua', 'Called on first connection with browser'],
    ['PUT', '/promo/initialize/ua', '/api/1/promo/initialize/ua', 'Called on first connection with browser containing IP and UA'],
    ['PUT', '/promo/activity', '/api/1/promo/activity', 'Called on periodic check-in and finalization from browser']
  ]

  const proxyRoutes = proxyForwards.map((definition) => {
    return {
      method: definition[0],
      path: definition[1],
      config: {
        tags: ['api'],
        description: definition[3],
        handler: {
          proxy: {
            uri: `${SERVICES_PROTOCOL}://${SERVICES_HOST}:${SERVICES_PORT}${definition[2]}`
          }
        }
      }
    }
  })

  return proxyRoutes
}
