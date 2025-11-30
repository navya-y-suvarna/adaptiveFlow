import React from "react";
import { Clock, Activity } from "lucide-react";

const DecisionLogicDisplay = ({ 
  greenLight, 
  priorityActive, 
  priorityDirection, 
  laneCounts, 
  vehicles,
  timer 
}) => {
  const getDecisionReason = () => {
    if (priorityActive) {
      return `🚨 PRIORITY OVERRIDE: Emergency vehicle in ${priorityDirection} lane`;
    }
    
    const currentCount = laneCounts[greenLight] || 0;
    const maxCount = Math.max(...Object.values(laneCounts));
    
    if (currentCount === maxCount && currentCount > 0) {
      return `📊 VEHICLE COUNT: ${greenLight} lane has maximum vehicles (${currentCount})`;
    }
    
    return `🔄 DEFAULT ROTATION: No priority vehicles and lanes are balanced`;
  };

  const getLaneStatus = (direction) => {
    const count = laneCounts[direction] || 0;
    const priorityVehicles = vehicles.filter(v => 
      v.direction === direction && v.isPriority
    ).length;
    
    return {
      direction,
      count,
      priorityVehicles,
      isGreen: direction === greenLight,
      isMax: count === Math.max(...Object.values(laneCounts)) && count > 0
    };
  };

  const laneStatus = ["N", "S", "E", "W"].map(getLaneStatus);

  return (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mb-6">
      <h3 className="text-white font-bold mb-3 flex items-center gap-2">
        <Activity size={20} />
        Smart Traffic Decision Logic
      </h3>
      
      {/* Current Decision */}
      <div className="bg-gray-900 p-3 rounded border border-gray-600 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400">Current Decision:</span>
          <span className={`font-bold ${priorityActive ? "text-red-400" : "text-green-400"}`}>
            {priorityActive ? "PRIORITY OVERRIDE" : "SMART TRAFFIC FLOW"}
          </span>
        </div>
        <div className="text-sm text-gray-300">
          {getDecisionReason()}
        </div>
      </div>

      {/* Lane Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {laneStatus.map(lane => (
          <div key={lane.direction} className={`p-3 rounded border ${
            lane.isGreen 
              ? priorityActive 
                ? "bg-red-900 border-red-500" 
                : "bg-green-900 border-green-500"
              : "bg-gray-700 border-gray-600"
          }`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-white font-semibold">
                {lane.direction === "N" ? "North" : 
                 lane.direction === "S" ? "South" : 
                 lane.direction === "E" ? "East" : "West"}
              </span>
              {lane.isGreen && (
                <span className={`text-xs px-2 py-1 rounded ${
                  priorityActive ? "bg-red-600" : "bg-green-600"
                }`}>
                  ACTIVE
                </span>
              )}
            </div>
            
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Vehicles:</span>
                <span className={`font-mono ${lane.isMax ? "text-yellow-400" : "text-white"}`}>
                  {lane.count}
                  {lane.isMax && " ⭐"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Priority:</span>
                <span className="text-red-400 font-mono">
                  {lane.priorityVehicles}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span className={lane.isGreen ? "text-green-400" : "text-gray-400"}>
                  {lane.isGreen ? "Moving" : "Waiting"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Logic Rules */}
      <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded p-3">
        <h4 className="text-blue-300 font-semibold mb-2">Decision Rules:</h4>
        <div className="text-sm text-blue-200 space-y-1">
          <div>1. 🚨 <strong>Priority First:</strong> Emergency vehicles get immediate green light</div>
          <div>2. 📊 <strong>Max Vehicles:</strong> Lane with most vehicles gets priority when no emergencies</div>
          <div>3. ⏰ <strong>Time Limit:</strong> Green light duration: {Math.ceil(timer)}s remaining</div>
          <div>4. 🔄 <strong>Balance:</strong> Rotates if all lanes have equal vehicle count</div>
        </div>
      </div>
    </div>
  );
};

export default DecisionLogicDisplay;
