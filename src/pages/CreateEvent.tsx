import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { lemontreePantries, type Pantry } from "@/lib/pantries";
import FlyerPreview from "@/components/FlyerPreview";
import html2canvas from "html2canvas";

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Known neighborhoods with approximate coords for distance-based search
const neighborhoods: Record<string, { lat: number; lng: number }> = {
  "washington heights": { lat: 40.849, lng: -73.935 },
  "east village": { lat: 40.729, lng: -73.981 },
  "sunset park": { lat: 40.647, lng: -74.008 },
  "jackson heights": { lat: 40.747, lng: -73.891 },
  "harlem": { lat: 40.809, lng: -73.940 },
  "bushwick": { lat: 40.694, lng: -73.918 },
  "south bronx": { lat: 40.820, lng: -73.923 },
  "astoria": { lat: 40.762, lng: -73.921 },
  "morningside heights": { lat: 40.810, lng: -73.962 },
  "columbia": { lat: 40.808, lng: -73.962 },
  "nyu": { lat: 40.729, lng: -73.996 },
  "greenwich village": { lat: 40.733, lng: -74.002 },
  "upper west side": { lat: 40.787, lng: -73.975 },
  "upper east side": { lat: 40.774, lng: -73.956 },
  "chelsea": { lat: 40.746, lng: -74.001 },
  "midtown": { lat: 40.754, lng: -73.984 },
  "lower east side": { lat: 40.715, lng: -73.984 },
  "williamsburg": { lat: 40.710, lng: -73.957 },
  "crown heights": { lat: 40.668, lng: -73.940 },
  "bed-stuy": { lat: 40.682, lng: -73.936 },
  "flatbush": { lat: 40.652, lng: -73.959 },
  "flushing": { lat: 40.762, lng: -73.830 },
  "fordham": { lat: 40.862, lng: -73.898 },
  "inwood": { lat: 40.868, lng: -73.920 },
};

function findCenterFromInput(q: string): { lat: number; lng: number } | null {
  const lower = q.toLowerCase().trim();
  // Check neighborhoods
  for (const [name, coords] of Object.entries(neighborhoods)) {
    if (lower.includes(name)) return coords;
  }
  // Check pantry names/addresses
  const pantryMatch = lemontreePantries.find(
    (p) =>
      p.neighborhood.toLowerCase().includes(lower) ||
      p.address.toLowerCase().includes(lower) ||
      p.name.toLowerCase().includes(lower)
  );
  if (pantryMatch) return { lat: pantryMatch.lat, lng: pantryMatch.lng };
  return null;
}

