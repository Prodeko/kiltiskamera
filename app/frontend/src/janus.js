import { Janus } from 'janus-gateway'

const SERVER_ADDR = "http://10.100.46.237:8088/janus"

Janus.init({
  debug: true,
  // eslint-disable-next-line react-hooks/rules-of-hooks
  dependencies: Janus.useDefaultDependencies(),
  callback: function() {}
})

class JanusState {

  constructor() {
    this.statusSubs = []
    this.streaming = null
    this.selectedStream = null
    this.bitrateTimer = null
    this.status = null
    this.videoID = null
  }

  get state() {
    return {
      streaming: this.streaming,
      selectedStream: this.selectedStream,
      status: this.status,
      videoID: this.videoID
    }
  }

  setStatus(val) {
    this.status = val
  }

  setStreaming(val) {
    this.streaming = val
  }

  setSelectedStream(val) {
    this.selectedStream = val
  }

  startWithID(id) {
    this.videoID = id
  }
}

const janusState = new JanusState()

const janus = new Janus({
  server: SERVER_ADDR,
  success: function() {
      janus.attach(
        {
          plugin: "janus.plugin.streaming",
          opaqueId: "streamingtest-" + Janus.randomString(12),
          success: function(pluginHandle) {
            janusState.setStreaming(pluginHandle)
            updateStreamsList();
          },
          error: function(error) {
            console.log("Error attaching plugin... " + error);
          },
          onmessage: handleMessage,
          onremotetrack: handleTrack,
          oncleanup: function() {
            console.log("cleanup")
          }
        });
  },
  error: function() {
    console.log('error')
  }
})

function updateStreamsList() {
	const body = { "request": "list" };
	janusState.streaming.send({"message": body, success: function(result) {
		if(result && result["list"]) {
      const streamList = result["list"]
      const stream = streamList[1] // 1 idx is the h264 stream
      const streamId = stream["id"]
      janusState.setSelectedStream(streamId)
      startStream();
		}
	}});
}

function startStream() {
	var body = { "request": "watch", id: parseInt(janusState.selectedStream) };
	janusState.streaming.send({"message": body});
}

const handleMessage = (msg, jsep) => {
  var result = msg["result"];
  if(result && result["status"]) {
    console.log(result["status"])
  } else if(msg["error"] !== undefined && msg["error"] !== null) {
    console.log("error");
    return;
  }
  if(jsep) {
    janusState.streaming.createAnswer(
      {
        jsep: jsep,
        media: { audioSend: false, videoSend: false },	// We want recvonly audio/video
        success: function(jsep) {
          var body = { "request": "start" };
          janusState.streaming.send({"message": body, "jsep": jsep});
        },
        error: function(error) {
          console.log("error");
        }
      });
  }
}

const handleTrack = (track, mid, on) => {
const videoStream = new MediaStream([track]);
if (!janusState.videoID) {
  console.log("ERROR: videoID missing. Forgot to call startWithID?")
  return
}
const el = document.getElementById(janusState.videoID)
Janus.attachMediaStream(el, videoStream)
}

export { Janus, janusState }
export default janus