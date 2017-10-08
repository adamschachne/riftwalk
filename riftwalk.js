const {dialog} = require('electron').remote
const fs = require('electron').remote.require('fs')
const https = require('electron').remote.require('https')
const http = require('electron').remote.require('http')
const process = require('electron').remote.process
const platform = require('electron').remote.require('os').platform()

const LOCK_FILE_RATE = 2000
const MM_RATE = 500
const API_URL = 'http://104.236.184.38:3000'

var client = {
    gameDirectory : localStorage.getItem("gameDirectory"),
    lockFileInterval : null,
    matchMakingInterval : null,
    isRunning : false,
    lci : {}
}
var socket = null

function logError(error) {
    console.log("ERROR: ", error)
}

function validateDirectory(cb) {
    var dir = (platform == 'win32' ? client.gameDirectory+"/LeagueClient.exe" : client.gameDirectory+"/LeagueClient.app")
    if (client.gameDirectory) {
        fs.access(dir, fs.constants.R_OK, (err) => {
            if (!err) {
                // client.lockFileInterval = setInterval(checkLeagueClientOpen, LOCK_FILE_RATE)
            }
            else {
                console.log('aoiwujfbalwiudbawlidujb ')
              client.gameDirectory = null
            }
            cb(!err)
        })
        // fs.readFile(client.gameDirectory+"", callback)
    }
    else {
      cb(false)
    }
}

function selectDirectory(cb) {
    dialog.showOpenDialog({properties: (platform == 'win32' ? ['openDirectory'] : ['openFile'])}, (paths) => {
        if (paths.length > 0) {
            if (platform == "darwin"){
              paths[0] += "/Contents/LoL"
            }
            console.log(paths[0])
            // localStorage.setItem("gameDirectory", paths[0])
            client.gameDirectory = paths[0]
            validateDirectory((isValid) => {
              cb(isValid)
            })
        }
        return null
    })
}

function checkLeagueClientOpen() {
    fs.access(client.gameDirectory+"/lockfile", fs.constants.R_OK, (err) => {
        if (!err) {// exists
            if (!client.isRunning) {
                fs.readFile(client.gameDirectory+"/lockfile",'utf8',(err, data) => {
                    if (!err) {
                        parseLockfile(data)
                        client.lci.header = "Basic " + (new Buffer("riot:"+client.lci.password).toString('base64'))
                        client.isRunning = true
                        //sendRequest("/lol-matchmaking/v1/search", "POST", {}, function() {})
                        client.matchMakingInterval = setInterval(queueHandler, MM_RATE)
                    } else {
                        logError("could not read " + client.gameDirectory+"/lockfile")
                    }
                })
            }
        } else {
            client.isRunning = false
        }
    })
}

function parseLockfile(data) {
    //LeagueClient:12712:49944:UxTanza3QyC1wJEuQq6kLw:https
    var attrs = data.split(":")
    client.lci = {
        pid : attrs[1],
        port : attrs[2],
        password : attrs[3],
        protocol : attrs[4]
    }
}

function sendRequest(endpoint, method, payload, callbackStatus, callbackBody) {
    // var options = {
    //     host: 'localhost',
    //     port: client.lci.port,
    //     path: endpoint,
    //     method: method,
    //     rejectUnauthorized: false,
    // 
    //     headers: {
    //         'Content-Type' : "application/json",
    //         'Authorization' : client.lci.header
    //     }
    // }
    // 
    // var protocol = client.lci.protocol == 'https' ? https : http
    // var req = https.request(options, function(res) {
    //     callbackStatus(res.statusCode);
    //     res.setEncoding('utf8')
    //     //console.log(options.host + ':' + res.statusCode);
    //     res.on('data', function (data) {
    //         console.log(data)
    //         // callbackBody(JSON.parse(data));
    //     });
    //     res.on('end', function(){
    //       console.log("ENDEDEEDEDEDEDED")
    //     })
    // })
    // 
    // req.on('error', function(err) {
    //     console.log(err)
    // })
    // 
    // req.write(JSON.stringify(payload));
    // req.end()
    $.ajax({
      url: client.lci.protocol+"://localhost:"+client.lci.port+endpoint,
      headers: {'Content-Type' : "application/json", 'Authorization' : client.lci.header},
      method: method,
      data: payload
    })
    .always(function(data, textStatus){
      callbackStatus(data.status)
      callbackBody(data)      
    })
}

function queueHandler() {
    sendRequest("/lol-matchmaking/v1/ready-check", "GET", {}, (code) => {
        //console.log(code)
    }, (obj) => {
        if (obj.httpStatus == 404) {
            //console.log(obj.message)
        } else {
            // accept queue based on Companion settings and notify mobile
        }
    })
}

// function startQueue(queueId, retries) {
//   console.log('retries', retries)
//   if (retries > 0){
//     deleteQueue(function(){
//       createLobby(queueId, function(success){
//         if (success){
//           matchMakingSearch(function(success){
//             if (!success){
//               setTimeout(function(){
//                 startQueue(queueId, --retries)
//               }, 50)
//             }
//           })
//         }
//         else {
//           setTimeout(function(){
//             startQueue(queueId, --retries)
//           }, 50)
//         }
//       })
//     })
//   }
// 
// }

function matchMakingSearch(cb){
  sendRequest("/lol-matchmaking/v1/search", "POST", {}, (code) => {
      if (Math.floor(code/100) == 2) {
          console.log("in queue")
          cb(true)
      } else {
          console.log(code)
          cb(false)
      }
  }, (obj) => {console.log(obj)})
}

function createLobby(queueId, cb){
  sendRequest("/lol-lobby/v1/lobby", "POST", {"queueId": queueId}, (code) => {
      if (Math.floor(code/100) == 2) {
        cb(true)
      } else {
          console.log(code)
          cb(false)
      }
  }, (obj) => {console.log(obj)})
}

function deleteQueue(cb){
  sendRequest("/lol-lobby/v1/lobby", "DELETE", {}, (code) => {
    cb()
  }, (obj) => {console.log(obj)})
}

function getQueues(cb){
  sendRequest("/lol-game-queues/v1/queues", "GET", {}, (code) => {
    
  }, (obj) => {cb(obj)})
}

function connectToAPI() {
    socket = io.connect(API_URL,{'forceNew':true});
    initEvents()
}

process.on('uncaughtException', function (err) {
    console.log(err)

    switch (err.errno) {
        case "ECONNREFUSED":
            clearInterval(client.matchMakingInterval)
        break;
    }
})
