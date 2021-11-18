const myPeer = new Peer(undefined, {
    host: '/',
    port: '3001'
})
  
  function newEl(type){
    const el = document.createElement(type)
    return el   
  }
  
  const myaudio = newEl('audio')
  myaudio.muted = true
  const peers = {}
  
  navigator.mediaDevices.getUserMedia({  
    video: false,
    audio: true
  }).then(stream => {
    
    //Stream Object
    console.log("stream",stream)
    stream.getTracks().forEach((t) => {
      console.log("initial disable")
      if (t.kind === 'audio') t.enabled = false
    })
    addaudioStream(myaudio, stream)
  
  
    micbtn.addEventListener('click', ()=>{  
      micmuted  = !micmuted
      if(micmuted){
        console.log('muted') 
        stream.getTracks().forEach((t) => {
          console.log("event disable")
          if (t.kind === 'audio') t.enabled = false
        })
      } 
      else{
        console.log('unmuted')
        stream.getTracks().forEach((t) => {
          console.log("event enable")
          if (t.kind === 'audio') t.enabled = true
        })
      }
      addaudioStream(myaudio, stream)
    })
  
    myPeer.on('call', call => {
      console.log("incoming call")
      call.answer(stream)
      const audio = newEl('audio')
      call.on('stream', useraudioStream => {
        console.log("incoming audio called")
        addaudioStream(audio, useraudioStream)
      })
    })
  
    socket.on('user-connected', userId => {
        console.log("new user connects", userId)
      connectToNewUser(userId, stream)
    })
  })
  
  socket.on('user-disconnected', userId => {
    if (peers[userId]) peers[userId].close()
  })
  
  myPeer.on('open', peerId => {
      console.log("peer id at on", peerId)
      socket.emit('join',{username, room: ROOM_ID, peerId, roomname : room}, (error)=>{
          if(error){
              alert(error)
              location.href = '/'
          }
      })
  })
  
  function connectToNewUser(userId, stream) {
      console.log("connects new peer")
      const audio = newEl('audio')
      const call = myPeer.call(userId, stream)
    call.on('stream', useraudioStream => {
        console.log("self audio called")
      addaudioStream(audio, useraudioStream)
    })
    call.on('close', () => {
      audio.remove()
    })
  
    peers[userId] = call
  }
  
  function addaudioStream(audio, stream) {
      console.log("audio added")
    audio.srcObject = stream
    audio.addEventListener('loadedmetadata', () => {
      audio.play()
    })
    audioGrid.append(audio)
  }