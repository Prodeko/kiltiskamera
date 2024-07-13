import React, { useEffect, useRef, useState } from 'react'
import Chat from './Chat'
import VideoLoading from './VideoLoading'

import Hls from 'hls.js'

type VideoInitResult = (() => unknown) | void

const App = () => {
  const [videoStatus, setVideoStatus] = useState<boolean>(false)

  const videoEl = useRef<HTMLVideoElement | null>(null)

  const initNativeHlsVideo = async (
    video: HTMLVideoElement,
    url: string
  ): Promise<VideoInitResult> => {
    return new Promise(async (res, rej) => {
      video.onerror = rej

      // We'll be optimistic and try to play even if the canPlayType result is "maybe"
      if (Boolean(video.canPlayType("application/x-mpegURL codec=' '"))) {
        video.src = url
        try {
          console.log('Trying to play HLS video natively')
          await video.play()
          res()
        } catch (e) {
          console.warn('Tried to play native HLS video but failed')
          rej(e)
        }
      } else {
        console.warn("Can't play HLS video natively")
        rej(new Error("Browser doesn't support native HLS video"))
      }
    })
  }

  const initMseHslVideo = async (
    video: HTMLVideoElement,
    url: string
  ): Promise<VideoInitResult> => {
    // For other browsers, use Hls.js
    return new Promise((res, rej) => {
      if (Hls.isSupported()) {
        video.onerror = rej

        console.log('Trying to play HLS video via Hls.js')
        const newHls = new Hls({ liveDurationInfinity: true })
        try {
          newHls.attachMedia(video)
          newHls.on(Hls.Events.MEDIA_ATTACHED, () => {
            newHls.loadSource(url)
          })

          // Return teardown function
          res(() => newHls.destroy())
        } catch (e) {
          rej(e)
        }
      } else {
        rej(new Error('HLS video is not supported via Hls.js'))
      }
    })
  }

  useEffect(() => {
    let videoInitResult: VideoInitResult

    const initializeHls = () => {
      fetch('https://kiltiskamera.prodeko.org/stream_url') // Include http:// or https://
        .then((response) => response.json())
        .then(async ({ url }) => {
          const videoCurrent = videoEl.current
          if (!videoCurrent) {
            throw new Error('Video element not found')
          }

          videoInitResult = await initNativeHlsVideo(videoCurrent, url)
            .catch(() => initMseHslVideo(videoCurrent, url))
            .catch((e) => console.error(e))
        })
        .catch((error) => {
          console.error('Error fetching stream URL:', error)
        })
    }

    initializeHls()

    // Cleanup function
    return () => {
      videoInitResult?.()
    }
  }, [videoEl])
  return (
    <div className="flex flex-col w-screen h-screen bg-black relative">
      <div className="aspect-video overflow-hidden max-w-screen max-h-screen">
        <video
          className={`aspect-video bg-black ${videoStatus ? '' : 'h-0 w-0'}`}
          ref={videoEl}
          muted
          autoPlay
          playsInline
          onPlay={() => setVideoStatus(true)}
          onPause={() => console.log('Teremos')}
        ></video>
        {!videoStatus && <VideoLoading />}
      </div>
      <div className="absolute top-0 right-0 h-full w-[25%] min-w-[280px]">
        <Chat />
      </div>
    </div>
  )
}

export default App
