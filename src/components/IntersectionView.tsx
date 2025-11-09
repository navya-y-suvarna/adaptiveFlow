import { TrafficLight } from './TrafficLight';
import { Car, Ambulance as AmbulanceIcon } from 'lucide-react';

interface IntersectionViewProps {
  currentSignal: 'north' | 'south' | 'east' | 'west';
  timer: number;
  trafficDensity: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  ambulanceDirection?: 'north' | 'south' | 'east' | 'west';
  reason?: string;
}

export function IntersectionView({ currentSignal, timer, trafficDensity, ambulanceDirection, reason }: IntersectionViewProps) {
  const renderVehicles = (direction: 'north' | 'south' | 'east' | 'west', count: number) => {
    const positions = {
      north: 'top-20 left-1/2 -translate-x-1/2 flex-col space-y-1',
      south: 'bottom-20 left-1/2 -translate-x-1/2 flex-col-reverse space-y-reverse space-y-1',
      east: 'right-20 top-1/2 -translate-y-1/2 flex-row-reverse space-x-reverse space-x-1',
      west: 'left-20 top-1/2 -translate-y-1/2 flex-row space-x-1',
    };

    const hasAmbulance = ambulanceDirection === direction;

    return (
      <div className={`absolute ${positions[direction]} flex`}>
        {hasAmbulance && (
          <div className="animate-bounce">
            <AmbulanceIcon className="w-8 h-8 text-red-500 fill-red-500 drop-shadow-lg" />
          </div>
        )}
        {Array.from({ length: Math.min(count, 8) }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <Car className="w-5 h-5 text-blue-500 fill-blue-500" />
          </div>
        ))}
        {count > 8 && (
          <span className="text-white text-xs bg-gray-800 px-2 py-1 rounded">+{count - 8}</span>
        )}
      </div>
    );
  };

  return (
    <div className="relative w-full max-w-3xl aspect-square bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl overflow-hidden border-4 border-gray-700">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-56 h-56">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-800 border-4 border-yellow-400 shadow-xl">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-yellow-400 font-bold text-lg drop-shadow-lg">MAIN JUNCTION</div>
                <div className="text-gray-300 text-xs mt-1">Mangaluru</div>
              </div>
            </div>
          </div>

          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-full bg-gradient-to-b from-gray-600 to-gray-700 -z-10 border-x-2 border-yellow-500/30" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-20 w-full bg-gradient-to-r from-gray-600 to-gray-700 -z-10 border-y-2 border-yellow-500/30" />
        </div>
      </div>

      <TrafficLight direction="north" isActive={currentSignal === 'north'} timer={timer} reason={reason} />
      <TrafficLight direction="south" isActive={currentSignal === 'south'} timer={timer} reason={reason} />
      <TrafficLight direction="east" isActive={currentSignal === 'east'} timer={timer} reason={reason} />
      <TrafficLight direction="west" isActive={currentSignal === 'west'} timer={timer} reason={reason} />

      {renderVehicles('north', trafficDensity.north)}
      {renderVehicles('south', trafficDensity.south)}
      {renderVehicles('east', trafficDensity.east)}
      {renderVehicles('west', trafficDensity.west)}

      {ambulanceDirection && (
        <div className="absolute top-2 right-2 bg-red-600 text-white px-3 py-2 rounded-lg shadow-lg animate-pulse flex items-center gap-2">
          <AmbulanceIcon className="w-5 h-5" />
          <span className="font-semibold text-sm">EMERGENCY: {ambulanceDirection.toUpperCase()}</span>
        </div>
      )}
    </div>
  );
}
