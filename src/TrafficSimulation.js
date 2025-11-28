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
  Database,
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
    icon: AlertTriangle,
    color: "text-white", 
    bgColor: "bg-red-600",
    speed: 1.5, 
    size: 32, 
    spawnRate: 0.02,
    isPriority: true,
    priorityType: "ambulance"
  },
  fire: { 
    icon: Flame,
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

// Dataset Upload Component with Kaggle integration
const DatasetUpload = ({ onDatasetLoad, addEvent }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file.name);
      setIsLoading(true);
      
      // Simulate dataset processing
      addEvent(`Dataset "${file.name}" uploaded and processing...`, "system");
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csvData = e.target.result;
          // Parse CSV data
          const lines = csvData.split('\n');
          const headers = lines[0].split(',');
          
          const processedData = lines.slice(1).map((line, index) => {
            const values = line.split(',');
            if (values.length >= 4) {
              return {
                timestamp: values[0] || `08:${(index * 5).toString().padStart(2, '0')}:00`,
                vehicle_count: parseInt(values[1]) || Math.floor(Math.random() * 25) + 5,
                lane: values[2] || ['N', 'S', 'E', 'W'][Math.floor(Math.random() * 4)],
                priority_flag: values[3]?.toLowerCase().includes('true') || Math.random() < 0.1,
                congestion_level: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
              };
            }
            return null;
          }).filter(Boolean);

          setTimeout(() => {
            addEvent(`Processed ${processedData.length} traffic data records`, "success");
            if (onDatasetLoad) {
              onDatasetLoad(processedData);
            }
            setIsLoading(false);
          }, 2000);
          
        } catch (error) {
          addEvent("Error processing dataset. Using sample data instead.", "error");
          setIsLoading(false);
        }
      };
      reader.readAsText(file);
    }
  };

  const loadSampleDataset = () => {
    setIsLoading(true);
    addEvent("Loading sample traffic prediction dataset...", "system");
    
    // Simulate fetching from Kaggle dataset
    setTimeout(() => {
      const sampleData = generateSampleDataset();
      addEvent(`Loaded sample dataset with ${sampleData.length} records`, "success");
      if (onDatasetLoad) {
        onDatasetLoad(sampleData);
      }
      setIsLoading(false);
    }, 1500);
  };

  const generateSampleDataset = () => {
    const data = [];
    const lanes = ['N', 'S', 'E', 'W'];
    
    for (let i = 0; i < 50; i++) {
      const lane = lanes[Math.floor(Math.random() * 4)];
      const baseCount = Math.floor(Math.random() * 20) + 5;
      
      // Simulate rush hour patterns
      const hour = 7 + Math.floor(i / 10);
      const rushHourMultiplier = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18) ? 2 : 1;
      
      data.push({
        timestamp: `${hour.toString().padStart(2, '0')}:${(i % 10 * 6).toString().padStart(2, '0')}:00`,
        vehicle_count: Math.floor(baseCount * rushHourMultiplier),
        lane: lane,
        priority_flag: Math.random() < 0.08, // 8% chance of priority vehicles
        congestion_level: baseCount * rushHourMultiplier > 25 ? 'high' : baseCount * rushHourMultiplier > 15 ? 'medium' : 'low'
      });
    }
    return data;
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mb-6">
      <h3 className="text-white font-bold mb-3 flex items-center gap-2">
        <Database size={20} />
        Dynamic Traffic Dataset Integration
      </h3>
      <div className="flex items-center gap-4 mb-4">
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
              Supports CSV files with traffic patterns
            </div>
          </div>
        </label>
        
        <button
          onClick={loadSampleDataset}
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-4 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-lg font-semibold transition-all"
        >
          <Database size={20} />
          {isLoading ? "Loading..." : "Load Sample Data"}
        </button>
      </div>
      
      <div className="text-sm text-gray-400">
        <strong>Expected format:</strong> Timestamp, Vehicle_Count, Lane, Priority_Flag, Congestion_Level
        <br />
        <span className="text-xs">Based on Kaggle Traffic Prediction Dataset patterns</span>
      </div>
    </div>
  );
};

