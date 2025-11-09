import { useEffect, useState } from 'react';
import { Activity, Clock, AlertTriangle, TrendingDown, Ambulance as AmbulanceIcon } from 'lucide-react';
import { supabase, Ambulance } from '../lib/supabase';

interface AmbulanceWithDirection extends Ambulance {
  direction?: 'north' | 'south' | 'east' | 'west';
}

interface DashboardProps {
  ambulances: AmbulanceWithDirection[];
  onDeactivateAmbulance: (id: string) => void;
}

export function Dashboard({ ambulances, onDeactivateAmbulance }: DashboardProps) {
  const [metrics, setMetrics] = useState({
    avgWaitTime: 0,
    activeAmbulances: 0,
    signalChanges: 0,
    efficiency: 0,
  });

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 5000);
    return () => clearInterval(interval);
  }, [ambulances]);

  const loadMetrics = async () => {
    const { data: logs } = await supabase
      .from('signal_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50);

    if (logs) {
      const avgDuration = logs.reduce((sum, log) => sum + log.duration, 0) / logs.length || 0;
      const ambulanceOverrides = logs.filter(log => log.reason === 'ambulance_override').length;
      const efficiency = Math.round(((logs.length - ambulanceOverrides) / logs.length) * 100) || 0;

      setMetrics({
        avgWaitTime: Math.round(avgDuration),
        activeAmbulances: ambulances.length,
        signalChanges: logs.length,
        efficiency,
      });
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">System Dashboard</h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-6 h-6 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Avg Wait Time</span>
          </div>
          <div className="text-3xl font-bold text-blue-700">{metrics.avgWaitTime}s</div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <span className="text-sm font-medium text-red-900">Active Emergencies</span>
          </div>
          <div className="text-3xl font-bold text-red-700">{metrics.activeAmbulances}</div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-6 h-6 text-green-600" />
            <span className="text-sm font-medium text-green-900">Signal Changes</span>
          </div>
          <div className="text-3xl font-bold text-green-700">{metrics.signalChanges}</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="w-6 h-6 text-purple-600" />
            <span className="text-sm font-medium text-purple-900">Efficiency</span>
          </div>
          <div className="text-3xl font-bold text-purple-700">{metrics.efficiency}%</div>
        </div>
      </div>

      {ambulances.length > 0 && (
        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <AmbulanceIcon className="w-5 h-5 text-red-600" />
            Active Ambulances
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {ambulances.map(ambulance => (
              <div
                key={ambulance.id}
                className="flex items-center justify-between p-3 bg-red-50 rounded-lg border-l-4 border-red-600"
              >
                <div>
                  <div className="font-semibold text-gray-800">{ambulance.vehicle_number}</div>
                  <div className="text-xs text-gray-600">
                    Direction: <span className="font-medium uppercase">{ambulance.direction || 'N/A'}</span>
                  </div>
                </div>
                <button
                  onClick={() => onDeactivateAmbulance(ambulance.id)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
                >
                  Mark Arrived
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-600 mb-2">Project Information</h3>
        <div className="text-xs text-gray-500 space-y-1">
          <p><span className="font-medium">Location:</span> Main Junction, Mangaluru</p>
          <p><span className="font-medium">System:</span> GPS-Enabled Dynamic Traffic Management</p>
          <p><span className="font-medium">Features:</span> Adaptive signals, Emergency override, Real-time monitoring</p>
        </div>
      </div>
    </div>
  );
}
