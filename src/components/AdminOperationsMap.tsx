import { MapContainer, TileLayer, Marker, Popup, Circle, LayerGroup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { lemontreePantries } from "@/lib/pantries";

// Custom icons
const pantryIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:28px;height:28px;background:hsl(142,71%,45%);border:2px solid white;border-radius:4px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3)"><span style="font-size:14px">🏪</span></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -16],
});

const flyerIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:20px;height:20px;background:hsl(45,93%,47%);border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -12],
});

const eventIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:28px;height:28px;background:hsl(217,91%,53%);border:2px solid white;border-radius:4px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3)"><span style="font-size:14px">📍</span></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -16],
});

// Food shortage zones (high food insecurity areas in NYC)
const foodShortageZones = [
  { name: "South Bronx", lat: 40.817, lng: -73.920, radius: 1500 },
  { name: "East Harlem", lat: 40.794, lng: -73.942, radius: 1000 },
  { name: "Central Brooklyn", lat: 40.678, lng: -73.935, radius: 1200 },
  { name: "Far Rockaway", lat: 40.600, lng: -73.750, radius: 1000 },
  { name: "Hunts Point", lat: 40.812, lng: -73.880, radius: 800 },
  { name: "Brownsville", lat: 40.662, lng: -73.905, radius: 1000 },
  { name: "East New York", lat: 40.666, lng: -73.882, radius: 1200 },
  { name: "Mott Haven", lat: 40.808, lng: -73.922, radius: 800 },
];

interface FlyerPost {
  id: string;
  latitude: number;
  longitude: number;
  notes?: string | null;
  created_at?: string | null;
}

interface EventLocation {
  id: string;
  title: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  status: string | null;
  date: string;
}

interface AdminOperationsMapProps {
  flyerPosts: FlyerPost[];
  events: EventLocation[];
}

export default function AdminOperationsMap({ flyerPosts, events }: AdminOperationsMapProps) {
  const nycCenter: [number, number] = [40.745, -73.940];
  const eventsWithCoords = events.filter((e) => e.latitude && e.longitude);

  return (
    <div className="w-full rounded-sm overflow-hidden tactical-border" style={{ height: 500 }}>
      <MapContainer
        center={nycCenter}
        zoom={11}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Food shortage zones */}
        <LayerGroup>
          {foodShortageZones.map((zone) => (
            <Circle
              key={zone.name}
              center={[zone.lat, zone.lng]}
              radius={zone.radius}
              pathOptions={{
                color: "hsl(0, 72%, 51%)",
                fillColor: "hsl(0, 72%, 51%)",
                fillOpacity: 0.12,
                weight: 1,
                dashArray: "6 4",
              }}
            >
              <Popup>
                <div className="text-xs">
                  <strong className="text-red-600">⚠ Food Shortage Zone</strong>
                  <p>{zone.name}</p>
                </div>
              </Popup>
            </Circle>
          ))}
        </LayerGroup>

        {/* Pantries */}
        <LayerGroup>
          {lemontreePantries.map((pantry) => (
            <Marker key={pantry.id} position={[pantry.lat, pantry.lng]} icon={pantryIcon}>
              <Popup>
                <div className="text-xs max-w-[200px]">
                  <strong className="text-green-700">{pantry.name}</strong>
                  <p className="text-gray-600">{pantry.address}</p>
                  <p className="mt-1">{pantry.offerings.join(", ")}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </LayerGroup>

        {/* Events */}
        <LayerGroup>
          {eventsWithCoords.map((event) => (
            <Marker
              key={event.id}
              position={[event.latitude!, event.longitude!]}
              icon={eventIcon}
            >
              <Popup>
                <div className="text-xs max-w-[200px]">
                  <strong className="text-blue-600">{event.title}</strong>
                  <p className="text-gray-600">{event.location}</p>
                  <p className="mt-1">
                    {event.date} · <span className="uppercase">{event.status}</span>
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </LayerGroup>

        {/* Flyer posts */}
        <LayerGroup>
          {flyerPosts.map((post) => (
            <Marker key={post.id} position={[post.latitude, post.longitude]} icon={flyerIcon}>
              <Popup>
                <div className="text-xs">
                  <strong className="text-amber-600">📄 Flyer Posted</strong>
                  {post.notes && <p>{post.notes}</p>}
                  {post.created_at && (
                    <p className="text-gray-500">{new Date(post.created_at).toLocaleDateString()}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </LayerGroup>
      </MapContainer>
    </div>
  );
}
