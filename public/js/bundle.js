(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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
let radioSound, volume = 0.5;

const playRadioSound = async (url) => {
  if(radioSound) radioSound.stop();
  radioSound = new Howl({
    src: url, //url //[urlResolved recommended but using url for now] 
    format: ['mp3', 'aac'],
    volume,
    html5 : true
  });
  radioSound.play();
}

const stopRadioSound = () => {
  radioSound.stop();
}

const isPlaying = () => {
  return radioSound.playing()
}

const setVolume = (vol) => {
  radioSound.volume(vol)
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
  const stations = await rbapi.searchStations({
    language: 'english',
    tag: tagname,
    limit: 10
  })
  stations.forEach((station)=>{
    const stationName = station.name
    const stationId = station.id
    const stationUrl = station.url //[urlResolved recommended but using url for now]
    let stationTags = station.tags
    const stationCountry = station.country
    const stationLanguage = station.language
    // const stationTags = 'rock'
    // const stationCountry = 'us'
    // const stationLanguage = 'english'
  
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
    
    const $stations = document.getElementById('stations')
    $stations.insertAdjacentHTML('beforeend',html)
    const $station = document.querySelector(`[key='${stationId}']`)
    const $stationPlay = $station.querySelector('.station-play-btn')
    $stationPlay.addEventListener('click', (e)=>{
      selectStation($station)
    })
  })
}

const nowPlaying = {
  stationName: '',
  stationId: '',
  stationUrl: ''
}

const updateNowPlaying = ({stationName, stationId, stationUrl}) => {
  nowPlaying.stationName = stationName
  nowPlaying.stationId = stationId
  nowPlaying.stationUrl = stationUrl
}

socket.on('catch-webaudiostate', (channelPlaying) => {
  
  console.log(channelPlaying)
  if(channelPlaying === null || (channelPlaying.stationUrl === null)){
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




socket.on('test', async (data) => {
  const stations = await rbapi.searchStations({
    language: 'english',
    tag: 'rock',
    limit: 3
  })
  console.log(stations)
  const url = stations[0].url
  var sound = new Howl({
    src: url, 
    format: ['mp3', 'aac'],
    html5 : true
  });
  sound.play();
})





},{"radio-browser-api":3}],2:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.StationSearchType = exports.StationSearchOrder = void 0;

/**
 * @public
 */
const StationSearchOrder = {
  name: 'name',
  url: 'url',
  homepage: 'homepage',
  favicon: 'favicon',
  tags: 'tags',
  country: 'country',
  state: 'state',
  language: 'language',
  votes: 'votes',
  codec: 'codec',
  bitrate: 'bitrate',
  lastCheckOK: 'lastCheckOK',
  lastCheckTime: 'lastCheckTime',
  clickTimeStamp: 'clickTimeStamp',
  clickCount: 'clickCount',
  clickTrend: 'clickTrend',
  random: 'random'
};
/**
 * @public
 */

exports.StationSearchOrder = StationSearchOrder;
const StationSearchType = {
  byUuid: 'byUuid',
  byName: 'byName',
  byNameExact: 'byNameExact',
  byCodec: 'byCodec',
  byCodexExact: 'byCodecExact',
  byCountry: 'byCountry',
  byCountryExact: 'byCountryExact',
  byCountryCodeExact: 'byCountryCodeExact',
  byState: 'byState',
  byStateExact: 'byStateExact',
  byLanguage: 'byLanguage',
  byLanguageExact: 'byLanguageexact',
  byTag: 'byTag',
  byTagExact: 'byTagExact'
};
/**
 * @public
 */

exports.StationSearchType = StationSearchType;

},{}],3:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _radioBrowser = require("./radioBrowser");

Object.keys(_radioBrowser).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _radioBrowser[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _radioBrowser[key];
    }
  });
});

var _constants = require("./constants");

Object.keys(_constants).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _constants[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _constants[key];
    }
  });
});

},{"./constants":2,"./radioBrowser":4}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RadioBrowserApi = void 0;

var _constants = require("./constants");

/**
 * Query the radio browser api.
 * @public
 */
