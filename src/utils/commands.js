module.exports = async function (commandData,io,roomid,myroomsmap){           
    //const clients = io.sockets.adapter.rooms[roomid].sockets 
    const command = commandData.command
    const input = {stationName : commandData.stationName, stationId : commandData.stationId, stationUrl: commandData.stationUrl}
    const room = myroomsmap.get(roomid)
    room.channelPlaying = input
    myroomsmap.set(roomid, room)
    io.to(roomid).emit(command,input)    
}

