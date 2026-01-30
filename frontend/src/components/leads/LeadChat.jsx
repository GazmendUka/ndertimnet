import React, { useEffect, useState, useRef } from "react";
import api from "../../api/axios";
import { Send } from "lucide-react";

export default function LeadChat({ lead }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef();

  // ------------------------------------------------------------
  // LOAD CHAT MESSAGES
  // ------------------------------------------------------------
  async function fetchMessages() {
    if (!lead) return;

    try {
      const res = await api.get(`leads/leadmessages/?lead=${lead.id}`);

      const list = res.data.results || res.data.rezultatet || [];

      setMessages(list);
    } catch (err) {
      console.error("Could not load messages:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMessages();
  }, [lead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ------------------------------------------------------------
  // SEND MESSAGE
  // ------------------------------------------------------------
  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim()) return;

    try {
      await api.post("leads/leadmessages/", {
        lead: lead.id,
        message: input, // FIX: backend expects "message"
      });

      setInput("");
      fetchMessages(); // reload chat
    } catch (err) {
      console.error("Send message failed:", err);
      alert("Nuk mund të dërgohet mesazhi.");
    }
  }

  if (!lead) return null;

  return (
    <div className="premium-card p-4 mt-6">
      <h3 className="font-semibold text-lg mb-3">💬 Chat me klientin</h3>

      <div
        style={{
          maxHeight: "300px",
          overflowY: "auto",
          padding: "10px",
          border: "1px solid #ddd",
          borderRadius: "6px",
          background: "#fafafa",
        }}
      >
        {loading && <p>Loading chat...</p>}

        {!loading &&
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                marginBottom: "12px",
                textAlign:
                  msg.sender_type === "company" ? "right" : "left",
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background:
                    msg.sender_type === "company"
                      ? "#d1e7ff"
                      : "#e6f7e8",
                }}
              >
                {msg.message /* FIX */}
              </div>

              <p
                style={{
                  fontSize: "11px",
                  color: "#888",
                  marginTop: "2px",
                }}
              >
                {new Date(msg.created_at).toLocaleString("sv-SE")}
              </p>
            </div>
          ))}

        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="flex gap-2 mt-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Skriv ett meddelande..."
          className="flex-1 p-2 rounded border border-gray-300"
        />

        <button
          type="submit"
          className="premium-btn btn-dark flex items-center gap-2"
        >
          <Send size={16} />
          Dërgo
        </button>
      </form>
    </div>
  );
}
