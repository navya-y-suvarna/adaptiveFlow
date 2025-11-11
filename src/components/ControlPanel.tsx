import { useState } from 'react';
import { Play, Pause, Plus, Minus, Ambulance as AmbulanceIcon } from 'lucide-react';

interface Props {
  isRunning: boolean;
  onToggle: () => void;
  trafficDensity: Record<'north' | 'south' | 'east' | 'west', number>;
  onUpdateDensity: (dir: 'north' | 'south' | 'east' | 'west', val: number) => void;
  onAddAmbulance: (vehicle: string, dir: 'north' | 'south' | 'east' | 'west') => void;
}

export function ControlPanel({ isRunning, onToggle, trafficDensity, onUpdateDensity, onAddAmbulance }: Props) {
  const [showAmb, setShowAmb] = useState(false);
  const [vehicle, setVehicle] = useState('');
  const [dir, setDir] = useState<'north' | 'south' | 'east' | 'west'>('north');

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 space-y-6 text-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Control Panel</h2>
        <button
          onClick={onToggle}
          className={`px-6 py-3 rounded-lg font-semibold text-white ${
            isRunning ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {isRunning ? <Pause className="inline mr-2" /> : <Play className="inline mr-2" />}
          {isRunning ? 'Stop' : 'Start'}
        </button>
      </div>

      {/* Vehicle density controls */}
      {(['north', 'south', 'east', 'west'] as const).map(d => (
        <div key={d} className="flex items-center justify-between text-gray-700">
          <span className="capitalize w-20 font-medium">{d}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdateDensity(d, Math.max(0, trafficDensity[d] - 5))}
              className="p-2 bg-red-500 hover:bg-red-600 text-white rounded"
              disabled={!isRunning}
            >
              <Minus />
            </button>
            <input
              type="number"
              value={trafficDensity[d]}
              onChange={e => onUpdateDensity(d, Math.max(0, Math.min(30, Number(e.target.value))))}
              className="w-16 text-center border border-gray-400 rounded px-2 py-1 text-gray-800 bg-white font-semibold"
              min={0}
              max={30}
            />
            <button
              onClick={() => onUpdateDensity(d, Math.min(30, trafficDensity[d] + 5))}
              className="p-2 bg-green-500 hover:bg-green-600 text-white rounded"
              disabled={!isRunning}
            >
              <Plus />
            </button>
          </div>
        </div>
      ))}

      {/* Ambulance section */}
      {!showAmb ? (
        <button
          disabled={!isRunning}
          onClick={() => setShowAmb(true)}
          className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
        >
          <AmbulanceIcon className="w-5 h-5" />
          Deploy Ambulance
        </button>
      ) : (
        <div className="space-y-3">
          <input
            type="text"
            value={vehicle}
            onChange={e => setVehicle(e.target.value)}
            placeholder="Enter vehicle number (e.g., KA-20-AB-1234)"
            className="w-full border-2 border-gray-400 rounded-lg px-3 py-2 text-gray-900 bg-white placeholder-gray-500"
          />
          <div className="grid grid-cols-4 gap-2">
            {(['north', 'south', 'east', 'west'] as const).map(d => (
              <button
                key={d}
                onClick={() => setDir(d)}
                className={`px-3 py-2 rounded-lg font-medium text-sm ${
                  dir === d ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                {d.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onAddAmbulance(vehicle.trim(), dir);
                setShowAmb(false);
                setVehicle('');
              }}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold"
            >
              Deploy
            </button>
            <button
              onClick={() => setShowAmb(false)}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded-lg font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
