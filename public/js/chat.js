const socket = io()
const {RadioBrowserApi} = require('radio-browser-api') //{RadioBrowserApi, StationSearchOrder, StationSearchType}
const rbapi = new RadioBrowserApi('Hymn-Chat-Call-Radio')

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
  stream.getTracks().forEach((t) => {
    if (t.kind === 'audio') t.enabled = false
  })
  addaudioStream(myaudio, stream)
  micbtn.addEventListener('click', ()=>{  
    micmuted  = !micmuted
    if(micmuted){
      stream.getTracks().forEach((t) => {
        if (t.kind === 'audio') t.enabled = false
      })
    } 
    else{
      stream.getTracks().forEach((t) => {
        if (t.kind === 'audio') t.enabled = true
      })
    }
    addaudioStream(myaudio, stream)
  })

  myPeer.on('call', call => {
    call.answer(stream)
    const audio = newEl('audio')
    call.on('stream', useraudioStream => {
      //console.log("incoming audio called")
      addaudioStream(audio, useraudioStream)
    })
  })

  socket.on('user-connected', userId => {
      setTimeout(()=>connectToNewUser(userId, stream), 3000)
  })
})

socket.on('user-disconnected', userId => {
  if (peers[userId]) peers[userId].close()
})

myPeer.on('open', peerId => {
    socket.emit('join',{username, room: ROOM_ID, peerId, roomname : room}, (error)=>{
        if(error){
            alert(error)
            location.href = '/'
        }
    })
})

function connectToNewUser(userId, stream) {
    const audio = newEl('audio')
    const call = myPeer.call(userId, stream)
  call.on('stream', useraudioStream => {
      //console.log("self audio called")
    addaudioStream(audio, useraudioStream)
  })
  call.on('close', () => {
    audio.remove()
  })

  peers[userId] = call
}

function addaudioStream(audio, stream) {
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
    const html = Mustache.render(messageTemplate,{
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('h:mm a')
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})

socket.on('locationMessage', (location)=>{
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
            $locationButton.removeAttribute('disabled')
           })      
     })     
 })

//RADIO
let radioSound, volume = 0.5;

const playRadioSound = async (url) => {
  if(radioSound) radioSound.stop();
  radioSound = new Howl({
    src: url, 
    format: ['mp3', 'aac'],
    volume,
    html5 : true
  });
  if(radioSound) radioSound.play();
}

const stopRadioSound = () => {
  if(radioSound) radioSound.stop();
}

const isPlaying = () => {
  if(!radioSound) return false
  return radioSound.playing()
}

const setVolume = (vol) => {
  if(radioSound) radioSound.volume(vol)
  volume = vol;
}


document.querySelectorAll('.tag').forEach(($tag)=>{
  $tag.addEventListener('click', (e)=>{
    selectTag(e.target)
  })
})

const selectTag = async ($tag) => {
  const tagname = $tag.textContent
  const index = parseInt($tag.getAttribute('key'))
  document.querySelectorAll('.selected-tag').forEach(($selectedTag)=>{
    $selectedTag.classList.remove('selected-tag')
  })
  $tag.classList.add('selected-tag')
  const stations1 = await rbapi.searchStations({
    language: 'english',
    tag: tagname,
    limit: 100
  })
  const stations2 = await rbapi.searchStations({
    country : 'india',
    tag: tagname,
    limit: 100
  })
  const stations = stations1.concat(stations2)
  const $stations = document.getElementById('stations')
  $stations.innerHTML = null
  stations.forEach((station)=>{
    const stationName = station.name
    const stationId = station.id
    const stationUrl = station.url //[urlResolved recommended but using url for now]
    let stationTags = station.tags
    const stationCountry = station.country
    const stationLanguage = station.language
    
    if(stationTags.length > 2){
      stationTags = stationTags.slice(0,2)
    }

    const html = Mustache.render(stationTemplate,{
      stationName,
      stationTags,
      stationCountry,
      stationLanguage,
      stationId,
      stationUrl
    })
    
    $stations.insertAdjacentHTML('beforeend',html)
    const $station = document.querySelector(`[key='${stationId}']`)
    const $stationPlay = $station.querySelector('.station-play-btn')
    $stationPlay.addEventListener('click', (e)=>{
      selectStation($station)
    })
  })
}

const nowPlaying = {
  stationName: null,
  stationId: null,
  stationUrl: null
}

const updateNowPlaying = ({stationName, stationId, stationUrl}) => {
  nowPlaying.stationName = stationName
  nowPlaying.stationId = stationId
  nowPlaying.stationUrl = stationUrl
}

socket.on('catch-webaudiostate', (channelPlaying) => {
  if(channelPlaying === null || channelPlaying.stationUrl === null){
    return
  }
  play(channelPlaying.stationName, channelPlaying.stationUrl, channelPlaying.stationId)
})


const selectStation = ($station) => {
  const stationId = $station.getAttribute('key')
  const stationName = $station.getAttribute('name')
  const stationUrl = $station.getAttribute('url')
  document.querySelectorAll('.selected-station').forEach(($selectedStation)=>{
    $selectedStation.classList.remove('selected-station')
  })
  $station.classList.add('selected-station')
  const commandData = {
    command : 'play',
    stationName,
    stationUrl,
    stationId
  }
  socket.emit('send-command',commandData)
}

document.getElementById('play-pause-btn').addEventListener('click', () => {
  let commandData;
  if(nowPlaying.stationUrl){
    if(!isPlaying()){
      commandData = {
        command : 'play',
        stationName : nowPlaying.stationName,
        stationUrl : nowPlaying.stationUrl,
        stationId : nowPlaying.stationId
      }  
    }
    else{
      commandData = {
        command : 'stop',
        stationName : null,
        stationUrl : null,
        stationId : null
      }  
    }
    socket.emit('send-command',commandData)
  }
})


const play = async (stationName, stationUrl, stationId) => {
  const nps = document.querySelector('.now-playing-station')
  nps.innerHTML = stationName
  const ppbtn = document.getElementById('play-pause-btn')
  ppbtn.innerHTML = 'Pause'
  updateNowPlaying({stationName, stationId, stationUrl})
  playRadioSound(stationUrl)
}
const stop = async (stationName, stationUrl, stationId) => {
  const ppbtn = document.getElementById('play-pause-btn')
  ppbtn.innerHTML = 'Play'
  stopRadioSound()
}
document.getElementById('volume-slider').addEventListener('input', (e)=> {
  setVolume(e.target.value)
})
socket.on('play', (data)=>{
  play(data.stationName, data.stationUrl, data.stationId)
})
socket.on('stop', (data) => {
  stop(data.stationName, data.stationUrl, data.stationId)
})





