
function standardOptions () {
  return {
    method: "GET",
    url: "http://localhost:9000/api/1/releases",
    json: true,
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + process.env.AUTH_TOKEN
    }
  }
}

function refreshOptions () {
  var options = standardOptions()
  options.method = "PUT"
  options.url = options.url + '/refresh'
  return options
}

module.exports = {
  standardOptions: standardOptions,
  refreshOptions: refreshOptions
}
