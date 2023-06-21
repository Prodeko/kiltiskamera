import React, { useEffect, useState } from 'react'
import { IoSend } from 'react-icons/io5'
import useWebSocket from 'react-use-websocket'

const WS_URL = 'ws://10.100.51.230:8080'

enum WsMessageType {
  MESSAGE = 'MESSAGE',
  INIT_ALL = 'ALL',
}

type ChatMessage = {
  timestamp: string,
  text: string
}

type WsMessage = {
  type: WsMessageType,
  data: ChatMessage[]
}

const isWsMessage = (potentialWsMessage: unknown): potentialWsMessage is WsMessage => {
  const wsMessage = potentialWsMessage as WsMessage
  if (Object.values(WsMessageType).includes(wsMessage.type) && Array.isArray(wsMessage.data)) {
    for (let i = 0; i < wsMessage.data.length; i++) {
      const chatMessage = wsMessage.data[i]
      if (chatMessage.text === undefined || chatMessage.timestamp === undefined) {
        return false
      }
    }    
    return true
  }
  return false
}

const Message = ({message}: {message: ChatMessage}) => {
  return(
    <div className='text-gray-300'>
      <p className='text-xs'>{message.timestamp}</p>
      <p className='mb-3'>{message.text}</p>
    </div>
  )
}

const Chat = () => {
  const [message, setMessage] = useState<string>('')
  const [messages, setMessages] = useState<ChatMessage[]>([])

  const { sendJsonMessage, lastJsonMessage } = useWebSocket(WS_URL, {
    onOpen: () => {
      console.log('Webasocket connected!')
    },
    share: true,
  })

  useEffect(() => {
    if (lastJsonMessage !== null && isWsMessage(lastJsonMessage)) {
      setMessages(lastJsonMessage.data)
      console.log('Current messages:', messages)
    }
  }, [lastJsonMessage, setMessages, messages])

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    sendJsonMessage({
      text: message
    })
    setMessage('')
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault()
    setMessage(event.target.value)
  }


  return(
    <div className='bg-gray-800 h-full flex flex-col justify-between'>
      <div className='rounded-b-3xl bg-gray-700 p-4 h-full'>
        {messages.length === 0
          ? <div className='flex flex-col justify-center items-center h-full'><div className='text-4xl'>😢</div><p className='font-bold text-gray-200'>It's quite quiet here!</p></div>
          : (<>{messages.map(msg => <Message message={msg}/>)}</>
          )
        }
      </div>
      <form className='flex p-4' onSubmit={onSubmit}>
        <input className='px-6 py-4 flex-grow bg-gray-800 text-gray-100 outline-none' type="text" placeholder='What do you want to say?' onChange={handleChange} value={message}/>
        <button className='bg-green-600 rounded-full p-5 text-gray-100' type='submit'><IoSend /></button>
      </form>
    </div>
  )
}

export default Chat