exports.setup = (runtime) => {
  const braveCorePost = {
    method: 'POST',
    path: '/1/bc-crashes',
    handler: {
      proxy: {
        uri: process.env.CRASH_PROXY,
        passThrough: true,
        timeout: 30000
      }
    },
    options: {
      description: "* Record crash for Brave Core",
    }
  }

  return [
    braveCorePost
  ]
}
