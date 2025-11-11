interface TrafficLightProps {
  direction: 'north' | 'south' | 'east' | 'west';
  isActive: boolean;
  timer: number;
  reason?: string;
}

export function TrafficLight({ direction, isActive, timer, reason }: TrafficLightProps) {
  const pos = {
    north: 'top-4 left-1/2 -translate-x-1/2',
    south: 'bottom-4 left-1/2 -translate-x-1/2',
    east: 'right-4 top-1/2 -translate-y-1/2',
    west: 'left-4 top-1/2 -translate-y-1/2',
  };

  return (
    <div className={`absolute ${pos[direction]} z-10`}>
      <div className={`flex flex-col items-center gap-2 p-3 rounded-lg shadow-xl border-2 
        ${isActive ? 'border-green-400' : 'border-red-500'} bg-gray-900`}>
        <div className="flex gap-1">
          <div className={`w-5 h-5 rounded-full ${!isActive ? 'bg-red-600' : 'bg-red-900/30'}`} />
          <div className={`w-5 h-5 rounded-full ${isActive ? 'bg-green-600' : 'bg-green-900/30'}`} />
        </div>
        {isActive && (
          <div className="text-white text-sm text-center">
            {timer}s
            {reason === 'ambulance_override' && <div className="text-red-400 text-xs font-semibold">PRIORITY</div>}
          </div>
        )}
      </div>
      <div className="text-center text-xs text-gray-300 mt-1">{direction.toUpperCase()}</div>
    </div>
  );
}
