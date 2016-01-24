exports.dailyActiveUsersGrouped = (db, cb, ts, days) => {
  ts = ts || (new Date()).getTime()
  days = days || 7

  var query = db.collection('usage').aggregate([
    {
      $match: { daily: true }
    },
    {
      $project: {
        date: {
          $add : [ (new Date(0)), '$ts' ]
        },
        platform: {
          $ifNull: [ '$platform', 'unknown' ]
        },
        version: {
          $ifNull: [ '$version', 'unknown' ]
        },
        ymd: {
          $dateToString: {
            format: "%Y-%m-%d", date: {
              $add : [ (new Date(-5 * 60 * 60000)), '$ts' ]
            }
          }
        }
      }
    },
    {
      $group: {
        _id: { ymd: '$ymd', platform: '$platform' },
        count: {
          $sum: 1
        }
      }
    },
    {
      $sort: {
        '_id.ymd': -1,
        '_id.platform': 1
      }
    }
  ])

  query.toArray((err, result) => {
    cb(err, result)
  })
}
