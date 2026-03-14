import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const flyerIcon = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

interface FlyerPost {
  id: string;
  latitude: number;
  longitude: number;
  notes?: string | null;
  created_at?: string | null;
}

interface EventMapProps {
  center: [number, number];
  flyerPosts: FlyerPost[];
  eventTitle?: string;
  eventId?: string;
}

function SetView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 14);
  }, [center, map]);
  return null;
}

export default function EventMap({ center, flyerPosts: initialPosts, eventTitle, eventId }: EventMapProps) {
  const [livePosts, setLivePosts] = useState<FlyerPost[]>(initialPosts);

  // Keep in sync with parent
  useEffect(() => {
    setLivePosts(initialPosts);
  }, [initialPosts]);

  // Realtime subscription for new flyer posts
  useEffect(() => {
    if (!eventId) return;
    const channel = supabase
      .channel(`flyers-${eventId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "flyer_posts", filter: `event_id=eq.${eventId}` },
        (payload) => {
          const newPost = payload.new as FlyerPost;
          setLivePosts((prev) => {
            if (prev.some((p) => p.id === newPost.id)) return prev;
            return [...prev, newPost];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  return (
    <div className="w-full aspect-video rounded-sm overflow-hidden tactical-border">
      <MapContainer
        center={center}
        zoom={14}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <SetView center={center} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <Marker position={center}>
          <Popup>
            <strong>{eventTitle || "Event Location"}</strong>
          </Popup>
        </Marker>

        {livePosts.map((post) => (
          <div key={post.id}>
            <Circle
              center={[post.latitude, post.longitude]}
              radius={100}
              pathOptions={{
                color: "hsl(142, 71%, 45%)",
                fillColor: "hsl(142, 71%, 45%)",
                fillOpacity: 0.25,
              }}
            />
            <Marker position={[post.latitude, post.longitude]} icon={flyerIcon}>
              <Popup>
                <div>
                  <strong>Flyer Posted</strong>
                  {post.notes && <p>{post.notes}</p>}
                  {post.created_at && (
                    <p className="text-xs">{new Date(post.created_at).toLocaleString()}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          </div>
        ))}
      </MapContainer>
    </div>
  );
}
