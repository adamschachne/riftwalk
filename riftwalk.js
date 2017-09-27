const {dialog} = require('electron').remote
const fs = require('electron').remote.require('fs')
const https = require('electron').remote.require('https')
const http = require('electron').remote.require('http')
const process = require('electron').remote.process
const platform = require('electron').remote.require('os').platform()

const LOCK_FILE_RATE = 2000
const MM_RATE = 500



var client = {
    gameDirectory : localStorage.getItem("gameDirectory"),
    lockFileInterval : null,
    matchMakingInterval : null,
    isRunning : false,
    lci : {}
}



function logError(error) {
    console.log("ERROR: ", error)
}

function validateDirectory(cb) {
    var dir = (platform == 'win32' ? client.gameDirectory+"/LeagueClient.exe" : client.gameDirectory+"/LeagueClient.app")
    if (client.gameDirectory) {
        fs.access(dir, fs.constants.R_OK, (err) => {
            if (!err) {
                client.lockFileInterval = setInterval(checkLeagueClientOpen, LOCK_FILE_RATE)
            }
            else {
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
            localStorage.setItem("gameDirectory", paths[0])
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
    var options = {
        host: 'localhost',
        port: client.lci.port,
        path: endpoint,
        method: method,
        rejectUnauthorized: false,

        headers: {
            'Content-Type' : "application/json",
            'Authorization' : client.lci.header
        }
    }

    var protocol = client.lci.protocol == 'https' ? https : http
    var req = protocol.request(options, function(res) {
        callbackStatus(res.statusCode);
        res.setEncoding('utf8')
        //console.log(options.host + ':' + res.statusCode);
        res.on('data', function (data) {
            callbackBody(JSON.parse(data));
        })
    })

    req.on('error', function(err) {
        console.log(err)
    })

    req.write(JSON.stringify(payload));
    req.end()
}

function queueHandler() {
    sendRequest("/lol-matchmaking/v1/ready-check", "GET", {}, (code) => {
        console.log(code)
    }, (obj) => {
        if (obj.httpStatus == 404) {
            //console.log(obj.message)
        } else {
            // accept queue based on Companion settings and notify mobile
        }
    })
}

function startQueue(queueId) {
    sendRequest("/lol-lobby/v1/lobby", "POST", {"queueId": queueId}, (code) => {
        if (code == 200) {
            sendRequest("/lol-matchmaking/v1/search", "POST", {}, (code) => {
                if (code == 200) {
                    console.log("in queue")
                } else {
                    console.log(code)
                }
            }, (obj) => {console.log(obj)})
        } else {
            console.log(code)
        }
    }, (obj) => {console.log(obj)})
}


process.on('uncaughtException', function (err) {
    console.log(err)

    switch (err.errno) {
        case "ECONNREFUSED":
            clearInterval(client.matchMakingInterval)
        break;
    }
})