class RadioBrowserApi {
  /**
   * Creates an instance of radio browser api.
   * @param appName - App name to be used as user agent header to indentify the calls to the API
   * @param hideBroken - Hide broken stations for all future API calls
   */
  constructor(appName, hideBroken = true) {
    this.appName = appName;
    this.hideBroken = hideBroken;
    this.baseUrl = void 0;
    this.fetchConfig = {
      method: 'GET',
      redirect: 'follow'
    };

    if (!appName) {
      throw new Error('appName is required');
    }

    this.fetchConfig.headers = {
      'user-agent': this.appName
    };
  }
  /**
   * Resolves API base url this will be the default for all class instances.
   * @param autoSet - Automatically set first resolved base url
   * @param config-  Fetch configuration
   * @returns Array of objects with the ip and name of the api server
   */


  async resolveBaseUrl(config = {}) {
    let result; // temporary fix for https cert error when in frontend
    // hardcode the server
    // https://github.com/segler-alex/radiobrowser-api-rust/issues/122

    if (typeof window !== 'undefined') {
      return [{
        ip: '45.77.62.161',
        name: 'fr1.api.radio-browser.info'
      }];
    }

    const response = await fetch( // this should be https when the above issue is resolved
    'http://all.api.radio-browser.info/json/servers', config);

    if (response.ok) {
      result = await response.json();
      return result;
    } else {
      throw response;
    }
  }
  /**
   * Sets base url for all api calls
   * @param url - Url to the api server
   */


  setBaseUrl(url) {
    this.baseUrl = url;
  }
  /**
   * Get current  base url
   * @returns Base url
   */


  getBaseUrl() {
    return this.baseUrl;
  }
  /**
   * Gets available countries
   * @param search - Search for country
   * @param query - Query params
   * @param fetchConfig - Fetch configuration
   * @returns Array of country results with the name of the station and station count
   */


  async getCountries(search, query, fetchConfig) {
    return this.runRequest(this.buildRequest('countries', search, query), fetchConfig);
  }
  /**
   * Gets countries by country code
   * @param search - Country code
   * @param query  - Query
   * @param fetchConfig - Fetch configuration
   * @returns Array of country results with the name of the station and station count
   */


  async getCountryCodes(search, query, fetchConfig) {
    search = search ? `${search.toUpperCase()}` : '';
    return this.runRequest(this.buildRequest('countrycodes', search, query), fetchConfig);
  }
  /**
   * Gets available codes
   * @param query - Query
   * @param fetchConfig -  Fetch configuration
   * @returns List of available codes
   */


  async getCodecs(query, fetchConfig) {
    return this.runRequest(this.buildRequest('codecs', '', query), fetchConfig);
  }
  /**
   * Gets country states. States **should** be regions inside a country.
   * @param country - Limit state to particular country
   * @param query - Query
   * @param fetchConfig - Fetch configuration
   * @returns Array of country states
   */


  async getCountryStates(country, query, fetchConfig) {
    return this.runRequest(this.buildRequest('states', country, query), fetchConfig);
  }
  /**
   * Gets all available languages
   * @param language- Limit results to particular language
   * @param query -  Query
   * @param fetchConfig - Fetch configuration
   * @returns Array of language results
   */


  async getLanguages(language, query, fetchConfig) {
    return this.runRequest(this.buildRequest('languages', language, query), fetchConfig);
  }
  /**
   * Gets all available tags
   * @param tag - Limit results to particular tag
   * @param query - Query
   * @param fetchConfig - Fetch configuration
   * @returns List of tag results
   */


  async getTags(tag, query, fetchConfig) {
    tag = tag ? tag.toLowerCase() : ''; // empty string returns all tags

    return this.runRequest(this.buildRequest('tags', tag, query), fetchConfig);
  }
  /**
   * Gets stations by various available parameters
   * @param searchType - Parameter for the search
   * @param search - Search value for the parameter
   * @param query - Query
   * @param fetchConfig - Fetch configuration
   * @param removeDuplicates - remove duplicate stations
   * @returns Array of station results
   */


