const EmojiReactionForm = ({
  onReactionSubmit,
}: {
  onReactionSubmit: (emoji: string) => void;
}) => {
  const REACTIONS = ["😎", "🐶", "🐔", "🍉", "😵‍💫", "😮‍💨"];

  return (
    <div className="flex flex-row w-full justify-between z-2">
      {REACTIONS.map((emoji, index) => (
        <button
          key={index}
          className="text-4xl cursor-pointer transition-all duration-200 transform hover:scale-150 active:opacity-50 active:scale-150"
          onClick={() => onReactionSubmit(emoji)}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

export default EmojiReactionForm;
