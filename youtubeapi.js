var forceProd = false;
var serverUrl = forceProd ? "ws://ludvig.cloudno.de/tempus" : (window.location.port ? "ws://localhost:8080/tempus" : "wss://ludvig.cloudno.de/tempus");

var connection = new Connection(serverUrl);
var player;

var youtubeIframeReady = false;
var youtubeHasStartedVideo = false;
var youtubeVideoFirstLoad = true;
var youtubeIframeShouldCreateEmpty = false;
var youtubeIgnoreEventChange = true;
var youtubeTimeToLoad = null;
var youtubeStartedLoadingAt = null;
var youtubeShouldSeekToStart = false;
var youtubeVideoHasLoaded = false;
var youtubeIframeHasVideo = false;

function createYoutubeIframe() {
    if (youtubeIframeReady) return console.log("ingore");

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
    if (youtubeIframeShouldCreateEmpty || !connection || !connection.sessionState || JSON.stringify(connection.sessionState) == "{}" || connection.sessionState.queue.length == 0) {
        videoId = "";
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
    youtubeIgnoreEventChange = false;

    if (!youtubeIframeHasVideo) {
        const frame = document.querySelector("iframe");
        const noVid = document.createElement("h1");
        noVid.id = "no-video";
        noVid.innerText = "Empty queue";

        frame.parentElement.appendChild(noVid);

        frame.style.visibility = "hidden";

        return;
    }

    if (connection.startedByVideo && !connection.getVideoToPlay().isPaused) return;
    if (connection.getVideoToPlay().hasEnded) {
        youtubeVideoFirstLoad = false;
        return console.log("vid end");
    }

    youtubeIgnoreEventChange = true;
    setTimeout(() => youtubeIgnoreEventChange = false, 100);

    const video = connection.getVideoToPlay();

    // Playback speed
    player.setPlaybackRate(video.playbackSpeed);

    // Set paused or played
    if (connection.joinedMidSession) {
        if (video.isPaused) {
            player.playVideo();
            player.pauseVideo();
            youtubeVideoFirstLoad = false;

            connection.send({ type: "give-me-timestamp" });
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

    if (event.data === -1) console.log("LOADED???", youtubeVideoHasLoaded, connection.joinedMidSession, connection.getVideoToPlay().hasEnded);

    // When the video loads
    if (event.data === -1) {
        if (!youtubeVideoHasLoaded && !connection.joinedMidSession) {
            console.log("VIDEO LOADED");

            connection.send({ type: "video-loaded", date: now() });

            youtubeVideoHasLoaded = true;
            youtubeVideoFirstLoad = true;
        }
        if (connection.joinedMidSession && !connection.getVideoToPlay().isPaused/* && !connection.getVideoToPlay().hasEnded*/) {
            if (connection.getVideoToPlay().hasEnded) {
                //youtubeVideoFirstLoad = false;
            } else {
                console.log("Playing video (joined mid session)")
                youtubeVideoFirstLoad = true;
                player.playVideo();
            }
        }
    }

    if (event.data === YT.PlayerState.PLAYING) {
        console.log("PLAYING", youtubeVideoFirstLoad, connection.joinedMidSession)
        updateTitle(`Playing: ${player.getVideoData().title}`)

        if (!document.body.contains(document.getElementById('progress-bar'))) {
            addProgressBar(player.getVideoData()['video_id']);
        }

        // if (connection.getVideoToPlay().hasEnded && youtubeVideoFirstLoad) {
        //     connection.send({ type: "video-loaded", date: now() });
        //     this.connection.getVideoToPlay().hasEnded = false;
        //     player.pauseVideo();
        //     youtubeVideoFirstLoad = true;
        //     return;
        // }

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

            connection.joinedMidSession = false;
            youtubeVideoHasLoaded = true;
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
            if (connection.getVideoToPlay().isPaused || connection.getVideoToPlay().hasEnded) {
                youtubeVideoFirstLoad = false;
                return;
            }
            //youtubeVideoFirstLoad = false;

            if (!connection.getVideoToPlay().hasEnded) {
                connection.send({ type: "give-me-timestamp" });
            }
        }

        if (!youtubeVideoFirstLoad && /* connection.joinedMidSession && */ connection.getVideoToPlay().hasEnded) {
            connection.send({
                type: "state-update",
                data: { ...getVideoData(), hasEnded: false },
                date: now()
            });
        }
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
        //youtubeVideoHasLoaded = false;

        connection.getVideoToPlay().hasEnded = true;

        //player.pauseVideo();

        //if (connection.isAdmin) {
            connection.send({
                type: "video-ended",
                date: now()
            });
        //}

        // if (!connection.isAdmin) return;

        // // Try to play the next video in the queue (use the queue on the server to avoid desync)
        // connection.send({
        //     type: "video-ended",
        //     date: now()
        // });
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
    removeResults();
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
    if (!search) return;

    document.querySelector(".result-container").style.visibility = "visible";
    document.querySelector(".lds-dual-ring").visibility = "visible";

    document.querySelector(".search-input input").value = search;
    document.querySelector(".search-input input").focus();

    document.body.classList.add("fixed");

    document.querySelector(".result-container #videos").innerHTML = "";

    connection.send({
        type: "get-search-results",
        data: { query: search },
        date: now()
    });
}

window.onhashchange = function () {
    window.location.reload();
}