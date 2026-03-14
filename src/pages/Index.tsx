import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import EventCard from "@/components/EventCard";
import type { EventCardData } from "@/components/EventCard";

type StatusFilter = "all" | "active" | "upcoming" | "completed";

export default function Index() {
  const [filter, setFilter] = useState<StatusFilter>("all");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, event_volunteers(count)")
        .order("date", { ascending: true });
      if (error) throw error;
      return (data || []).map((e: any) => ({
        ...e,
        volunteer_count: e.event_volunteers?.[0]?.count ?? 0,
      })) as EventCardData[];
    },
  });

  const filtered = filter === "all" ? events : events.filter((e) => e.status === filter);
  const activeCount = events.filter((e) => e.status === "active").length;

  const filters: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "ALL" },
    { value: "active", label: "ACTIVE" },
    { value: "upcoming", label: "UPCOMING" },
    { value: "completed", label: "COMPLETED" },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="container px-4 pt-16 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <h1 className="font-display font-black text-5xl md:text-7xl uppercase italic leading-[0.9] mb-4">
            GET THE WORD
            <br />
            OUT. <span className="text-primary">LITERALLY.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mb-6">
            <span className="font-mono-tight text-foreground font-semibold">{activeCount} active campaigns</span>{" "}
            across NYC.
          </p>
          <div className="flex gap-2">
            <Link
              to="/create"
              className="px-6 py-3 bg-primary text-primary-foreground font-display font-bold text-sm uppercase rounded-sm hover:opacity-90 transition-opacity"
            >
              CREATE EVENT
            </Link>
            <Link
              to="/leaderboard"
              className="px-6 py-3 tactical-border font-display font-bold text-sm uppercase rounded-sm hover:bg-secondary transition-colors"
            >
              LEADERBOARD
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Events */}
      <section className="container px-4 pb-20">
        <div className="flex items-center gap-2 mb-4">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`text-label px-3 py-1.5 rounded-sm transition-colors ${
                filter === f.value
                  ? "bg-foreground text-background"
                  : "tactical-border hover:bg-secondary"
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="ml-auto font-mono-tight text-sm text-muted-foreground">
            {filtered.length} events
          </span>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-center py-12">Loading events…</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">No events yet. Create the first one!</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((event, i) => (
              <EventCard key={event.id} event={event} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
