import React, { useEffect } from 'react'
import Chat from './Chat'
import { janusState } from './janus'

const App = () => {
  
  const janusStateChange = (state: any) => {
    //console.log('janusStateChange', state)
  }

  useEffect(() => {
    janusState.subscribe(janusStateChange)
  }, [])

  return(
    <div className='flex flex-col lg:grid lg:grid-cols-[5fr_2fr] lg:grid-rows-[1fr_auto_5fr] h-screen bg-violet-500'>
      <video className='bg-black aspect-video' autoPlay muted id='remotevideo'></video>
      <div className='lg:row-start-3 bg-blue-200 flex-shrink lg:h-full lg:flex-shrink-0'>Toolbar</div> {/*Reactions*/}
      <div className='flex-grow lg:col-start-2 lg:col-end-3 lg:row-span-full'>
        <Chat />
      </div>
    </div>
  )
}

export default App;
