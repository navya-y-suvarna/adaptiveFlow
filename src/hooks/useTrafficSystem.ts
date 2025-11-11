import { useState, useEffect } from 'react';
import { supabase, Intersection, Direction, Ambulance } from '../lib/supabase';

export function useTrafficSystem() {
  const [intersection, setIntersection] = useState<Intersection | null>(null);
  const [trafficDensity, setTrafficDensity] = useState<Record<Direction, number>>({
    north: 10,
    south: 10,
    east: 10,
    west: 10,
  });
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Initial data load
  useEffect(() => {
    loadIntersection();
    loadAmbulances();

    const ambulanceChannel = supabase
      .channel('public:ambulances')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ambulances' },
        loadAmbulances
      )
      .subscribe();

    return () => {
      // remove the realtime channel on cleanup; ignore any errors to keep cleanup synchronous
      supabase.removeChannel(ambulanceChannel).catch(() => { });
    };
  }, []);

  // Main simulation loop
  useEffect(() => {
    if (!isRunning || !intersection) return;

    const interval = setInterval(async () => {
      setIntersection(prev => {
        if (!prev) return prev;

        if (prev.signal_timer > 0) {
          const newTimer = prev.signal_timer - 1;
          supabase.from('intersections')
            .update({ signal_timer: newTimer })
            .eq('id', prev.id);
          return { ...prev, signal_timer: newTimer };
        } else {
          handleSignalSwitch(prev);
          return prev;
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, ambulances, trafficDensity]);

  // Fetch intersection
  const loadIntersection = async () => {
    const { data } = await supabase.from('intersections').select('*').limit(1).single();
    if (data) setIntersection(data);
  };

  // Fetch active ambulances
  const loadAmbulances = async () => {
    const { data } = await supabase
      .from('ambulances')
      .select('*')
      .eq('status', 'active');
    if (data) setAmbulances(data);
  };

  // Decide which signal turns green
  const handleSignalSwitch = async (prev: Intersection) => {
    const activeAmb = ambulances.find(a => a.status === 'active');

    let nextSignal: Direction;
    let duration: number;
    let reason: string;

    if (activeAmb && activeAmb.direction) {
      nextSignal = activeAmb.direction;
      duration = 15;
      reason = 'ambulance_override';
    } else {
      const highest = getHighestDensityDirection();
      nextSignal = highest.direction;
      duration = calculateDuration(highest.density);
      reason = 'density_based';
    }

    await supabase.from('intersections')
      .update({
        current_signal: nextSignal,
        signal_timer: duration,
        updated_at: new Date().toISOString(),
      })
      .eq('id', prev.id);

    await supabase.from('signal_logs')
      .insert({
        intersection_id: prev.id,
        direction: nextSignal,
        duration,
        reason,
      });

    setIntersection({
      ...prev,
      current_signal: nextSignal,
      signal_timer: duration,
    });
  };

  // Utility functions
  const getHighestDensityDirection = () => {
    let maxDir: Direction = 'north';
    let maxVal = 0;
    for (const dir of Object.keys(trafficDensity) as Direction[]) {
      if (trafficDensity[dir] > maxVal) {
        maxVal = trafficDensity[dir];
        maxDir = dir;
      }
    }
    return { direction: maxDir, density: maxVal };
  };

  const calculateDuration = (density: number) =>
    Math.max(10, Math.min(45, Math.round(density * 2)));

  const updateTrafficDensity = (direction: Direction, count: number) => {
    setTrafficDensity(prev => ({ ...prev, [direction]: count }));
    if (intersection) {
      supabase.from('traffic_density').insert({
        intersection_id: intersection.id,
        direction,
        vehicle_count: count,
      });
    }
  };

  const addAmbulance = async (vehicleNumber: string, direction: Direction) => {
    if (!vehicleNumber.trim()) return;

    const { data, error } = await supabase
      .from('ambulances')
      .insert({
        vehicle_number: vehicleNumber,
        direction, // ✅ add direction here
        status: 'active',
        current_location: { lat: 12.9141, lng: 74.8560 },
        destination: { lat: 12.917, lng: 74.858 },
      })
      .select()
      .single();

    if (!error && data) {
      // ✅ instantly update the UI
      setAmbulances(prev => [...prev, { ...data, direction }]);
    } else {
      console.error('Ambulance insertion failed:', error?.message);
    }
  };


  const deactivateAmbulance = async (id: string) => {
    await supabase.from('ambulances').update({ status: 'arrived' }).eq('id', id);
    loadAmbulances();
  };

  const toggleSimulation = () => setIsRunning(prev => !prev);

  return {
    intersection,
    trafficDensity,
    ambulances,
    isRunning,
    updateTrafficDensity,
    addAmbulance,
    deactivateAmbulance,
    toggleSimulation,
  };
}
