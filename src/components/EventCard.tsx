import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export interface EventCardData {
  id: string;
  title: string;
  location: string;
  neighborhood: string | null;
  date: string;
  time: string;
  flyers_needed: number | null;
  flyers_posted: number | null;
  language: string | null;
  status: string | null;
  volunteer_count?: number;
}

const statusColors: Record<string, string> = {
  active: "bg-primary text-primary-foreground",
  upcoming: "bg-accent text-accent-foreground",
  completed: "bg-success text-success-foreground",
};

export default function EventCard({ event, index }: { event: EventCardData; index: number }) {
  const flyersPosted = event.flyers_posted ?? 0;
  const status = event.status ?? "upcoming";

  return (
    <motion.div
      initial={{ opacity: 0.1, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 30 }}
    >
      <Link to={`/event/${event.id}`} className="block">
        <div className="bg-card tactical-border tear-off p-4 hover:bg-secondary/50 transition-colors group">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-label px-1.5 py-0.5 rounded-sm ${statusColors[status] || statusColors.upcoming}`}>
                  {status.toUpperCase()}
                </span>
                <span className="text-label">{event.language ?? "English"}</span>
              </div>
              <h3 className="font-display font-bold text-lg leading-tight group-hover:text-accent transition-colors">
                {event.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="font-mono-tight">{event.neighborhood ?? ""}</span>
            <span className="tactical-border px-2 py-0.5 rounded-sm text-label">
              {flyersPosted} FLYERS POSTED
            </span>
            {event.volunteer_count !== undefined && (
              <span className="text-label">
                {event.volunteer_count} VOLUNTEERS
              </span>
            )}
            <span className="ml-auto text-label">{event.date}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
