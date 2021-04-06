
// Websockets

const defaultSessionState = {
    timestamp: 0,
    playbackSpeed: 1,
    isPaused: true,
    currentVideoId: "",
    queue: []
};

class Connection {
    constructor(url) {
        this.sessionState = {};

        this.isAdmin = false;
        this.sessionId = null;
        this.clientId = null;
        this.watchers = 0;
        this.joinedMidSession = false;

        this.url = url;
        this.conn = new WebSocket(url);
        this.conn.onopen = this.handleConnected.bind(this);

        // Receiving message
        this.conn.onmessage = this.handleMessage.bind(this);


        this.conn.onerror = function (event) {
            showSnack("Error: Could not connect to the server", 1000)
        };
    }

    send(data) {
        if (data.type != "pong")
            console.log("Sending message", data);

        // const s = JSON.stringify(data);
        // setTimeout(() => this.conn.send(s), 1000);
        //  if (data.type != "pong") console.trace();

        this.conn.send(JSON.stringify(data));
    }

    handleConnected() {
        console.log("Connected to", this.url);

        this.send({
            type: "join-session",
            data: { sessionId: window.location.hash.slice(1) }
        });
    }

    handleMessage(msg) {
        var message = JSON.parse(msg.data);

        if (message.type != "ping") console.log("Recieved message sent by %s", message.originalMessage.sentBy, message);

        switch (message.type) {
            case "join-session": {
                if (!message.success) return console.log("Failed to join session");

                this.sessionId = message.data.sessionId;
                this.clientId = message.data.clientId;
                this.isAdmin = message.data.isAdmin;
                updateHash(message.data.sessionId);

                // Load the youtube player
                this.sessionState = message.data.state;
                if (this.sessionState.queue.length > 0) {
                    this.joinedMidSession = true;
                    createYoutubeIframe();
                }

                // Set the queue
                this.sessionState.queue.forEach(video => addVideoToQueueHtml(video));

                console.log("Joined session:", this.sessionId);

                // Start a periodic timestamp update
                if (this.isAdmin) {
                    console.log("Started timestamp update interval");
                    setInterval(() => {
                        // Don't update timestamp if video is paused
                        if (this.getVideoToPlay() && !this.getVideoToPlay().isPaused && youtubeIframeReady) {
                            this.send({ type: "timestamp-update", data: { timestamp: player.getCurrentTime() }, date: now() });
                        }
                    }, 3000);
                }

                break;
            }
            case "ping": {
                this.send({ type: "pong" });

                break;
            }
            case "state-update": {
                if (!message.success) return console.log(message.error);

                youtubeIgnoreEventChange = true;
                setTimeout(() => youtubeIgnoreEventChange = false, 500);

                if (this.sessionState.currentQueueIndex !== message.data.currentQueueIndex) {
                    console.log("Another video should be played than the current one (THIS SHOULD NOT HAPPEN)");
                }

                this.sessionState = message.data.state;

                // Check if the message was sent by me
                if (this.sentByMe(message))
                   return;

                if (!youtubeIframeReady)
                   return createYoutubeIframe();

                const video = this.getVideoToPlay();

                console.log("Video is at %s, but should be at %s according to the server", player.getCurrentTime(), video.timestamp);
                console.log("Message took in total %s seconds", (now() - message.originalMessage.date) / 1000)

                // Set timestamp
                const timeDiff = Math.abs(player.getCurrentTime() - video.timestamp);
                const maxTimeDesync = 1; // in seconds

                console.log("Time desync:", timeDiff);

                if (timeDiff > maxTimeDesync)
                    player.seekTo(video.timestamp, true);

                // Playback speed
                player.setPlaybackRate(video.playbackSpeed);

                // Set paused or played
                if (video.isPaused)
                    player.pauseVideo();
                else
                    player.playVideo();

                break;
            }
            case "play-video-from-queue": {
                this.sessionState = message.data.state;
                const videoToPlay = this.sessionState.queue[this.sessionState.currentQueueIndex];

                youtubeVideoHasLoaded = false;

                removeTrackProgress();
                addProgressBar(videoToPlay.id);

                // Reset the joined mid session flag as the client should be considered "joined from the start of the video"
                this.joinedMidSession = false; 

                if (!youtubeIframeReady) {
                    createYoutubeIframe();
                } else {
                    player.cueVideoById(videoToPlay.id, videoToPlay.timestamp);
                    //youtubeShouldSeekToStart = true;

                    // Playback speed
                    player.setPlaybackRate(videoToPlay.playbackSpeed);
                    player.playVideo();
                    player.pauseVideo();
                }

                break;
            }
            case "play-next-video": {
                if (!message.success) return console.log(message.error);

                youtubeVideoHasLoaded = false;

                this.sessionState = message.data.state;

                removeTrackProgress();
                addProgressBar(videoToPlay.id);

                if (!youtubeIframeReady)
                    createYoutubeIframe();
                else // TODO Fix
                    player.loadVideoById(this.getVideoToPlay().id);

                break;
            }
            case "add-video-to-queue": {
                if (!message.success) return console.log(message.error);

                // Get the last element
                const newQueueEntry = message.data.video;
                if (!newQueueEntry) return;

                this.sessionState.queue.push(newQueueEntry);

                if (document.body.contains(document.getElementById("queue-info"))) {
                    document.getElementById("queue-info").remove();
                }

                addVideoToQueueHtml(newQueueEntry);

                break;
            }
            case "delete-video-from-queue": {
                if (!message.success) return console.log(message.error);

                this.sessionState.queue = message.data.queue;

                const currentVideoId = getVideoData().currentVideoId;

                document.getElementById('queue').removeChild(document.querySelector(`[data-id='${message.data.deleted}']`));

                console.log("This is the deleted id: " + message.data.deleted)

                if (this.sessionState.queue.length > 0) {
                    if (message.data.deleted == currentVideoId) {

                        var previousVideo = this.sessionState.currentQueueIndex - 1;
                        if (previousVideo < 0) previousVideo = 0;

                        this.send({
                            type: "play-video-from-queue",
                            data: { queueIndex: previousVideo },
                            date: now()
                        });
                    }
                }

                if (this.sessionState.queue.length == 0) {
                    player = null;
                    youtubeIframeReady = false;

                    document.getElementById('player').remove();
                    document.querySelector(`[class='player-container']`).innerHTML += `<div id="player"><h1 id="no-video">Please queue using the input above</h1></div>`;
                }

                break;
            }
            case "broadcast-clients": {
                if (!message.success) return console.log(message.error);

                this.watchers = message.data.watchers;

                displayWatchers(message.data.watchers);

                break;
            }

            case "play-video": {
                if (!message.success) return console.log(message.error);

                if (youtubeIframeReady)
                player.playVideo()//setTimeout(() => player.playVideo(), 1000);

                break;
            }

            case "give-me-timestamp": {
                if (!message.success) return console.log(message.error);

                youtubeIgnoreEventChange = true;
                setTimeout(() => youtubeIgnoreEventChange = false, 1000);

                const margin = 1.5;
                this.getVideoToPlay().timestamp = message.data.timestamp + margin;

                youtubeVideoFirstLoad = false;

                player.seekTo(this.getVideoToPlay().timestamp);

                break;
            }

            default: {
                console.log("Other message:", message.type);
                break;
            }
        }
    }

    getVideoToPlay() {
        return this.sessionState.queue[this.sessionState.currentQueueIndex];
    }

    sentByMe(message) {
        return message.originalMessage.sentBy == this.clientId;
    }
}