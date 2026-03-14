import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const targetIcon = new L.DivIcon({
  className: "",
  html: `<div style="background: hsl(0, 84%, 60%); width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">!</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

const eventIcon = new L.DivIcon({
  className: "",
  html: `<div style="background: hsl(142, 71%, 45%); width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

interface Suggestion {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  reason: string;
  impact_score: number;
  type: string;
}

function FitBounds({ markers }: { markers: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length > 1) {
      const bounds = L.latLngBounds(markers.map(([lat, lng]) => [lat, lng]));
      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (markers.length === 1) {
      map.setView(markers[0], 14);
    }
  }, [markers, map]);
  return null;
}

const typeEmoji: Record<string, string> = {
  subway_station: "🚇",
  community_center: "🏘️",
  commercial_strip: "🏪",
  residential_area: "🏠",
  transit_hub: "🚌",
  shelter: "🏥",
  library: "📚",
  clinic: "⚕️",
};

function openNavigationApp(lat: number, lng: number, name: string) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const url = isIOS
    ? `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=w`
    : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
  
  // Use window.open with noopener to avoid iframe blocking
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) {
    // Fallback: create a temporary link and click it
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

export default function FlyerMission() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id || null));
  }, []);

  const { data: event } = useQuery({
    queryKey: ["event-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const lat = event?.latitude ?? 40.749;
  const lng = event?.longitude ?? -73.935;

  const {
    data: suggestions,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["flyer-suggestions", id, lat, lng],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("suggest-flyer-locations", {
        body: {
          latitude: lat,
          longitude: lng,
          neighborhood: event?.neighborhood,
          eventTitle: event?.title,
        },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data.suggestions as Suggestion[];
    },
    enabled: !!event,
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });

  const allMarkers: [number, number][] = [
    [lat, lng],
    ...(suggestions?.map((s) => [s.latitude, s.longitude] as [number, number]) || []),
  ];

  const selected = selectedIdx !== null ? suggestions?.[selectedIdx] : null;

  return (
    <div className="min-h-screen container px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Link to={`/event/${id}`} className="text-label text-accent hover:underline mb-3 inline-block">
          ← BACK TO EVENT
        </Link>
        <h1 className="font-display font-black text-3xl md:text-4xl uppercase italic leading-tight mb-1">
          FLYER <span className="text-primary">MISSION</span>
        </h1>
        <p className="text-muted-foreground text-sm mb-6">
          AI-identified high-impact zones near your event based on food access data. Pick a location and start walking!
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <div className="w-full aspect-video rounded-sm overflow-hidden tactical-border">
            <MapContainer
              center={[lat, lng]}
              zoom={14}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={false}
            >
              <FitBounds markers={allMarkers} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Event location */}
              <Marker position={[lat, lng]} icon={eventIcon}>
                <Popup>
                  <strong>{event?.title || "Event"}</strong>
                  <br />
                  <span className="text-xs">Event Location</span>
                </Popup>
              </Marker>

              {/* Suggestion markers */}
              {suggestions?.map((s, i) => (
                <div key={i}>
                  <Circle
                    center={[s.latitude, s.longitude]}
                    radius={200}
                    pathOptions={{
                      color: selectedIdx === i ? "hsl(0, 84%, 60%)" : "hsl(25, 95%, 53%)",
                      fillColor: selectedIdx === i ? "hsl(0, 84%, 60%)" : "hsl(25, 95%, 53%)",
                      fillOpacity: selectedIdx === i ? 0.3 : 0.15,
                      weight: selectedIdx === i ? 3 : 1,
                    }}
                  />
                  <Marker
                    position={[s.latitude, s.longitude]}
                    icon={targetIcon}
                    eventHandlers={{ click: () => setSelectedIdx(i) }}
                  >
                    <Popup>
                      <div>
                        <strong>{s.name}</strong>
                        <p className="text-xs">{s.address}</p>
                        <p className="text-xs mt-1">{s.reason}</p>
                        <p className="text-xs font-bold mt-1">Impact: {s.impact_score}/100</p>
                      </div>
                    </Popup>
                  </Marker>
                </div>
              ))}
            </MapContainer>
          </div>

          {/* Selected location action */}
          <AnimatePresence>
            {selected && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-4 tactical-border rounded-sm bg-card p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{typeEmoji[selected.type] || "📍"}</span>
                      <h3 className="font-display font-bold text-lg uppercase">{selected.name}</h3>
                    </div>
                    <p className="font-mono-tight text-sm text-muted-foreground">{selected.address}</p>
                    <p className="font-mono-tight text-xs text-muted-foreground mt-1">{selected.reason}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-mono-tight text-2xl font-bold text-primary">{selected.impact_score}</span>
                    <p className="text-label text-xs">IMPACT</p>
                  </div>
                </div>
                <button
                  onClick={() => openNavigationApp(selected.latitude, selected.longitude, selected.name)}
                  className="mt-4 w-full py-3 bg-primary text-primary-foreground font-display font-black text-lg uppercase rounded-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <span>🧭</span> START NAVIGATION
                </button>
                <p className="text-xs text-muted-foreground text-center mt-1.5 font-mono-tight">
                  Opens in Google Maps / Apple Maps with walking directions
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Suggestions list */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <span className="text-label">
            {isLoading ? "ANALYZING FOOD ACCESS DATA…" : `${suggestions?.length || 0} HIGH-IMPACT ZONES`}
          </span>

          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="tactical-border rounded-sm bg-card p-4 animate-pulse">
                  <div className="h-4 bg-secondary rounded w-3/4 mb-2" />
                  <div className="h-3 bg-secondary rounded w-1/2 mb-2" />
                  <div className="h-3 bg-secondary rounded w-full" />
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="tactical-border rounded-sm bg-destructive/10 p-4">
              <p className="text-sm text-destructive font-mono-tight">
                Failed to load suggestions. Please try again.
              </p>
            </div>
          )}

          {suggestions?.map((s, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * i }}
              onClick={() => setSelectedIdx(i)}
              className={`w-full text-left tactical-border rounded-sm p-4 transition-all ${
                selectedIdx === i
                  ? "bg-primary/10 border-primary/30"
                  : "bg-card hover:bg-secondary/50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center text-lg">
                  {typeEmoji[s.type] || "📍"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display font-bold text-sm uppercase truncate">{s.name}</h3>
                    <span className="font-mono-tight text-xs font-bold text-primary flex-shrink-0">
                      {s.impact_score}
                    </span>
                  </div>
                  <p className="font-mono-tight text-xs text-muted-foreground truncate">{s.address}</p>
                  <p className="font-mono-tight text-xs text-muted-foreground mt-1 line-clamp-2">{s.reason}</p>
                </div>
              </div>
            </motion.button>
          ))}

          {!isLoading && suggestions && suggestions.length > 0 && !selected && (
            <p className="text-xs text-muted-foreground text-center font-mono-tight mt-2">
              Select a zone to start navigation →
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
