require("dotenv").config()

const AUTH_URL = `https://accounts.spotify.com/authorize?client_id=${process.env.CLIENT_ID}&response_type=code&redirect_uri=http://localhost:3000&scope=streaming%20user-read-email%20user-read-private%20user-library-read%20user-library-modify%20user-read-playback-state%20user-modify-playback-state`

const spotifyApi = new SpotifyWebApi({
    clientId: process.env.CLIENT_ID
})

spotifyApi.getArtist('2hazSY4Ef3aB9ATXW7F5w3')
  .then(function(data) {
    console.log('Artist information', data.body);
  }, function(err) {
    console.error(err);
  });

  spotifyApi.searchTracks('Love')
  .then(function(data) {
    console.log('Search by "Love"', data.body);
  }, function(err) {
    console.error(err);
  });

  // Search tracks whose artist's name contains 'Love'
spotifyApi.searchTracks('artist:Love')
.then(function(data) {
  console.log('Search tracks by "Love" in the artist name', data.body);
}, function(err) {
  console.log('Something went wrong!', err);
});

// Search tracks whose artist's name contains 'Kendrick Lamar', and track name contains 'Alright'
spotifyApi.searchTracks('track:Alright artist:Kendrick Lamar')
.then(function(data) {
  console.log('Search tracks by "Alright" in the track name and "Kendrick Lamar" in the artist name', data.body);
}, function(err) {
  console.log('Something went wrong!', err);
});



spotifyApi.searchTracks('search').then(res => {
    const searchResults = res.body.tracks.items.map(track => {
        return {
          artist: track.artists[0].name,
          title: track.name,
          uri: track.uri
        }
    })
    
})









spotifyApi.getArtistTopTracks('0oSGxfWSnnOXhD2fKuz2Gy', 'GB')
  .then(function(data) {
    console.log(data.body);
    }, function(err) {
    console.log('Something went wrong!', err);
  });

  /* Get Audio Features for a Track */
spotifyApi.getAudioFeaturesForTrack('3Qm86XLflmIXVm1wcwkgDK')
.then(function(data) {
  console.log(data.body);
}, function(err) {
  done(err);
});

/* Get Audio Analysis for a Track */
spotifyApi.getAudioAnalysisForTrack('3Qm86XLflmIXVm1wcwkgDK')
.then(function(data) {
  console.log(data.body);
}, function(err) {
  done(err);
});

// Get Recommendations Based on Seeds
spotifyApi.getRecommendations({
    min_energy: 0.4,
    seed_artists: ['6mfK6Q2tzLMEchAr0e9Uzu', '4DYFVNKZ1uixa6SQTvzQwJ'],
    min_popularity: 50
  })
.then(function(data) {
  let recommendations = data.body;
  console.log(recommendations);
}, function(err) {
  console.log("Something went wrong!", err);
});

// Get available genre seeds
spotifyApi.getAvailableGenreSeeds()
.then(function(data) {
  let genreSeeds = data.body;
  console.log(genreSeeds);
}, function(err) {
  console.log('Something went wrong!', err);
});






spotifyApi.getMyCurrentPlaybackState()
  .then(function(data) {
    // Output items
    if (data.body && data.body.is_playing) {
      console.log("User is currently playing something!");
    } else {
      console.log("User is not playing anything, or doing so in private.");
    }
  }, function(err) {
    console.log('Something went wrong!', err);
  });

  spotifyApi.getMyCurrentPlayingTrack()
  .then(function(data) {
    console.log('Now playing: ' + data.body.item.name);
  }, function(err) {
    console.log('Something went wrong!', err);
  });


  spotifyApi.pause()
  .then(function() {
    console.log('Playback paused');
  }, function(err) {
    //if the user making the request is non-premium, a 403 FORBIDDEN response code will be returned
    console.log('Something went wrong!', err);
  });

// Seek To Position In Currently Playing Track
spotifyApi.seek(positionMs)
  .then(function() {
    console.log('Seek to ' + positionMs);
  }, function(err) {
    //if the user making the request is non-premium, a 403 FORBIDDEN response code will be returned
    console.log('Something went wrong!', err);
  });

  spotifyApi.play()
  .then(function() {
    console.log('Playback started');
  }, function(err) {
    //if the user making the request is non-premium, a 403 FORBIDDEN response code will be returned
    console.log('Something went wrong!', err);
  });



