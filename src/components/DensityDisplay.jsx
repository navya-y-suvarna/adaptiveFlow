import React from "react";
import { Clock, Activity } from "lucide-react";

const DensityDisplay = ({ laneCounts, greenLight, timer, priorityActive, prioritySpawnTimer }) => {
  const maxCount = Math.max(...Object.values(laneCounts), 1);
  
  return (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mb-6">
      <h3 className="text-white font-bold mb-3 flex items-center gap-2">
        <Activity size={20} />
        Lane Vehicle Count & Signal Control
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {["N", "S", "E", "W"].map((dir) => {
          const vehicleCount = laneCounts[dir] || 0;
          const percentage = (vehicleCount / maxCount) * 100;
          const isGreen = dir === greenLight;

          return (
            <div key={dir} className={`p-3 rounded-lg border transition-all duration-300 ${
              isGreen 
                ? priorityActive
                  ? "bg-red-900 border-red-500 shadow-lg scale-105"
                  : "bg-green-900 border-green-500 shadow-lg scale-105"
                : "bg-gray-800 border-gray-700"
            }`}>
              <div className="text-center mb-2">
                <div className="text-gray-400 text-sm mb-1">
                  {dir === "N" ? "North" : dir === "S" ? "South" : dir === "E" ? "East" : "West"}
                </div>
                <div className={`text-xl font-bold ${
                  isGreen 
                    ? priorityActive ? "text-red-300" : "text-green-300"
                    : "text-white"
                }`}>
                  {vehicleCount}
                </div>
                <div className="text-gray-500 text-xs">vehicles</div>
              </div>
              
              <div className="relative h-4 bg-gray-700 rounded-full mb-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isGreen 
                      ? priorityActive ? "bg-red-500" : "bg-green-500"
                      : "bg-blue-500"
                  }`}
                  style={{ width: `${percentage}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                  {vehicleCount} vehicles
                </div>
              </div>
              
              {isGreen && (
                <div className={`text-xs text-center font-semibold ${
                  priorityActive ? "text-red-400" : "text-green-400"
                }`}>
                  {priorityActive ? "🚨 PRIORITY SIGNAL" : "✓ GREEN SIGNAL"}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Current status */}
      <div className="bg-gray-900 p-3 rounded border border-gray-600">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">Current Green Lane:</span>
          <span className={`font-bold ${priorityActive ? "text-red-400" : "text-green-400"}`}>
            {greenLight} {priorityActive && "(Priority Override)"}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm mt-2">
          <span className="text-gray-400">Signal Change In:</span>
          <span className="font-mono text-yellow-400">{Math.ceil(timer)}s</span>
        </div>
        <div className="flex justify-between items-center text-sm mt-2">
          <span className="text-gray-400">Next Priority Vehicle:</span>
          <span className="font-mono text-red-400">{Math.ceil(prioritySpawnTimer)}s</span>
        </div>
      </div>
    </div>
  );
};

export default DensityDisplay;

