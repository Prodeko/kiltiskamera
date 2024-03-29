import { animated, useSpring } from "@react-spring/web";

export type ChatMessage = {
  sender: string;
  timestamp: string;
  text: string;
};

const Message = ({ message }: { message: ChatMessage }) => {
  const springs = useSpring({
    from: { marginTop: -40, opacity: 0 },
    to: { marginTop: 0, opacity: 1 },
  });

  return (
    <animated.div
      className="text-gray-300 flex flex-row justify-between align-middle pb-5"
      style={{ ...springs } as any}
    >
      <p className="text-3xl">{message.text}</p>
      <div className="flex flex-col self-center">
        <p className="text-xs">
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
        <p className="text-xs">{message.sender}</p>
      </div>
    </animated.div>
  );
};

export default Message;
