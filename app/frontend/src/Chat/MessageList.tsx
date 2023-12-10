import React, { useEffect, useRef } from "react";
import Message from "./Message";

export type ChatMessage = {
  timestamp: string;
  text: string;
};

const MessageList = ({ messages }: { messages: ChatMessage[] }) => {
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    setTimeout(() => {
      scrollToBottom();
    }, 500);
  }, []);

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
