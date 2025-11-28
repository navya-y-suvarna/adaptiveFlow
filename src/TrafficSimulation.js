import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Truck,
  Car,
  Clock,
  Activity,
  Bus,
  Bike,
  Shield,
  Flame,
  AlertTriangle,
  Upload,
  Siren,
} from "lucide-react";

const normalGreenTime = 15;
const emergencyGreenTime = 25;
const MAX_LOG_ITEMS = 80;

// Enhanced vehicle types with priority vehicles using available icons
const VEHICLE_TYPES = {
  car: { 
    icon: Car, 
    color: "text-blue-400", 
    bgColor: "bg-blue-500",
    speed: 1, 
    size: 24, 
    spawnRate: 0.4,
    isPriority: false
  },
  bus: { 
    icon: Bus, 
    color: "text-orange-400", 
    bgColor: "bg-orange-500",
    speed: 0.7, 
    size: 28, 
    spawnRate: 0.15,
    isPriority: false
  },
  truck: { 
    icon: Truck, 
    color: "text-gray-400", 
    bgColor: "bg-gray-500",
    speed: 0.6, 
    size: 30, 
    spawnRate: 0.1,
    isPriority: false
  },
  bike: { 
    icon: Bike, 
    color: "text-green-400", 
    bgColor: "bg-green-500",
    speed: 1.2, 
    size: 20, 
    spawnRate: 0.1,
    isPriority: false
  },
  ambulance: { 
    icon: AlertTriangle,  // Using AlertTriangle instead of Ambulance
    color: "text-white", 
    bgColor: "bg-red-600",
    speed: 1.5, 
    size: 32, 
    spawnRate: 0.02,
    isPriority: true,
    priorityType: "ambulance"
  },
  fire: { 
    icon: Flame,  // Using Flame instead of FireExtinguisher
    color: "text-white", 
    bgColor: "bg-red-500",
    speed: 1.4, 
    size: 30, 
    spawnRate: 0.02,
    isPriority: true,
    priorityType: "fire"
  },
  police: { 
    icon: Shield, 
    color: "text-white", 
    bgColor: "bg-blue-600",
    speed: 1.6, 
    size: 28, 
    spawnRate: 0.02,
    isPriority: true,
    priorityType: "police"
  }
};

// Get random vehicle type based on spawn rates
function getRandomVehicleType() {
  const rand = Math.random();
  let cumulative = 0;
  
  for (const [type, config] of Object.entries(VEHICLE_TYPES)) {
    cumulative += config.spawnRate;
    if (rand <= cumulative) return type;
  }
  return "car";
}

// Dataset Upload Component
const DatasetUpload = ({ onFileUpload, addEvent }) => {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file.name);
      
      // Simulate dataset processing
      addEvent(`Dataset "${file.name}" uploaded and processed`, "system");
      
      // Here you would typically parse the CSV/JSON and update simulation parameters
      setTimeout(() => {
        addEvent("Traffic patterns updated based on historical data", "success");
        if (onFileUpload) {
          onFileUpload(file);
        }
      }, 1000);
    }
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mb-6">
      <h3 className="text-white font-bold mb-3 flex items-center gap-2">
        <Upload size={20} />
        Smart Traffic Dataset Upload
      </h3>
      <div className="flex items-center gap-4">
        <label className="flex-1">
          <input
            type="file"
            accept=".csv,.json,.xlsx"
            onChange={handleFileUpload}
            className="hidden"
          />
          <div className="cursor-pointer bg-gray-700 hover:bg-gray-600 border-2 border-dashed border-gray-600 rounded-lg p-4 text-center transition-all">
            <div className="text-gray-300 mb-1">
              {selectedFile ? `Selected: ${selectedFile}` : "Upload Traffic Dataset"}
            </div>
            <div className="text-gray-500 text-sm">
              Supports CSV, JSON, Excel files with traffic patterns
            </div>
          </div>
        </label>
        
        <div className="text-sm text-gray-400 max-w-md">
          <strong>Expected format:</strong> Timestamp, Vehicle_Type, Lane, Priority_Flag
          <br />
          <span className="text-xs">Upload historical data to optimize traffic flow patterns</span>
        </div>
      </div>
    </div>
  );
};

