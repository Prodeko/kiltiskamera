import React from 'react'
import { IoSend } from 'react-icons/io5'
import useWebSocket from 'react-use-websocket'

const WS_URL = 'ws://localhost:8080'


const Chat = () => {
  const { sendJsonMessage } = useWebSocket(WS_URL, {
    onOpen: () => {
      console.log('Webasoketti kytketty')
    },
    share: true,
    filter: () => false,
    retryOnError: true,
    shouldReconnect: () => true
  })

  const onClick = () => {
    sendJsonMessage({
      text: "Miten menee?"
    })
  }


  return(
    <div className='bg-gray-800 h-full flex flex-col justify-between'>
      <div className='flex flex-col justify-center flex-grow items-center gap-4 rounded-b-3xl bg-gray-700'>
        <div className='text-4xl'>😢</div>
        <p className='font-bold text-gray-200'>It's quite quiet here!</p>
      </div>
      <div className='flex p-4'>
        <input className='px-6 py-4 flex-grow bg-gray-800 text-gray-100 outline-none' type="text" placeholder='What do you want to say?'/>
        <button onClick={onClick} className='bg-green-600 rounded-full p-5 text-gray-100'><IoSend /></button>
      </div>
    </div>
  )
}

export default Chat