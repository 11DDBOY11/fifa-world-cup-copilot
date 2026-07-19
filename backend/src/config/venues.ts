export interface Venue {
  id: string;
  name: string;
  city: string;
  country: 'USA' | 'Canada' | 'Mexico' | 'India';
  lat: number;
  lng: number;
  default_language: string;
  unit_system: 'imperial' | 'metric';
  gates: string[];
}

export const venues: Venue[] = [
  {
    id: 'metlife',
    name: 'MetLife Stadium',
    city: 'East Rutherford,NJ,US',
    country: 'USA',
    lat: 40.8135,
    lng: -74.0744,
    default_language: 'en',
    unit_system: 'imperial',
    gates: ['gate-a', 'gate-b', 'gate-c', 'gate-d'],
  },
  {
    id: 'azteca',
    name: 'Estadio Azteca',
    city: 'Mexico City',
    country: 'Mexico',
    lat: 19.3029,
    lng: -99.1505,
    default_language: 'es',
    unit_system: 'metric',
    gates: ['gate-1', 'gate-2', 'gate-3', 'gate-4'],
  },
  {
    id: 'bc-place',
    name: 'BC Place',
    city: 'Vancouver,BC,CA',
    country: 'Canada',
    lat: 49.2768,
    lng: -123.112,
    default_language: 'en',
    unit_system: 'metric',
    gates: ['gate-a', 'gate-b', 'gate-c', 'gate-d'],
  },
  {
    id: 'kanteerav',
    name: 'Sree Kanteerava Stadium',
    city: 'Bangalore',
    country: 'India',
    lat: 12.9784,
    lng: 77.5745,
    default_language: 'en',
    unit_system: 'metric',
    gates: ['gate-a', 'gate-b', 'gate-c', 'gate-d'],
  },
];
