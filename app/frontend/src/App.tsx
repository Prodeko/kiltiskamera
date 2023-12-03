import React, { useEffect, useRef, useState } from 'react';
import Chat from './Chat'
import VideoLoading from './VideoLoading'

import Hls from "hls.js";

const App = () => {
  const [hls, setHls] = useState<Hls | null>(null);
  const [videoStatus, setVideoStatus] = useState<boolean>(false)
  const [m3u8StreamSource, setM3u8StreamSource] = useState('');

  const videoEl = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const initializeHls = () => {
      fetch('http://localhost:8087/stream_url') // Include http:// or https://
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
          console.error('Error fetching stream URL:', error);
        });

      const newHls = new Hls({debug:true});
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
  
  return(
    <div className='flex flex-col lg:grid lg:grid-cols-[5fr_2fr] lg:grid-rows-[1fr_auto_5fr] h-screen bg-violet-500'>
      <div className='aspect-video'>
        <video className={`bg-black aspect-video ${videoStatus ? '' : 'h-0 w-0'}`} ref={videoEl} muted autoPlay onPlay={() => setVideoStatus(true)} onPause={() => console.log('Teremos')}></video> 
        {!videoStatus && <VideoLoading />}
      </div>
      <div className='lg:row-start-3 bg-blue-200 flex-shrink lg:h-full lg:flex-shrink-0'>Reaktiot: Bilis, Kahvi, Otter, teekuppi</div> {/*Reactions*/}
      <div className='flex-grow lg:col-start-2 lg:col-end-3 lg:row-span-full'>
        <Chat />
      </div>
    </div>
  )
}

export default App;