  async getStationsBy(searchType, search, query, fetchConfig, removeDuplicates = false) {
    if (!_constants.StationSearchType[searchType]) {
      throw new Error(`search type does not exist: ${searchType}`);
    }

    search = search ? search.toLowerCase() : ''; // http://fr1.api.radio-browser.info/{format}/stations/byuuid/{searchterm}

    const stations = await this.runRequest(this.buildRequest(`stations/${searchType.toLowerCase()}`, search, query), fetchConfig);
    return this.normalizeStations(stations, removeDuplicates);
  }
  /**
   * Normalizes stations from the API response
   * @param stations - Array of station responses
   * @param removeDuplicates - remove duplicate stations
   * @returns Array of normalized stations
   */


  normalizeStations(stations, removeDuplicates = false) {
    const result = [];
    const duplicates = {};

    for (const response of stations) {
      if (removeDuplicates) {
        const nameAndUrl = `${response.name.toLowerCase().trim()}${response.url.toLowerCase().trim()}`; // guard against results having the same stations under different id's

        if (duplicates[nameAndUrl]) continue;
        duplicates[nameAndUrl] = true;
      }

      const station = {
        changeId: response.changeuuid,
        id: response.stationuuid,
        name: response.name,
        url: response.url,
        urlResolved: response.url_resolved,
        homepage: response.homepage,
        favicon: response.favicon,
        country: response.country,
        countryCode: response.countrycode,
        state: response.state,
        votes: response.votes,
        codec: response.codec,
        bitrate: response.bitrate,
        clickCount: response.clickcount,
        clickTrend: response.clicktrend,
        hls: Boolean(response.hls),
        lastCheckOk: Boolean(response.lastcheckok),
        lastChangeTime: new Date(response.lastchangetime),
        lastCheckOkTime: new Date(response.lastcheckoktime),
        clickTimestamp: new Date(response.clicktimestamp),
        lastLocalCheckTime: new Date(response.lastlocalchecktime),
        language: response.language.split(','),
        lastCheckTime: new Date(response.lastchecktime),
        tags: [...new Set(response.tags.split(','))].filter(tag => tag.length > 0 && tag.length < 10) // drop duplicates and tags over 10 characters

      };
      result.push(station);
    }

    return result;
  }
  /**
   * Gets all available stations. Please note that if results
   * are not limited somehow, they can be huge (size in MB)
   * @param query - Query
   * @param fetchConfig - Fetch configuration
   * @param removeDuplicates - remove duplicate stations
   * @returns Array of all available stations
   */


  async getAllStations(query, fetchConfig, removeDuplicates = false) {
    const stations = await this.runRequest(this.buildRequest('stations', '', query), fetchConfig);
    return this.normalizeStations(stations, removeDuplicates);
  }
  /**
   * Searches stations by particular params
   * @param query - Query
   * @param fetchConfig - Fetch configuration
   * @param removeDuplicates - remove duplicate stations
   * @returns Array of station results
   */


  async searchStations(query, fetchConfig, removeDuplicates = false) {
    const stations = await this.runRequest(this.buildRequest('stations/search', undefined, query), fetchConfig);
    return this.normalizeStations(stations, removeDuplicates);
  }
  /**
   * Gets stations by clicks. Stations with the highest number of clicks are most popular
   * @param limit - Limit the number of returned stations
   * @param fetchConfig - Fetch configuration
   * @returns Array of stations
   */


  async getStationsByClicks(limit, fetchConfig) {
    return this.resolveGetStations('topclick', limit, fetchConfig);
  }
  /**
   * Gets stations by votes. Returns most voted stations
   * @param limit - Limit the number of returned stations
   * @param fetchConfig - Fetch configuration
   * @returns Array of stations
   */


  async getStationsByVotes(limit, fetchConfig) {
    return this.resolveGetStations('topvote', limit, fetchConfig);
  }
  /**
   * Gets stations by recent clicks. They are basically most recently listened stations.
   * @param limit - Limit the number of returned stations
   * @param fetchConfig - Fetch configuration
   * @returns Array of stations
   */


