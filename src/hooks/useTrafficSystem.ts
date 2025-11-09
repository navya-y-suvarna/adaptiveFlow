import { useState, useEffect, useCallback } from 'react';
import { supabase, Intersection, TrafficDensity, Ambulance } from '../lib/supabase';

const DIRECTIONS = ['north', 'south', 'east', 'west'] as const;
type Direction = typeof DIRECTIONS[number];

interface TrafficState {
  [key: string]: number;
}

interface AmbulanceWithDirection extends Ambulance {
  direction?: Direction;
}

export function useTrafficSystem() {
  const [intersection, setIntersection] = useState<Intersection | null>(null);
  const [trafficDensity, setTrafficDensity] = useState<TrafficState>({
    north: 0,
    south: 0,
    east: 0,
    west: 0,
  });
  const [ambulances, setAmbulances] = useState<AmbulanceWithDirection[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    loadIntersection();
    loadAmbulances();

    const ambulanceSubscription = supabase
      .channel('ambulance_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'ambulances' },
        () => loadAmbulances()
      )
      .subscribe();

    return () => {
      ambulanceSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isRunning || !intersection) return;

    const interval = setInterval(async () => {
      const currentTimer = intersection.signal_timer || 0;

      if (currentTimer > 0) {
        const newTimer = currentTimer - 1;
        await supabase
          .from('intersections')
          .update({ signal_timer: newTimer })
          .eq('id', intersection.id);

        setIntersection(prev => prev ? { ...prev, signal_timer: newTimer } : null);
      } else {
        const activeAmbulances = ambulances.filter(a => a.status === 'active');

        let nextSignal: Direction;
        let duration: number;
        let reason: string;

        if (activeAmbulances.length > 0 && activeAmbulances[0].direction) {
          nextSignal = activeAmbulances[0].direction;
          duration = 15;
          reason = 'ambulance_override';
        } else {
          const highestDensityDirection = getHighestDensityDirection();
          nextSignal = highestDensityDirection.direction;
          duration = calculateDuration(highestDensityDirection.density);
          reason = highestDensityDirection.density > 15 ? 'high_density' : 'normal';
        }

        await supabase
          .from('intersections')
          .update({
            current_signal: nextSignal,
            signal_timer: duration,
            updated_at: new Date().toISOString(),
          })
          .eq('id', intersection.id);

        await supabase
          .from('signal_logs')
          .insert({
            intersection_id: intersection.id,
            direction: nextSignal,
            duration,
            reason,
          });

        setIntersection(prev => prev ? {
          ...prev,
          current_signal: nextSignal,
          signal_timer: duration,
        } : null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, intersection, trafficDensity, ambulances]);

  const loadIntersection = async () => {
    const { data } = await supabase
      .from('intersections')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (data) setIntersection(data);
  };

  const loadAmbulances = async () => {
    const { data } = await supabase
      .from('ambulances')
      .select('*')
      .eq('status', 'active');

    if (data) setAmbulances(data);
  };

  const getHighestDensityDirection = (): { direction: Direction; density: number } => {
    let maxDensity = 0;
    let maxDirection: Direction = 'north';

    DIRECTIONS.forEach(direction => {
      const density = trafficDensity[direction] || 0;
      if (density > maxDensity) {
        maxDensity = density;
        maxDirection = direction;
      }
    });

    return { direction: maxDirection, density: maxDensity };
  };

  const calculateDuration = (density: number): number => {
    if (density > 20) return 45;
    if (density > 15) return 35;
    if (density > 10) return 30;
    if (density > 5) return 25;
    return 20;
  };

  const updateTrafficDensity = useCallback((direction: Direction, count: number) => {
    setTrafficDensity(prev => ({ ...prev, [direction]: count }));

    if (intersection) {
      supabase
        .from('traffic_density')
        .insert({
          intersection_id: intersection.id,
          direction,
          vehicle_count: count,
        });
    }
  }, [intersection]);

  const addAmbulance = async (vehicleNumber: string, direction: Direction) => {
    const { data, error } = await supabase
      .from('ambulances')
      .insert({
        vehicle_number: vehicleNumber,
        status: 'active',
        current_location: { lat: 12.9141 + Math.random() * 0.01, lng: 74.8560 + Math.random() * 0.01 },
        destination: { lat: 12.9141 + Math.random() * 0.01, lng: 74.8560 + Math.random() * 0.01 },
      })
      .select()
      .single();

    if (!error && data) {
      setAmbulances(prev => [...prev.filter(a => a.status === 'active'), { ...data, direction }]);

      await supabase
        .from('system_metrics')
        .insert({
          metric_type: 'ambulance_response',
          value: 0,
          unit: 'seconds',
        });
    }

    return { data, error };
  };

  const deactivateAmbulance = async (id: string) => {
    await supabase
      .from('ambulances')
      .update({ status: 'arrived' })
      .eq('id', id);
  };

  const toggleSimulation = () => {
    setIsRunning(prev => !prev);
  };

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
