import React, { useState, useEffect } from "react";
import { Clock, Activity } from "lucide-react";

const VehicleCountdown = ({ vehicles, greenLight, laneCounts, isRunning }) => {
  const [countdowns, setCountdowns] = useState({ N: 0, S: 0, E: 0, W: 0 });

  useEffect(() => {
    if (!isRunning) {
      setCountdowns({ N: 0, S: 0, E: 0, W: 0 });
      return;
    }

    const calculateCountdowns = () => {
      const newCountdowns = { N: 0, S: 0, E: 0, W: 0 };
      
      // For each lane, calculate the maximum time needed to clear all vehicles
      ["N", "S", "E", "W"].forEach(direction => {
        const laneVehicles = vehicles.filter(v => v.direction === direction);
        if (laneVehicles.length > 0) {
          // Find the vehicle that will take the longest to clear
          let maxTime = 0;
          laneVehicles.forEach(vehicle => {
            // Calculate time to reach position -80 (completely off screen)
            const distanceToClear = vehicle.position + 80;
            const timeToClear = distanceToClear / (vehicle.speed * (vehicle.isPriority ? 1.2 : 1));
            if (timeToClear > maxTime) {
              maxTime = timeToClear;
            }
          });
          newCountdowns[direction] = maxTime;
        }
      });

      setCountdowns(newCountdowns);
    };

    calculateCountdowns();
    
    const interval = setInterval(calculateCountdowns, 500);
    return () => clearInterval(interval);
  }, [vehicles, greenLight, isRunning]);

  return (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mb-6">
      <h3 className="text-white font-bold mb-3 flex items-center gap-2">
        <Clock size={20} />
        Lane Clearance Time Estimate
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {["N", "S", "E", "W"].map((dir) => {
          const isGreen = dir === greenLight;
          const countdown = countdowns[dir];
          const vehicleCount = laneCounts[dir] || 0;
          
          return (
            <div key={dir} className={`p-3 rounded-lg border transition-all duration-300 ${
              isGreen ? "bg-green-900 border-green-500" : "bg-gray-800 border-gray-700"
            }`}>
              <div className="text-center mb-2">
                <div className="text-gray-400 text-sm mb-1">
                  {dir === "N" ? "North" : dir === "S" ? "South" : dir === "E" ? "East" : "West"}
                </div>
                <div className={`text-xl font-bold font-mono ${
                  isGreen ? "text-green-300" : "text-gray-300"
                }`}>
                  {countdown > 0 ? countdown.toFixed(1) + "s" : "0s"}
                </div>
                <div className="text-gray-500 text-xs mt-1">
                  {vehicleCount} vehicle{vehicleCount !== 1 ? 's' : ''}
                </div>
              </div>
              
              {vehicleCount > 0 && (
                <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      isGreen ? "bg-green-500" : "bg-blue-500"
                    }`}
                    style={{ 
                      width: `${Math.min(100, (countdown / 20) * 100)}%` 
                    }}
                  ></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="text-gray-400 text-xs mt-2 text-center">
        Shows estimated time to clear all vehicles in each lane
      </div>
    </div>
  );
};

export default VehicleCountdown;
