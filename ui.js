var ui = new Vue({
  data: {platform: platform, client: client, step: 1, directoryMessage: 'Click "Browse"', firstTime: true, titleOpacity: 0, subtitleOpacity: 0, actionOpacity: 0},
  el: "#app",
  methods: {
    close(){
      window.close()
    },
    startSetup() {
      if (!client.gameDirectory){
        client.gameDirectory = (platform == 'win32' ? "C:\\Riot Games\\League of Legends" : "/Applications/Leagueof Legends.app")
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
          step = 2
        }
        else {
          ui.invalidDirectory()
        }
      })
    },
    invalidDirectory(){
      console.log('invalid directory')
      this.directoryMessage = "Couldn't find League of Legends"
    }
  }
})
