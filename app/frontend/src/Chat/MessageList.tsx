import React, { useRef } from "react";
import Message from "./Message";

export type ChatMessage = {
  timestamp: string;
  text: string;
};

const MessageList = ({ messages }: { messages: ChatMessage[] }) => {
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      ref={messagesContainerRef}
      className="h-full w-full overflow-y-scroll mb-10 pr-4 flex flex-col-reverse"
    >
      {messages
        .slice(0)
        .reverse()
        .map((msg) => (
          <Message key={msg.timestamp} message={msg} />
        ))}
    </div>
  );
};

export default MessageList;
