const users = []

//addUser, removeUser, getUser, getUsersInRoom

const addUser = ({id, username, room, peerId}) =>{
    //clean the data
    username = username.trim().toLowerCase()
    room = room.trim().toLowerCase()

    //validate the data
    if(!username||!room){
        return {
            error: 'Username and Room are Required!'
        }
    }

    //check for existing user
    const existingUser = users.find((user)=>{
        return user.room === room && user.username === username
    })

    //validate username
    if(existingUser){
        return {
            error: 'Username is already taken!'
        }
    }

    //store user
    
    const user = {id, username, room, peerId, webaudiostate : {
        isAudioLoaded : false,
        isAudioPlaying : false
    }}
    users.push(user)
    return { user }
} 

const removeUser = (id)=>{
    const index = users.findIndex((user)=>{
        return user.id === id
    })
    if(index !== -1){
        return users.splice(index,1)[0]
    }
}

const getUser = (id)=>{
    const user = users.find((u)=>{
        return u.id === id
    })
    return user    
}

const getUsersInRoom = (room)=>{
    room = room.trim().toLowerCase()
    const user = users.filter((u)=>{
        return u.room === room
    })
    return user
}

const setAudioState = (id, isAudioLoaded, isAudioPlaying) => {
    const user = users.find((u)=>{
        return u.id === id
    })
    user.webaudiostate.isAudioLoaded = isAudioLoaded
    user.webaudiostate.isAudioPlaying = isAudioPlaying
    return user
}

module.exports = {
    addUser, 
    removeUser, 
    getUser, 
    getUsersInRoom,
    setAudioState
}