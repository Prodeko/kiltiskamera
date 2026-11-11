import React, { useEffect, useRef, useState } from "react";
import Chat from "./Chat";
import VideoLoading from "./VideoLoading";

import Hls from "hls.js";
import { playWhep } from "./whep";

const App = () => {
  const [videoStatus, setVideoStatus] = useState<boolean>(false);

  const videoEl = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let newHls: Hls | undefined;
    let peerConnection: RTCPeerConnection | undefined;
    let cancelled = false;

    const playHls = (url: string, videoCurrent: HTMLVideoElement) => {
      videoCurrent.srcObject = null;
      if (Hls.isSupported()) {
        // For other browsers, use Hls.js
        newHls = new Hls({ liveDurationInfinity: true, lowLatencyMode: true });
        newHls.attachMedia(videoCurrent);
        newHls.on(Hls.Events.MEDIA_ATTACHED, () => {
          newHls?.loadSource(url);
          videoCurrent.muted = true;
          videoCurrent.play();
        });
      } else if (
        videoCurrent.canPlayType("application/vnd.apple.mpegurl") ===
        "maybe" // This result type is ridiculous
      ) {
        // HLS is natively supported in Safari
        videoCurrent.src = url;
        videoCurrent.addEventListener("loadedmetadata", function () {
          videoCurrent.play();
        });
      } else {
        console.error("HLS not supported on this browser");
      }
    };

    const initializeStream = () => {
      fetch("https://kiltiskamera.prodeko.org/stream_url") // Include http:// or https://
        .then((response) => response.json())
        .then(async (data) => {
          const { url, whepUrl } = data;
          const videoCurrent = videoEl.current;
          if (!videoCurrent) return;

          // WebRTC has sub-second latency; LL-HLS is the fallback when
          // WebRTC can't connect (e.g. UDP and the TCP port blocked)
          if (whepUrl && "RTCPeerConnection" in window) {
            try {
              const pc = await playWhep(whepUrl, videoCurrent);
              if (cancelled) return pc.close();
              peerConnection = pc;
              pc.addEventListener("connectionstatechange", () => {
                if (pc.connectionState === "failed" && !cancelled) {
                  console.warn("WebRTC connection lost, switching to HLS");
                  pc.close();
                  playHls(url, videoCurrent);
                }
              });
              videoCurrent.play();
              return;
            } catch (error) {
              console.warn("WebRTC unavailable, falling back to HLS:", error);
            }
          }
          if (!cancelled) playHls(url, videoCurrent);
        })
        .catch((error) => {
          console.error("Error fetching stream URL:", error);
        });
    };

    initializeStream();

    // Cleanup function
    return () => {
      cancelled = true;
      newHls?.destroy();
      peerConnection?.close();
    };
  }, [videoEl]);

  return (
    <div className="flex flex-col w-screen h-screen bg-black relative">
      <div className="aspect-video overflow-hidden max-w-screen max-h-screen">
        <video
          className={`aspect-video bg-black ${videoStatus ? "" : "h-0 w-0"}`}
          ref={videoEl}
          muted
          autoPlay
          loop
          playsInline
          onPlay={() => setVideoStatus(true)}
          onPause={() => console.log("Teremos")}
        ></video>
        {!videoStatus && <VideoLoading />}
      </div>
      <div className="absolute top-0 right-0 h-full w-[25%] min-w-[280px]">
        <Chat />
      </div>
    </div>
  );
};

export default App;
