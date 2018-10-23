const uap = require('user-agent-parser')

const redirectURLForMobileGet = (ua, referralCode) => {
  // parse the useragent string
  ua = uap(ua)
  // match for mobile
  if (ua.os.name.match(/iOS/)) {
    return `/download/ios/${referralCode}`
  }
  if (ua.os.name.match(/Android/)) {
    return `/download/android/${referralCode}`
  }
  return process.env.MOBILE_DESKTOP_REDIRECT_URL || 'https://www.brave.com'
}

module.exports = {
  redirectURLForMobileGet
}
