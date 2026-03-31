export interface SeedFacility {
  id: string;
  facilityName: string;
  address: string;
  latitude: number;
  longitude: number;
  totalSpaces: number;
  availableSpaces: number;
  pricePerHour: number;
  status: string;
}

export const seedFacilities: SeedFacility[] = [
  {
    id: 'bole-medhanialem',
    facilityName: 'Bole Medhanialem Parking',
    address: 'Bole Road, Near Medhanialem Mall',
    latitude: 8.9948,
    longitude: 38.7885,
    totalSpaces: 150,
    availableSpaces: 45,
    pricePerHour: 15,
    status: 'Verified',
  },
  {
    id: 'piazza-central',
    facilityName: 'Piazza Central Lot',
    address: 'Arada, Near Piazza Church',
    latitude: 9.0358,
    longitude: 38.7524,
    totalSpaces: 80,
    availableSpaces: 12,
    pricePerHour: 20,
    status: 'Verified',
  },
  {
    id: 'mexico-square',
    facilityName: 'Mexico Square Garage',
    address: 'Lideta, Near Mexico Square',
    latitude: 9.0105,
    longitude: 38.7445,
    totalSpaces: 200,
    availableSpaces: 85,
    pricePerHour: 10,
    status: 'Verified',
  },
  {
    id: 'megenagna-hub',
    facilityName: 'Megenagna Hub Parking',
    address: 'Yeka, Near Megenagna Roundabout',
    latitude: 9.0195,
    longitude: 38.8015,
    totalSpaces: 120,
    availableSpaces: 0,
    pricePerHour: 12,
    status: 'Full',
  },
  {
    id: 'kazanchis-business',
    facilityName: 'Kazanchis Business Lot',
    address: 'Kirkos, Near UNECA',
    latitude: 9.0185,
    longitude: 38.7655,
    totalSpaces: 100,
    availableSpaces: 35,
    pricePerHour: 18,
    status: 'Verified',
  },
  {
    id: 'sarbet-shopping',
    facilityName: 'Sarbet Shopping Center',
    address: 'Lideta, Near African Union',
    latitude: 8.9955,
    longitude: 38.7355,
    totalSpaces: 60,
    availableSpaces: 22,
    pricePerHour: 15,
    status: 'Verified',
  },
  {
    id: 'cmc-residential',
    facilityName: 'CMC Residential Parking',
    address: 'Yeka, CMC Area',
    latitude: 9.0255,
    longitude: 38.8555,
    totalSpaces: 300,
    availableSpaces: 150,
    pricePerHour: 8,
    status: 'Verified',
  },
  {
    id: 'stadium-public',
    facilityName: 'Stadium Public Lot',
    address: 'Kirkos, Near Addis Ababa Stadium',
    latitude: 9.0155,
    longitude: 38.7555,
    totalSpaces: 400,
    availableSpaces: 10,
    pricePerHour: 5,
    status: 'Verified',
  },
];
