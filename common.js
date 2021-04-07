Date.prototype.stdTimezoneOffset = function () {
    var jan = new Date(this.getFullYear(), 0, 1);
    var jul = new Date(this.getFullYear(), 6, 1);
    return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
}

Date.prototype.isDstObserved = function () {
    return this.getTimezoneOffset() < this.stdTimezoneOffset();
}

const now = () => {
    return new Date().getTime();
    var today = new Date();
    var offset = today.getTimezoneOffset();
    var d = new Date(); 
    d.setMinutes(d.getMinutes() + offset);
    return d.getTime();
}

const addVideoToQueueHtml = (video) => {
    var durationStr = video.duration < 1 ? (Math.round(video.duration * 60) + "s") : (Math.round(video.duration) + " min");
    var thumbnail = video.thumbnail.url;

    var toAdd =
        `<div data-id=${video.id} class="video-div video">
            <div class="video-thumbnail-container" onclick="playVideo('${video.id}')">
                <img class="thumbnail" src="${thumbnail}">
                <span class="overlay">${durationStr}</span>
            </div>
            <div class="video-text-container">
                <div>
                    <div class="queue-title line-clamp" onclick="playVideo('${video.id}')">${video.title}</div>
                    <div class="channel-name">${video.channel}</div>
                </div>
                <div class="video-button-container small"> <!-- For small screens -->
                    <button class="mini-button" onclick="playVideo('${video.id}')">▶</button>
                    <button class="mini-button" onclick="deleteVideo('${video.id}')">🗑️</button>
                </div>
            </div>
            <div class="video-button-container video-large">
                <button class="mini-button" onclick="playVideo('${video.id}')">▶</button>
                <button class="mini-button" onclick="deleteVideo('${video.id}')">🗑️</button>
            </div>
        </div>`;

    document.getElementById('queue').innerHTML += toAdd;
    showSnack(`"${video.title}" added to queue`, 1000)
}

/**
 * 0 = title
 * 1 = channel name
 * 2 = thumbnail link
 * 3 = video id
 */

function drawSearchResults(displayArray, searchQuery) {
    document.body.classList.add("fixed");

    document.querySelector(".status").style.filter = "blur(1px)";
    document.querySelector(".nav-bar").style.filter = "blur(1px)";
    document.querySelector(".container").style.filter = "blur(1px)";

    document.querySelector(".lds-dual-ring").style.visibility = "hidden";

    //document.querySelector(".result-container").innerHTML = `<button class="route exit" onclick="removeResults();">X</button>`
    // document.querySelector(".result-container").innerHTML += `
    // <form class="search-input" onsubmit="queueVideo(event, document.getElementById('room').value);" autocomplete="off">
    //     <input placeholder="Search or Paste URL" value="${searchQuery}">
    // </form>`;

    document.querySelector(".result-container #videos").innerHTML = "";
    displayArray.forEach(videoData => document.querySelector(".result-container #videos").innerHTML += `
    <div class="video-div video mini">
        <div class="video-thumbnail-container" onclick="queueVideo(null, 'https://www.youtube.com/watch?v=${videoData[3]}'); removeResults();">
            <img class="thumbnail" src=${videoData[2]}>
        </div>
    <div class="video-text-container">
        <div>
            <div class="queue-title line-clamp" onclick="queueVideo(null, 'https://www.youtube.com/watch?v=${videoData[3]}'); removeResults();">${videoData[0]}</div>
            <div class="channel-name">${videoData[1]}</div>
        </div>`);
}

function removeResults() {
    document.querySelector(".status").style.filter = "";
    document.querySelector(".nav-bar").style.filter = "";
    document.querySelector(".container").style.filter = "";

    document.querySelector(".result-container").style.visibility = "hidden";
    document.querySelector(".lds-dual-ring").style.visibility = "hidden";

    document.body.classList.remove("fixed");
}

function showSnack(message, ms) {
    var snack = document.getElementById("snackbar");

    snack.className = "show";
    snack.textContent = message;

    setTimeout(function () { snack.className = snack.className.replace("show", ""); }, ms);
}

function addProgressBar(id) {
    if (document.querySelector(`[data-id='${id}']`))
        document.querySelector(`[data-id='${id}']`).innerHTML += `<div id="progress-bar"><div id="progress"></div></div>`;
    
    if(trackingProgress == false) {
        trackProgress(id);
    }
}

var trackingProgress = false;
function trackProgress(id) {
    trackingProgress = true
    console.log("started to track progress")
    setInterval(() => {
        if (!player || !youtubeIframeReady) return;

        // The last div (progressbar-bar) and the last (and only) element of it (progress)
        if (document.getElementById('progress')) {
            var time = 0;
            if (connection.getVideoToPlay() && connection.getVideoToPlay().hasEnded)
                time = player.getDuration();
            else 
                time = player.getCurrentTime();

            document.getElementById('progress').style.width = `${time/(player.getDuration())*100}%`
        }
    }, 66 /* 15 fps */)
}

function removeTrackProgress() {
    if (document.contains(document.getElementById('progress-bar'))) {
        document.getElementById('progress-bar').remove();
    }
}

function a() {
    queueVideo({ preventDefault: () => {} }, "https://www.youtube.com/watch?v=LXb3EKWsInQ")
}

function b() {
    queueVideo({ preventDefault: () => {} }, "https://www.youtube.com/watch?v=2ZIpFytCSVc")
}

function c() {
    queueVideo({ preventDefault: () => {} }, "https://www.youtube.com/watch?v=fwKhMzdpu9Y")
}