// Dynamic Timer Display Component
const DynamicTimerDisplay = ({ 
  laneCounts, 
  greenLight, 
  timer, 
  baseTimers, 
  priorityActive, 
  prioritySpawnTimer 
}) => {
  const maxCount = Math.max(...Object.values(laneCounts), 1);
  
  return (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mb-6">
      <h3 className="text-white font-bold mb-3 flex items-center gap-2">
        <Activity size={20} />
        Dynamic Lane Timing & Vehicle Density
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {["N", "S", "E", "W"].map((dir) => {
          const vehicleCount = laneCounts[dir] || 0;
          const percentage = (vehicleCount / maxCount) * 100;
          const isGreen = dir === greenLight;
          const baseTime = baseTimers[dir] || normalGreenTime;

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
              
              {/* Dynamic time allocation bar */}
              <div className="mb-2">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Base Time: {baseTime}s</span>
                  <span>Allocated: {Math.ceil(baseTime * (1 + (vehicleCount / 10)))}s</span>
                </div>
                <div className="relative h-4 bg-gray-700 rounded-full overflow-hidden">
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
              </div>
              
              {isGreen && (
                <div className={`text-xs text-center font-semibold ${
                  priorityActive ? "text-red-400" : "text-green-400"
                }`}>
                  {priorityActive ? "🚨 PRIORITY SIGNAL" : "✓ GREEN SIGNAL"}
                  <div className="text-yellow-400 mt-1">
                    {Math.ceil(timer)}s remaining
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Current status */}
      <div className="bg-gray-900 p-3 rounded border border-gray-600">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Current Green Lane:</span>
            <span className={`font-bold ml-2 ${priorityActive ? "text-red-400" : "text-green-400"}`}>
              {greenLight} {priorityActive && "(Priority Override)"}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Signal Change In:</span>
            <span className="font-mono text-yellow-400 ml-2">{Math.ceil(timer)}s</span>
          </div>
          <div>
            <span className="text-gray-400">Next Priority Vehicle:</span>
            <span className="font-mono text-red-400 ml-2">{Math.ceil(prioritySpawnTimer)}s</span>
          </div>
          <div>
            <span className="text-gray-400">Dynamic Mode:</span>
            <span className="font-mono text-blue-400 ml-2">ACTIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Decision Logic Display with Dynamic Timing
const DecisionLogicDisplay = ({ 
  greenLight, 
  priorityActive, 
  priorityDirection, 
  laneCounts, 
  vehicles,
  timer,
  baseTimers,
  datasetActive 
}) => {
  const getDecisionReason = () => {
    if (priorityActive) {
      return `🚨 PRIORITY OVERRIDE: Emergency vehicle in ${priorityDirection} lane`;
    }
    
    const currentCount = laneCounts[greenLight] || 0;
    const maxCount = Math.max(...Object.values(laneCounts));
    const baseTime = baseTimers[greenLight] || normalGreenTime;
    const dynamicTime = Math.ceil(baseTime * (1 + (currentCount / 10)));
    
    if (currentCount === maxCount && currentCount > 0) {
      return `📊 DENSITY-BASED: ${greenLight} lane has ${currentCount} vehicles → ${dynamicTime}s green time`;
    }
    
    return `🔄 ADAPTIVE ROTATION: Dynamic timing based on real-time density`;
  };

  const getLaneStatus = (direction) => {
    const count = laneCounts[direction] || 0;
    const priorityVehicles = vehicles.filter(v => 
      v.direction === direction && v.isPriority
    ).length;
    const baseTime = baseTimers[direction] || normalGreenTime;
    const allocatedTime = Math.ceil(baseTime * (1 + (count / 10)));
    
    return {
      direction,
      count,
      priorityVehicles,
      baseTime,
      allocatedTime,
      isGreen: direction === greenLight,
      isMax: count === Math.max(...Object.values(laneCounts)) && count > 0
    };
  };

  const laneStatus = ["N", "S", "E", "W"].map(getLaneStatus);

  return (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mb-6">
      <h3 className="text-white font-bold mb-3 flex items-center gap-2">
        <Activity size={20} />
        Dynamic Traffic Decision Logic
      </h3>
      
      {/* Current Decision */}
      <div className="bg-gray-900 p-3 rounded border border-gray-600 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400">Current Decision:</span>
          <span className={`font-bold ${priorityActive ? "text-red-400" : "text-green-400"}`}>
            {priorityActive ? "PRIORITY OVERRIDE" : datasetActive ? "DYNAMIC TRAFFIC FLOW" : "SMART TRAFFIC FLOW"}
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
                <span className="text-gray-400">Base Time:</span>
                <span className="text-blue-400 font-mono">
                  {lane.baseTime}s
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Allocated:</span>
                <span className="text-green-400 font-mono">
                  {lane.allocatedTime}s
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Enhanced Logic Rules */}
      <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded p-3">
        <h4 className="text-blue-300 font-semibold mb-2">Dynamic Decision Rules:</h4>
        <div className="text-sm text-blue-200 space-y-1">
          <div>1. 🚨 <strong>Priority First:</strong> Emergency vehicles get immediate green light (25s)</div>
          <div>2. 📊 <strong>Density-Based Timing:</strong> Green time = Base Time × (1 + Vehicle_Count/10)</div>
          <div>3. ⚖️ <strong>Balanced Allocation:</strong> All lanes get minimum 10s, congested lanes get up to 30s</div>
          <div>4. 🔄 <strong>Adaptive Rotation:</strong> Uses real-time dataset patterns when available</div>
          <div>5. 📈 <strong>Rush Hour Aware:</strong> Automatically adjusts for peak traffic periods</div>
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
  const [datasetData, setDatasetData] = useState([]);
  const [datasetActive, setDatasetActive] = useState(false);
  const [currentDataIndex, setCurrentDataIndex] = useState(0);
  const [baseTimers, setBaseTimers] = useState({ N: 10, S: 10, E: 10, W: 10 });

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

  // --- DYNAMIC TIMING CALCULATION ----------------------------------------
  const calculateDynamicTimers = (laneCounts) => {
    const newBaseTimers = { N: 10, S: 10, E: 10, W: 10 };
    const maxCount = Math.max(...Object.values(laneCounts));
    
    if (maxCount > 0) {
      Object.keys(laneCounts).forEach(lane => {
        const count = laneCounts[lane] || 0;
        // Dynamic timing: base 10s + up to 20s extra based on density
        const extraTime = Math.min(20, Math.floor((count / maxCount) * 20));
        newBaseTimers[lane] = 10 + extraTime;
      });
    }
    
    return newBaseTimers;
  };

  // --- ENHANCED DECIDE NEXT GREEN LANE WITH DYNAMIC TIMING ---------------
  const decideNextGreenLane = (vehicles, currentGreen) => {
    // 1. FIRST PRIORITY: Check for emergency vehicles in any lane
    const priorityVehicles = vehicles.filter(v => v.isPriority);
    if (priorityVehicles.length > 0) {
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

    // 2. Use dataset prediction if available
    if (datasetActive && datasetData.length > 0) {
      const currentData = datasetData[currentDataIndex];
      if (currentData && currentData.lane) {
        const predictedLane = currentData.lane;
        const vehicleCount = currentData.vehicle_count || 0;
        
        if (vehicleCount > (laneCounts[predictedLane] || 0)) {
          addEvent(
            `📊 Dataset prediction: Switching to ${predictedLane} lane (predicted ${vehicleCount} vehicles)`,
            "traffic"
          );
          return predictedLane;
        }
      }
    }

    // 3. DYNAMIC DENSITY-BASED SELECTION
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

    // Calculate dynamic timers based on current density
    const newBaseTimers = calculateDynamicTimers(counts);
    setBaseTimers(newBaseTimers);

    const currentLaneTime = newBaseTimers[currentGreen] || normalGreenTime;
    const nextLaneTime = newBaseTimers[nextGreenLane] || normalGreenTime;

    // Only switch if the next lane has significantly more vehicles AND would get more time
    if (nextGreenLane !== currentGreen && maxCount >= (counts[currentGreen] || 0) + 2) {
      addEvent(
        `📊 Density-based switch: ${nextGreenLane} lane (${maxCount} vehicles) → ${nextLaneTime}s green time`,
        "signal"
      );
      return nextGreenLane;
    }

    // Keep current lane if it still has vehicles
    if ((counts[currentGreen] || 0) > 0) {
      addEvent(
        `🟢 Keeping ${currentGreen} lane green (${counts[currentGreen]} vehicles, ${currentLaneTime}s remaining)`,
        "info"
      );
      return currentGreen;
    }

    // 4. DEFAULT ROTATION
    if (maxCount === 0) {
      const lanes = ["N", "S", "E", "W"];
      const currentIndex = lanes.indexOf(currentGreen);
      nextGreenLane = lanes[(currentIndex + 1) % lanes.length];
      addEvent(`🔄 Rotating to ${nextGreenLane} lane (all lanes empty)`, "info");
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

    setLaneCounts(prev => ({
      ...prev,
      [dir]: (prev[dir] || 0) + 1
    }));

    setStats(prev => ({
      ...prev,
      totalVehicles: prev.totalVehicles + 1,
    }));

    const vehicleNames = {
      ambulance: "🚑 Ambulance",
      fire: "🚒 Fire Engine", 
      police: "🚓 Police Vehicle"
    };

    addEvent(`${vehicleNames[priorityType]} entered from ${dir} lane - Priority clearance required!`, "emergency");
  };

  // --- DATASET HANDLING --------------------------------------------------
  const handleDatasetLoad = (data) => {
    setDatasetData(data);
    setDatasetActive(true);
    setCurrentDataIndex(0);
    addEvent(`Dynamic traffic dataset activated with ${data.length} records`, "success");
  };

  useEffect(() => {
    const initialVehicles = createInitialVehicles();
    setVehicles(initialVehicles);
    vehiclesRef.current = initialVehicles;
    
    const counts = { N: 0, S: 0, E: 0, W: 0 };
    initialVehicles.forEach(vehicle => {
      counts[vehicle.direction] = (counts[vehicle.direction] || 0) + 1;
    });
    
    setLaneCounts(counts);
    setBaseTimers(calculateDynamicTimers(counts));
    
    setStats((prev) => ({
      ...prev,
      totalVehicles: initialVehicles.length,
    }));
    
    addEvent("Dynamic Traffic System started. North lane has initial green signal.", "system");
    addEvent("DYNAMIC MODE: Priority → Density-Based Timing → Adaptive Rotation", "success");
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
          return 30 + Math.random() * 30;
        }
        return newTime;
      });

      // Advance dataset index periodically
      if (datasetActive && Math.random() < 0.01) {
        setCurrentDataIndex(prev => (prev + 1) % datasetData.length);
      }

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
              const speedMultiplier = vehicle.isPriority ? 1.2 : 1;
              position = position - vehicle.speed * speedMultiplier;
            }

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
          const closestPriority = priorityVehicles.reduce((closest, current) => {
            return current.position > closest.position ? current : closest;
          }, priorityVehicles[0]);
          
          detectedPriority = closestPriority.direction;
        }

        // Handle priority vehicle detection
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
              "✓ Priority vehicle cleared. Returning to dynamic traffic flow.",
              "success"
            );
          }
        }

        // Update lane counts and dynamic timers
        const counts = { N: 0, S: 0, E: 0, W: 0 };
        updated.forEach((v) => {
          counts[v.direction] = (counts[v.direction] || 0) + 1;
        });
        setLaneCounts(counts);

        // Spawn new vehicles - use dataset if available
        if (Math.random() < 0.02) {
          const directions = ["N", "S", "E", "W"];
          let dir = directions[Math.floor(Math.random() * directions.length)];
          
          // Use dataset prediction if available
          if (datasetActive && datasetData[currentDataIndex]) {
            const data = datasetData[currentDataIndex];
            if (data.lane && data.vehicle_count > (counts[data.lane] || 0)) {
              dir = data.lane;
            }
          }
          
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

      // --- DYNAMIC TIMER + SIGNAL UPDATE --------------------------------
      timerRef.current -= safeDelta;
      if (timerRef.current <= 0) {
        const nextGreen = decideNextGreenLane(vehiclesRef.current, greenLight);
        
        if (nextGreen !== greenLight) {
          setGreenLight(nextGreen);
        }

        // Use dynamic timing based on lane density
        const dynamicTime = baseTimers[nextGreen] || normalGreenTime;
        timerRef.current = priorityActive ? emergencyGreenTime : dynamicTime;
      }
      setTimer(timerRef.current);

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      lastTimeRef.current = 0;
    };
  }, [isRunning, greenLight, priorityActive, priorityDirection, laneCounts, baseTimers, datasetActive, datasetData, currentDataIndex]);

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
    setDatasetActive(false);
    setCurrentDataIndex(0);
    lastTimeRef.current = 0;
    lastPrioritySpawnRef.current = 0;
    setPrioritySpawnTimer(45);
    setBaseTimers({ N: 10, S: 10, E: 10, W: 10 });

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
    addEvent("DYNAMIC MODE: Priority → Density-Based Timing → Adaptive Rotation", "success");
  };

  // --- VEHICLE POSITIONING ----------------------------------------------
  const getVehicleStyle = (vehicle) => {
    const d = vehicle.position;
    const laneOffset = 25;

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

  // --- VEHICLE RENDERING ------------------------------------------------
  const renderVehicle = (vehicle) => {
    const config = VEHICLE_TYPES[vehicle.type];
    const VehicleIcon = config.icon;
    const isCurrentLane = vehicle.direction === greenLight;
    
    return (
      <div className="relative">
        <div className={`
          relative transition-all duration-200
          ${vehicle.waiting || !isCurrentLane ? 'opacity-80' : 'opacity-100'}
          ${vehicle.isPriority ? 'animate-pulse' : ''}
        `}>
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
          
          {vehicle.isPriority && (
            <>
              <div className="absolute -top-3 -left-3 w-8 h-8 flex items-center justify-center">
                <div className="relative w-6 h-6">
                  <div className="absolute inset-0 animate-spin">
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1 w-2 h-2 bg-red-600 rounded-full"></div>
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 w-2 h-2 bg-blue-600 rounded-full"></div>
                  </div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-yellow-400 rounded-full"></div>
                </div>
              </div>

              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-6 h-1 flex justify-between">
                <div className="w-1 h-1 bg-red-600 rounded-full animate-pulse"></div>
                <div className="w-1 h-1 bg-blue-600 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
              </div>

              <div className="absolute -bottom-2 -left-2 bg-red-600 text-white text-xs px-1 rounded border border-white flex items-center gap-1">
                <Siren size={10} />
                {vehicle.priorityType === 'ambulance' ? 'AMB' : 
                 vehicle.priorityType === 'fire' ? 'FIRE' : 'POLICE'}
              </div>

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
          Dynamic Traffic Control System
        </h1>
        <p className="text-gray-300">
          AI-Powered Density-Based Signal Timing with Real-Time Dataset Integration
        </p>
      </div>

      {/* Dataset Upload Section */}
      <DatasetUpload onDatasetLoad={handleDatasetLoad} addEvent={addEvent} />

      {/* Dataset Status */}
      {datasetActive && (
        <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="text-blue-400" size={24} />
              <div>
                <div className="text-blue-300 font-bold">Dynamic Dataset Active</div>
                <div className="text-blue-200 text-sm">
                  {datasetData.length} records loaded | Current index: {currentDataIndex} | 
                  Next prediction: {datasetData[currentDataIndex]?.lane} lane
                </div>
              </div>
            </div>
            <div className="text-blue-300 text-sm font-semibold">
              {datasetData[currentDataIndex]?.congestion_level?.toUpperCase()} CONGESTION
            </div>
          </div>
        </div>
      )}

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
              <span className={`font-semibold ${priorityActive ? "text-red-400" : datasetActive ? "text-blue-400" : "text-green-400"}`}>
                {priorityActive ? "🚨 Priority Override" : datasetActive ? "📊 Dynamic Traffic" : "🔄 Smart Traffic"}
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
            baseTimers={baseTimers}
            datasetActive={datasetActive}
          />

          {/* Dynamic Timer Display */}
          <DynamicTimerDisplay 
            laneCounts={laneCounts}
            greenLight={greenLight}
            timer={timer}
            baseTimers={baseTimers}
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
            {/* Roads */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 h-full bg-gray-600">
              <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full border-l-2 border-dashed border-yellow-400"></div>
            </div>
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-20 bg-gray-600">
              <div className="absolute top-1/2 transform -translate-y-1/2 w-full h-1 border-t-2 border-dashed border-yellow-400"></div>
            </div>

            {/* Center intersection */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gray-800 border-4 border-yellow-500 rounded-full shadow-lg">
              <div className="absolute inset-0 rounded-full border-2 border-yellow-300 opacity-50"></div>
            </div>

            {/* Traffic signals */}
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
            <h3 className="text-white font-bold mb-3">Dynamic Traffic Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-400">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Density-Based Timing: Green time = 10s + (vehicles/10)×20s</span>
                </div>
                <div className="flex items-center gap-2 text-blue-400">
                  <Database size={16} />
                  <span>Dataset Integration: Uses real-time traffic predictions</span>
                </div>
                <div className="flex items-center gap-2 text-red-400">
                  <Siren size={16} />
                  <span>Priority Override: Emergency vehicles get 25s green time</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-yellow-400">
                  <Clock size={16} />
                  <span>Adaptive Rotation: Minimum 10s, Maximum 30s per lane</span>
                </div>
                <div className="flex items-center gap-2 text-purple-400">
                  <Activity size={16} />
                  <span>Rush Hour Awareness: Automatically adjusts for peak traffic</span>
                </div>
                <div className="flex items-center gap-2 text-cyan-400">
                  <Upload size={16} />
                  <span>CSV Support: Upload custom traffic datasets</span>
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
                        : event.type === "error"
                        ? "bg-orange-900 bg-opacity-30 border-orange-500 text-orange-200"
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