import React, { useCallback, useEffect, useState } from 'react'
import Chat from './Chat'
import VideoLoading from './VideoLoading'
import VideoJS from './VideoJs'
import { Player } from 'video.js'

const App = () => {
  const [videoStatus, setVideoStatus] = useState<boolean>(false)
  const [streamUrl, setStreamUrl] = useState<string | null>(null)

  const videoJsOptions = {
    autoplay: true,
    controls: true,
    responsive: true,
    fluid: true,
    muted: true,
    liveui: true,
    sources: [
      {
        src: streamUrl,
        type: 'application/x-mpegURL',
      },
    ],
  }

  const handlePlayerReady = (player: Player) => {
    // You can handle player events here, for example:
    player.on('ready', () => {
      setVideoStatus(true)
    })

    player.on('dispose', () => {
      setVideoStatus(false)
    })
  }

  const fetchStreamUrl = useCallback(() => {
    fetch('https://kiltiskamera.prodeko.org/stream_url') // Include http:// or https://
      .then((response) => response.json())
      .then(async ({ url }) => {
        setStreamUrl(url)
      })
      .catch((error) => {
        console.error('Error fetching stream URL:', error)
        console.log('Retrying...')
        setTimeout(fetchStreamUrl, 1000)
      })
  }, [])

  useEffect(fetchStreamUrl, [fetchStreamUrl])

  return (
    <div className="flex flex-col w-screen h-screen bg-black relative">
      <div className="aspect-video overflow-hidden max-w-screen max-h-screen">
        <VideoJS options={videoJsOptions} onReady={handlePlayerReady} />
        {!videoStatus && <VideoLoading />}
      </div>
      <div className="absolute top-0 right-0 h-full w-[25%] min-w-[280px]">
        <Chat />
      </div>
    </div>
  )
}

export default App