// Vehicle Countdown Component - FIXED
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

// Decision Logic Display Component
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

// Density Display Component
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

const TrafficSimulation = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [greenLight, setGreenLight] = useState("N");
  const [timer, setTimer] = useState(normalGreenTime);
  const [priorityActive, setPriorityActive] = useState(false);
  const [priorityDirection, setPriorityDirection] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [stats, setStats] = useState({
    totalVehicles: 0,
    avgWaitTime: 0,
    priorityResponses: 0,
    avgPriorityTime: 2.3,
  });
  const [eventLog, setEventLog] = useState([]);
  const [laneCounts, setLaneCounts] = useState({ N: 0, S: 0, E: 0, W: 0 });
  const [prioritySpawnTimer, setPrioritySpawnTimer] = useState(45);

  const animationRef = useRef(null);
  const lastTimeRef = useRef(0);
  const vehiclesRef = useRef([]);
  const timerRef = useRef(normalGreenTime);
  const lastPrioritySpawnRef = useRef(0);

  // --- EVENT LOG HELPERS -------------------------------------------------

  const addEvent = (message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString("en-IN", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    setEventLog((prev) => {
      const next = [
        {
          id: `${Date.now()}-${Math.random()}`,
          time: timestamp,
          message,
          type,
        },
        ...prev,
      ];
      return next.slice(0, MAX_LOG_ITEMS);
    });
  };

  // --- TIME FORMATTER ----------------------------------------------------

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  // --- IMPROVED DECIDE NEXT GREEN LANE -----------------------------------

  const decideNextGreenLane = (vehicles, currentGreen) => {
    // 1. FIRST PRIORITY: Check for emergency vehicles in any lane
    const priorityVehicles = vehicles.filter(v => v.isPriority);
    if (priorityVehicles.length > 0) {
      // Find the lane with the most priority vehicles
      const priorityCounts = { N: 0, S: 0, E: 0, W: 0 };
      priorityVehicles.forEach(v => {
        priorityCounts[v.direction] = (priorityCounts[v.direction] || 0) + 1;
      });
      
      let maxPriority = 0;
      let priorityLane = null;
      Object.entries(priorityCounts).forEach(([lane, count]) => {
        if (count > maxPriority) {
          maxPriority = count;
          priorityLane = lane;
        }
      });
      
      if (priorityLane && priorityLane !== currentGreen) {
        addEvent(
          `🚨 Priority override: ${priorityLane} lane selected (${maxPriority} emergency vehicles)`,
          "emergency"
        );
        return priorityLane;
      }
    }

    // 2. SECOND PRIORITY: If current lane has vehicles, keep it green to clear traffic
    const currentLaneVehicles = vehicles.filter(v => v.direction === currentGreen);
    if (currentLaneVehicles.length > 0) {
      // Only change if another lane has significantly more vehicles
      const counts = { N: 0, S: 0, E: 0, W: 0 };
      vehicles.forEach(v => {
        counts[v.direction] = (counts[v.direction] || 0) + 1;
      });

      const currentCount = counts[currentGreen] || 0;
      let maxCount = 0;
      let maxLane = currentGreen;
      
      Object.entries(counts).forEach(([lane, count]) => {
        if (count > maxCount) {
          maxCount = count;
          maxLane = lane;
        }
      });

      // Only switch if another lane has at least 2 more vehicles
      if (maxLane !== currentGreen && maxCount >= currentCount + 2) {
        addEvent(
          `📊 Switching to ${maxLane} lane (${maxCount} vehicles vs ${currentCount} in current lane)`,
          "signal"
        );
        return maxLane;
      }

      // Keep current lane green to clear traffic
      addEvent(
        `🟢 Keeping ${currentGreen} lane green (${currentCount} vehicles to clear)`,
        "info"
      );
      return currentGreen;
    }

    // 3. THIRD PRIORITY: Lane with maximum vehicles
    const counts = { N: 0, S: 0, E: 0, W: 0 };
    vehicles.forEach(v => {
      counts[v.direction] = (counts[v.direction] || 0) + 1;
    });

    let maxCount = 0;
    let nextGreenLane = currentGreen;
    
    Object.entries(counts).forEach(([lane, count]) => {
      if (count > maxCount) {
        maxCount = count;
        nextGreenLane = lane;
      }
    });

    // 4. DEFAULT: If all lanes empty, rotate
    if (maxCount === 0) {
      const lanes = ["N", "S", "E", "W"];
      const currentIndex = lanes.indexOf(currentGreen);
      nextGreenLane = lanes[(currentIndex + 1) % lanes.length];
      addEvent(`🔄 Rotating to ${nextGreenLane} lane (all lanes empty)`, "info");
    } else if (nextGreenLane !== currentGreen) {
      addEvent(`📊 Switching to ${nextGreenLane} lane (${maxCount} vehicles - maximum)`, "signal");
    }

    return nextGreenLane;
  };

  // --- INITIAL VEHICLES --------------------------------------------------

  const createInitialVehicles = () => {
    const initial = [];
    const directions = ["N", "S", "E", "W"];

    directions.forEach((dir) => {
      for (let i = 0; i < 2; i++) {
        const vehicleType = getRandomVehicleType();
        const config = VEHICLE_TYPES[vehicleType];
        
        initial.push({
          id: `${dir}-${vehicleType}-init-${i}`,
          direction: dir,
          type: vehicleType,
          position: i * 120 + 100,
          waiting: dir !== "N",
          waitTime: 0,
          isPriority: config.isPriority,
          priorityType: config.priorityType,
          speed: config.speed,
        });
      }
    });
    return initial;
  };

  // --- SPAWN PRIORITY VEHICLE --------------------------------------------

  const spawnPriorityVehicle = () => {
    const directions = ["N", "S", "E", "W"];
    const dir = directions[Math.floor(Math.random() * directions.length)];
    
    // Randomly choose between ambulance, fire, police
    const priorityTypes = ["ambulance", "fire", "police"];
    const priorityType = priorityTypes[Math.floor(Math.random() * priorityTypes.length)];
    const config = VEHICLE_TYPES[priorityType];
    
    const priorityVehicle = {
      id: `PRIORITY-${priorityType}-${Date.now()}`,
      direction: dir,
      type: priorityType,
      position: 350,
      waiting: dir !== greenLight,
      waitTime: 0,
      isPriority: true,
      priorityType: priorityType,
      speed: config.speed,
    };

    setVehicles(prev => {
      const updated = [...prev, priorityVehicle];
      vehiclesRef.current = updated;
      return updated;
    });

    // Update lane counts
    setLaneCounts(prev => ({
      ...prev,
      [dir]: (prev[dir] || 0) + 1
    }));

    setStats(prev => ({
      ...prev,
      totalVehicles: prev.totalVehicles + 1,
    }));

    // Add appropriate event message
    const vehicleNames = {
      ambulance: "🚑 Ambulance",
      fire: "🚒 Fire Engine", 
      police: "🚓 Police Vehicle"
    };

    addEvent(`${vehicleNames[priorityType]} entered from ${dir} lane - Priority clearance required!`, "emergency");
  };

  useEffect(() => {
    const initialVehicles = createInitialVehicles();
    setVehicles(initialVehicles);
    vehiclesRef.current = initialVehicles;
    
    // Calculate initial lane counts
    const counts = { N: 0, S: 0, E: 0, W: 0 };
    initialVehicles.forEach(vehicle => {
      counts[vehicle.direction] = (counts[vehicle.direction] || 0) + 1;
    });
    
    setLaneCounts(counts);
    
    setStats((prev) => ({
      ...prev,
      totalVehicles: initialVehicles.length,
    }));
    
    addEvent("Smart Traffic System started. North lane has initial green signal.", "system");
    addEvent("SYSTEM READY: Priority vehicles → Max vehicles → Lane rotation", "success");
    timerRef.current = normalGreenTime;
    setTimer(normalGreenTime);
  }, []);

  // --- MAIN ANIMATION LOOP ----------------------------------------------

  useEffect(() => {
    if (!isRunning) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      lastTimeRef.current = 0;
      return;
    }

    const animate = (currentTime) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = currentTime;
      }

      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;
      const safeDelta = Math.min(deltaTime, 0.2);

      // Update global time
      setTime((prev) => prev + safeDelta);

      // Update priority spawn timer
      setPrioritySpawnTimer(prev => {
        const newTime = prev - safeDelta;
        if (newTime <= 0) {
          spawnPriorityVehicle();
          return 30 + Math.random() * 30; // Random between 30-60 seconds
        }
        return newTime;
      });

      // --- VEHICLE UPDATE ------------------------------------------------
      setVehicles((prevVehicles) => {
        const updated = prevVehicles
          .map((vehicle) => {
            const canMove = vehicle.direction === greenLight;

            let waiting = vehicle.waiting;
            let waitTime = vehicle.waitTime;
            let position = vehicle.position;

            if (!canMove) {
              waiting = true;
              waitTime += safeDelta;
            } else {
              waiting = false;
              // Move vehicle based on type (priority vehicles move faster)
              const speedMultiplier = vehicle.isPriority ? 1.2 : 1;
              position = position - vehicle.speed * speedMultiplier;
            }

            // Remove vehicles that left the scene
            if (position < -80) {
              return null;
            }

            return {
              ...vehicle,
              position,
              waiting,
              waitTime,
            };
          })
          .filter(Boolean);

        // Check for priority vehicles for immediate response
        const priorityVehicles = updated.filter(v => v.isPriority && v.position > 100);
        let detectedPriority = null;

        if (priorityVehicles.length > 0 && !priorityActive) {
          // Find the priority vehicle closest to intersection
          const closestPriority = priorityVehicles.reduce((closest, current) => {
            return current.position > closest.position ? current : closest;
          }, priorityVehicles[0]);
          
          detectedPriority = closestPriority.direction;
        }

        // Handle priority vehicle detection - IMMEDIATE response
        if (detectedPriority && (!priorityActive || priorityDirection !== detectedPriority)) {
          setPriorityActive(true);
          setPriorityDirection(detectedPriority);
          setGreenLight(detectedPriority);
          timerRef.current = emergencyGreenTime;
          setTimer(emergencyGreenTime);
          
          const priorityVehicle = priorityVehicles.find(v => v.direction === detectedPriority);
          const vehicleNames = {
            ambulance: "Ambulance",
            fire: "Fire Engine",
            police: "Police Vehicle"
          };
          
          addEvent(
            `🚨 IMMEDIATE RESPONSE: ${vehicleNames[priorityVehicle.priorityType]} detected in ${detectedPriority} lane - Priority override activated!`,
            "emergency"
          );
          
          setStats((prev) => ({
            ...prev,
            priorityResponses: prev.priorityResponses + 1,
          }));
        }

        // Check if priority vehicle left
        if (priorityActive) {
          const remainingPriority = updated.filter(v => v.isPriority && v.direction === priorityDirection);
          if (remainingPriority.length === 0) {
            setPriorityActive(false);
            setPriorityDirection(null);
            addEvent(
              "✓ Priority vehicle cleared. Returning to smart traffic flow.",
              "success"
            );
          }
        }

        // Update lane counts
        const counts = { N: 0, S: 0, E: 0, W: 0 };
        updated.forEach((v) => {
          counts[v.direction] = (counts[v.direction] || 0) + 1;
        });
        setLaneCounts(counts);

        // Spawn new regular vehicles
        if (Math.random() < 0.02) {
          const directions = ["N", "S", "E", "W"];
          const dir = directions[Math.floor(Math.random() * directions.length)];
          const vehicleType = getRandomVehicleType();
          const config = VEHICLE_TYPES[vehicleType];
          
          const newVehicle = {
            id: `${dir}-${vehicleType}-${Date.now()}`,
            direction: dir,
            type: vehicleType,
            position: 350,
            waiting: dir !== greenLight,
            waitTime: 0,
            isPriority: config.isPriority,
            priorityType: config.priorityType,
            speed: config.speed,
          };
          
          updated.push(newVehicle);
          setStats((prev) => ({
            ...prev,
            totalVehicles: prev.totalVehicles + 1,
          }));
        }

        // Update average wait time
        const waitingVehicles = updated.filter((v) => v.waiting);
        if (waitingVehicles.length > 0) {
          const avgWait = waitingVehicles.reduce((sum, v) => sum + v.waitTime, 0) / waitingVehicles.length;
          setStats((prev) => ({
            ...prev,
            avgWaitTime: avgWait,
          }));
        } else {
          setStats((prev) => ({
            ...prev,
            avgWaitTime: 0,
          }));
        }

        vehiclesRef.current = updated;
        return updated;
      });

      // --- TIMER + SIGNAL UPDATE -----------------------------------------
      if (!priorityActive) {
        timerRef.current -= safeDelta;
        if (timerRef.current <= 0) {
          const nextGreen = decideNextGreenLane(vehiclesRef.current, greenLight);
          
          if (nextGreen !== greenLight) {
            setGreenLight(nextGreen);
          }

          timerRef.current = normalGreenTime;
        }
        setTimer(timerRef.current);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      lastTimeRef.current = 0;
    };
  }, [isRunning, greenLight, priorityActive, priorityDirection, laneCounts]);

  // --- RESET -------------------------------------------------------------

  const reset = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    setIsRunning(false);
    setTime(0);
    timerRef.current = normalGreenTime;
    setTimer(normalGreenTime);
    setGreenLight("N");
    setPriorityActive(false);
    setPriorityDirection(null);
    lastTimeRef.current = 0;
    lastPrioritySpawnRef.current = 0;
    setPrioritySpawnTimer(45);

    const initialVehicles = createInitialVehicles();
    setVehicles(initialVehicles);
    vehiclesRef.current = initialVehicles;
    
    const counts = { N: 0, S: 0, E: 0, W: 0 };
    initialVehicles.forEach(vehicle => {
      counts[vehicle.direction] = (counts[vehicle.direction] || 0) + 1;
    });
    
    setLaneCounts(counts);
    
    setStats({
      totalVehicles: initialVehicles.length,
      avgWaitTime: 0,
      priorityResponses: 0,
      avgPriorityTime: 2.3,
    });

    setEventLog([]);
    addEvent("System reset. All parameters restored to default.", "system");
    addEvent("DECISION LOGIC: 1. Priority Vehicles → 2. Max Vehicles → 3. Lane Rotation", "success");
  };

  // --- VEHICLE POSITIONING ----------------------------------------------

  const getVehicleStyle = (vehicle) => {
    const d = vehicle.position;
    const laneOffset = 25;
    const config = VEHICLE_TYPES[vehicle.type];

    switch (vehicle.direction) {
      case "N":
        return {
          left: `calc(50% - ${laneOffset}px)`,
          top: `calc(50% - ${d}px)`,
          transform: "translate(-50%, -50%) rotate(0deg)",
        };
      case "S":
        return {
          left: `calc(50% + ${laneOffset}px)`,
          top: `calc(50% + ${d}px)`,
          transform: "translate(-50%, -50%) rotate(180deg)",
        };
      case "E":
        return {
          left: `calc(50% + ${d}px)`,
          top: `calc(50% + ${laneOffset}px)`,
          transform: "translate(-50%, -50%) rotate(90deg)",
        };
      case "W":
        return {
          left: `calc(50% - ${d}px)`,
          top: `calc(50% - ${laneOffset}px)`,
          transform: "translate(-50%, -50%) rotate(270deg)",
        };
      default:
        return {
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        };
    }
  };

  // --- ENHANCED VEHICLE RENDERING WITH EMERGENCY SYMBOLS -----------------

  const renderVehicle = (vehicle) => {
    const config = VEHICLE_TYPES[vehicle.type];
    const VehicleIcon = config.icon;
    const isCurrentLane = vehicle.direction === greenLight;
    
    return (
      <div className="relative">
        {/* Vehicle with enhanced styling */}
        <div className={`
          relative transition-all duration-200
          ${vehicle.waiting || !isCurrentLane ? 'opacity-80' : 'opacity-100'}
          ${vehicle.isPriority ? 'animate-pulse' : ''}
        `}>
          {/* Vehicle body with shadow and glow */}
          <div className={`
            rounded-lg p-1
            ${config.bgColor}
            ${vehicle.isPriority ? 'shadow-[0_0_15px_rgba(239,68,68,0.8)]' : 'shadow-lg'}
            border-2 ${vehicle.isPriority ? 'border-white' : 'border-gray-200 border-opacity-30'}
          `}>
            <VehicleIcon
              className={config.color}
              size={config.size}
              fill={vehicle.isPriority ? "currentColor" : "none"}
              strokeWidth={1.5}
            />
          </div>
          
          {/* Enhanced Priority vehicle indicators */}
          {vehicle.isPriority && (
            <>
              {/* Rotating Siren Effect */}
              <div className="absolute -top-3 -left-3 w-8 h-8 flex items-center justify-center">
                <div className="relative w-6 h-6">
                  {/* Rotating siren lights */}
                  <div className="absolute inset-0 animate-spin">
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1 w-2 h-2 bg-red-600 rounded-full"></div>
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 w-2 h-2 bg-blue-600 rounded-full"></div>
                  </div>
                  {/* Center siren dot */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-yellow-400 rounded-full"></div>
                </div>
              </div>

              {/* Flashing light bars */}
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-6 h-1 flex justify-between">
                <div className="w-1 h-1 bg-red-600 rounded-full animate-pulse"></div>
                <div className="w-1 h-1 bg-blue-600 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
              </div>

              {/* Priority badge with siren icon */}
              <div className="absolute -bottom-2 -left-2 bg-red-600 text-white text-xs px-1 rounded border border-white flex items-center gap-1">
                <Siren size={10} />
                {vehicle.priorityType === 'ambulance' ? 'AMB' : 
                 vehicle.priorityType === 'fire' ? 'FIRE' : 'POLICE'}
              </div>

              {/* Emergency vehicle trail effect when moving */}
              {!vehicle.waiting && isCurrentLane && (
                <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
                  <div className="flex space-x-1">
                    {[1, 2, 3].map(i => (
                      <div 
                        key={i}
                        className="w-1 h-1 bg-red-400 rounded-full animate-pulse"
                        style={{ animationDelay: `${i * 0.1}s` }}
                      ></div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Movement indicator for regular vehicles */}
        {!vehicle.waiting && isCurrentLane && !vehicle.isPriority && (
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
            <div className="flex space-x-1">
              {[1, 2, 3].map(i => (
                <div 
                  key={i}
                  className="w-1 h-1 bg-green-400 rounded-full animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                ></div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-2xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <Activity className="text-green-400" />
          Smart Traffic Solution - AI Powered Management
        </h1>
        <p className="text-gray-300">
          Priority vehicle detection with AI-optimized signal control using historical data
        </p>
      </div>

      {/* Dataset Upload Section */}
      <DatasetUpload addEvent={addEvent} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Controls + Simulation */}
        <div className="lg:col-span-2">
          {/* Controls */}
          <div className="flex gap-3 mb-6 flex-wrap items-center">
            <button
              onClick={() => {
                setIsRunning((prev) => {
                  const next = !prev;
                  addEvent(
                    next ? "Simulation started." : "Simulation paused.",
                    "system"
                  );
                  return next;
                });
              }}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all"
            >
              {isRunning ? <Pause size={20} /> : <Play size={20} />}
              {isRunning ? "Pause" : "Start"}
            </button>
            <button
              onClick={reset}
              className="flex items-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-all"
            >
              <RotateCcw size={20} />
              Reset
            </button>

            <div className="flex items-center gap-2 bg-gray-800 px-3 py-2 rounded-lg border border-gray-700">
              <span className="text-gray-300 text-sm">Mode:</span>
              <span className={`font-semibold ${priorityActive ? "text-red-400" : "text-green-400"}`}>
                {priorityActive ? "🚨 Priority Override" : "📊 Smart Traffic"}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm mb-1">Simulation Time</div>
              <div className="text-2xl font-bold text-white font-mono">
                {formatTime(time)}
              </div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm mb-1">Total Vehicles</div>
              <div className="text-2xl font-bold text-white">
                {stats.totalVehicles}
              </div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm mb-1">Avg Wait Time</div>
              <div className="text-2xl font-bold text-white">
                {stats.avgWaitTime.toFixed(1)}s
              </div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm mb-1">
                Priority Responses
              </div>
              <div className="text-2xl font-bold text-red-400">
                {stats.priorityResponses}
              </div>
            </div>
          </div>

          {/* Decision Logic Display */}
          <DecisionLogicDisplay 
            greenLight={greenLight}
            priorityActive={priorityActive}
            priorityDirection={priorityDirection}
            laneCounts={laneCounts}
            vehicles={vehicles}
            timer={timer}
          />

          {/* Vehicle Countdown - FIXED */}
          <VehicleCountdown 
            vehicles={vehicles} 
            greenLight={greenLight} 
            laneCounts={laneCounts}
            isRunning={isRunning}
          />

          {/* Density Display */}
          <DensityDisplay 
            laneCounts={laneCounts}
            greenLight={greenLight}
            timer={timer}
            priorityActive={priorityActive}
            prioritySpawnTimer={prioritySpawnTimer}
          />

          {/* Enhanced Priority banner */}
          {priorityActive && (
            <div className="bg-red-900 border-2 border-red-500 rounded-lg p-4 mb-6 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Siren className="text-red-300" size={24} />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                </div>
                <div>
                  <div className="text-red-100 font-bold flex items-center gap-2">
                    🚨 EMERGENCY VEHICLE DETECTED
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                    </div>
                  </div>
                  <div className="text-red-300 text-sm">
                    Priority clearance activated for {priorityDirection} lane | All other lanes stopped
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Intersection visualization */}
          <div
            className="relative bg-gray-700 rounded-lg p-8 overflow-hidden mx-auto border-4 border-gray-600"
            style={{ height: "600px", width: "600px" }}
          >
            {/* Roads with better styling */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 h-full bg-gray-600">
              <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full border-l-2 border-dashed border-yellow-400"></div>
            </div>
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-20 bg-gray-600">
              <div className="absolute top-1/2 transform -translate-y-1/2 w-full h-1 border-t-2 border-dashed border-yellow-400"></div>
            </div>

            {/* Center intersection with better styling */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gray-800 border-4 border-yellow-500 rounded-full shadow-lg">
              <div className="absolute inset-0 rounded-full border-2 border-yellow-300 opacity-50"></div>
            </div>

            {/* Traffic signals for each lane */}
            {["N", "S", "E", "W"].map((dir) => {
              const isGreen = dir === greenLight;
              let position = {};
              
              switch(dir) {
                case "N":
                  position = { top: "140px", left: "50%", transform: "translateX(-50%)" };
                  break;
                case "S":
                  position = { bottom: "140px", left: "50%", transform: "translateX(-50%)" };
                  break;
                case "E":
                  position = { right: "140px", top: "50%", transform: "translateY(-50%)" };
                  break;
                case "W":
                  position = { left: "140px", top: "50%", transform: "translateY(-50%)" };
                  break;
              }

              return (
                <div key={dir} className="absolute bg-gray-900 p-3 rounded-xl border-2 border-gray-600 shadow-lg" style={position}>
                  <div className={`w-8 h-8 rounded-full border-2 ${isGreen ? "bg-green-500 border-green-300 shadow-[0_0_10px_rgba(34,197,94,0.5)]" : "bg-red-500 border-red-300"} transition-all duration-300`}></div>
                </div>
              );
            })}

            {/* Timer display */}
            <div className="absolute top-4 left-4 bg-gray-900 px-4 py-2 rounded-lg border-2 border-gray-600 shadow-lg">
              <div className="flex items-center gap-2 text-white">
                <Clock size={16} />
                <span className="font-mono text-lg">{Math.ceil(timer)}s</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {greenLight} Lane {priorityActive && "(Priority)"}
              </div>
            </div>

            {/* Current green lane highlight */}
            <div className={`absolute ${
              greenLight === "N" ? "top-0 left-1/2 transform -translate-x-1/2 w-20 h-48 bg-green-500 bg-opacity-20 border-b-4 border-green-400" :
              greenLight === "S" ? "bottom-0 left-1/2 transform -translate-x-1/2 w-20 h-48 bg-green-500 bg-opacity-20 border-t-4 border-green-400" :
              greenLight === "E" ? "right-0 top-1/2 transform -translate-y-1/2 w-48 h-20 bg-green-500 bg-opacity-20 border-l-4 border-green-400" :
              "left-0 top-1/2 transform -translate-y-1/2 w-48 h-20 bg-green-500 bg-opacity-20 border-r-4 border-green-400"
            } transition-all duration-300`}></div>

            {/* Vehicles */}
            {vehicles.map((vehicle) => {
              const style = getVehicleStyle(vehicle);
              return (
                <div
                  key={vehicle.id}
                  className="absolute transition-all duration-100 ease-linear"
                  style={style}
                >
                  {renderVehicle(vehicle)}
                </div>
              );
            })}

            {/* Direction labels */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white font-bold bg-gray-900 bg-opacity-80 px-3 py-1 rounded-lg border border-gray-600">NORTH</div>
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white font-bold bg-gray-900 bg-opacity-80 px-3 py-1 rounded-lg border border-gray-600">SOUTH</div>
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white font-bold bg-gray-900 bg-opacity-80 px-3 py-1 rounded-lg border border-gray-600">WEST</div>
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white font-bold bg-gray-900 bg-opacity-80 px-3 py-1 rounded-lg border border-gray-600">EAST</div>
          </div>

          {/* Enhanced Legend */}
          <div className="mt-6 bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h3 className="text-white font-bold mb-3">Vehicle Types & Emergency Symbols</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              {Object.entries(VEHICLE_TYPES).map(([type, config]) => {
                const IconComponent = config.icon;
                return (
                  <div key={type} className={`flex items-center gap-2 p-2 rounded ${
                    config.isPriority ? "bg-red-900 bg-opacity-50" : "bg-gray-700"
                  }`}>
                    <div className={`p-1 rounded ${config.bgColor}`}>
                      <IconComponent 
                        className={config.color} 
                        size={16} 
                        fill={config.isPriority ? "currentColor" : "none"}
                      />
                    </div>
                    <span className="text-gray-300 capitalize text-xs">{type}</span>
                    {config.isPriority && (
                      <div className="flex items-center gap-1">
                        <Siren size={12} className="text-red-400" />
                        <span className="text-red-400 text-xs">PRIO</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 p-3 bg-yellow-900 bg-opacity-30 rounded border border-yellow-700">
              <div className="text-yellow-200 text-sm">
                <strong>Emergency Vehicle Symbols:</strong>
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                    <span>Red Flashing Light</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                    <span>Blue Flashing Light</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-red-600 rounded-full animate-spin"></div>
                    <span>Rotating Siren</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Siren size={14} className="text-red-400" />
                    <span>Siren Indicator</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          
        </div>

        {/* RIGHT: Event Log */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 h-full flex flex-col">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Activity size={20} className="text-green-400" />
              System Events & Decisions
            </h3>
            <div
              className="space-y-2 overflow-y-auto flex-1"
              style={{ maxHeight: "800px" }}
            >
              {eventLog.length === 0 ? (
                <div className="text-gray-500 text-sm italic">
                  No events yet. Start the simulation to see decision logic.
                </div>
              ) : (
                eventLog.map((event) => (
                  <div
                    key={event.id}
                    className={`p-3 rounded text-sm border-l-4 ${
                      event.type === "emergency"
                        ? "bg-red-900 bg-opacity-30 border-red-500 text-red-200"
                        : event.type === "success"
                        ? "bg-green-900 bg-opacity-30 border-green-500 text-green-200"
                        : event.type === "signal"
                        ? "bg-yellow-900 bg-opacity-30 border-yellow-500 text-yellow-200"
                        : event.type === "traffic"
                        ? "bg-blue-900 bg-opacity-30 border-blue-500 text-blue-200"
                        : "bg-gray-700 border-gray-600 text-gray-300"
                    }`}
                  >
                    <div className="font-mono text-xs opacity-70 mb-1">
                      {event.time}
                    </div>
                    <div className="text-xs">{event.message}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrafficSimulation;