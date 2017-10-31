var ui = new Vue({
  data: {
    loggedIn: false, clientConnected: false, code: null,
    platform: platform, client: client, step: 1, directoryMessage: 'Click "Browse"',
    firstTime: true, titleOpacity: 0, subtitleOpacity: 0, actionOpacity: 0, loading: true,
    apiConnect: false, leageConnect: client.isRunning,  devices: []
  },
  el: "#app",
  methods: {
    close(){
      window.close()
    },
    startSetup() {
      if (!client.gameDirectory){
        client.gameDirectory = (platform == 'win32' ? "C:\\Riot Games\\League of Legends" : "/Applications/League of Legends.app/Contents/LoL")
        console.log(client.gameDirectory)
      }
      validateDirectory((success) => {
        if (success){

        }
      })
      this.titleOpacity = 1
      setTimeout(function(){
        ui.subtitleOpacity = 1
      }, 1500)
      setTimeout(function(){
        ui.actionOpacity = 1
      }, 3500)
    },
    selectDirectory(){
      selectDirectory((success) => {
        if (success){
          //valid directory
          //ui.step = 2
        }
        else {
          ui.invalidDirectory()
        }
      })
    },
    next(){
      if (client.gameDirectory) {
          localStorage.setItem("gameDirectory", client.gameDirectory)
          this.step = 2
          client.lockFileInterval = setInterval(checkLeagueClientOpen, LOCK_FILE_RATE)
          connectToAPI()
      }
    },
    invalidDirectory(){
      console.log('invalid directory')
      this.directoryMessage = "Couldn't find League of Legends"
    },
    removeDevice(d){
      this.loading = true
      socket.emit('remove device', {device: d.id})
    }
  }
})
