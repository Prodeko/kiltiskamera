import React, { useEffect } from 'react'
import Chat from './Chat'
import { janusState } from './janus'

const VIDEO_EL_ID = 'videoelement'

const App = () => {

  useEffect(() => {
    janusState.startWithID(VIDEO_EL_ID)
  }, [])

  return(
    <div className='flex flex-col lg:grid lg:grid-cols-[5fr_2fr] lg:grid-rows-[1fr_auto_5fr] h-screen bg-violet-500'>
      <video className='bg-black aspect-video' autoPlay muted id={VIDEO_EL_ID}></video>
      <div className='lg:row-start-3 bg-blue-200 flex-shrink lg:h-full lg:flex-shrink-0'>Toolbar</div> {/*Reactions*/}
      <div className='flex-grow lg:col-start-2 lg:col-end-3 lg:row-span-full'>
        <Chat />
      </div>
    </div>
  )
}

export default App;
