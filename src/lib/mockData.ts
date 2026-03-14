export interface Event {
  id: string;
  title: string;
  location: string;
  neighborhood: string;
  date: string;
  time: string;
  flyersNeeded: number;
  flyersPosted: number;
  volunteersActive: number;
  volunteersTotal: number;
  language: string;
  status: "active" | "upcoming" | "completed";
  coordinates: { lat: number; lng: number };
}

export interface Volunteer {
  id: string;
  name: string;
  points: number;
  streak: number;
  flyersPosted: number;
  league: "bronze" | "silver" | "gold" | "diamond";
  avatar: string;
}

export const mockEvents: Event[] = [
  {
    id: "evt-001",
    title: "Free Food Near Washington Heights",
    location: "181st St & Fort Washington Ave",
    neighborhood: "Washington Heights",
    date: "2026-03-18",
    time: "9:00 AM - 12:00 PM",
    flyersNeeded: 40,
    flyersPosted: 12,
    volunteersActive: 3,
    volunteersTotal: 8,
    language: "English / Spanish",
    status: "active",
    coordinates: { lat: 40.849, lng: -73.935 },
  },
  {
    id: "evt-002",
    title: "Free Groceries - East Village",
    location: "14th St & Avenue B",
    neighborhood: "East Village",
    date: "2026-03-20",
    time: "10:00 AM - 2:00 PM",
    flyersNeeded: 30,
    flyersPosted: 2,
    volunteersActive: 1,
    volunteersTotal: 5,
    language: "English",
    status: "active",
    coordinates: { lat: 40.729, lng: -73.981 },
  },
  {
    id: "evt-003",
    title: "Community Meals - Sunset Park",
    location: "4th Ave & 44th St",
    neighborhood: "Sunset Park",
    date: "2026-03-22",
    time: "11:00 AM - 3:00 PM",
    flyersNeeded: 50,
    flyersPosted: 0,
    volunteersActive: 0,
    volunteersTotal: 3,
    language: "English / Chinese",
    status: "upcoming",
    coordinates: { lat: 40.647, lng: -74.008 },
  },
  {
    id: "evt-004",
    title: "Free Pantry - Jackson Heights",
    location: "Roosevelt Ave & 74th St",
    neighborhood: "Jackson Heights",
    date: "2026-03-15",
    time: "8:00 AM - 11:00 AM",
    flyersNeeded: 35,
    flyersPosted: 35,
    volunteersActive: 0,
    volunteersTotal: 12,
    language: "English / Spanish / Bengali",
    status: "completed",
    coordinates: { lat: 40.747, lng: -73.891 },
  },
];

export const mockVolunteers: Volunteer[] = [
  { id: "v1", name: "Maria S.", points: 2840, streak: 14, flyersPosted: 142, league: "diamond", avatar: "MS" },
  { id: "v2", name: "James K.", points: 1920, streak: 8, flyersPosted: 96, league: "gold", avatar: "JK" },
  { id: "v3", name: "Priya D.", points: 1650, streak: 11, flyersPosted: 83, league: "gold", avatar: "PD" },
  { id: "v4", name: "Carlos R.", points: 1200, streak: 5, flyersPosted: 60, league: "silver", avatar: "CR" },
  { id: "v5", name: "Aisha M.", points: 980, streak: 3, flyersPosted: 49, league: "silver", avatar: "AM" },
  { id: "v6", name: "David L.", points: 740, streak: 7, flyersPosted: 37, league: "bronze", avatar: "DL" },
  { id: "v7", name: "Sarah W.", points: 520, streak: 2, flyersPosted: 26, league: "bronze", avatar: "SW" },
  { id: "v8", name: "Tom H.", points: 380, streak: 1, flyersPosted: 19, league: "bronze", avatar: "TH" },
];
