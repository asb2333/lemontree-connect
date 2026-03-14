export interface PantrySchedule {
  day: string;
  time: string;
}

export interface Pantry {
  id: string;
  name: string;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  offerings: string[];
  schedule: PantrySchedule[];
}

export const lemontreePantries: Pantry[] = [
  {
    id: "p1",
    name: "Lemontree Pantry – Washington Heights",
    address: "181st St & Fort Washington Ave",
    neighborhood: "Washington Heights",
    lat: 40.849,
    lng: -73.935,
    offerings: ["Free Groceries", "Fresh Produce"],
    schedule: [
      { day: "Tuesday", time: "10:00 AM – 1:00 PM" },
      { day: "Thursday", time: "2:00 PM – 5:00 PM" },
    ],
  },
  {
    id: "p2",
    name: "Lemontree Pantry – East Village",
    address: "14th St & Avenue B",
    neighborhood: "East Village",
    lat: 40.729,
    lng: -73.981,
    offerings: ["Free Meals", "Canned Goods"],
    schedule: [
      { day: "Monday", time: "11:00 AM – 2:00 PM" },
      { day: "Friday", time: "9:00 AM – 12:00 PM" },
    ],
  },
  {
    id: "p3",
    name: "Lemontree Pantry – Sunset Park",
    address: "4th Ave & 44th St",
    neighborhood: "Sunset Park",
    lat: 40.647,
    lng: -74.008,
    offerings: ["Free Groceries", "Halal Options"],
    schedule: [
      { day: "Wednesday", time: "10:00 AM – 1:00 PM" },
      { day: "Saturday", time: "9:00 AM – 12:00 PM" },
    ],
  },
  {
    id: "p4",
    name: "Lemontree Pantry – Jackson Heights",
    address: "Roosevelt Ave & 74th St",
    neighborhood: "Jackson Heights",
    lat: 40.747,
    lng: -73.891,
    offerings: ["Free Groceries", "Baby Formula", "Diapers"],
    schedule: [
      { day: "Tuesday", time: "9:00 AM – 12:00 PM" },
      { day: "Saturday", time: "10:00 AM – 1:00 PM" },
    ],
  },
  {
    id: "p5",
    name: "Lemontree Pantry – Harlem",
    address: "125th St & Lenox Ave",
    neighborhood: "Harlem",
    lat: 40.809,
    lng: -73.940,
    offerings: ["Free Meals", "Fresh Produce", "Bread"],
    schedule: [
      { day: "Monday", time: "10:00 AM – 1:00 PM" },
      { day: "Wednesday", time: "3:00 PM – 6:00 PM" },
      { day: "Friday", time: "10:00 AM – 1:00 PM" },
    ],
  },
  {
    id: "p6",
    name: "Lemontree Pantry – Bushwick",
    address: "Knickerbocker Ave & Myrtle Ave",
    neighborhood: "Bushwick",
    lat: 40.694,
    lng: -73.918,
    offerings: ["Free Groceries", "Kosher Options"],
    schedule: [
      { day: "Thursday", time: "11:00 AM – 2:00 PM" },
      { day: "Saturday", time: "9:00 AM – 11:00 AM" },
    ],
  },
  {
    id: "p7",
    name: "Lemontree Pantry – South Bronx",
    address: "149th St & Grand Concourse",
    neighborhood: "South Bronx",
    lat: 40.820,
    lng: -73.923,
    offerings: ["Free Meals", "Groceries", "Clothing"],
    schedule: [
      { day: "Monday", time: "9:00 AM – 12:00 PM" },
      { day: "Wednesday", time: "9:00 AM – 12:00 PM" },
      { day: "Friday", time: "1:00 PM – 4:00 PM" },
    ],
  },
  {
    id: "p8",
    name: "Lemontree Pantry – Astoria",
    address: "Broadway & 31st St",
    neighborhood: "Astoria",
    lat: 40.762,
    lng: -73.921,
    offerings: ["Free Groceries", "Fresh Produce"],
    schedule: [
      { day: "Tuesday", time: "10:00 AM – 1:00 PM" },
      { day: "Thursday", time: "3:00 PM – 6:00 PM" },
    ],
  },
];
