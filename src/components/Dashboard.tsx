import { Clock, AlertTriangle, Activity, TrendingDown, Ambulance as AmbulanceIcon } from 'lucide-react';
import { Ambulance } from '../lib/supabase';

interface Props {
  ambulances: Ambulance[];
  onDeactivateAmbulance: (id: string) => void;
}

export function Dashboard({ ambulances, onDeactivateAmbulance }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">System Dashboard</h2>
      <div className="grid grid-cols-2 gap-4">
        <Metric icon={<Clock />} label="Avg Wait Time" value="25s" />
        <Metric icon={<AlertTriangle />} label="Active Emergencies" value={ambulances.length.toString()} />
        <Metric icon={<Activity />} label="Signal Changes" value="120" />
        <Metric icon={<TrendingDown />} label="Efficiency" value="93%" />
      </div>

      {ambulances.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
            <AmbulanceIcon className="text-red-600" /> Active Ambulances
          </h3>
          {ambulances.map(a => (
            <div key={a.id} className="flex justify-between items-center bg-red-50 p-3 rounded-lg mt-2">
              <div>
                <div className="font-semibold">{a.vehicle_number}</div>
                <div className="text-sm text-gray-500">Dir: {a.direction}</div>
              </div>
              <button
                onClick={() => onDeactivateAmbulance(a.id)}
                className="bg-gray-700 text-white px-3 py-1 rounded">
                Mark Arrived
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-gray-50 p-4 rounded-xl text-center">
      <div className="text-gray-700 font-medium">{label}</div>
      <div className="text-2xl font-bold text-gray-800 mt-1">{value}</div>
    </div>
  );
}
