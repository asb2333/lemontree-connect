import { useParams, Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface ChatMessage {
  id: string;
  event_id: string;
  user_id: string;
  message: string;
  created_at: string | null;
  profile?: { display_name: string | null };
}

export default function Coordination() {
  const { id } = useParams<{ id: string }>();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Get current user
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id || null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fetch event
  const { data: event } = useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      const { data } = await supabase.from("events").select("*").eq("id", id!).single();
      return data;
    },
    enabled: !!id,
  });

  // Fetch messages
  useEffect(() => {
    if (!id) return;
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("event_id", id)
        .order("created_at", { ascending: true });

      if (data) {
        // Fetch profiles for all unique user_ids
        const userIds = [...new Set(data.map((m) => m.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", userIds);

        const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
        setMessages(
          data.map((m) => ({
            ...m,
            profile: profileMap.get(m.user_id) || { display_name: null },
          }))
        );
      }
    };
    fetchMessages();

    // Real-time subscription
    const channel = supabase
      .channel(`chat-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `event_id=eq.${id}` },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;
          const { data: profile } = await supabase
            .from("profiles")
            .select("user_id, display_name")
            .eq("user_id", newMsg.user_id)
            .single();
          setMessages((prev) => {
            // Deduplicate: remove optimistic messages with same user_id + message text
            const isDuplicate = prev.some((m) => m.id === newMsg.id);
            if (isDuplicate) return prev;
            // Replace optimistic version if exists
            const filtered = prev.filter(
              (m) => !(m.user_id === newMsg.user_id && m.message === newMsg.message && m.id !== newMsg.id)
            );
            return [...filtered, { ...newMsg, profile: profile || { display_name: null } }];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!message.trim() || !userId || !id) return;
    const text = message.trim();
    setMessage("");
    
    // Optimistic update
    const tempId = crypto.randomUUID();
    const { data: myProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", userId)
      .single();
    
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        event_id: id,
        user_id: userId,
        message: text,
        created_at: new Date().toISOString(),
        profile: { display_name: myProfile?.display_name || null },
      },
    ]);
    
    await supabase.from("chat_messages").insert({
      event_id: id,
      user_id: userId,
      message: text,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen container px-4 py-12 flex flex-col">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Link to={event ? `/event/${event.id}` : "/"} className="text-label text-accent hover:underline mb-3 inline-block">
          ← BACK TO EVENT
        </Link>
        <h1 className="font-display font-black text-3xl uppercase italic mb-1">
          GROUP <span className="text-primary">CHAT</span>
        </h1>
        {event && <p className="text-muted-foreground text-sm mb-4">{event.title}</p>}
      </motion.div>

      {/* Messages */}
      <div className="flex-1 tactical-border rounded-sm bg-card p-4 mb-4 overflow-y-auto max-h-[60vh] space-y-3">
        {!userId && (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-2">Sign in to join the conversation</p>
            <Link to="/login" className="px-4 py-2 bg-primary text-primary-foreground font-display font-bold text-sm uppercase rounded-sm">
              SIGN IN
            </Link>
          </div>
        )}
        {userId && messages.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No messages yet. Start the conversation!</p>
        )}
        {messages.map((msg) => {
          const isOwn = msg.user_id === userId;
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}
            >
              <span className="text-label mb-0.5">
                {msg.profile?.display_name || "Anonymous"}
              </span>
              <div className={`px-3 py-2 rounded-sm max-w-[70%] ${
                isOwn ? "bg-primary text-primary-foreground" : "bg-secondary"
              }`}>
                <p className="text-sm font-body">{msg.message}</p>
              </div>
              <span className="text-label mt-0.5 opacity-60">
                {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
              </span>
            </motion.div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {userId && (
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2.5 bg-card tactical-border rounded-sm font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            onClick={sendMessage}
            disabled={!message.trim()}
            className="px-6 py-2.5 bg-primary text-primary-foreground font-display font-bold uppercase rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            SEND
          </button>
        </div>
      )}
    </div>
  );
}
