import { TrafficLight } from './TrafficLight';
import { Car, Ambulance as AmbulanceIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  currentSignal: 'north' | 'south' | 'east' | 'west';
  timer: number;
  trafficDensity: Record<'north' | 'south' | 'east' | 'west', number>;
  ambulanceDirection?: 'north' | 'south' | 'east' | 'west';
  reason?: string;
}

export function IntersectionView({
  currentSignal,
  timer,
  trafficDensity,
  ambulanceDirection,
  reason,
}: Props) {
  const roadColor = 'bg-gray-800';
  const borderLine = 'border-yellow-400 border-4 rounded-2xl';

  // Animation directions (moving toward the center)
  const vehicleVariants = {
    north: { y: [-100, 0], opacity: [0, 1] }, // move down
    south: { y: [100, 0], opacity: [0, 1] },  // move up
    east: { x: [100, 0], opacity: [0, 1] },   // move left
    west: { x: [-100, 0], opacity: [0, 1] },  // move right
  };

  const renderVehicles = (direction: 'north' | 'south' | 'east' | 'west', count: number) => {
    const lanePositions: Record<string, string> = {
      north: 'absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center',
      south: 'absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col-reverse items-center',
      east: 'absolute right-0 top-1/2 -translate-y-1/2 flex flex-row-reverse',
      west: 'absolute left-0 top-1/2 -translate-y-1/2 flex flex-row',
    };

    const vehicles = Array.from({ length: Math.min(count, 5) });

    return (
      <div className={lanePositions[direction]}>
        {vehicles.map((_, i) => (
          <motion.div
            key={i}
            variants={vehicleVariants}
            animate={direction}
            transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
            className="mb-2"
          >
            <Car className="w-6 h-6 text-blue-400 fill-blue-500 drop-shadow-lg" />
          </motion.div>
        ))}

        {/* Animated Ambulance */}
        {ambulanceDirection === direction && (
          <motion.div
            variants={vehicleVariants}
            animate={direction}
            transition={{ duration: 1.8, repeat: Infinity }}
            className="relative mt-2"
          >
            <AmbulanceIcon className="w-10 h-10 text-red-500 drop-shadow-[0_0_10px_#ff0000] animate-pulse" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
          </motion.div>
        )}
      </div>
    );
  };

  return (
    <div className={`relative w-full max-w-3xl aspect-square mx-auto ${roadColor} ${borderLine} shadow-2xl`}>
      {/* Center label */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-yellow-400 font-bold text-xl">MAIN JUNCTION</div>
          <div className="text-gray-300 text-sm">Mangaluru</div>
          <div className="text-gray-400 text-xs mt-1">
            Active Signal: <span className="text-green-400 font-semibold">{currentSignal.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Lights */}
      <TrafficLight direction="north" isActive={currentSignal === 'north'} timer={timer} reason={reason} />
      <TrafficLight direction="south" isActive={currentSignal === 'south'} timer={timer} reason={reason} />
      <TrafficLight direction="east" isActive={currentSignal === 'east'} timer={timer} reason={reason} />
      <TrafficLight direction="west" isActive={currentSignal === 'west'} timer={timer} reason={reason} />

      {/* Vehicles & Ambulance */}
      {renderVehicles('north', trafficDensity.north)}
      {renderVehicles('south', trafficDensity.south)}
      {renderVehicles('east', trafficDensity.east)}
      {renderVehicles('west', trafficDensity.west)}

      {/* Emergency Label */}
      {ambulanceDirection && (
        <div className="absolute top-2 right-2 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse flex items-center gap-2">
          <AmbulanceIcon className="w-5 h-5" />
          <span className="font-semibold text-sm">EMERGENCY: {ambulanceDirection.toUpperCase()}</span>
        </div>
      )}
    </div>
  );
}
