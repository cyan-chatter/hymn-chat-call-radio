const socket = io()
const {RadioBrowserApi, StationSearchOrder, StationSearchType} = require('radio-browser-api')
const rbapi = new RadioBrowserApi('Hymn-Chat-Call-Radio')
console.log(rbapi)

const $messageForm = document.querySelector('#message-form')
const $messageFormInput = $messageForm.querySelector('input')
const $messageFormButton = $messageForm.querySelector('button')
const $locationButton = document.querySelector('#send-location')
const $messages = document.querySelector('#messages')

const messageTemplate = document.querySelector('#message-template').innerHTML
const locationTemplate = document.querySelector('#location-template').innerHTML
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML
const stationTemplate = document.querySelector('#station-template').innerHTML

const audioGrid = document.getElementById('audio-grid')
const musicGrid = document.getElementById('music-grid')
const micbtn = document.getElementById('toggle-mic-btn')

let micmuted = true
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
      setTimeout(()=>connectToNewUser(userId, stream), 3000)
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


const autoscroll = ()=>{
    const $newMessage = $messages.lastElementChild

    //height of the new message
    const newMessageStyles = getComputedStyle($newMessage)
    const newMessageMargin = parseInt(newMessageStyles.marginBottom)
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin

    // visible height
    const visibleHeight = $messages.offsetHeight

    // height of messages container
    const containerHeight = $messages.scrollHeight

    // how far have i scrolled
    const scrollOffset = $messages.scrollTop + visibleHeight

    if(containerHeight - newMessageHeight <= scrollOffset){
        // scroll to the bottom 
        $messages.scrollTop = $messages.scrollHeight
    }

}

socket.on('message', (message)=>{
    console.log(message)
    const html = Mustache.render(messageTemplate,{
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('h:mm a')
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})

socket.on('locationMessage', (location)=>{
    console.log(location)
    const html = Mustache.render(locationTemplate,{
        username: location.username,
        url: location.url,
        createdAt: moment(location.createdAt).format('h:mm a')
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()    
})

socket.on('roomData', ({room , users})=>{
    const html = Mustache.render(sidebarTemplate, {
      room,
      users  
    })

    document.querySelector('#sidebar').innerHTML = html
})

 $messageForm.addEventListener('submit', (e)=>{
    e.preventDefault()
    $messageFormButton.setAttribute('disabled', 'disabled')
    const messageText = e.target.elements.message_text.value
    socket.emit('send-message',messageText,(error)=>{
        $messageFormButton.removeAttribute('disabled')
        $messageFormInput.value = ''
        $messageFormInput.focus() 
        if(error){
           return console.log(error)    
        }
        console.log('Message Delivered!')
    })
 })

 $locationButton.addEventListener('click', ()=>{
     
     if(!navigator.geolocation){
         return alert('Geolocation is not supported by your Browser.  :(')
     }

     $locationButton.setAttribute('disabled', 'disabled')

     navigator.geolocation.getCurrentPosition((position)=>{      
        const locate = {
            latitude: undefined,
            longitude: undefined
        }
           locate.latitude = position.coords.latitude
           locate.longitude = position.coords.longitude
           socket.emit('send-location', locate,()=>{
            console.log('Location Shared!')
            $locationButton.removeAttribute('disabled')
           })      
     })     
 })

//file player

let audioCtx;
let source;
let songLength;

if(window.webkitAudioContext) {
  audioCtx = new window.webkitAudioContext();
} else {
  audioCtx = new window.AudioContext();
}

const playAudio = async (bufferdata) => {
  source = audioCtx.createBufferSource()
  audioCtx.decodeAudioData(bufferdata, function(buffer) {
    myBuffer = buffer
    songLength = buffer.duration
    source.buffer = myBuffer
    source.connect(audioCtx.destination)
    source.loop = false
  }, function(e){"Error with decoding audio data" + e.error})
  source.start(0)
}


//RADIO
var radioSound = new Howl({
  src: "", //url //[urlResolved recommended but using url for now] 
  format: ['mp3', 'aac'],
  volume : 0.5,
  html5 : true
});

document.querySelectorAll('.tag').forEach(($tag)=>{
  $tag.addEventListener('click', (e)=>{
    selectTag(e.target)
  })
})

const selectTag = ($tag) => {
  const tagname = $tag.textContent
  const index = parseInt($tag.getAttribute('key'))
  document.querySelectorAll('.selected-tag').forEach(($selectedTag)=>{
    $selectedTag.classList.remove('selected-tag')
  })
  $tag.classList.add('selected-tag')
  const stations = await rbapi.searchStations({
    language: 'english',
    tag: tagname,
    limit: 10
  })
  stations.forEach((station)=>{
    const stationName = station.name
    const stationId = station.id
    const stationUrl = station.url //[urlResolved recommended but using url for now]
    const stationTags = station.tags
    const stationCountry = station.country
    const stationLanguage = station.language
  
    const html = Mustache.render(stationTemplate,{
      stationName,
      stationTags,
      stationCountry,
      stationLanguage,
      stationId,
      stationUrl
    })
    const $stations = document.querySelector('.stations')
    $stations.appendChild(html)
  })
}

const selectStation = ($station) => {
  const stationId = $station.getAttribute('key')
  const stationName = $station.getAttribute('name')
  const stationUrl = $station.getAttribute('url')
  document.querySelectorAll('.selected-station').forEach(($selectedStation)=>{
    $selectedStation.classList.remove('selected-station')
  })
  $station.classList.add('selected-station')
  play(stationName, stationUrl)
}

const play = async (stationName, stationUrl) => {
  document.getElementById('now-playing-station').innerHTML = stationName
  radioSound.src = stationUrl
  radioSound.play()
}

const syncplay = () => {
  radioSound.stop()
  radioSound.play()
}

document.getElementById('play-pause-btn').addEventListener('click', (e) => {
  if(radioSound.playing()) {
    radioSound.pause()
    e.target.innerHTML = 'Play'
  } else {
    play()
    e.target.innerHTML = 'Pause'
  }
})

document.getElementById('sync-play-btn').addEventListener('click', (e) => {
  syncplay()
})

document.getElementById('volume-slider').addEventListener('input', (e)=> {
  radioSound.volume(e.target.value)
})

document.querySelectorAll('.station').forEach(($station)=>{
  $station.addEventListener('click', (e)=>{
    selectStation($station)
  })
})

socket.on('test', async (data) => {
  const stations = await rbapi.searchStations({
    language: 'english',
    tag: data,
    limit: 3
  })
  console.log(stations)
  var sound = new Howl({
    src: stations[0].url, //[urlResolved recommended but using url for now]
    format: ['mp3', 'aac'],
    html5 : true
  });
  sound.play();
})

socket.on('play', (data)=>{
  playAudio(data.buffer)
  socket.emit('webaudiostate', null)
})

socket.on('pause', (data)=>{
  if(audioCtx.state === 'running') {
    audioCtx.suspend()
  }
  socket.emit('webaudiostate', null)
})

socket.on('resume', (data)=>{
  if(audioCtx.state === 'suspended') {
    audioCtx.resume()  
  }
  socket.emit('webaudiostate', null)
})

socket.on('stop', (data) => {
  source.stop(0);
  socket.emit('webaudiostate', null)
})


