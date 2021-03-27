// 1. This code loads the IFrame Player API code asynchronously.
var tag = document.createElement('script');

tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

function onPlayerStateChange(event) {

  // function found in communications.js
  sendChange(event.data);
}

// 2. This function creates an <iframe> (and YouTube player)
//    after the API code downloads.
var player;
function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    height: '390',
    width: '640',
    videoId: 'uD4izuDMUQA',
    playerVars: {
      'autoplay': 0,
      'origin': "http://localhost:5500",
      "rel": 0,
      "modestbranding": 1,
      'sandbox': "allow-forms allow-scripts allow-pointer-lock allow-same-origin allow-top-navigation"
    },
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
}

// 3. The API will call this function when the video player is ready.
function onPlayerReady(event) {
  event.target.stopVideo();
}

var done = false;

function stopVideo() {
  player.stopVideo();
}

function writeToFrame() {
  
}