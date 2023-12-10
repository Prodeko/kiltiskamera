import React, { useEffect, useState } from "react";
import useWebSocket from "react-use-websocket";
import EmojiReactionForm from "./EmojiForm";
import MessageList, { ChatMessage } from "./MessageList";

const WS_URL = "ws://localhost:8080";

enum WsMessageType {
  MESSAGE = "MESSAGE",
  INIT_ALL = "ALL",
}

type WsMessage = {
  type: WsMessageType;
  data: ChatMessage[];
};

const isWsMessage = (
  potentialWsMessage: unknown
): potentialWsMessage is WsMessage => {
  const wsMessage = potentialWsMessage as WsMessage;
  if (
    Object.values(WsMessageType).includes(wsMessage.type) &&
    Array.isArray(wsMessage.data)
  ) {
    for (let i = 0; i < wsMessage.data.length; i++) {
      const chatMessage = wsMessage.data[i];
      if (
        chatMessage.text === undefined ||
        chatMessage.timestamp === undefined
      ) {
        return false;
      }
    }
    return true;
  }
  return false;
};

const Chat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const { sendJsonMessage, lastJsonMessage } = useWebSocket(WS_URL, {
    onOpen: () => {
      console.log("Websocket connected!");
    },
    share: true,
  });

  useEffect(() => {
    if (lastJsonMessage !== null && isWsMessage(lastJsonMessage)) {
      setMessages(lastJsonMessage.data);
    }
  }, [lastJsonMessage, setMessages, messages]);

  const handleReactionSubmit = (emoji: string) => {
    sendJsonMessage({
      text: emoji,
    });
  };

  return (
    <div className="h-full w-full relative flex flex-col align-bottom justify-end pb-8 pr-8 pl-8 bg-gradient-to-l from-[rgba(0,0,0,0.7)] to-transparent">
      <MessageList messages={messages} />
      <div className="w-full absolute bottom-8 right-8">
        <EmojiReactionForm onReactionSubmit={handleReactionSubmit} />
      </div>
    </div>
  );
};

export default Chat;
