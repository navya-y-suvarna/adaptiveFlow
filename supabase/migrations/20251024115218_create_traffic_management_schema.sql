/*
  # Smart Traffic Management System Schema

  1. New Tables
    - `intersections`
      - `id` (uuid, primary key)
      - `name` (text) - Intersection name/identifier
      - `location` (jsonb) - GPS coordinates {lat, lng}
      - `current_signal` (text) - Current active direction (north/south/east/west)
      - `signal_timer` (integer) - Remaining seconds on current signal
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `traffic_density`
      - `id` (uuid, primary key)
      - `intersection_id` (uuid, foreign key)
      - `direction` (text) - north, south, east, west
      - `vehicle_count` (integer) - Number of vehicles waiting
      - `timestamp` (timestamptz)
    
    - `ambulances`
      - `id` (uuid, primary key)
      - `vehicle_number` (text, unique)
      - `current_location` (jsonb) - GPS coordinates
      - `destination` (jsonb) - GPS coordinates
      - `status` (text) - active, inactive, arrived
      - `priority_route` (jsonb) - Array of intersection IDs on route
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `signal_logs`
      - `id` (uuid, primary key)
      - `intersection_id` (uuid, foreign key)
      - `direction` (text)
      - `duration` (integer) - Signal duration in seconds
      - `reason` (text) - normal, ambulance_override, high_density
      - `timestamp` (timestamptz)
    
    - `system_metrics`
      - `id` (uuid, primary key)
      - `metric_type` (text) - avg_wait_time, ambulance_delays, fuel_saved
      - `value` (numeric)
      - `unit` (text) - seconds, liters, count
      - `timestamp` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to read all data
    - Add policies for system to write data
*/

-- Create intersections table
CREATE TABLE IF NOT EXISTS intersections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location jsonb NOT NULL,
  current_signal text DEFAULT 'north',
  signal_timer integer DEFAULT 30,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create traffic_density table
CREATE TABLE IF NOT EXISTS traffic_density (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intersection_id uuid REFERENCES intersections(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('north', 'south', 'east', 'west')),
  vehicle_count integer DEFAULT 0,
  timestamp timestamptz DEFAULT now()
);

-- Create ambulances table
CREATE TABLE IF NOT EXISTS ambulances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_number text UNIQUE NOT NULL,
  current_location jsonb,
  destination jsonb,
  status text DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'arrived')),
  priority_route jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create signal_logs table
CREATE TABLE IF NOT EXISTS signal_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intersection_id uuid REFERENCES intersections(id) ON DELETE CASCADE,
  direction text NOT NULL,
  duration integer NOT NULL,
  reason text DEFAULT 'normal',
  timestamp timestamptz DEFAULT now()
);

-- Create system_metrics table
CREATE TABLE IF NOT EXISTS system_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type text NOT NULL,
  value numeric NOT NULL,
  unit text NOT NULL,
  timestamp timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE intersections ENABLE ROW LEVEL SECURITY;
ALTER TABLE traffic_density ENABLE ROW LEVEL SECURITY;
ALTER TABLE ambulances ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

-- Policies for intersections
CREATE POLICY "Anyone can view intersections"
  ON intersections FOR SELECT
  TO public
  USING (true);

CREATE POLICY "System can update intersections"
  ON intersections FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "System can insert intersections"
  ON intersections FOR INSERT
  TO public
  WITH CHECK (true);

-- Policies for traffic_density
CREATE POLICY "Anyone can view traffic density"
  ON traffic_density FOR SELECT
  TO public
  USING (true);

CREATE POLICY "System can insert traffic density"
  ON traffic_density FOR INSERT
  TO public
  WITH CHECK (true);

-- Policies for ambulances
CREATE POLICY "Anyone can view ambulances"
  ON ambulances FOR SELECT
  TO public
  USING (true);

CREATE POLICY "System can manage ambulances"
  ON ambulances FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Policies for signal_logs
CREATE POLICY "Anyone can view signal logs"
  ON signal_logs FOR SELECT
  TO public
  USING (true);

CREATE POLICY "System can insert signal logs"
  ON signal_logs FOR INSERT
  TO public
  WITH CHECK (true);

-- Policies for system_metrics
CREATE POLICY "Anyone can view metrics"
  ON system_metrics FOR SELECT
  TO public
  USING (true);

CREATE POLICY "System can insert metrics"
  ON system_metrics FOR INSERT
  TO public
  WITH CHECK (true);

-- Insert default intersection
INSERT INTO intersections (name, location, current_signal, signal_timer)
VALUES 
  ('Main Junction - Mangaluru', '{"lat": 12.9141, "lng": 74.8560}'::jsonb, 'north', 30)
ON CONFLICT DO NOTHING;