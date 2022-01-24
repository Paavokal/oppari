const express = require('express')
const app = express()
const http = require('http')
const server = http.createServer(app)
const PORT = process.env.PORT || 3001
const socketIo = require('socket.io')
const socketioJwt = require('socketio-jwt')

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


// MIDDLEWARE: USERNAME HANDSHAKE TO SOCKET
io.use((socket, next) => {
    console.log(socket.handshake.auth.username)
    const username = socket.handshake.auth.username
    if (!username) {
        return next(new Error("invalid username"))
    }
    socket.username = username
    next()
})


//CLIENT CONNECTION
io.on('connection',(socket)=>{

    console.log(socket)
    socket.onAny((event, ...args) => {
        console.log(event, args)
    })

    //USER JOIN
    socket.on('user_join', () => {
        users.push(socket.username)
        io.emit('user_join', users)
        socket.broadcast.emit('chat message', `<b> ${socket.username} connected </b>`)
        console.log(users)
    })

    //CHAT-MESSAGE
    socket.on('chat message', msg => {
        io.emit('chat message',`<b>${socket.username}</b>: ${msg}`)
    })

    //PRIVATE MESSAGE
    socket.on('private_message', (toUser, msgToUser) => {
        console.log(io.allSockets())
    })
    
    //USER DISCONNECT
    socket.on('disconnect', () => {
        if (socket.username) {
            users.splice(users.indexOf(socket.username), 1)
            console.log(users)
            io.emit('user_quit', users)
            socket.broadcast.emit('chat message', `<b> ${socket.username} disconnected </b>`)
          }
    })
})


server.listen(PORT, () => {
    console.log('listening on *:3001')
})