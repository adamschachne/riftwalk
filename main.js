const {app, BrowserWindow, Tray, Menu} = require('electron')
const path = require('path')
const url = require('url')
const fs = require('fs')
const os = require('os')
const notifier = require('node-notifier')
const AutoLaunch = require('auto-launch');
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win
let tray
var platform = os.platform()

app.commandLine.appendSwitch('ignore-certificate-errors');

function createWindow () {
  // Create the browser window.

  win = new BrowserWindow({width: 500, height: 300, resizable: false, frame: false,  icon: path.join(__dirname, '/img/desktop-icon.png'), backgroundColor: '#010A14'/*transparent: true, frame: false*/})
  // tray = new Tray('img/trayicon.png')
  var iconPath = path.join(__dirname, '/img/trayicon.png')
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
        {label: 'Show', type: 'normal', click: function(){
          win.show()
          if (platform == 'darwin') {
            app.dock.show()
          }
        }},
        {label: 'Start at Login', type: 'checkbox', checked: false, click: function(item){
          console.log(item.checked)
        }},
        {label: '', type: 'separator'},
        {label: 'Quit', type: 'normal', click: function(){
          app.quit()
        }}
    ])
    tray.setToolTip('Riftwalk')
    tray.setContextMenu(contextMenu)
  // and load the index.html of the app.
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))

  // Open the DevTools.
  win.webContents.openDevTools()


  // Emitted when the window is closed.
  win.on('close', (event) => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    event.preventDefault()//this prevents it from closing. The `closed` event will not fire now
    win.hide()
    if (platform == 'darwin') {
      app.dock.hide()
    }
        // Object
        notifier.notify({
          'title': 'Riftwalk',
          'message': 'We\'ll keep running in the background to make sure you don\'t miss a queue!'
        })
    })

  tray.on('click', () => {
    if (win.isVisible()){
      win.hide()
      if (platform == 'darwin') {
        app.dock.hide()
      }

    }else {
      win.show()
      if (platform == 'darwin') {
        app.dock.show()
      }
    }
  })
}



// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
    win.removeAllListeners('close');
    win.close();
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
  else {
    win.show()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
