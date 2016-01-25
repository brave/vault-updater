var styles = [
     {
         fillColor: "rgba(220,220,220,0.2)",
         strokeColor: "rgba(220,220,220,1)",
         pointColor: "rgba(220,220,220,1)",
         pointStrokeColor: "#fff",
         pointHighlightFill: "#fff",
         pointHighlightStroke: "rgba(220,220,220,1)"
     },
     {
         fillColor: "rgba(151,187,205,0.2)",
         strokeColor: "rgba(151,187,205,1)",
         pointColor: "rgba(151,187,205,1)",
         pointStrokeColor: "#fff",
         pointHighlightFill: "#fff",
         pointHighlightStroke: "rgba(151,187,205,1)"
     },
     {
         fillColor: "rgba(205,187,205,0.2)",
         strokeColor: "rgba(205,187,205,1)",
         pointColor: "rgba(205,187,205,1)",
         pointStrokeColor: "#fff",
         pointHighlightFill: "#fff",
         pointHighlightStroke: "rgba(205,187,205,1)"
     },
     {
         fillColor: "rgba(187,205,205,0.2)",
         strokeColor: "rgba(187,205,205,1)",
         pointColor: "rgba(187,205,205,1)",
         pointStrokeColor: "#fff",
         pointHighlightFill: "#fff",
         pointHighlightStroke: "rgba(187,205,205,1)"
     }
]
    
$('#usage').on('click', function(evt) {
  $('#crashes').parent().removeClass('active')
  $('#usage').parent().addClass('active')
  $('#usageContent').show()
  $('#crashesContent').hide()
  $.ajax('/api/1/dau', {
    success: function(rows) {
      var table = $('#usageDataTable tbody')
      table.empty()
      rows.forEach(function(row) {
        table.append('<tr><td>' + row.ymd + '</td><td>' + row.platform + '</td><td class="text-right">' + row.count + '</td></tr>')
      })

      // Build a list of unique labels (ymd)
      var labels = _.chain(rows)
          .map(function(row) { return row.ymd })
          .uniq()
          .sort()
          .value()

      // Build a list of unique data sets (platform)
      var platforms = _.chain(rows)
          .map(function(row) { return row.platform })
          .uniq()
          .value()

      // Associate the data
      var product = _.object(_.map(labels, function(label) {
        return [label, {}]
      }))
      rows.forEach(function(row) {
        product[row.ymd][row.platform] = row.count
      })

      // Build the Chart.js data structure
      var datasets = []
      platforms.forEach(function(platform) {
        var dataset = []
        labels.forEach(function(label) {
          dataset.push(product[label][platform] || 0)
        })
        datasets.push(dataset)
      })

      var styles = [
        {
          fillColor: "rgba(220,220,220,0.2)",
          strokeColor: "rgba(220,220,220,1)",
          pointColor: "rgba(220,220,220,1)",
          pointStrokeColor: "#fff",
          pointHighlightFill: "#fff",
          pointHighlightStroke: "rgba(220,220,220,1)"
        },
        {
          fillColor: "rgba(151,187,205,0.2)",
          strokeColor: "rgba(151,187,205,1)",
          pointColor: "rgba(151,187,205,1)",
          pointStrokeColor: "#fff",
          pointHighlightFill: "#fff",
          pointHighlightStroke: "rgba(151,187,205,1)"
        },
        {
          fillColor: "rgba(205,187,205,0.2)",
          strokeColor: "rgba(205,187,205,1)",
          pointColor: "rgba(205,187,205,1)",
          pointStrokeColor: "#fff",
          pointHighlightFill: "#fff",
          pointHighlightStroke: "rgba(205,187,205,1)"
        }
      ]
      
      var data = {
        labels: labels,
        datasets: _.map(datasets, function(dataset, idx) {
          return _.extend({
            label: platforms[idx],
            data: dataset
          }, styles[idx])
        })
      }
      
      var ctx = document.getElementById("usageChart").getContext("2d");
      var myChart = new Chart(ctx).Line(data)
    }
  })
})

$('#crashes').on('click', function(evt) {
  $('#crashes').parent().addClass('active')
  $('#usage').parent().removeClass('active')
  $('#usageContent').hide()
  $('#crashesContent').show()
  $.ajax('/api/1/dc', {
    success: function(rows) {
      var table = $('#crashesDataTable tbody')
      table.empty()
      rows.forEach(function(row) {
        table.append('<tr><td>' + row.ymd + '</td><td>' + row.platform + '</td><td class="text-right">' + row.count + '</td></tr>')
      })

      // Build a list of unique labels (ymd)
      var labels = _.chain(rows)
          .map(function(row) { return row.ymd })
          .uniq()
          .sort()
          .value()

      // Build a list of unique data sets (platform)
      var platforms = _.chain(rows)
          .map(function(row) { return row.platform })
          .uniq()
          .value()

      // Associate the data
      var product = _.object(_.map(labels, function(label) {
        return [label, {}]
      }))
      rows.forEach(function(row) {
        product[row.ymd][row.platform] = row.count
      })

      // Build the Chart.js data structure
      var datasets = []
      platforms.forEach(function(platform) {
        var dataset = []
        labels.forEach(function(label) {
          dataset.push(product[label][platform] || 0)
        })
        datasets.push(dataset)
      })

      var data = {
        labels: labels,
        datasets: _.map(datasets, function(dataset, idx) {
          return _.extend({
            label: platforms[idx],
            data: dataset
          }, styles[idx])
        })
      }
      
      var ctx = document.getElementById("crashesChart").getContext("2d");
      var myChart = new Chart(ctx).Line(data)
    }
  })
})

