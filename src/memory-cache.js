const cache = {}

/*
 * Create a function A that will store the result of the execution
 * of an async function B in memory and return the result. Each
 * subsequent call to function A will return the cached result
 * if N seconds have not elapsed, or it will again call async
 * function B, update the memory cache and return the result.
 */
const create = (seconds, func) => {
  // define variables to hold timestamp of next cache update and
  // the value to be cached
  let nextRun, v
  // return function
  return async () => {
    // if the cache has not been initialized or is due for a refresh
    if (!nextRun || (new Date()).getTime() > nextRun) {
      if (process.env.DEBUG) console.log('refilling cache')
      // re-fill the cache
      v = await func()
      // schedule timestamp for next update
      nextRun = (new Date()).getTime() + (seconds * 1000)
    }
    // return cached value
    return v
  }
}

module.exports = {
  create
}
