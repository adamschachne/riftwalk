function initEvents() {

    socket.on('request token', function() {
        console.log('request token')
        socket.emit('token', {token: localStorage.getItem("token")})
    })

    socket.on('connection success', function(data) {
        ui.apiConnect = true
        if (ui.firstTime) {
          getPairCode()
        }
        else {
            socket.emit('request device list', {token : localStorage.getItem('token')})
        }
        console.log('good')
    })

    socket.on('connection failure', function(data) {
        console.log('bad token')
        localStorage.removeItem('gameDirectory')
        localStorage.removeItem('token')
        location.reload()
    })

    socket.on('timeout', function() {
        setTimeout(function() {
            connectToAPI()
        }, 60000)
    })

    socket.on('disconnect', () => {
        if (ui.firstTime) {
            ui.code = null
        }
        //ui.apiConnect = false
    });

    socket.on('created client', function(data) {
      ui.apiConnect = true
      localStorage.setItem('token', data.token)
      getPairCode()
    })

    socket.on('code generated', function(data) {
        console.log(data.code)
        ui.code = data.code
    })

    socket.on('mobile added', function(data){
        localStorage.setItem('completedSetup', true)
        ui.firstTime = false
        ui.code = null
        clearInterval(client.codeInterval)
        socket.emit('request device list', {token : localStorage.getItem('token')})
    })

    socket.on('device list', function(data){
        ui.devices = data.devices
        ui.loading = false
    })

    socket.on('get state', function() {
      socket.emit('got state', client.state)
    })

    socket.on('request queues', function(){
      getQueues(function(clientData){
        socket.emit('got queues', {clientData: clientData})
      })
    })

    socket.on('create lobby', function(data){
      createLobby(data.id, function(result){
        // result == true if successfully joined lobby
        socket.emit('created lobby', {result: result, queueId: data.id})
      })
    })

    socket.on('leave lobby', function(){
      leaveLobby(function(result){
        socket.emit('left lobby', {result: result})
      })
    })

    socket.on('start queue', function(data){
      matchMakingSearch(function(result){
        socket.emit('started queue', {result: result})
      })
    })

    socket.on('cancel queue', function(data){
      matchMakingCancel(function(result){
        socket.emit('cancelled queue', {result: result})
      })
    })

    socket.on('accept queue', function(){
      matchMakingAccept(function(result){
        socket.emit('cancelled queue', {result: result})
      })
    })
}
