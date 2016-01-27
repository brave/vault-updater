var reporting = require('./lib/reporting')
var _ = require('underscore')

/*
 * Pull k/v pairs out of a contained child object
 *
 * { a: { b: 1, c: 2 }, d: 3 } -> { b: 1, c: 2, d: 3}
 */
const pullOutAttribs = (obj, k) => {
  Object.keys(obj[k]).forEach((internalKey) => {
    obj[internalKey] = obj[k][internalKey]
  })
  delete obj[k]
  return obj
}

// Data endpoints
exports.setup = (server, db) => {

  // Version for today's daily active users
  server.route({
    method: 'GET',
    path: '/api/1/version',
    handler: function (request, reply) {
      reporting.dailyVersions(db, (err, rows) => {
        if (err) {
          reply(err.toString).statusCode(500)
        } else {
          rows.forEach((row) => pullOutAttribs(row, '_id'))
          reply(rows)
        }
      })
    }
  })

  // Daily active users
  server.route({
    method: 'GET',
    path: '/api/1/dau',
    handler: function (request, reply) {
      reporting.dailyActiveUsersGrouped(db, (err, rows) => {
        if (err) {
          reply(err.toString).statusCode(500)
        } else {
          rows.forEach((row) => pullOutAttribs(row, '_id'))
          reply(rows)
        }
      })
    }
  })

  // Daily active users aggregated across platforms
  server.route({
    method: 'GET',
    path: '/api/1/dau_aggregated',
    handler: function (request, reply) {
      reporting.dailyActiveUsersAggregated(db, (err, rows) => {
        if (err) {
          reply(err.toString).statusCode(500)
        } else {
          rows.forEach((row) => pullOutAttribs(row, '_id'))
          reply(rows)
        }
      })
    }
  })

  // Crash reports
  server.route({
    method: 'GET',
    path: '/api/1/dc',
    handler: function (request, reply) {
      reporting.dailyCrashesGrouped(db, (err, rows) => {
        if (err) {
          reply(err.toString).statusCode(500)
        } else {
          rows.forEach((row) => pullOutAttribs(row, '_id'))
          reply(rows)
        }
      })
    }
  })

}
