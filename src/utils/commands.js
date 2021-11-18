const {generateMessage} = require('./messages')
const fs = require('fs')
var path = require('path');
const fsPromises = require('fs').promises

const getFileData = async fn => {
    data = await fsPromises.readFile(fn)
    return data
}
const errorMessage = (message = "Incorrect Syntax") => {
    let resp;
    resp.status = 0
    resp.message = message
}
const test = async (io,roomid) => {
    //const clients = getClients(io,roomid)
    let resp;
    resp.status = 1
    resp.message = "Command Test Successful"  
    io.to(roomid).emit('test','jazz') 
    io.to(roomid).emit('message',generateMessage('Hymn', resp.message)) 

}
const getClients = (io,roomid) => {
    const clients = io.sockets.adapter.rooms[roomid].sockets 
    return clients
}


module.exports = async function (commandData,io,roomid,myroomsmap){    
       
    const command = commandData.command
    const input = {stationName : commandData.stationName, stationId : commandData.stationId, stationUrl: commandData.stationUrl}
    
    const room = myroomsmap.get(roomid)
    room.channelPlaying = input
    myroomsmap.set(roomid, room)
    io.to(roomid).emit(command,input)    
}

