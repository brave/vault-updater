const cache = {}

/*
 * Create a function A that will store the result of the execution
 * of an async function B in memory and return the result. Each
 * subsequent call to function A will return the cached result
 * if N seconds have not elapsed, or it will again call async
 * function B, update the memory cache and return the result.
 */
const create = (seconds, func) => {
  let nextRun, v
  return async () => {
    if (!nextRun || (new Date()).getTime() > nextRun) {
      if (process.env.DEBUG) console.log('refilling cache')
      v = await func()
      nextRun = (new Date()).getTime() + (seconds * 1000)
    }
    return v
  }
}

module.exports = {
  create
}
