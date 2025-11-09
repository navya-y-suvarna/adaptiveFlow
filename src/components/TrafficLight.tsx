interface TrafficLightProps {
  direction: 'north' | 'south' | 'east' | 'west';
  isActive: boolean;
  timer: number;
  reason?: string;
}

export function TrafficLight({ direction, isActive, timer, reason }: TrafficLightProps) {
  const positions = {
    north: 'top-4 left-1/2 -translate-x-1/2',
    south: 'bottom-4 left-1/2 -translate-x-1/2',
    east: 'right-4 top-1/2 -translate-y-1/2',
    west: 'left-4 top-1/2 -translate-y-1/2',
  };

  const orientations = {
    north: 'flex-col',
    south: 'flex-col',
    east: 'flex-row',
    west: 'flex-row',
  };

  return (
    <div className={`absolute ${positions[direction]} z-10`}>
      <div className={`flex ${orientations[direction]} items-center gap-2 bg-gray-900 p-3 rounded-lg shadow-xl border-2 ${isActive ? 'border-green-400 shadow-green-400/50 shadow-lg' : 'border-red-600 shadow-red-600/50 shadow-lg'}`}>
        <div className="flex gap-1">
          <div className={`w-5 h-5 rounded-full transition-all ${!isActive ? 'bg-red-600 shadow-lg shadow-red-500/80 animate-pulse' : 'bg-red-900/30'}`} />
          <div className={`w-5 h-5 rounded-full transition-all ${isActive ? 'bg-green-600 shadow-lg shadow-green-500/80 animate-pulse' : 'bg-green-900/30'}`} />
        </div>
        {isActive && (
          <div className="flex flex-col items-center gap-1">
            <span className="text-white font-bold text-lg">{timer}s</span>
            {reason === 'ambulance_override' && (
              <span className="text-red-400 text-xs font-semibold animate-pulse">PRIORITY</span>
            )}
          </div>
        )}
      </div>
      <div className="text-center mt-1">
        <span className={`text-xs font-semibold ${isActive ? 'text-green-400' : 'text-red-400'}`}>
          {direction.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
