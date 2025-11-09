import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Intersection {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  current_signal: 'north' | 'south' | 'east' | 'west';
  signal_timer: number;
  created_at: string;
  updated_at: string;
}

export interface TrafficDensity {
  id: string;
  intersection_id: string;
  direction: 'north' | 'south' | 'east' | 'west';
  vehicle_count: number;
  timestamp: string;
}

export interface Ambulance {
  id: string;
  vehicle_number: string;
  current_location: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
  status: 'active' | 'inactive' | 'arrived';
  priority_route: string[];
  created_at: string;
  updated_at: string;
}

export interface SignalLog {
  id: string;
  intersection_id: string;
  direction: string;
  duration: number;
  reason: string;
  timestamp: string;
}

export interface SystemMetric {
  id: string;
  metric_type: string;
  value: number;
  unit: string;
  timestamp: string;
}
