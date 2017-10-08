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
    state: {view: 'home', queues: [], inQueue: false, inLobby: false},
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
      console.log(textStatus)
      callbackStatus(textStatus == "success" || textStatus == "nocontent")
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

function createLobby(queueId, cb){
  sendRequest("/lol-lobby/v1/lobby", "POST", {"queueId": queueId}, (res) => {
      cb(res, queueId)
      client.state.inLobby = res
  }, (obj) => {console.log(obj)})
}

function leaveLobby(cb){
  sendRequest("/lol-lobby/v1/lobby", "DELETE", {}, (res) => {
    cb(res)
    client.state.inLobby = !res
  }, (obj) => {console.log(obj)})
}

function getQueues(cb){
  sendRequest("/lol-game-queues/v1/queues", "GET", {}, (res) => {
    cb(res)
  }, (obj) => {
    client.state.queues = obj
    cb(obj)})
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