  async getStationsByRecentClicks(limit, fetchConfig) {
    return this.resolveGetStations('lastclick', limit, fetchConfig);
  }
  /**
   * Sends click for the station. This method should be used when user starts to listen to the station.
   * @param id - Station id
   * @param fetchConfig  - Fetch configuration
   * @returns Station click object
   */


  async sendStationClick(id, fetchConfig) {
    return this.runRequest(this.buildRequest('url', id, undefined, false), fetchConfig);
  }
  /**
   * Votes for station. This method should be used when user adds the station to favourites etc..
   * @param id - Station id
   * @param fetchConfig - Fetch configuration
   * @returns Station vote object
   */


  async voteForStation(id, fetchConfig) {
    return this.runRequest(this.buildRequest('vote', id), fetchConfig);
  }
  /**
   * Gets stations by station id
   * @param ids - Array of station id's
   * @param fetchConfig - Fetch configuration
   * @returns Array of stations
   */


  async getStationsById(ids, fetchConfig) {
    const stationsIds = ids.join(',');
    const stations = await this.runRequest(this.buildRequest(`stations/byuuid?uuids=${stationsIds}`, undefined, undefined, false), fetchConfig);
    return this.normalizeStations(stations);
  }
  /**
   * Gets station by station url
   * @param url - Station url
   * @param fetchConfig - Fetch configuration
   * @returns Array of stations
   */


  async getStationByUrl(url, fetchConfig) {
    const stations = await this.runRequest(this.buildRequest(`stations/byurl/${url}`, undefined, undefined, false), fetchConfig);
    return this.normalizeStations(stations);
  }

  async resolveGetStations(endPoint, limit, fetchConfig) {
    const limitStations = limit ? `/${limit}` : '';
    const stations = await this.runRequest(this.buildRequest(`stations/${endPoint}${limitStations}`, undefined, undefined, false), fetchConfig);
    return this.normalizeStations(stations);
  }
  /**
   * Builds request to the API
   * @param endPoint - API endpoint
   * @param search - Search term
   * @param query - Query
   * @param addHideBrokenParam - Hide broken stations from the results
   * @returns Built request string
   */


  buildRequest(endPoint, search, query, addHideBrokenParam = true) {
    search = search ? `/${encodeURIComponent(search)}` : '';
    let queryCopy;

    if (query) {
      queryCopy = { ...query
      };

      if ('tagList' in queryCopy && Array.isArray(queryCopy.tagList)) {
        queryCopy.tagList = [...queryCopy.tagList];
      }

      if (addHideBrokenParam && typeof queryCopy.hideBroken === 'undefined') {
        queryCopy.hideBroken = this.hideBroken;
      }
    }

    const queryParams = queryCopy ? this.createQueryParams(queryCopy) : '';
    return `${endPoint}${search}${queryParams}`;
  }
  /**
   * Fires of the request to the API
   * @param url - Request url
   * @param fetchConfig - Fetch configuration
   * @returns Fetch response
   */


  async runRequest(url, fetchConfig = {}) {
    const finalConfig = { ...this.fetchConfig,
      ...fetchConfig,
      headers: { ...this.fetchConfig.headers,
        ...fetchConfig.headers
      }
    };

    if (!this.baseUrl) {
      const results = await this.resolveBaseUrl();
      const random = Math.floor(Math.random() * results.length);
      this.baseUrl = `https://${results[random].name}`;
    }

    const response = await fetch(`${this.baseUrl}/json/${url}`, finalConfig);

    if (response.ok) {
      return response.json();
    } else {
      throw response;
    }
  }
  /**
   * Encodes query parameters
   * @param params - Object that represents paramters as key value pairs
   * @returns  String of encoded query parameters
   */


  createQueryParams(params) {
    let result = '';

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        result += `&${key}=${encodeURIComponent(value)}`;
      }
    }

    return result ? `?${result.slice(1).toLowerCase()}` : '';
  }

}

exports.RadioBrowserApi = RadioBrowserApi;
RadioBrowserApi.version = "4.0.5";

},{"./constants":2}]},{},[1]);
