type ChatMessage = {
  timestamp: string;
  text: string;
};

const Message = ({ message }: { message: ChatMessage }) => {
  return (
    <div className="text-gray-300">
      <p className="text-xs">{message.timestamp}</p>
      <p className="mb-3">{message.text}</p>
    </div>
  );
};

export default Message;
