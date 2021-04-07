var forceProd = false;
var serverUrl = forceProd ? "ws://ludvig.cloudno.de/tempus" : (window.location.port ? "ws://localhost:8080/tempus" : "wss://ludvig.cloudno.de/tempus");

var connection = new Connection(serverUrl);
var player;

var youtubeIframeReady = false;
var youtubeHasStartedVideo = false;
var youtubeVideoFirstLoad = true;
var youtubeIgnoreEventChange = true;
var youtubeTimeToLoad = null;
var youtubeStartedLoadingAt = null;
var youtubeShouldSeekToStart = false;
var youtubeVideoHasLoaded = false;
var youtubeIframeHasVideo = false;

function createYoutubeIframe() {
    //if (connection.sessionState.queue.length == 0) return; // If no videos exists
    if (youtubeIframeReady) return;

    // If the script already is loaded
    if (document.querySelector("#www-widgetapi-script"))
        return onYouTubeIframeAPIReady();

    youtubeStartedLoadingAt = now();

    var tag = document.createElement('script');

    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    return true;
}

function onYouTubeIframeAPIReady() {
    if (!youtubeStartedLoadingAt) youtubeStartedLoadingAt = now();

    var videoId;

    // Create an empty iframe
    if (!connection || !connection.sessionState || JSON.stringify(connection.sessionState) == "{}" || connection.sessionState.queue.length == 0) {
        videoId = "oxqdrquXuec";
        youtubeIframeHasVideo = false;
    } else {
        videoId = connection.getVideoToPlay().id;
        youtubeIframeHasVideo = true;
    }

    player = new YT.Player('player', {
        height: '720',
        width: '1280',
        videoId: videoId,
        playerVars: {
            'start': 0,
            'autoplay': 0,
            'origin': "https://tempus.gq",
            "rel": 0,
            "modestbranding": 1,
            'sandbox': "allow-forms allow-scripts allow-pointer-lock allow-same-origin allow-top-navigation"
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });

    return true;
}

function onPlayerReady() {
    youtubeIframeReady = true;

    if (!youtubeIframeHasVideo) {
        youtubeIgnoreEventChange = false;

        const frame = document.querySelector("iframe");
        const noVid = document.createElement("h1");
        noVid.id = "no-video";
        noVid.innerText = "Empty queue";

        frame.parentElement.appendChild(noVid);

        frame.style.visibility = "hidden";

        return;
    }

    youtubeIgnoreEventChange = true;
    setTimeout(() => youtubeIgnoreEventChange = false, 100);

    const video = connection.getVideoToPlay();

    // Playback speed
    player.setPlaybackRate(video.playbackSpeed);

    // Set paused or played
    if (connection.joinedMidSession) {
        if (video.isPaused) {
            player.pauseVideo();
            youtubeVideoFirstLoad = false;
        } else {
            player.playVideo();
        }
    } else {
        player.playVideo();
        player.pauseVideo();
    }
}

function onPlayerStateChange(event) {
    if (youtubeIgnoreEventChange) return;

    if (youtubeShouldSeekToStart) {
        console.log("Seeking to start");
        player.seekTo(0);
        setTimeout(() => player.playVideo(), 100);

        youtubeShouldSeekToStart = false;
    }

    if (event.data === -1) console.log("LOADED???", youtubeVideoHasLoaded, connection.joinedMidSession);

    // When the video loads
    if (event.data === -1) {
        if (!youtubeVideoHasLoaded && !connection.joinedMidSession) {
            console.log("VIDEO LOADED");

            connection.send({ type: "video-loaded", date: now() });

            youtubeVideoHasLoaded = true;
            youtubeVideoFirstLoad = true;
        }
        if (connection.joinedMidSession) {
            console.log("Playing video (joined mid session)")
            youtubeVideoFirstLoad = true;
            player.playVideo();
        }
    }

    if (event.data === YT.PlayerState.PLAYING) {
        console.log("PLAYING", youtubeVideoFirstLoad, connection.joinedMidSession)
        updateTitle(`Playing: ${player.getVideoData().title}`)

        if (!document.body.contains(document.getElementById('progress-bar'))) {
            addProgressBar(player.getVideoData()['video_id']);
        }

        if (connection.isAdmin) {
            connection.send({
                type: "state-update",
                data: { ...getVideoData(), firstLoad: youtubeVideoFirstLoad },
                date: now()
            });
        } else if (!youtubeVideoFirstLoad) {
            connection.send({
                type: "state-update",
                data: { ...getVideoData(), firstLoad: youtubeVideoFirstLoad },
                date: now()
            });
        }

        if (connection.joinedMidSession) {
            if (!youtubeVideoFirstLoad) {
                connection.send({
                    type: "state-update",
                    data: { ...getVideoData(), firstLoad: youtubeVideoFirstLoad },
                    date: now()
                });
            }
        }

        if (youtubeVideoFirstLoad && connection.joinedMidSession) {

            // Don't skip forward if the video is paused
            if (connection.getVideoToPlay().isPaused) {
                youtubeVideoFirstLoad = false;
                return;
            }
            //youtubeVideoFirstLoad = false;

            connection.send({ type: "give-me-timestamp" });

            // youtubeTimeToLoad = (now() - youtubeStartedLoadingAt) / 1000;

            // console.log("Youtube took %s seconds to start playing video", youtubeTimeToLoad, connection.getVideoToPlay());

            // const time = connection.getVideoToPlay().timestamp + youtubeTimeToLoad + 0.5;

            // youtubeIgnoreEventChange = true;
            // player.seekTo(time);
            // setTimeout(() => youtubeIgnoreEventChange = false, 2000);

            // youtubeVideoFirstLoad = false;
            // youtubeStartedLoadingAt = null;

            // connection.send({
            //     type: "state-update",
            //     data: { ...getVideoData(), timestamp: time, firstLoad: youtubeVideoFirstLoad },
            //     date: now()
            // });    
        }

        //youtubeVideoFirstLoad = false;

        // If the video loaded for the first time
        // if (youtubeVideoFirstLoad) {
        //     //youtubeVideoFirstLoad = false;
        //     // if (connection.getVideoToPlay().timestamp == 0) {
        //     //     youtubeVideoFirstLoad = false;
        //     //     return;
        //     // }

        //     // Don't skip forward if the video is paused
        //     if (connection.getVideoToPlay().isPaused) {
        //         youtubeVideoFirstLoad = false;
        //         return;
        //     }

        //     youtubeTimeToLoad = (now() - youtubeStartedLoadingAt) / 1000;

        //     console.log("Youtube took %s seconds to start playing video", youtubeTimeToLoad, connection.getVideoToPlay());

        //     // youtubeIgnoreEventChange = true;

        //     // player.seekTo(connection.getVideoToPlay().timestamp + youtubeTimeToLoad);

        //     // setTimeout(() => youtubeIgnoreEventChange = false, 1000);

        //     youtubeVideoFirstLoad = false;
        //     youtubeStartedLoadingAt = null;
        // }
    }
    if (event.data === YT.PlayerState.PAUSED) {
        console.log("PAUSED")
        updateTitle(`Paused: ${player.getVideoData().title}`)

        connection.send({
            type: "state-update",
            data: getVideoData(),
            date: now()
        });

        youtubeVideoFirstLoad = false;
    }
    if (event.data === YT.PlayerState.ENDED) {
        console.log("Video ended");

        youtubeVideoFirstLoad = false;

        if (!connection.isAdmin) return;

        // Try to play the next video in the queue (use the queue on the server to avoid desync)
        connection.send({
            type: "play-next-video",
            date: now()
        });
    }
    if (event.data === YT.PlayerState.CUED) {
        console.log("Que:ed");
    }
}

function getVideoData() {
    var currentTimestamp = player.getCurrentTime(); // Seconds into the video, e.g 60s
    var playbackSpeed = player.getPlaybackRate(); // Playback rate, e.g 1.0 or 2.0
    var videoId = player.getVideoData()['video_id'];
    var isPaused = (player.getPlayerState() == YT.PlayerState.PAUSED);
    if (player.getPlayerState() == YT.PlayerState.PLAYING) {
        isPaused = false;
    }
    return {
        timestamp: currentTimestamp,
        playbackSpeed: playbackSpeed,
        isPaused: isPaused,
        currentVideoId: videoId,
        queueIndex: connection.sessionState.currentQueueIndex
    };
}

const invite = str => {
    const el = document.createElement('textarea');
    el.value = str;
    el.setAttribute('readonly', '');
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showSnack("Copied", 1000)
};

function queueVideo(event = null, url) {
    if (event != null) {
        event.preventDefault();
    }
    if(!isValidYoutubeURL(url)) {
        getSearchResults(url);
        document.getElementById('room').value = "";
        return;
    }
    connection.send({ type: "add-video-to-queue", data: { url } });
    document.getElementById('room').value = "";
}

function getVideoId(url) {
    url = url.split(" ").join(""); // remove spaces

    if (!this.isValidHttpUrl(url))
        return;

    const hostname = new URL(url).hostname.replace("www.", "");

    if (hostname === "youtube.com" || hostname === "youtu.be") {
        if (hostname === "youtube.com")
            return new URL(url).search.replace("?v=", "");
        if (hostname === "youtu.be")
            return new URL(url).pathname.replace("/", "");
    }

    // Wasn't a youtube url
    return;
}

function isValidYoutubeURL(url) {
    return this.getVideoId(url) != null;
}

function isValidHttpUrl(string) {
    let url;

    try {
        url = new URL(string);
    } catch (_) {
        return false;
    }

    return url.protocol === "http:" || url.protocol === "https:";
}

function updateHash(room) {
    window.location.hash = room;
}

function displayWatchers(amount) {
    switch (amount) {
        case 1: {
            document.getElementById("watching").textContent = `Watching alone.`
            break;
        }
        default: {
            document.getElementById("watching").textContent = `${amount} people watching.`
            break;
        }
    }
}

function showInputfield(newPlaceholder) {
    document.getElementById("input-div").style.visibility = "visible";
    document.getElementById("session-input").placeholder = newPlaceholder;
    document.getElementById("session-input").focus();
}

function attemptTojoinSession(event) {
    event.preventDefault();
    console.log(`session.html#${document.getElementById('session-input').value}`);
    window.location = (`${window.location.origin}/session.html#${document.getElementById('session-input').value}`);
}

function updateTitle(title) {
    document.title = `${title}`;
}

function deleteVideo(id) {
    connection.send({ type: "delete-video-from-queue", data: { id: id.toString() } });
}

function playVideo(id) {
    const index = connection.sessionState.queue.indexOf(connection.sessionState.queue.find(vid => vid.id === id));
    connection.send({ type: "play-video-from-queue", data: { queueIndex: index } });
}

function createSessionWithLink(link) {
    connection.send({
        type: "create-session-with-link",
        link: link,
        date: now()
    });
}

function getSearchResults(search) {
    document.querySelector(`[class='result-container']`).innerHTML = "";
    document.querySelector(`[class='result-container']`).innerHTML += `<div class="lds-dual-ring"></div>`
    document.querySelector(`[class='result-container']`).style.visibility = "visible";
    document.querySelector(`[class='result-container']`).innerHTML += `<button class="route exit" onclick="removeResults();">X</button>`
    connection.send({
        type: "get-search-results",
        data: { query: search },
        date: now()
    });
}

window.onhashchange = function () {
    window.location.reload();
}