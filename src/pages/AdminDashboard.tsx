import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import AdminOperationsMap from "@/components/AdminOperationsMap";
import { Loader2, ShieldAlert } from "lucide-react";

function StatCard({
  label,
  value,
  sub,
  color = "text-foreground",
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="tactical-border rounded-sm bg-card p-5">
      <p className="text-label mb-1">{label}</p>
      <p className={`font-mono-tight text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-label mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const { isAdmin, loading: authLoading } = useAdminCheck();
  const navigate = useNavigate();

  const { data: events } = useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const { data } = await supabase.from("events").select("*");
      return data || [];
    },
    enabled: isAdmin,
  });

  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*");
      return data || [];
    },
    enabled: isAdmin,
  });

  const { data: flyerPosts } = useQuery({
    queryKey: ["admin-flyers"],
    queryFn: async () => {
      const { data } = await supabase.from("flyer_posts").select("*");
      return data || [];
    },
    enabled: isAdmin,
  });

  const { data: qrScans } = useQuery({
    queryKey: ["admin-scans"],
    queryFn: async () => {
      const { data } = await supabase.from("qr_scans").select("*");
      return data || [];
    },
    enabled: isAdmin,
  });

  const { data: volunteers } = useQuery({
    queryKey: ["admin-volunteers"],
    queryFn: async () => {
      const { data } = await supabase.from("event_volunteers").select("*");
      return data || [];
    },
    enabled: isAdmin,
  });

  // Auth gate
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="font-display font-black text-2xl uppercase">ACCESS DENIED</h1>
          <p className="text-muted-foreground max-w-sm">
            This dashboard is restricted to Lemontree admin accounts. If you believe this is an error, contact your team lead.
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2.5 bg-primary text-primary-foreground font-display font-bold uppercase rounded-sm hover:opacity-90 transition-opacity"
          >
            GO HOME
          </button>
        </motion.div>
      </div>
    );
  }

  const totalEvents = events?.length || 0;
  const activeEvents = events?.filter((e) => e.status === "active").length || 0;
  const upcomingEvents = events?.filter((e) => e.status === "upcoming").length || 0;
  const completedEvents = events?.filter((e) => e.status === "completed").length || 0;
  const totalVolunteers = profiles?.length || 0;
  const totalFlyers = flyerPosts?.length || 0;
  const totalScans = qrScans?.length || 0;
  const totalSignups = volunteers?.length || 0;
  const totalPoints = profiles?.reduce((sum, p) => sum + (p.points || 0), 0) || 0;
  const totalFlyersNeeded = events?.reduce((sum, e) => sum + (e.flyers_needed || 0), 0) || 0;
  const totalFlyersPosted = events?.reduce((sum, e) => sum + (e.flyers_posted || 0), 0) || 0;
  const flyerCoverage = totalFlyersNeeded > 0 ? Math.round((totalFlyersPosted / totalFlyersNeeded) * 100) : 0;
  const scanToFlyerRate = totalFlyers > 0 ? (totalScans / totalFlyers).toFixed(1) : "0";
  const avgVolPerEvent = totalEvents > 0 ? (totalSignups / totalEvents).toFixed(1) : "0";

  // Neighborhoods with most activity
  const neighborhoodMap = new Map<string, number>();
  events?.forEach((e) => {
    const n = e.neighborhood || "Unknown";
    neighborhoodMap.set(n, (neighborhoodMap.get(n) || 0) + 1);
  });
  const topNeighborhoods = [...neighborhoodMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Top volunteers
  const topVolunteers = [...(profiles || [])]
    .sort((a, b) => (b.points || 0) - (a.points || 0))
    .slice(0, 5);

  // Recent events
  const recentEvents = [...(events || [])]
    .sort((a, b) => new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime())
    .slice(0, 5);

  return (
    <div className="min-h-screen container px-4 py-12">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display font-black text-4xl uppercase italic mb-2"
      >
        ADMIN <span className="text-primary">DASHBOARD</span>
      </motion.h1>
      <p className="text-muted-foreground mb-8">Lemontree operations overview &amp; intelligence.</p>

      {/* Primary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatCard label="TOTAL EVENTS" value={totalEvents} sub={`${activeEvents} active · ${upcomingEvents} upcoming`} />
        <StatCard label="VOLUNTEERS" value={totalVolunteers} color="text-accent" />
        <StatCard label="FLYERS POSTED" value={totalFlyers} color="text-primary" sub={`${flyerCoverage}% coverage`} />
        <StatCard label="QR SCANS" value={totalScans} color="text-success" sub={`${scanToFlyerRate} scans/flyer`} />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="EVENT SIGNUPS" value={totalSignups} sub={`${avgVolPerEvent} avg/event`} />
        <StatCard label="TOTAL POINTS" value={totalPoints.toLocaleString()} color="text-primary" />
        <StatCard label="AVG POINTS/USER" value={totalVolunteers > 0 ? Math.round(totalPoints / totalVolunteers) : 0} />
        <StatCard label="COMPLETED EVENTS" value={completedEvents} sub={totalEvents > 0 ? `${Math.round((completedEvents / totalEvents) * 100)}% completion` : "—"} />
      </div>

      {/* Operations Map */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <p className="text-label mb-3">OPERATIONS MAP</p>
        <AdminOperationsMap flyerPosts={flyerPosts || []} events={events || []} />
        <div className="flex flex-wrap gap-4 mt-3">
          <span className="text-label flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "hsl(0, 72%, 51%)", opacity: 0.4 }} />
            FOOD SHORTAGE ZONES
          </span>
          <span className="text-label flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "hsl(142, 71%, 45%)" }} />
            PANTRIES
          </span>
          <span className="text-label flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "hsl(217, 91%, 53%)" }} />
            EVENTS
          </span>
          <span className="text-label flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full inline-block" style={{ background: "hsl(45, 93%, 47%)" }} />
            FLYER POSTS
          </span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Events */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="tactical-border rounded-sm bg-card p-5"
        >
          <p className="text-label mb-4">RECENT EVENTS</p>
          {recentEvents.length === 0 ? (
            <p className="text-muted-foreground text-sm">No events yet.</p>
          ) : (
            <div className="space-y-3">
              {recentEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-body font-semibold text-sm truncate">{event.title}</p>
                    <p className="text-label truncate">{event.location}</p>
                  </div>
                  <span
                    className={`text-label px-1.5 py-0.5 rounded-sm ml-2 whitespace-nowrap ${
                      event.status === "active"
                        ? "bg-primary text-primary-foreground"
                        : event.status === "upcoming"
                        ? "bg-accent text-accent-foreground"
                        : "bg-success text-success-foreground"
                    }`}
                  >
                    {event.status?.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Top Volunteers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="tactical-border rounded-sm bg-card p-5"
        >
          <p className="text-label mb-4">TOP VOLUNTEERS</p>
          {topVolunteers.length === 0 ? (
            <p className="text-muted-foreground text-sm">No volunteers yet.</p>
          ) : (
            <div className="space-y-3">
              {topVolunteers.map((vol, i) => (
                <div key={vol.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <span className="font-mono-tight text-sm font-bold text-muted-foreground w-6">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="w-8 h-8 rounded-sm bg-primary/10 flex items-center justify-center font-mono-tight text-xs font-bold">
                    {(vol.display_name || "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body font-semibold text-sm truncate">{vol.display_name || "Anonymous"}</p>
                    <p className="text-label">{vol.flyers_posted || 0} FLYERS · {vol.streak || 0}🔥</p>
                  </div>
                  <span className="font-mono-tight text-sm font-bold text-primary">
                    {(vol.points || 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Top Neighborhoods */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="tactical-border rounded-sm bg-card p-5"
        >
          <p className="text-label mb-4">TOP NEIGHBORHOODS</p>
          {topNeighborhoods.length === 0 ? (
            <p className="text-muted-foreground text-sm">No neighborhood data yet.</p>
          ) : (
            <div className="space-y-3">
              {topNeighborhoods.map(([name, count], i) => (
                <div key={name} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <span className="font-mono-tight text-sm font-bold text-muted-foreground w-6">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1">
                    <p className="font-body font-semibold text-sm">{name}</p>
                  </div>
                  <span className="font-mono-tight text-sm font-bold text-accent">
                    {count} EVENT{count !== 1 ? "S" : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
