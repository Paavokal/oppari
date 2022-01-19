const express = require('express')
const app = express()
const http = require('http')
const server = http.createServer(app)
const PORT = process.env.PORT || 3001
const socketIo = require('socket.io')

const io = socketIo(server,{ 
    cors: {
      origin: 'http://localhost:3000'
    }
})

app.use(express.static(__dirname + '/public'))

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html')
  })

const date = `Server startup: ${new Date()}`
const users = []


//CLIENT CONNECTION
io.on('connection',(socket)=>{
    console.log('client connected: ',socket.id)

    //USER JOIN
    socket.on('user_join', (data) => {
        socket.nickname = data
        users.push(data)
        io.emit('user_join', users)
        socket.broadcast.emit('chat message', `<b> ${socket.nickname} connected </b>`)
    })

    //CHAT-MESSAGE
    socket.on('chat message', msg => {
        io.emit('chat message',`<b>${socket.nickname}</b>: ${msg}`)
      })
    
    //USER DISCONNECT
    socket.on('disconnect', () => {
        if (socket.nickname) {
            users.splice(users.indexOf(socket.nickname), 1)
            console.log(users)
            io.emit('user_quit', users)
            socket.broadcast.emit('chat message', `<b> ${socket.nickname} disconnected </b>`)
          }
    })
})


server.listen(PORT, () => {
    console.log('listening on *:3001')
})