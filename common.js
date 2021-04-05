Date.prototype.stdTimezoneOffset = function () {
    var jan = new Date(this.getFullYear(), 0, 1);
    var jul = new Date(this.getFullYear(), 6, 1);
    return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
}

Date.prototype.isDstObserved = function () {
    return this.getTimezoneOffset() < this.stdTimezoneOffset();
}

const now = () => {
    var today = new Date();
    var offset = today.getTimezoneOffset() - today.stdTimezoneOffset()
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

function showSnack(message, ms) {
    var snack = document.getElementById("snackbar");

    snack.className = "show";
    snack.textContent = message;

    setTimeout(function () { snack.className = snack.className.replace("show", ""); }, ms);
}

function addProgressBar(id) {
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
        document.getElementById('progress').style.width = `${(player.getCurrentTime())/(player.getDuration())*100}%`
    }, 66 /* 15 fps */)
}

function removeTrackProgress() {
    if(document.contains(document.getElementById('progress-bar'))) {
        document.getElementById('progress-bar').remove();
    }
}

function a() {
    queueVideo({ preventDefault: () => {} }, "https://www.youtube.com/watch?v=LXb3EKWsInQ")
}