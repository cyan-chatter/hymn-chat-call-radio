const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
//const {RadioBrowserApi, StationSearchOrder, StationSearchType} = require('radio-browser-api')
//const API = new RadioBrowserApi('Hymn-Chat-Call-Radio')
const app = express()
const cors = require("cors")
const server = http.createServer(app)
const Filter = require('bad-words')
const { v4: uuidV4 } = require('uuid')
const bodyParser = require("body-parser")
require('dotenv').config({ path: `${__dirname}/dev.env` })


const lyricsFinder = require("lyrics-finder")


app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.set('view engine', 'ejs')
const publicDirectoryPath = path.join(__dirname, '../public')
app.use(express.static(publicDirectoryPath))
const port = process.env.PORT || 3000
const io = socketio.listen(server, {
    log: false,
    agent: false,
    origins: '*:*',
    transports: ['websocket', 'htmlfile', 'xhr-polling', 'jsonp-polling', 'polling']
})

const {generateMessage, generateLocation} = require('./utils/messages')
const {addUser, removeUser, getUser, getUsersInRoom, setAudioState} = require('./utils/users')

const executeCommand = require('./utils/commands')
// const rba = {
//     API,  StationSearchOrder, StationSearchType
// }

const invrooms = []


const soloroomid = uuidV4()

const generalroom = {
    roomname : 'general', roomid: 'general', roomtype : 'myroom-default', actives : 0, channelPlaying : null
}
const soloroom = {
    roomname : 'solo', roomid: soloroomid, roomtype : 'myroom-default', actives : 0, channelPlaying : null
}

const myroomsmap = new Map()

myroomsmap.set(generalroom.roomid,generalroom)
myroomsmap.set(soloroom.roomid,soloroom)

app.get('/', (req,res) => {
    res.render('index')
})

app.post('/newmyroom', (req,res)=>{
    let roomname = req.body.roomname
    let roomid = uuidV4()
    const newroom = {
        roomname, roomid, roomtype : 'myroom', actives : 0, channelPlaying : null
    }
    myroomsmap.set(roomid,newroom)
    res.send(newroom)
})
// app.post('/newinvroom', (req,res)=>{
//     let roomid = req.body.roomid
//     let roomname = roomsmap.get(roomid);
//     let roomtype = 'invroom'
//     let actives = 0
//     const newroom = {
//         roomname, roomid, roomtype, actives
//     }
//     invroomsmap.set(roomid,newroom)
//     res.send(newroom)
// })

app.post('/lobby', (req,res)=>{
    username = req.body.username
    const vals = Array.from(myroomsmap.values())
    console.log(vals)
    res.render('lobby',{
        username: req.body.username,
        myrooms : vals, 
        invrooms
    })
})

app.get('/lobby/:username', (req,res)=>{
    const vals = Array.from(myroomsmap.values())
    res.render('lobby',{
        username : req.params.username,
        myrooms : vals,  
        invrooms
    })
})


app.get('/room/:roomid/:username', (req,res) => {
    console.log(req.params)
    console.log(myroomsmap.get(req.params.roomid))
    let room = myroomsmap.get(req.params.roomid).roomname
    console.log(room)
    if(!room) return res.redirect('/')
    const tags = [
        'all',
        'classical',
        'country',
        'dance',
        'disco',
        'jazz',
        'pop',
        'rap',
        'retro',
        'rock'
    ]
    let data = {
        username : req.params.username,
        room,
        roomId : req.params.roomid,
        tags
    }
    res.render('chat', data)
})
  
app.get("/lyrics", async (req, res) => {
    const lyrics =
        (await lyricsFinder(req.query.artist, req.query.track)) || "No Lyrics Found"
    res.json({ lyrics })
})


io.on('connection', (socket)=>{
    console.log('New Web Socket Connection')
    socket.on('join', (options, callback)=>{
        const {error, user} = addUser({ id: socket.id, ...options})
        if(error){
            return callback(error)
        }
        socket.join(user.room)
        socket.to(user.room).broadcast.emit('user-connected', user.peerId)
        socket.emit('message', generateMessage('', 'Welcome!'))
        socket.broadcast.to(user.room).emit('message', generateMessage('', `${user.username} has joined the chat`))    
        let room = myroomsmap.get(user.room)
        socket.emit('catch-webaudiostate', room.channelPlaying)
        myroomsmap.set(user.room, {
            ...room,
            actives : ++room.actives
        })
        io.to(user.room).emit('roomData', {
            room: options.roomname,
            users: getUsersInRoom(user.room)
        })
        callback()
    })

    socket.on('send-message',(messageText, callback)=>{   
        const user = getUser(socket.id)       
        const filter = new Filter()
        if(filter.isProfane(messageText)){
            return callback('Profanity is Not Allowed Here!. Keep the Chat Clean')
        }
        
        io.to(user.room).emit('message',generateMessage(user.username, messageText))
        callback('Message Delivered!')
        const room = myroomsmap.get(user.room)
        console.log(room.channelPlaying)
    })

    socket.on('disconnect',async ()=>{
        const user = removeUser(socket.id)
        if(user){
            socket.to(user.room).broadcast.emit('user-disconnected', user.peerId)
            io.to(user.room).emit('message', generateMessage('', `${user.username} has left the chat`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
            let room = myroomsmap.get(user.room)
            let cp = room.channelPlaying
            --room.actives
            if(room.actives === 0){
                cp = null
            }
            myroomsmap.set(user.room, {
                ...room,
                channelPlaying : cp,
                actives : room.actives
            })
        }
    })
    
    socket.on('send-location', (location,callback)=>{
        const user = getUser(socket.id)
        const messageText = `https://google.com/maps?q=${location.latitude},${location.longitude}`
        io.to(user.room).emit('locationMessage', generateLocation(user.username, messageText))
        callback()
    })

    socket.on('send-command',async (commandText)=>{   
        const user = getUser(socket.id)
        const roomid = user.room
        await executeCommand(commandText,io,roomid,myroomsmap)
    })
    
})

server.listen(port,()=>{
    console.log('Server is up at Port: ', port);
})