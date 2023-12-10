import React, { useEffect, useRef, useState } from "react";
import Chat from "./Chat"
import VideoLoading from "./VideoLoading";

import Hls from "hls.js";

const App = () => {
  const [hls, setHls] = useState<Hls | null>(null);
  const [videoStatus, setVideoStatus] = useState<boolean>(false);
  const [m3u8StreamSource, setM3u8StreamSource] = useState("");

  const videoEl = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const initializeHls = () => {
      fetch("https://kiltiskamera.azurewebsites.net/stream_url") // Include http:// or https://
        .then((response) => response.json())
        .then((data) => {
          const { url } = data;

          if (videoEl.current) {
            newHls.attachMedia(videoEl.current);
            newHls.on(Hls.Events.MEDIA_ATTACHED, () => {
              newHls.loadSource(url);
            });
          }
        })
        .catch((error) => {
          console.error("Error fetching stream URL:", error);
        });

      const newHls = new Hls({ debug: true });
      setHls(newHls);
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
      <div className="aspect-video max-w-screen max-h-screen">
        <video
          className={`aspect-video bg-black ${videoStatus ? "" : "h-0 w-0"}`}
          ref={videoEl}
          muted
          autoPlay
          onPlay={() => setVideoStatus(true)}
          onPause={() => console.log("Teremos")}
        ></video>
        {!videoStatus && <VideoLoading />}
      </div>
      <div className="absolute top-0 right-0 h-full">
        <Chat />
      </div>
    </div>
  );
};

export default App;