export default function CreateEvent() {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [language, setLanguage] = useState("English");
  const [loading, setLoading] = useState(false);
  const [eventLat, setEventLat] = useState<number | null>(null);
  const [eventLng, setEventLng] = useState<number | null>(null);
  const [neighborhood, setNeighborhood] = useState("");
  const [selectedPantries, setSelectedPantries] = useState<Pantry[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const flyerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const nearbyPantries = useMemo(() => {
    if (!location.trim()) return [];
    const center = findCenterFromInput(location);
    if (center) {
      return [...lemontreePantries]
        .map((p) => ({ ...p, dist: getDistance(center.lat, center.lng, p.lat, p.lng) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 6);
    }
    // Fallback: text match
    const q = location.toLowerCase();
    return lemontreePantries
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q) ||
          p.neighborhood.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [location]);

  const togglePantry = (pantry: Pantry) => {
    setSelectedPantries((prev) => {
      const exists = prev.some((p) => p.id === pantry.id);
      if (exists) return prev.filter((p) => p.id !== pantry.id);
      if (prev.length >= 4) return prev;
      return [...prev, pantry];
    });
    if (!eventLat) {
      setEventLat(pantry.lat);
      setEventLng(pantry.lng);
      setNeighborhood(pantry.neighborhood);
    }
  };

  const selectAllNearby = () => {
    const clean = nearbyPantries.slice(0, 4).map((p) => {
      const { dist, ...rest } = p as any;
      return rest as Pantry;
    });
    setSelectedPantries(clean);
    if (nearbyPantries.length > 0) {
      setEventLat(nearbyPantries[0].lat);
      setEventLng(nearbyPantries[0].lng);
      setNeighborhood(nearbyPantries[0].neighborhood);
    }
    setShowSuggestions(false);
  };

  const buildTimeString = () => {
    if (selectedPantries.length === 0) return "See flyer for times";
    const days = new Set<string>();
    selectedPantries.forEach((p) => p.schedule.forEach((s) => days.add(s.day)));
    return Array.from(days).join(", ");
  };

  const qrValue = `https://lemontree.org/event/${encodeURIComponent(title || "new")}?loc=${encodeURIComponent(location)}`;

  const handleDownloadFlyer = async () => {
    if (!flyerRef.current) return;
    const canvas = await html2canvas(flyerRef.current, { scale: 2, useCORS: true, backgroundColor: null });
    const link = document.createElement("a");
    link.download = `${title || "lemontree"}-flyer.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleSubmit = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: "Sign in required", description: "Please sign in to create an event.", variant: "destructive" });
      navigate("/login");
      return;
    }

    if (!title || !location) {
      toast({ title: "Missing fields", description: "Please fill in title and location.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .insert({
        title,
        location,
        date: new Date().toISOString().split("T")[0],
        time: buildTimeString(),
        language,
        neighborhood: neighborhood || null,
        latitude: eventLat,
        longitude: eventLng,
        created_by: session.user.id,
        status: "upcoming",
        group_chat_enabled: true,
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Event created!", description: "Your event is now live." });
    navigate(`/event/${data.id}`);
  };

  return (
    <div className="min-h-screen container px-4 py-12">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display font-black text-4xl uppercase italic mb-8"
      >
        CREATE <span className="text-primary">EVENT</span>
      </motion.h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 30 }}
          className="space-y-5"
        >
          <div>
            <label className="text-label block mb-1.5">EVENT TITLE</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Free Food Near Washington Heights"
              className="w-full px-3 py-2.5 bg-card tactical-border rounded-sm font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="relative">
            <label className="text-label block mb-1.5">YOUR LOCATION / NEIGHBORHOOD</label>
            <input
              type="text"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => location.trim() && setShowSuggestions(true)}
              placeholder="e.g. Washington Heights, Harlem, Bushwick…"
              className="w-full px-3 py-2.5 bg-card tactical-border rounded-sm font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {location.trim() && nearbyPantries.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1 font-mono-tight">
                Showing {nearbyPantries.length} nearest pantries sorted by distance
              </p>
            )}
          </div>

          {/* Nearby pantries */}
          <AnimatePresence>
            {nearbyPantries.length > 0 && (showSuggestions || selectedPantries.length > 0) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center justify-between mb-2">
                  <label className="text-label">NEARBY LEMONTREE PANTRIES</label>
                  {selectedPantries.length < Math.min(nearbyPantries.length, 4) && (
                    <button type="button" onClick={selectAllNearby} className="text-xs text-accent hover:underline font-semibold">
                      SELECT TOP 4
                    </button>
                  )}
                </div>
                <div className="space-y-1.5">
                  {nearbyPantries.map((p) => {
                    const isSelected = selectedPantries.some((s) => s.id === p.id);
                    const distMiles = (p as any).dist;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePantry(p)}
                        className={`w-full text-left px-3 py-2.5 rounded-sm transition-all flex items-center gap-3 ${
                          isSelected
                            ? "bg-primary/10 tactical-border border-primary/30"
                            : "tactical-border hover:bg-secondary"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-sm flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected ? "bg-primary text-primary-foreground" : "tactical-border"
                          }`}
                        >
                          {isSelected && <span className="text-xs">✓</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-body font-semibold text-sm block truncate">{p.name}</span>
                          <span className="font-mono-tight text-xs text-muted-foreground">
                            {p.address} · {p.neighborhood}
                            {distMiles !== undefined && ` · ${distMiles.toFixed(1)} mi`}
                          </span>
                          <span className="font-mono-tight text-xs text-muted-foreground block">
                            {p.offerings.join(", ")} · {p.schedule.map((s) => `${s.day.slice(0, 3)} ${s.time}`).join(", ")}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {selectedPantries.length > 0 && (
                  <p className="text-xs text-success mt-2 font-mono-tight">
                    ✓ {selectedPantries.length} pantries will appear on the flyer
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="text-label block mb-1.5">LANGUAGE</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2.5 bg-card tactical-border rounded-sm font-body text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option>English</option>
              <option>English / Spanish</option>
              <option>English / Chinese</option>
              <option>English / Bengali</option>
              <option>Spanish</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-3 bg-primary text-primary-foreground font-display font-bold uppercase rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "CREATING..." : "GENERATE & PUBLISH"}
            </button>
            <button
              onClick={handleDownloadFlyer}
              disabled={selectedPantries.length === 0}
              className="py-3 px-4 tactical-border font-display font-bold uppercase rounded-sm hover:bg-secondary transition-colors disabled:opacity-30"
            >
              ↓ PDF
            </button>
          </div>
        </motion.div>

        {/* Live Flyer Preview */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 30 }}
        >
          <p className="text-label mb-2">LIVE FLYER PREVIEW</p>
          <FlyerPreview
            ref={flyerRef}
            title={title}
            language={language}
            pantries={selectedPantries}
            qrValue={qrValue}
          />
        </motion.div>
      </div>
    </div>
  );
}
