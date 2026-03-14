import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type League = "diamond" | "gold" | "silver" | "bronze";
type LeagueFilter = "all" | League;

const leagueEmoji: Record<League, string> = {
  diamond: "💎",
  gold: "🥇",
  silver: "🥈",
  bronze: "🥉",
};

const leagueColors: Record<League, string> = {
  diamond: "bg-accent/10 text-accent",
  gold: "bg-primary/10 text-primary",
  silver: "bg-muted text-muted-foreground",
  bronze: "bg-secondary text-foreground",
};

export default function Leaderboard() {
  const [filter, setFilter] = useState<LeagueFilter>("all");

  const { data: volunteers = [], isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("points", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const sorted = volunteers;
  const filtered = filter === "all" ? sorted : sorted.filter((v) => v.league === filter);

  const filters: { value: LeagueFilter; label: string }[] = [
    { value: "all", label: "ALL" },
    { value: "diamond", label: "💎 DIAMOND" },
    { value: "gold", label: "🥇 GOLD" },
    { value: "silver", label: "🥈 SILVER" },
    { value: "bronze", label: "🥉 BRONZE" },
  ];

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen container px-4 py-12">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display font-black text-4xl uppercase italic mb-2"
      >
        LEADER<span className="text-primary">BOARD</span>
      </motion.h1>
      <p className="text-muted-foreground mb-6">Top volunteers making an impact on the ground.</p>

      <div className="flex items-center gap-2 mb-6">
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
      </div>

      <div className="tactical-border rounded-sm bg-card overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-secondary/50">
          <span className="col-span-1 text-label">#</span>
          <span className="col-span-4 text-label">VOLUNTEER</span>
          <span className="col-span-2 text-label text-right">POINTS</span>
          <span className="col-span-2 text-label text-right">FLYERS</span>
          <span className="col-span-1 text-label text-right">STREAK</span>
          <span className="col-span-2 text-label text-right">LEAGUE</span>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No volunteers yet.</p>
        ) : (
          filtered.map((v, i) => {
            const league = (v.league as League) || "bronze";
            return (
              <motion.div
                key={v.id}
                initial={{ opacity: 0.1, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, type: "spring", stiffness: 300, damping: 30 }}
                className="grid grid-cols-12 gap-2 px-4 py-3 items-center border-t border-border hover:bg-secondary/30 transition-colors"
              >
                <span className="col-span-1 font-mono-tight text-sm font-bold text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="col-span-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-sm bg-primary/10 flex items-center justify-center font-mono-tight text-xs font-bold">
                    {getInitials(v.display_name)}
                  </div>
                  <span className="font-body font-semibold text-sm">{v.display_name ?? "Anonymous"}</span>
                </div>
                <span className="col-span-2 font-mono-tight text-sm font-bold text-right">
                  {(v.points ?? 0).toLocaleString()}
                </span>
                <span className="col-span-2 font-mono-tight text-sm text-right">
                  {v.flyers_posted ?? 0}
                </span>
                <span className="col-span-1 font-mono-tight text-sm text-right">
                  {v.streak ?? 0}🔥
                </span>
                <div className="col-span-2 flex justify-end">
                  <span className={`text-label px-2 py-0.5 rounded-sm ${leagueColors[league]}`}>
                    {leagueEmoji[league]} {league.toUpperCase()}
                  </span>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
