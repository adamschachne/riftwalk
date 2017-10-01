function initEvents() {

    socket.on('request token', function() {
        console.log('request token')
        socket.emit('token', {token: localStorage.getItem("token")})
    })

    socket.on('connection success', function(data) {
        console.log('good')
    })

    socket.on('timeout', function() {
        setTimeout(function() {
            connectToAPI()
        }, 60000)
    })

    socket.on('created client', function(data) {
        //localStorage.setItem('token', data.token)
        socket.emit('request code', {token : data.token})
    })
}
