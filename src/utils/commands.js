const {generateMessage} = require('./messages')
const fs = require('fs')
var path = require('path');
const fsPromises = require('fs').promises

const getFileData = async fn => {
    data = await fsPromises.readFile(fn)
    return data
}

const resp = {
    status : null, message : null
}

const getClients = (io,room) => {
    const clients = io.sockets.adapter.rooms[room].sockets 
    return clients
}

module.exports = async function (commandText,io,room,channelPlaying){    
       
    const argstext = commandText.trim()
    const args = argstext.split(" ", 2)
    const command = args[0]
    const input = args[1]

    //rba: {API,  StationSearchOrder, StationSearchType}
    switch (command) {
        case 'play' : 
                    if(input) await play(input,io,room,channelPlaying);
                    else errorMessage();
                    break;
        case 'pause' : 
                    if(input) errorMessage();
                    else pause(io,room,channelPlaying);
                    break;  
        case 'resume' : 
                    if(input) errorMessage();
                    else resume(io,room,channelPlaying);
                    break;  
        case 'stop' : 
                    if(input) errorMessage();
                    else stop(io,room,channelPlaying);
                    break; 
        case 'test' : 
                    if(input) errorMessage();
                    else test(io,room,channelPlaying);
                    break; 
        default: errorMessage();    
    }
}

const errorMessage = (message = "Incorrect Syntax") => {
    resp.status = 0
    resp.message = message
}


const test = async (io,room,channelPlaying) => {
    //const clients = getClients(io,room)
    resp.status = 1
    resp.message = "Command Test Successful"  
    
    io.to(room).emit('test','jazz') 
    

    io.to(room).emit('message',generateMessage('Hymn', resp.message)) 

}








const playfile = async (input,io,room,channelPlaying) => {    
    
    const filename = 'Ambre.mp3'
    var filepath = path.join(__dirname, filename);
    const stat = fs.statSync(filepath)
    console.log(stat)
    const clients = io.sockets.adapter.rooms[room].sockets    
    player.queue.enqueue()
    io.to(room).emit('message',generateMessage('Hymn', 'Added to Queue'))
    resp.status = 1
    resp.message = "Playing Song...."  
    io.to(room).emit('message',generateMessage('Hymn', resp.message)) 
    
    //to send a file
    fs.readFile(filepath, function(err, buf){
        for (const clientId in clients){
            const socket = io.sockets.connected[clientId]
            socket.emit('play', { audio: true, buffer: buf })
        }       
    })
}

const pausefile = (io,room,webaudiostate) => {
    const clients = io.sockets.adapter.rooms[room].sockets 
    if(!(webaudiostate.isAudioLoaded && webaudiostate.isAudioPlaying)){
        resp.status = 0
        resp.message = "Not Playing.."    
        io.to(room).emit('message',generateMessage('Hymn', resp.message)) 
        return
    }   
    resp.status = 1
    resp.message = "Pausing Song...."
    io.to(room).emit('message',generateMessage('Hymn', resp.message)) 
    for (const clientId in clients){
        const socket = io.sockets.connected[clientId]
        socket.emit('pause', "pause the song")
    }          
}

const resumefile = (io,room,webaudiostate) => {
    const clients = io.sockets.adapter.rooms[room].sockets    
    if(!webaudiostate.isAudioLoaded){
        resp.status = 0
        resp.message = "Nothing to Play.."    
        io.to(room).emit('message',generateMessage('Hymn', resp.message)) 
        return
    }
    if(webaudiostate.isAudioPlaying){
        resp.status = 0
        resp.message = "Already Playing.."    
        io.to(room).emit('message',generateMessage('Hymn', resp.message)) 
        return
    }
    resp.status = 1
    resp.message = "Resuming Song...."
    io.to(room).emit('message',generateMessage('Hymn', resp.message)) 
    for (const clientId in clients){
        const socket = io.sockets.connected[clientId]
        socket.emit('resume', "resume the song")
    }          
}

const stopfile = (io,room,webaudiostate) => {
    const clients = io.sockets.adapter.rooms[room].sockets    
    if(!webaudiostate.isAudioLoaded){
        resp.status = 0
        resp.message = "No Music to Stop.."    
        io.to(room).emit('message',generateMessage('Hymn', resp.message)) 
        return
    }
    resp.status = 1
    resp.message = "Stopping Music...."
    io.to(room).emit('message',generateMessage('Hymn', resp.message)) 
    for (const clientId in clients){
        const socket = io.sockets.connected[clientId]
        socket.emit('stop', "stop the song")
    }          
}