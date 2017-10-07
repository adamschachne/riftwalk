function initEvents() {

    socket.on('request token', function() {
        console.log('request token')
        socket.emit('token', {token: localStorage.getItem("token")})
    })

    socket.on('connection success', function(data) {
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

    socket.on('created client', function(data) {
        localStorage.setItem('token', data.token)
        socket.emit('request code', {token : data.token})
    })

    socket.on('code generated', function(data) {
        console.log(data.code)
        ui.code = data.code
    })

    socket.on('mobile added', function(data){
        localStorage.setItem('completedSetup', true)
        ui.firstTime = false
        socket.emit('request device list')
    })
    
    socket.on('device list', function(data){
      
    })
    
    socket.on('start queue', function(data){
      startQueue(data.queueId)
    })
}
