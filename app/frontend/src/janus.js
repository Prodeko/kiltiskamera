import { Janus } from 'janus-gateway'

Janus.init({
  debug: true,
  // eslint-disable-next-line react-hooks/rules-of-hooks
  dependencies: Janus.useDefaultDependencies(),
  callback: function() {}
})

class JanusState {

  constructor() {
    this.subscribers = []
    this.streaming = null
    this.selectedStream = null
    this.bitrateTimer = null
    this.status = null
  }

  /*
  Add a callback to be notified when janusState changes
  */
  subscribe(cb) {
    console.log('subscribed')
    this.subscribers.push(cb)
  }

  notifySubscribers() {
    this.subscribers.forEach(f => f(this.state))
  }

  get state() {
    return {
      streaming: this.streaming,
      selectedStream: this.selectedStream,
      bitrateTimer: this.bitrateTimer,
      status: this.status
    }
  }

  setStatus(val) {
    this.status = val
    this.notifySubscribers()
  }

  setStreaming(val) {
    this.streaming = val
    this.notifySubscribers()
  }

  setSelectedStream(val) {
    this.selectedStream = val
    this.notifySubscribers()
  }
  
  setBitrateTimer(val) {
    this.bitrateTimer = val
    this.notifySubscribers()
  }
}

const janusState = new JanusState()

const janus = new Janus({
  server: "http://10.100.46.237:8088/janus",
  success: function() {
      // Attach to streaming plugin
      janus.attach(
        {
          plugin: "janus.plugin.streaming",
          opaqueId: "streamingtest-" + Janus.randomString(12),
          success: function(pluginHandle) {
            janusState.setStreaming(pluginHandle)
            console.log("Plugin attached! (" + pluginHandle.getPlugin() + ", id=" + pluginHandle.getId() + ")");
            //get available streams and select the one we need
            updateStreamsList();
          },
          error: function(error) {
            console.log("Error attaching plugin... " + error);
          },
          onmessage: function(msg, jsep) {
            Janus.debug(" ::: Got a message :::");
            Janus.debug(msg);
            var result = msg["result"];
            if(result !== null && result !== undefined) {
              if(result["status"] !== undefined && result["status"] !== null) {
                var status = result["status"];
                if(status === 'starting')
                  Janus.log("Starting, please wait...");
                else if(status === 'started')
                  Janus.log("Started");
                else if(status === 'stopped')
                  Janus.log("Stopped");
              }
            } else if(msg["error"] !== undefined && msg["error"] !== null) {
              alert(msg["error"]);
              return;
            }
            if(jsep !== undefined && jsep !== null) {
              Janus.debug("Handling SDP as well...");
              Janus.debug(jsep);
              // Offer from the plugin, let's answer
              janusState.streaming.createAnswer(
                {
                  jsep: jsep,
                  media: { audioSend: false, videoSend: false },	// We want recvonly audio/video
                  success: function(jsep) {
                    Janus.debug("Got SDP!");
                    Janus.debug(jsep);
                    var body = { "request": "start" };
                    janusState.streaming.send({"message": body, "jsep": jsep});
                  },
                  error: function(error) {
                    Janus.error("WebRTC error:", error);
                    alert("WebRTC error... " + JSON.stringify(error));
                  }
                });
            }
          },
          onremotetrack: function(track, mid, on) {
            Janus.log("::: YEET A REMOTE STREAM :::")
            Janus.log("track", track)
            Janus.log("mid", mid)
            Janus.log("on", on)
            console.log(`Received remote track mid=${mid} on=${on}`, track);
            const videoStream = new MediaStream([track]);
            console.log(videoStream)
            const el = document.getElementById('remotevideo')
            console.log("ELEM", el)
            Janus.attachMediaStream(el, videoStream)
            // el.srcObject = videoStream
            console.log("ELEM2", el)
            // Janus.attachMediaStream($('#remotevideo').get(0), videoStream);
          },
          // onremotetrack: function(stream) {
          //   console.log(" ::: Got a remote stream :::");
          //   console.log(stream);
          //   // Janus.attachMediaStream($('#remotevideo').get(0), stream);
          //   console.log("ATTACH STREAM HERE", stream)
          //   var videoTracks = stream.getVideoTracks();
          //   if(videoTracks && videoTracks.length &&
          //       (Janus.webRTCAdapter.browserDetails.browser === "chrome" ||
          //         Janus.webRTCAdapter.browserDetails.browser === "firefox" ||
          //         Janus.webRTCAdapter.browserDetails.browser === "safari")) {
          //           janusState.setBitrateTimer(setInterval(function() {
          //             Janus.debug("Current bitrate is " + janusState.streaming.getBitrate());
          //         }, 1000))
          //   }
          // },
          oncleanup: function() {
            Janus.log(" ::: Got a cleanup notification :::");
            alert("streaming cleanup");
            if(janusState.bitrateTimer !== null && janusState.bitrateTimer !== undefined)
              clearInterval(janusState.bitrateTimer);
            janusState.setBitrateTimer(null);
            setInterval(function() {
              Janus.debug("Current bitrate is " + janusState.streaming.getBitrate());
            }, 1000);
          }
        });
  },
  error: function() {
    console.log("JANUJS ERRRORR")
    janusState.setStatus('error')
  }
})

function startStream() {
  Janus.log("Selected video id #" + janusState.selectedStream);
	var body = { "request": "watch", id: parseInt(janusState.selectedStream) };
	janusState.streaming.send({"message": body});
	// No remote video yet
	Janus.log("starting stream");
}

function updateStreamsList() {
	const body = { "request": "list" };
	Janus.debug("Sending message (" + JSON.stringify(body) + ")");
	janusState.streaming.send({"message": body, success: function(result) {
		if(result === null || result === undefined) {
      Janus.debug("Got no response to our query for available streams");
			return;
		}
		if(result["list"] !== undefined && result["list"] !== null) {
			var list = result["list"];
			Janus.log("Got a list of available streams");
			Janus.log(list);
      janusState.setSelectedStream(list[1]["id"])
      startStream();
		}
	}});
}

export { Janus, janusState }
export default janus