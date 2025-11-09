import { useState } from 'react';
import { Play, Pause, Plus, Minus, Ambulance as AmbulanceIcon } from 'lucide-react';

interface ControlPanelProps {
  isRunning: boolean;
  onToggle: () => void;
  trafficDensity: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  onUpdateDensity: (direction: 'north' | 'south' | 'east' | 'west', count: number) => void;
  onAddAmbulance: (vehicleNumber: string, direction: 'north' | 'south' | 'east' | 'west') => void;
}

export function ControlPanel({ isRunning, onToggle, trafficDensity, onUpdateDensity, onAddAmbulance }: ControlPanelProps) {
  const [showAmbulanceForm, setShowAmbulanceForm] = useState(false);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [selectedDirection, setSelectedDirection] = useState<'north' | 'south' | 'east' | 'west'>('north');

  const handleAddAmbulance = () => {
    if (vehicleNumber.trim()) {
      onAddAmbulance(vehicleNumber.trim(), selectedDirection);
      setVehicleNumber('');
      setSelectedDirection('north');
      setShowAmbulanceForm(false);
    }
  };

  const adjustDensity = (direction: 'north' | 'south' | 'east' | 'west', delta: number) => {
    const newCount = Math.max(0, Math.min(30, trafficDensity[direction] + delta));
    onUpdateDensity(direction, newCount);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Control Panel</h2>
        <button
          onClick={onToggle}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
            isRunning
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-5 h-5" />
              Stop Simulation
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Start Simulation
            </>
          )}
        </button>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-700">Traffic Density Control</h3>
        {(['north', 'south', 'east', 'west'] as const).map(direction => (
          <div key={direction} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <span className="font-medium text-gray-700 capitalize w-20">{direction}</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => adjustDensity(direction, -5)}
                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                disabled={!isRunning}
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-12 text-center font-bold text-lg text-gray-800">
                {trafficDensity[direction]}
              </span>
              <button
                onClick={() => adjustDensity(direction, 5)}
                className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                disabled={!isRunning}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="w-32 bg-gray-300 rounded-full h-3 overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300"
                style={{ width: `${(trafficDensity[direction] / 30) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-gray-200">
        {!showAmbulanceForm ? (
          <button
            onClick={() => setShowAmbulanceForm(true)}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
            disabled={!isRunning}
          >
            <AmbulanceIcon className="w-5 h-5" />
            Deploy Emergency Ambulance
          </button>
        ) : (
          <div className="space-y-3">
            <input
              type="text"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              placeholder="Enter vehicle number (e.g., KA-20-AB-1234)"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none"
              autoFocus
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ambulance Direction
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['north', 'south', 'east', 'west'] as const).map(direction => (
                  <button
                    key={direction}
                    onClick={() => setSelectedDirection(direction)}
                    className={`px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                      selectedDirection === direction
                        ? 'bg-red-600 text-white shadow-lg'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {direction.charAt(0).toUpperCase() + direction.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddAmbulance}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
              >
                Deploy
              </button>
              <button
                onClick={() => {
                  setShowAmbulanceForm(false);
                  setVehicleNumber('');
                  setSelectedDirection('north');
                }}
                className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
