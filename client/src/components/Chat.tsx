import type React from "react";
import { useEffect, useRef, useState } from "react";

interface ChatProps {
    token: string;
}

interface Message {
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
}

const Chat: React.FC<ChatProps> = ({ token }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to the WebSocket endpoint here.
    const wsUrl = `ws://localhost:8080/ws?token=${token}`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => console.log("WebSocket connected!");

    ws.current.onmessage = (event) => {
      try {
        const newMessage: Message = JSON.parse(event.data);
        setMessages((prev) => [...prev, newMessage]);
      } catch (error) {
        console.error("Failed to parse message: ", error);
      }
    };

    ws.current.onclose = () => console.log("WebSocket disconnected!");

    ws.current.onerror = (error) => {
      console.error("WebSocket error: ", error);
    };

    // Cleanup on unmount
    return () => {
      ws.current?.close();
    };
  }, [token]);

  const sendMessage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim() && ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(input);
      setInput("");
    }
  };

  return (
    <div>
      <h2>Real-time Chat</h2>
      <div
        style={{
          border: "1px solid #ccc",
          height: "300px",
          overflowY: "scroll",
          padding: "10px",
          marginBottom: "10px",
        }}
      >
        {messages.map((msg, index) => (
          <div key={index}>
            <strong>
              {msg.senderName.slice(0, msg.senderName.indexOf("@"))}:
            </strong>{" "}
            {msg.content}
          </div>
        ))}
      </div>
      <form onSubmit={sendMessage}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{ width: "80%", padding: "5px" }}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default Chat;