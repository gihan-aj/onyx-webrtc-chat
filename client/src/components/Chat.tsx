import type React from "react";
import { useEffect, useRef, useState } from "react";
import { userService, type User } from "../services/userService";
import { useAuth } from "../context/AuthContext";
import { MessageSquare, User as UserIcon, Send } from "lucide-react";

interface ChatProps {
  token: string;
}

interface Message {
  senderId: string;
  senderName: string;
  recipientId: string;
  content: string;
  timestamp: string;
}

const GENERAL_CHAT_USER: User = { id: "", email: "General Chat" };

const Chat: React.FC<ChatProps> = ({ token }) => {
  const { user: currentUser } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User>(GENERAL_CHAT_USER);
  const [wsConnected, setWsConnected] = useState<boolean>(false);

  const ws = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Users on Load
  useEffect(() => {
    // // Connect to the WebSocket endpoint here.
    // const wsUrl = `ws://localhost:8080/ws?token=${token}`;
    // ws.current = new WebSocket(wsUrl);

    // ws.current.onopen = () => console.log("WebSocket connected!");

    // ws.current.onmessage = (event) => {
    //   try {
    //     const newMessage: Message = JSON.parse(event.data);
    //     setMessages((prev) => [...prev, newMessage]);
    //   } catch (error) {
    //     console.error("Failed to parse message: ", error);
    //   }
    // };

    // ws.current.onclose = () => console.log("WebSocket disconnected!");

    // ws.current.onerror = (error) => {
    //   console.error("WebSocket error: ", error);
    // };

    // // Cleanup on unmount
    // return () => {
    //   ws.current?.close();
    // };

    const fetchUsers = async () => {
      try {
        const fetchedUsers = await userService.getAllUsers(token);
        const otherUsers = fetchedUsers.filter(
          (u) => u.id !== currentUser?.uid
        );
        setUsers(otherUsers);
      } catch (err) {
        console.error("Error fetching users: ", err);
      }
    };
    fetchUsers();
  }, [token, currentUser]);

  // 2. Connect to WebSocket
  useEffect(() => {
    const wsUrl = `ws://localhost:8080/ws?token=${token}`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log("WebSocket connected!");
      setWsConnected(true);
    };

    ws.current.onclose = () => setWsConnected(false);

    ws.current.onmessage = (event) => {
      try {
        const newMessage: Message = JSON.parse(event.data);
        setMessages((prev) => [...prev, newMessage]);
      } catch (err) {
        console.error("Failed to parse message: ", err);
      }
    };

    return () => {
      ws.current?.close();
    };
  }, [token]);

  // 3. Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedUser]);

  const sendMessage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim() && ws.current?.readyState === WebSocket.OPEN) {
      const msg = {
        content: input,
        recipientId: selectedUser.id, // Send empty string for General, or UserID for private
      };

      ws.current.send(JSON.stringify(msg));

      setInput("");
    }
  };

  // 4. Filtering logic
  const filteredMessages = messages.filter((msg) => {
    if (selectedUser.id === "") {
      return msg.recipientId === "" || !msg.recipientId;
    }

    const isFromThem =
      msg.senderId === selectedUser.id && msg.recipientId === currentUser?.uid;
    const isToThem =
      msg.senderId === currentUser?.uid && msg.recipientId === selectedUser.id;

    return isFromThem || isToThem;
  });

  return (
    <div className="flex h-full bg-white rounded-lg shadow-sm overflow-hidden border border-slate-200">
      {/* SIDEBAR: User List */}
      <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200 font-semibold text-slate-700">
          Conversations
        </div>
        <div className="overflow-y-auto flex-1">
          {/* General Chat Option */}
          <div
            onClick={() => setSelectedUser(GENERAL_CHAT_USER)}
            className={`p-3 cursor-pointer flex items-center gap-3 hover:bg-slate-100 transition-colors ${
              selectedUser.id === ""
                ? "bg-blue-50 border-r-4 border-blue-500"
                : ""
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <MessageSquare size={20} />
            </div>
            <div>
              <div className="font-medium text-slate-900">General Chat</div>
              <div className="text-xs text-slate-500">Public Room</div>
            </div>
          </div>

          {/* User List */}
          {users.map((u) => (
            <div
              key={u.id}
              onClick={() => setSelectedUser(u)}
              className={`p-3 cursor-pointer flex items-center gap-3 hover:bg-slate-100 transition-colors ${
                selectedUser.id === u.id
                  ? "bg-blue-50 border-r-4 border-blue-500"
                  : ""
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                <UserIcon size={20} />
              </div>
              <div className="overflow-hidden">
                <div className="font-medium text-slate-900 truncate">
                  {u.email}
                </div>
                <div className="text-xs text-slate-500 truncate">Online</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col bg-slate-50/50">
        {/* Chat Header */}
        <div className="p-4 bg-white border-b border-slate-200 shadow-sm flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 text-lg">
              {selectedUser.id === "" ? "# General Chat" : selectedUser.email}
            </span>
            {!wsConnected && (
              <span className="text-xs text-red-500 font-medium px-2 py-0.5 bg-red-50 rounded-full">
                Disconnected
              </span>
            )}
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {filteredMessages.map((msg, idx) => {
            const isMe = msg.senderId === currentUser?.uid;
            return (
              <div
                key={idx}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl p-3 shadow-sm ${
                    isMe
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-white text-slate-800 border border-slate-200 rounded-bl-none"
                  }`}
                >
                  {!isMe && selectedUser.id === "" && (
                    <div className="text-xs font-bold text-slate-400 mb-1">
                      {msg.senderName}
                    </div>
                  )}
                  <div className="text-sm">{msg.content}</div>
                  <div
                    className={`text-[10px] mt-1 text-right ${
                      isMe ? "text-blue-200" : "text-slate-400"
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-200">
          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Message ${
                selectedUser.id === "" ? "#General" : selectedUser.email
              }...`}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={!input.trim() || !wsConnected}
              className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat;
