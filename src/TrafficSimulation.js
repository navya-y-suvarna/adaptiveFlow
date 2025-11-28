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
} from "lucide-react";

const normalGreenTime = 15;
const emergencyGreenTime = 25;
const MAX_LOG_ITEMS = 80;

// Vehicle types with different properties
const VEHICLE_TYPES = {
  car: { icon: Car, color: "blue", speed: 1, size: 24, spawnRate: 0.5 },
  bus: { icon: Bus, color: "orange", speed: 0.7, size: 28, spawnRate: 0.2 },
  truck: { icon: Truck, color: "gray", speed: 0.6, size: 30, spawnRate: 0.15 },
  bike: { icon: Bike, color: "green", speed: 1.2, size: 20, spawnRate: 0.1 },
  ambulance: { icon: Truck, color: "red", speed: 1.5, size: 32, spawnRate: 0.05 }
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

const TrafficSimulation = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [greenLight, setGreenLight] = useState("N"); // Start with single lane
  const [timer, setTimer] = useState(normalGreenTime);
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [emergencyDirection, setEmergencyDirection] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [stats, setStats] = useState({
    totalVehicles: 0,
    avgWaitTime: 0,
    emergencyResponses: 0,
    avgEmergencyTime: 2.3,
  });
  const [eventLog, setEventLog] = useState([]);
  const [laneCounts, setLaneCounts] = useState({ N: 0, S: 0, E: 0, W: 0 });
  const [laneDensity, setLaneDensity] = useState({ N: 0, S: 0, E: 0, W: 0 });

  const animationRef = useRef(null);
  const lastTimeRef = useRef(0);
  const vehiclesRef = useRef([]);
  const timerRef = useRef(normalGreenTime);
  const lastAmbulanceSpawnRef = useRef(0);

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

  // --- DECIDE NEXT GREEN LANE --------------------------------------------

  const decideNextGreenLane = (vehicles, currentGreen) => {
    // Calculate density for each lane
    const density = { N: 0, S: 0, E: 0, W: 0 };
    let detectedAmbulance = null;

    vehicles.forEach(vehicle => {
      // Check for ambulances (highest priority)
      if (vehicle.type === "ambulance" && !detectedAmbulance) {
        detectedAmbulance = vehicle.direction;
      }

      // Calculate density with weights
      const weight = vehicle.type === "ambulance" ? 10 : 
                    vehicle.type === "truck" ? 3 : 
                    vehicle.type === "bus" ? 2 : 1;
      
      density[vehicle.direction] += weight;
    });

    // 1. Emergency vehicle has absolute priority
    if (detectedAmbulance) {
      return detectedAmbulance;
    }

    // 2. Find lane with maximum density
    let maxDensity = 0;
    let nextGreenLane = currentGreen;
    
    Object.entries(density).forEach(([lane, laneDensity]) => {
      if (laneDensity > maxDensity) {
        maxDensity = laneDensity;
        nextGreenLane = lane;
      }
    });

    // If all lanes are empty, rotate through lanes
    if (maxDensity === 0) {
      const lanes = ["N", "S", "E", "W"];
      const currentIndex = lanes.indexOf(currentGreen);
      nextGreenLane = lanes[(currentIndex + 1) % lanes.length];
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
          waiting: dir !== "N", // Only North lane starts green
          waitTime: 0,
          isEmergency: vehicleType === "ambulance",
          speed: config.speed,
        });
      }
    });
    return initial;
  };

  useEffect(() => {
    const initialVehicles = createInitialVehicles();
    setVehicles(initialVehicles);
    vehiclesRef.current = initialVehicles;
    
    // Calculate initial lane counts and density
    const counts = { N: 0, S: 0, E: 0, W: 0 };
    const density = { N: 0, S: 0, E: 0, W: 0 };
    
    initialVehicles.forEach(vehicle => {
      counts[vehicle.direction] = (counts[vehicle.direction] || 0) + 1;
      density[vehicle.direction] += vehicle.type === "ambulance" ? 10 : 
                                 vehicle.type === "truck" ? 3 : 
                                 vehicle.type === "bus" ? 2 : 1;
    });
    
    setLaneCounts(counts);
    setLaneDensity(density);
    
    setStats((prev) => ({
      ...prev,
      totalVehicles: initialVehicles.length,
    }));
    
    addEvent("Traffic simulation started. North lane has initial green signal.", "system");
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

      // --- VEHICLE UPDATE ------------------------------------------------
      setVehicles((prevVehicles) => {
        const updated = prevVehicles
          .map((vehicle) => {
            const canMove = vehicle.direction === greenLight;

            let waiting = vehicle.waiting;
            let waitTime = vehicle.waitTime;
            let position = vehicle.position;

            // If not the green lane → vehicle waits
            if (!canMove) {
              waiting = true;
              waitTime += safeDelta;
            } else {
              waiting = false;
              // Move vehicle based on type
              position = position - vehicle.speed * 0.8;
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

        // Calculate lane density
        const density = { N: 0, S: 0, E: 0, W: 0 };
        let detectedAmbulance = null;

        updated.forEach(vehicle => {
          // Check for ambulances
          if (vehicle.type === "ambulance" && !detectedAmbulance) {
            detectedAmbulance = vehicle.direction;
          }

          // Calculate density with weights
          const weight = vehicle.type === "ambulance" ? 10 : 
                        vehicle.type === "truck" ? 3 : 
                        vehicle.type === "bus" ? 2 : 1;
          
          density[vehicle.direction] += weight;
        });

        setLaneDensity(density);

        // Handle ambulance detection and emergency override
        if (detectedAmbulance && (!emergencyActive || emergencyDirection !== detectedAmbulance)) {
          setEmergencyActive(true);
          setEmergencyDirection(detectedAmbulance);
          setGreenLight(detectedAmbulance);
          timerRef.current = emergencyGreenTime;
          setTimer(emergencyGreenTime);
          
          addEvent(
            `🚨 Ambulance detected in ${detectedAmbulance} lane - Emergency override activated!`,
            "emergency"
          );
          
          setStats((prev) => ({
            ...prev,
            emergencyResponses: prev.emergencyResponses + 1,
          }));
        }

        // Check if emergency vehicle left
        const emergencyVehicles = updated.filter(v => v.type === "ambulance");
        if (emergencyActive && emergencyVehicles.length === 0) {
          setEmergencyActive(false);
          setEmergencyDirection(null);
          addEvent(
            "✓ Emergency vehicle cleared. Returning to normal operation.",
            "success"
          );
        }

        // Lane-wise counts
        const counts = { N: 0, S: 0, E: 0, W: 0 };
        updated.forEach((v) => {
          counts[v.direction] = (counts[v.direction] || 0) + 1;
        });
        setLaneCounts(counts);

        // Spawn new vehicles with different types
        lastAmbulanceSpawnRef.current += safeDelta;
        
        if (Math.random() < 0.02) { // General vehicle spawn rate
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
            isEmergency: vehicleType === "ambulance",
            speed: config.speed,
          };
          
          updated.push(newVehicle);
          setStats((prev) => ({
            ...prev,
            totalVehicles: prev.totalVehicles + 1,
          }));
          
          if (vehicleType === "ambulance") {
            addEvent(`🚑 New ambulance entered from ${dir} lane.`, "emergency");
          } else {
            addEvent(`New ${vehicleType} entered from ${dir} lane.`, "traffic");
          }
        }

        // Random ambulance spawn (independent of regular spawning)
        if (lastAmbulanceSpawnRef.current > 30 && Math.random() < 0.1) {
          const directions = ["N", "S", "E", "W"];
          const dir = directions[Math.floor(Math.random() * directions.length)];
          const config = VEHICLE_TYPES.ambulance;
          
          const ambulance = {
            id: `AMB-${Date.now()}`,
            direction: dir,
            type: "ambulance",
            position: 350,
            waiting: dir !== greenLight,
            waitTime: 0,
            isEmergency: true,
            speed: config.speed,
          };
          
          updated.push(ambulance);
          lastAmbulanceSpawnRef.current = 0;
          setStats((prev) => ({
            ...prev,
            totalVehicles: prev.totalVehicles + 1,
          }));
          
          addEvent(`🚑 Ambulance randomly spawned in ${dir} lane.`, "emergency");
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

      // --- TIMER + SIGNAL UPDATE (Single lane only) ---------------------
      if (!emergencyActive) {
        timerRef.current -= safeDelta;
        if (timerRef.current <= 0) {
          const nextGreen = decideNextGreenLane(vehiclesRef.current, greenLight);
          
          if (nextGreen !== greenLight) {
            setGreenLight(nextGreen);
            const density = laneDensity[nextGreen] || 0;
            
            addEvent(
              `Signal changed to ${nextGreen} lane (Density: ${density}).`,
              "signal"
            );
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
  }, [isRunning, greenLight, emergencyActive, emergencyDirection, laneDensity]);

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
    setEmergencyActive(false);
    setEmergencyDirection(null);
    lastTimeRef.current = 0;
    lastAmbulanceSpawnRef.current = 0;

    const initialVehicles = createInitialVehicles();
    setVehicles(initialVehicles);
    vehiclesRef.current = initialVehicles;
    
    const counts = { N: 0, S: 0, E: 0, W: 0 };
    const density = { N: 0, S: 0, E: 0, W: 0 };
    initialVehicles.forEach(vehicle => {
      counts[vehicle.direction] = (counts[vehicle.direction] || 0) + 1;
      density[vehicle.direction] += vehicle.type === "ambulance" ? 10 : 
                                 vehicle.type === "truck" ? 3 : 
                                 vehicle.type === "bus" ? 2 : 1;
    });
    
    setLaneCounts(counts);
    setLaneDensity(density);
    
    setStats({
      totalVehicles: initialVehicles.length,
      avgWaitTime: 0,
      emergencyResponses: 0,
      avgEmergencyTime: 2.3,
    });

    setEventLog([]);
    addEvent("System reset. All parameters restored to default.", "system");
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

  // --- DENSITY VISUALIZATION --------------------------------------------

  const DensityDisplay = () => {
    const maxDensity = Math.max(...Object.values(laneDensity), 1);
    
    return (
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mb-6">
        <h3 className="text-white font-bold mb-3 flex items-center gap-2">
          <Activity size={20} />
          Lane Density & Signal Control
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {["N", "S", "E", "W"].map((dir) => {
            const density = laneDensity[dir] || 0;
            const percentage = (density / maxDensity) * 100;
            const isGreen = dir === greenLight;
            const vehicleCount = laneCounts[dir] || 0;

            return (
              <div key={dir} className={`p-3 rounded-lg border transition-all duration-300 ${
                isGreen 
                  ? "bg-green-900 border-green-500 shadow-lg scale-105" 
                  : "bg-gray-800 border-gray-700"
              }`}>
                <div className="text-center mb-2">
                  <div className="text-gray-400 text-sm mb-1">
                    {dir === "N" ? "North" : dir === "S" ? "South" : dir === "E" ? "East" : "West"}
                  </div>
                  <div className={`text-xl font-bold ${isGreen ? "text-green-300" : "text-white"}`}>
                    {vehicleCount}
                  </div>
                  <div className="text-gray-500 text-xs">vehicles</div>
                </div>
                
                <div className="relative h-4 bg-gray-700 rounded-full mb-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isGreen ? "bg-green-500" : "bg-blue-500"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                    Density: {density}
                  </div>
                </div>
                
                {isGreen && (
                  <div className="text-green-400 text-xs text-center font-semibold">
                    ✓ GREEN SIGNAL
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
            <span className={`font-bold ${emergencyActive ? "text-red-400" : "text-green-400"}`}>
              {greenLight} {emergencyActive && "(Emergency Override)"}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm mt-2">
            <span className="text-gray-400">Next Change In:</span>
            <span className="font-mono text-yellow-400">{Math.ceil(timer)}s</span>
          </div>
        </div>
      </div>
    );
  };

  // --- VEHICLE RENDERING -------------------------------------------------

  const renderVehicle = (vehicle) => {
    const config = VEHICLE_TYPES[vehicle.type];
    const VehicleIcon = config.icon;
    const isCurrentLane = vehicle.direction === greenLight;
    
    return (
      <VehicleIcon
        className={`${
          vehicle.waiting || !isCurrentLane
            ? `text-${config.color}-300 opacity-80`
            : `text-${config.color}-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.7)]`
        } ${vehicle.isEmergency ? "animate-pulse drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]" : ""}`}
        size={config.size}
        fill={vehicle.isEmergency ? "white" : "currentColor"}
      />
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <Activity className="text-green-400" />
          Dynamic Single-Lane Traffic Management
        </h1>
        <p className="text-gray-300">
          One lane at a time - Maximum density priority with emergency override
        </p>
      </div>

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
              <span className={`font-semibold ${emergencyActive ? "text-red-400" : "text-green-400"}`}>
                {emergencyActive ? "🚨 Emergency Override" : "📊 Density-Based"}
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
                Emergency Responses
              </div>
              <div className="text-2xl font-bold text-red-400">
                {stats.emergencyResponses}
              </div>
            </div>
          </div>

          {/* Density Display */}
          <DensityDisplay />

          {/* Emergency banner */}
          {emergencyActive && (
            <div className="bg-red-900 border-2 border-red-500 rounded-lg p-4 mb-6 animate-pulse">
              <div className="flex items-center gap-3">
                <Truck className="text-red-300" size={24} />
                <div>
                  <div className="text-red-100 font-bold">
                    EMERGENCY OVERRIDE ACTIVE
                  </div>
                  <div className="text-red-300 text-sm">
                    Ambulance detected in {emergencyDirection} lane | All other lanes stopped | Priority clearance enabled
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Intersection visualization */}
          <div
            className="relative bg-gray-700 rounded-lg p-8 overflow-hidden mx-auto"
            style={{ height: "600px", width: "600px" }}
          >
            {/* Roads */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-16 h-full bg-gray-600">
              <div className="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full border-l-2 border-dashed border-yellow-300"></div>
            </div>
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-16 bg-gray-600">
              <div className="absolute top-1/2 transform -translate-y-1/2 w-full h-0.5 border-t-2 border-dashed border-yellow-300"></div>
            </div>

            {/* Center intersection */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-gray-800 border-4 border-yellow-500 rounded-full"></div>

            {/* Traffic signals for each lane */}
            {["N", "S", "E", "W"].map((dir) => {
              const isGreen = dir === greenLight;
              let position = {};
              
              switch(dir) {
                case "N":
                  position = { top: "120px", left: "50%", transform: "translateX(-50%)" };
                  break;
                case "S":
                  position = { bottom: "120px", left: "50%", transform: "translateX(-50%)" };
                  break;
                case "E":
                  position = { right: "120px", top: "50%", transform: "translateY(-50%)" };
                  break;
                case "W":
                  position = { left: "120px", top: "50%", transform: "translateY(-50%)" };
                  break;
              }

              return (
                <div key={dir} className="absolute bg-gray-900 p-2 rounded-lg border border-gray-600" style={position}>
                  <div className={`w-6 h-6 rounded-full border-2 ${isGreen ? "bg-green-500 border-green-300" : "bg-red-500 border-red-300"} shadow-lg`}></div>
                </div>
              );
            })}

            {/* Timer display */}
            <div className="absolute top-4 left-4 bg-gray-900 px-4 py-2 rounded-lg border border-gray-600">
              <div className="flex items-center gap-2 text-white">
                <Clock size={16} />
                <span className="font-mono text-lg">{Math.ceil(timer)}s</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {greenLight} Lane Green{emergencyActive && " (Emergency)"}
              </div>
            </div>

            {/* Current green lane highlight */}
            <div className={`absolute ${
              greenLight === "N" ? "top-0 left-1/2 transform -translate-x-1/2 w-16 h-48 bg-green-500 bg-opacity-20" :
              greenLight === "S" ? "bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-48 bg-green-500 bg-opacity-20" :
              greenLight === "E" ? "right-0 top-1/2 transform -translate-y-1/2 w-48 h-16 bg-green-500 bg-opacity-20" :
              "left-0 top-1/2 transform -translate-y-1/2 w-48 h-16 bg-green-500 bg-opacity-20"
            }`}></div>

            {/* Vehicles */}
            {vehicles.map((vehicle) => {
              const style = getVehicleStyle(vehicle);
              return (
                <div
                  key={vehicle.id}
                  className="absolute transition-all duration-100"
                  style={style}
                >
                  {renderVehicle(vehicle)}
                </div>
              );
            })}

            {/* Direction labels */}
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-white font-bold bg-gray-900 bg-opacity-70 px-2 py-1 rounded">NORTH</div>
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-white font-bold bg-gray-900 bg-opacity-70 px-2 py-1 rounded">SOUTH</div>
            <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white font-bold bg-gray-900 bg-opacity-70 px-2 py-1 rounded">WEST</div>
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white font-bold bg-gray-900 bg-opacity-70 px-2 py-1 rounded">EAST</div>
          </div>

          {/* Legend */}
          <div className="mt-6 bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h3 className="text-white font-bold mb-3">Vehicle Types & System Info</h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
              {Object.entries(VEHICLE_TYPES).map(([type, config]) => {
                const IconComponent = config.icon;
                return (
                  <div key={type} className="flex items-center gap-2">
                    <IconComponent 
                      className={`text-${config.color}-400`} 
                      size={18} 
                      fill={type === "ambulance" ? "white" : "currentColor"}
                    />
                    <span className="text-gray-300 capitalize text-xs">{type}</span>
                  </div>
                );
              })}
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-300 text-xs">Green Lane</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-gray-300 text-xs">Red Lane</span>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="mt-6 bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg p-4">
            <h3 className="text-blue-300 font-bold mb-2">System Logic</h3>
            <ul className="text-blue-200 text-sm space-y-1">
              <li>✓ <strong>Single Lane Operation:</strong> Only one lane gets green signal at a time</li>
              <li>✓ <strong>Dynamic Priority:</strong> Lane with highest vehicle density gets green</li>
              <li>✓ <strong>Emergency Override:</strong> Ambulance detection immediately switches to its lane</li>
              <li>✓ <strong>Random Ambulance Spawn:</strong> Ambulances spawn randomly in all directions</li>
              <li>✓ <strong>Weighted Density:</strong> Different vehicle types have different weights</li>
              <li>✓ <strong>Automatic Clearance:</strong> Emergency lane gets exclusive green until ambulance passes</li>
            </ul>
          </div>
        </div>

        {/* RIGHT: Event Log */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 h-full flex flex-col">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Activity size={20} className="text-green-400" />
              System Events
            </h3>
            <div
              className="space-y-2 overflow-y-auto flex-1"
              style={{ maxHeight: "800px" }}
            >
              {eventLog.length === 0 ? (
                <div className="text-gray-500 text-sm italic">
                  No events yet. Start the simulation to see activity.
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