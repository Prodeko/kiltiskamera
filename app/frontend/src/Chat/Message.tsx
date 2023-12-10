type ChatMessage = {
  timestamp: string;
  text: string;
};

const Message = ({ message }: { message: ChatMessage }) => {
  return (
    <div className="text-gray-300 pb-5">
      <p className="text-3xl">{message.text}</p>
      <p className="text-xs">{new Date(message.timestamp).toLocaleTimeString()}</p>
    </div>
  );
};

export default Message;
