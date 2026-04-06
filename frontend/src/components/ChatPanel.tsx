import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { useSocket } from '../hooks/useSocket';
import type { ChatMessage } from '../types/index';

export const ChatPanel = () => {
  const [input, setInput] = useState('');
  const [visible, setVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const store = useGameStore();
  const { sendMessage } = useSocket();

  const isInRoom = store.roomId !== null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [store.messages]);

  useEffect(() => {
    if (isInRoom) {
      setShouldRender(true);
      requestAnimationFrame(() => setVisible(true));
      setTimeout(() => inputRef.current?.focus(), 220);
      return;
    }

    setVisible(false);
    const timer = setTimeout(() => setShouldRender(false), 280);
    return () => clearTimeout(timer);
  }, [isInRoom]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !isInRoom) return;

    sendMessage(input.trim());
    setInput('');
  };

  if (!shouldRender) return null;

  return (
    <div
      className={`
      fixed top-0 right-0 h-screen w-[360px] bg-gray-100
      border-l border-gray-300 shadow-2xl overflow-hidden
      transition-all duration-300 ease-out transform pointer-events-auto
      ${visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
    `}
    >
      <div className="bg-white px-4 py-4 flex justify-between items-center border-b border-gray-200">
        <div>
          <h3 className="text-gray-900 font-semibold text-lg">Chat</h3>
          <p className="text-gray-500 text-xs">{store.roomMembers.length} members connected</p>
        </div>
        <div className="flex gap-1">
          {store.roomMembers.map((id, i) => (
            <div
              key={id}
              className="w-2 h-2 rounded-full bg-green-500 animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>

      <div className="h-[calc(100vh-132px)] overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
        {store.messages.length === 0 ? (
          <p className="text-gray-500 text-center text-sm italic mt-8">No messages yet. Start the conversation.</p>
        ) : (
          store.messages.map((msg, idx) => (
            <MessageBubble key={`${msg.timestamp}-${idx}`} message={msg} isOwn={msg.userId === store.currentUserId} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-gray-200">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            maxLength={200}
            className="flex-1 bg-gray-100 text-gray-900 text-sm rounded-lg px-3 py-2 border border-gray-300 focus:border-indigo-500 focus:outline-none placeholder-gray-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

const MessageBubble = ({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) => {
  const user = useGameStore().users.get(message.userId);
  const color = user?.color || '#888';

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
        max-w-[80%] rounded-2xl px-3 py-2 text-sm
        ${isOwn ? 'bg-indigo-600 text-white rounded-br-md' : 'bg-gray-800 text-gray-200 rounded-bl-md border border-gray-700'}
      `}
      >
        {!isOwn && (
          <span className="text-xs font-semibold block mb-1" style={{ color }}>
            {message.userName}
          </span>
        )}
        <p className="break-words">{message.message}</p>
        <span className="text-[10px] opacity-60 block mt-1 text-right">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};
