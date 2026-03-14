import { useParams, Link, useSearchParams } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import EventMap from "@/components/EventMap";
import FlyerPreview from "@/components/FlyerPreview";
import { lemontreePantries } from "@/lib/pantries";
import html2canvas from "html2canvas";
import exifr from "exifr";

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function EventDetail() {
  const { id } = useParams();
  const [joined, setJoined] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showFlyer, setShowFlyer] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const flyerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [searchParams] = useSearchParams();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id || null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user.id || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Track QR scan referral
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (!ref || !id) return;
    // Don't track if the scanner is the same as the referrer
    if (ref === userId) return;
    // Use sessionStorage to avoid duplicate scans per session
    const scanKey = `scanned-${id}-${ref}`;
    if (sessionStorage.getItem(scanKey)) return;
    sessionStorage.setItem(scanKey, "1");

    const hashIp = async () => {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(navigator.userAgent + new Date().toDateString());
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
      } catch { return null; }
    };

    hashIp().then((ipHash) => {
      supabase.from("qr_scans").insert({
        event_id: id,
        volunteer_id: ref,
        ip_hash: ipHash,
      }).then(() => {
        // Points are awarded automatically via database trigger
      });
    });
  }, [id, searchParams, userId]);

  const { data: event, isLoading } = useQuery({
    queryKey: ["event-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: flyerPosts } = useQuery({
    queryKey: ["flyer-posts", id],
    queryFn: async () => {
      const { data } = await supabase.from("flyer_posts").select("*").eq("event_id", id!);
      return data || [];
    },
    enabled: !!id,
  });

  const { data: volunteers } = useQuery({
    queryKey: ["event-volunteers", id],
    queryFn: async () => {
      const { data } = await supabase.from("event_volunteers").select("*").eq("event_id", id!);
      return data || [];
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (userId && id) {
      supabase
        .from("event_volunteers")
        .select("id")
        .eq("event_id", id)
        .eq("user_id", userId)
        .maybeSingle()
        .then(({ data }) => setJoined(!!data));
    }
  }, [userId, id]);

  const handlePostFlyer = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId || !id) return;

    setUploading(true);
    try {
      // Try to extract GPS from photo EXIF using exifr
      let gps: { lat: number; lng: number } | null = null;
      try {
        const exif = await exifr.gps(file);
        if (exif && exif.latitude && exif.longitude) {
          gps = { lat: exif.latitude, lng: exif.longitude };
        }
      } catch {
        // EXIF extraction failed, will fall back to geolocation
      }

      // Fallback to browser geolocation
      if (!gps) {
        try {
          const pos = await new Promise<GeolocationPosition>((res, rej) =>
            navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000 })
          );
          gps = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } catch {
          toast({ title: "Location needed", description: "Could not get location from photo or device. Please enable location services.", variant: "destructive" });
          setUploading(false);
          return;
        }
      }

      // Upload photo
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${id}/${userId}-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("flyer-photos").upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("flyer-photos").getPublicUrl(path);

      // Insert flyer post
      const { error: insertErr } = await supabase.from("flyer_posts").insert({
        event_id: id,
        user_id: userId,
        latitude: gps.lat,
        longitude: gps.lng,
        image_url: urlData.publicUrl,
        notes: "Photo posted",
      });
      if (insertErr) throw insertErr;

      toast({ title: "Flyer posted!", description: "Your flyer has been added to the map." });
      queryClient.invalidateQueries({ queryKey: ["flyer-posts", id] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-label">LOADING…</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-label">EVENT NOT FOUND</p>
      </div>
    );
  }

  const flyersPosted = (flyerPosts?.length || 0) + (event.flyers_posted ?? 0);
  const volunteerCount = volunteers?.length || 0;

  const shareUrl = `${window.location.origin}/event/${event.id}${userId ? `?ref=${userId}` : ""}`;
  const lat = event.latitude ?? 40.749;
  const lng = event.longitude ?? -73.935;

  const eventPantries = [...lemontreePantries]
    .map((p) => ({ ...p, dist: getDistance(lat, lng, p.lat, p.lng) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 4)
    .map(({ dist, ...p }) => p);

  const handleJoin = async () => {
    if (!userId) return;
    if (joined) {
      await supabase.from("event_volunteers").delete().eq("event_id", id!).eq("user_id", userId);
      setJoined(false);
    } else {
      await supabase.from("event_volunteers").insert({ event_id: id!, user_id: userId });
      setJoined(true);
    }
  };

  const handleDownloadFlyer = async () => {
    if (!flyerRef.current) return;
    const el = flyerRef.current;
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: -window.scrollY,
      width: el.scrollWidth,
      height: el.scrollHeight,
    });
    const link = document.createElement("a");
    link.download = `${event.title}-flyer.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="min-h-screen container px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <Link to="/" className="text-label text-accent hover:underline mb-3 inline-block">
          ← BACK TO EVENTS
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display font-black text-3xl md:text-4xl uppercase italic leading-tight">
              {event.title}
            </h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
              <span className="font-mono-tight">{event.location}</span>
              <span className="text-label">{event.time}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono-tight text-4xl font-bold text-primary">
              {flyersPosted}
            </span>
            <p className="text-label">FLYERS POSTED</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <div className="mb-3">
            <span className="text-label">FLYER DENSITY MAP</span>
          </div>
          <EventMap
            center={[lat, lng]}
            flyerPosts={flyerPosts || []}
            eventTitle={event.title}
            eventId={id}
          />
          <p className="text-label mt-3 text-center">
            {flyersPosted} FLYERS POSTED
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePostFlyer}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={!userId || uploading}
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 w-full py-4 bg-primary text-primary-foreground font-display font-black text-lg uppercase rounded-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center text-sm">📍</span>
            {uploading ? "UPLOADING..." : "POST A FLYER"}
          </motion.button>
          {!userId && (
            <p className="text-xs text-muted-foreground text-center mt-1 font-mono-tight">
              <Link to="/login" className="text-accent hover:underline">Sign in</Link> to post flyers
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {/* Download Flyer */}
          <div className="tactical-border rounded-sm bg-card p-4">
            <span className="text-label block mb-3">EVENT FLYER</span>
            <button
              onClick={() => setShowFlyer(!showFlyer)}
              className="w-full py-2.5 tactical-border font-display font-bold uppercase rounded-sm hover:bg-secondary transition-colors"
            >
              {showFlyer ? "HIDE FLYER" : "VIEW FLYER"}
            </button>
            <AnimatePresence>
              {showFlyer && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-3"
                >
                  <FlyerPreview
                    ref={flyerRef}
                    title={event.title}
                    language={event.language || "English"}
                    pantries={eventPantries}
                    qrValue={shareUrl}
                  />
                  <button
                    onClick={handleDownloadFlyer}
                    className="w-full mt-3 py-2.5 bg-primary text-primary-foreground font-display font-bold uppercase rounded-sm hover:opacity-90 transition-opacity"
                  >
                    ↓ DOWNLOAD FLYER
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Volunteer */}
          {userId !== event.created_by && (
            <div className="tactical-border rounded-sm bg-card p-4">
              <span className="text-label block mb-3">VOLUNTEER</span>
              {userId ? (
                <button
                  onClick={handleJoin}
                  className={`w-full py-2.5 font-display font-bold uppercase rounded-sm transition-all ${
                    joined
                      ? "bg-success text-success-foreground"
                      : "bg-foreground text-background hover:opacity-90"
                  }`}
                >
                  {joined ? "✓ YOU'RE IN" : "JOIN EVENT"}
                </button>
              ) : (
                <Link
                  to="/login"
                  className="block w-full py-2.5 text-center bg-foreground text-background font-display font-bold uppercase rounded-sm hover:opacity-90"
                >
                  SIGN IN TO JOIN
                </Link>
              )}
              <p className="font-mono-tight text-sm text-muted-foreground mt-2 text-center">
                {volunteerCount} volunteers
              </p>
            </div>
          )}
          {userId === event.created_by && (
            <div className="tactical-border rounded-sm bg-card p-4">
              <span className="text-label block mb-3">YOUR EVENT</span>
              <p className="font-mono-tight text-sm text-muted-foreground text-center">
                You created this event · {volunteerCount} volunteers
              </p>
            </div>
          )}

          {/* Share */}
          <div className="tactical-border rounded-sm bg-card p-4">
            <span className="text-label block mb-3">SHARE</span>
            <button
              onClick={() => setShowShare(!showShare)}
              className="w-full py-2.5 tactical-border font-display font-bold uppercase rounded-sm hover:bg-secondary transition-colors"
            >
              {showShare ? "HIDE" : "SHARE EVENT"}
            </button>
            <AnimatePresence>
              {showShare && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-3 overflow-hidden"
                >
                  <div className="flex justify-center mb-3">
                    <QRCodeSVG value={shareUrl} size={120} bgColor="transparent" fgColor="hsl(0,0%,4%)" />
                  </div>
                  <p className="text-label text-center mb-2">
                    {userId ? "YOUR UNIQUE REFERRAL LINK" : "SHARE LINK"}
                  </p>
                  <input
                    readOnly
                    value={shareUrl}
                    className="w-full px-2 py-1.5 bg-secondary font-mono-tight text-xs rounded-sm text-center"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Details */}
          <div className="tactical-border rounded-sm bg-card p-4 space-y-2">
            <span className="text-label block mb-1">DETAILS</span>
            <p className="text-sm"><span className="text-label inline-block w-20">LOCATION</span> {event.location}</p>
            <p className="text-sm"><span className="text-label inline-block w-20">SCHEDULE</span> {event.time}</p>
            <p className="text-sm"><span className="text-label inline-block w-20">LANGUAGE</span> {event.language}</p>
          </div>

          {/* Flyer Mission */}
          <div className="tactical-border rounded-sm bg-card p-4">
            <span className="text-label block mb-3">FLYER MISSION</span>
            <Link
              to={`/event/${id}/mission`}
              className="block w-full py-2.5 text-center bg-primary text-primary-foreground font-display font-bold uppercase rounded-sm hover:opacity-90 transition-opacity"
            >
              🧭 FIND HIGH-IMPACT ZONES
            </Link>
            <p className="font-mono-tight text-xs text-muted-foreground mt-2 text-center">
              AI identifies food desert areas where flyers have the most impact
            </p>
          </div>

          {/* Coordination */}
          <div className="tactical-border rounded-sm bg-card p-4">
            <span className="text-label block mb-3">COORDINATION</span>
            <Link
              to={`/event/${id}/chat`}
              className="block w-full py-2.5 text-center bg-accent text-accent-foreground font-display font-bold uppercase rounded-sm hover:opacity-90 transition-opacity"
            >
              OPEN GROUP CHAT
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
