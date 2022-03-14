const express = require('express')
const app = express()
const http = require('http')
const server = http.createServer(app)
const PORT = process.env.PORT || 3001
const socketIo = require('socket.io')
const crypto = require('crypto')
const randomId = () => crypto.randomBytes(8).toString("hex")
require("dotenv").config()

const { InMemorySessionStore } = require("./sessionStore");
const sessionStore = new InMemorySessionStore();

const io = socketIo(server)

app.use(express.static(__dirname + '/public'))


// MIDDLEWARE: USERNAME SOCKET HANDSHAKE
io.use((socket, next) => {
    //CHECK AVAILABLE SESSION
    const sessionID = socket.handshake.auth.sessionID
    if (sessionID) {
      const session = sessionStore.findSession(sessionID)
      if (session) {
        socket.sessionID = sessionID
        socket.userID = session.userID
        socket.username = session.username
        return next()
      }
    }

    //CHECK IF USERNAME ALREADY TAKEN
    sessionStore.findAllSessions().forEach((session) => {
        if(session.username === socket.handshake.auth.username) {
            return next(new Error("username already taken"))
        }
    })
    const username = socket.handshake.auth.username
    if (!username) {
      return next(new Error("invalid username"))
    }
    socket.sessionID = randomId()
    socket.userID = randomId()
    socket.username = username
    next()
  })


//CLIENT CONNECTION
io.on('connection',(socket)=>{
    socket.join(socket.userID)
    const users = []


    //SAVE SESSION
    sessionStore.saveSession(socket.sessionID, {
        userID: socket.userID,
        username: socket.username,
        connected: true,
    })
    socket.emit("session", {
        sessionID: socket.sessionID,
        userID: socket.userID,
        username: socket.username
    })


    //LOGGING ALL EVENTS
    socket.onAny((event, ...args) => {
        console.log(event, args)
    })

    //USER JOIN / update userlist
    sessionStore.findAllSessions().forEach((session) => {
        if(session.connected === true) {
            users.push({
            userID: session.userID,
            username: session.username,
            connected: session.connected,
            })
        }
    })
    console.log(users)
    io.emit("users", users)

    //CHAT-MESSAGE
    socket.on('chat message', msg => {
        io.emit('chat message',`<b>${socket.username}</b>: ${msg}`)
    })
    //PRIVATE MESSAGE
    socket.on('private_message', (toUser, msg) => {
        console.log(`private message: "${msg}" from:${socket.userID} to:${toUser}`)
        io.to(toUser).to(socket.userID).emit('private_message', {
            msg: `<b>${socket.username}:</b> ${msg}`,
            from: socket.userID,
            to: toUser
        })
    })

    socket.on('new message', () => {
        io.to(socket.userID).emit('users', users)
    })
    
    //USER DISCONNECT
    socket.on('disconnect', () => {
        //DISCONNECTED USER connected:false
        sessionStore.saveSession(socket.sessionID, {
            userID: socket.userID,
            username: socket.username,
            connected: false,
        });
        console.log('User: ' + socket.userID + ' has left')
        io.emit('user_disconnect', socket.userID)
    })
})


server.listen(PORT, () => {
    console.log('listening on *:3001')
})