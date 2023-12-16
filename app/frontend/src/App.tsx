import React, { useEffect, useRef, useState } from "react";
import Chat from "./Chat";
import VideoLoading from "./VideoLoading";

import Hls from "hls.js";

const App = () => {
  const [hls, setHls] = useState<Hls | null>(null);
  const [videoStatus, setVideoStatus] = useState<boolean>(false);

  const videoEl = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const initializeHls = () => {
      fetch("https://kiltiskamera.azurewebsites.net/stream_url") // Include http:// or https://
        .then((response) => response.json())
        .then((data) => {
          const { url } = data;

          if (videoEl.current) {
            const videoCurrent = videoEl.current;
            if (videoCurrent.canPlayType("application/vnd.apple.mpegurl")) {
              // HLS is natively supported in Safari
              videoCurrent.src = url;
              videoCurrent.addEventListener("loadedmetadata", function () {
                videoCurrent.play();
              });
            } else if (Hls.isSupported()) {
              // For other browsers, use Hls.js
              const newHls = new Hls({ liveDurationInfinity: true });
              newHls.attachMedia(videoCurrent);
              newHls.on(Hls.Events.MEDIA_ATTACHED, () => {
                newHls.loadSource(url);
              });
              setHls(newHls);
            } else {
              console.error("HLS not supported on this browser");
            }
          }
        })
        .catch((error) => {
          console.error("Error fetching stream URL:", error);
        });
    };

    initializeHls();

    // Cleanup function
    return () => {
      if (hls) {
        hls.destroy();
        setHls(null); // Set the state to null on cleanup
      }
    };
  }, []); // Empty dependency array to run the effect only once

  return (
    <div className="flex flex-col w-screen h-screen bg-black relative">
      <div className="aspect-video overflow-hidden max-w-screen max-h-screen">
        <video
          className={`aspect-video bg-black ${videoStatus ? "" : "h-0 w-0"}`}
          ref={videoEl}
          muted
          autoPlay
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
