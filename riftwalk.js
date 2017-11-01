const {dialog} = require('electron').remote
const fs = require('electron').remote.require('fs')
const https = require('electron').remote.require('https')
const http = require('electron').remote.require('http')
const process = require('electron').remote.process
const platform = require('electron').remote.require('os').platform()

const LOCK_FILE_RATE = 2000
const MM_RATE = 500
const ME_RATE = 1000
const CODE_RATE = 30000*60
const API_URL = 'http://104.236.184.38:3000'

var client = {
    gameDirectory : localStorage.getItem("gameDirectory"),
    lockFileInterval : null,
    matchMakingInterval : null,
    meInterval : null,
    codeInterval: null,
    isRunning : false,
    timeLeft : null,
    state : {
        clientStatus : "offline", // online, login, offline (closed)
        summonerName : null,
        summonerId : null,
        icon : null,
        status : null,
        statusMessage : null,
        queues : [],
        inQueue : false,
        inLobby: false,
        mapId : 'background',
        queueType : null,
        queuePopped: false,
        members : [],
        inGame : false,
    },
    lci : {},
}

//defining a 'watcher' for an attribute
watch(client.state, function(prop, action, newvalue, oldvalue){
    console.log(prop+" - action: "+action+" - new: "+newvalue+", old: "+oldvalue+"... and the context: ", this);
    // if (newvalue === undefined || !newvalue) {
    //     if (prop == "summonerName" || prop == "statusMessage" || prop == "icon")
    //         return
    // }
    socket.emit('update state', {prop: prop, value: newvalue})
});

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

function getPairCode(){
  clearInterval(client.codeInterval)
  socket.emit('request code', {token : localStorage.getItem('token')})
  client.codeInterval = setInterval(function(){
    socket.emit('request code', {token : localStorage.getItem('token')})
  }, CODE_RATE)
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
                        //client.matchMakingInterval = setInterval(queueHandler, MM_RATE)
                        //console.log("setting me interval")
                        client.meInterval = setInterval(function() {
                          getMe(() => {})
                        }, ME_RATE);
                        client.state.clientStatus = "online"
                        ui.clientConnected = true
                        ui.loggedIn = false
                    } else {
                        logError("could not read " + client.gameDirectory+"/lockfile")
                    }
                })
            }
        } else {
            console.log("client not running")
            ui.loggedIn = false
            ui.clientConnected = false
            client.state.clientStatus = "offline"
            clearInterval(client.matchMakingInterval)
            clearInterval(client.meInterval)
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
    if (method == "POST"){
      payload = JSON.stringify(payload)
    }
    $.ajax({
      url: client.lci.protocol+"://localhost:"+client.lci.port+endpoint,
      headers: {'Content-Type' : "application/json", 'Authorization' : client.lci.header},
      method: method,
      data: payload
    })
    .always(function(data, textStatus){
      //console.log(textStatus)
      callbackStatus(textStatus == "success" || textStatus == "nocontent")
      callbackBody(data)
    })
}

function queueHandler() {
    sendRequest("/lol-matchmaking/v1/ready-check", "GET", {}, (code) => {
        //console.log(code)
    }, (obj) => {
        if (obj.status == 404) {
            client.state.inQueue = false
            client.state.queuePopped = false
            client.timeLeft = null
            client.state.declined = false
            console.log("inQueue = false")
            //console.log(obj.message)
        } else {
            client.state.inQueue = true
            console.log("inQueue = true")
            // accept queue based on Companion settings and notify mobile
            if (obj.state == "InProgress") {
                // matchfound
                // TODO
                console.log("timer = ", obj.timer)
                if (obj.timer >= client.timeLeft) {
                  client.state.queuePopped = true
                } else {
                  client.state.queuePopped = false
                }
                client.timeLeft = obj.timer
                client.state.declined = (obj.playerResponse == "Declined")
            }
            else {
              client.timeLeft = null
              client.state.queuePopped = false
              client.state.declined = false
            }
        }
    })
}

function matchMakingSearch(cb){
  sendRequest("/lol-matchmaking/v1/search", "POST", {}, (res) => {
      cb(res)
      client.state.inQueue = res
  }, (obj) => {console.log(obj)})
}

function matchMakingCancel(cb){
  sendRequest("/lol-matchmaking/v1/search", "DELETE", {}, (res) => {
    cb(res)
    client.state.inQueue = !res
  }, (obj) => {console.log(obj)})
}

function matchMakingAccept(cb){
  sendRequest("/lol-matchmaking/v1/ready-check/accept", "POST", {}, (res) => {
      cb(res)
  }, (obj) => {console.log(obj)})
}

function createLobby(queueId, cb){
  sendRequest("/lol-lobby/v1/lobby", "POST", {"queueId": queueId}, (success) => {
      //cb(res, queueId)
      cb(success)
      client.state.inLobby = success
  }, (obj) => {
    if (obj.responseJSON && obj.responseJSON.httpStatus == 500) {
      // failed to join lobby for some reason
      console.log(obj.responseJSON.message)
    } else {
      console.log(obj)
      client.state.mapId = obj.mapId
    }
  })
}

function getLobby(cb){
  sendRequest("/lol-lobby/v1/lobby", "GET", {}, (res) => {
  }, (obj) => {
    cb(obj)
  })
}

function leaveLobby(cb){
  sendRequest("/lol-lobby/v1/lobby", "DELETE", {}, (res) => {
    cb(res)
    client.state.inLobby = !res
    if (res) {
      client.state.mapId = 'background'
    }
  }, (obj) => {console.log(obj)})
}

function getQueues(cb){
  sendRequest("/lol-game-queues/v1/queues", "GET", {}, (res) => {
    cb(res)
  }, (obj) => {
    client.state.queues = obj
    cb(obj)})
}

function getMe(cb) {
    sendRequest("/lol-chat/v1/me", "GET", {}, (res) => {
    }, (obj) => {
      //console.log(obj)
      if (obj.status == 0) {
        console.log("connection to client lost")
        return
      }

      if (obj.responseJSON && obj.responseJSON.message == "Player not connected") {
        console.log("not logged in")
        client.state.clientStatus = "login" // not logged in
        ui.loggedIn = false
        return
      }
      // if (obj.status == 409) {
      //   return
      // }
      ui.loggedIn = true
      ui.clientConnected = true
      client.state.clientStatus = "online"
      client.state.summonerName = obj.name
      client.state.summonerId = obj.id
      client.state.statusMessage = obj.statusMessage
      client.state.icon = obj.icon
      if (client.state.inLobby = (obj.lol.gameQueueType != "")) {
        getLobby((obj) => {
          client.state.queueType = obj.queueId
        })
      }

      if (client.state.inQueue = (obj.lol.gameStatus == "inQueue")) {
        clearInterval(client.matchMakingInterval)
        client.matchMakingInterval = setInterval(queueHandler, MM_RATE)
      } else {
          clearInterval(client.matchMakingInterval)
      }
      cb()
    })
}

function connectToAPI() {
    socket = io.connect(API_URL,{'forceNew':true});
    initEvents()
}

process.on('uncaughtException', function (err) {
    console.log(err)
})
