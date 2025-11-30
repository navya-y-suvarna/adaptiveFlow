import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Activity, Clock, Siren } from "lucide-react";
import DatasetUpload from "./components/DatasetUpload";
import DecisionLogicDisplay from "./components/DecisionLogicDisplay";
import VehicleCountdown from "./components/VehicleCountdown";
import DensityDisplay from "./components/DensityDisplay";
import {
  VEHICLE_TYPES,
  normalGreenTime,
  emergencyGreenTime,
} from "./utils/constants";
import { getRandomVehicleType } from "./utils/vehicleUtils";
import { addEvent } from "./utils/eventUtils";

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
    const priorityVehicles = vehicles.filter((v) => v.isPriority);
    if (priorityVehicles.length > 0) {
      // Find the lane with the most priority vehicles
      const priorityCounts = { N: 0, S: 0, E: 0, W: 0 };
      priorityVehicles.forEach((v) => {
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
          setEventLog,
          `🚨 Priority override: ${priorityLane} lane selected (${maxPriority} emergency vehicles)`,
          "emergency"
        );
        return priorityLane;
      }
    }

    // 2. SECOND PRIORITY: If current lane has vehicles, keep it green to clear traffic
    const currentLaneVehicles = vehicles.filter(
      (v) => v.direction === currentGreen
    );
    if (currentLaneVehicles.length > 0) {
      // Only change if another lane has significantly more vehicles
      const counts = { N: 0, S: 0, E: 0, W: 0 };
      vehicles.forEach((v) => {
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
          setEventLog,
          `📊 Switching to ${maxLane} lane (${maxCount} vehicles vs ${currentCount} in current lane)`,
          "signal"
        );
        return maxLane;
      }

      // Keep current lane green to clear traffic
      addEvent(
        setEventLog,
        `🟢 Keeping ${currentGreen} lane green (${currentCount} vehicles to clear)`,
        "info"
      );
      return currentGreen;
    }

    // 3. THIRD PRIORITY: Lane with maximum vehicles
    const counts = { N: 0, S: 0, E: 0, W: 0 };
    vehicles.forEach((v) => {
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
      addEvent(
        setEventLog,
        `🔄 Rotating to ${nextGreenLane} lane (all lanes empty)`,
        "info"
      );
    } else if (nextGreenLane !== currentGreen) {
      addEvent(
        setEventLog,
        `📊 Switching to ${nextGreenLane} lane (${maxCount} vehicles - maximum)`,
        "signal"
      );
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
    const priorityType =
      priorityTypes[Math.floor(Math.random() * priorityTypes.length)];
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

    setVehicles((prev) => {
      const updated = [...prev, priorityVehicle];
      vehiclesRef.current = updated;
      return updated;
    });

    // Update lane counts
    setLaneCounts((prev) => ({
      ...prev,
      [dir]: (prev[dir] || 0) + 1,
    }));

    setStats((prev) => ({
      ...prev,
      totalVehicles: prev.totalVehicles + 1,
    }));

    // Add appropriate event message
    const vehicleNames = {
      ambulance: "🚑 Ambulance",
      fire: "🚒 Fire Engine",
      police: "🚓 Police Vehicle",
    };

    addEvent(
      setEventLog,
      `${vehicleNames[priorityType]} entered from ${dir} lane - Priority clearance required!`,
      "emergency"
    );
  };

  useEffect(() => {
    const initialVehicles = createInitialVehicles();
    setVehicles(initialVehicles);
    vehiclesRef.current = initialVehicles;

    // Calculate initial lane counts
    const counts = { N: 0, S: 0, E: 0, W: 0 };
    initialVehicles.forEach((vehicle) => {
      counts[vehicle.direction] = (counts[vehicle.direction] || 0) + 1;
    });

    setLaneCounts(counts);

    setStats((prev) => ({
      ...prev,
      totalVehicles: initialVehicles.length,
    }));

    addEvent(
      setEventLog,
      "Smart Traffic System started. North lane has initial green signal.",
      "system"
    );
    addEvent(
      setEventLog,
      "SYSTEM READY: Priority vehicles → Max vehicles → Lane rotation",
      "success"
    );
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
      setPrioritySpawnTimer((prev) => {
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
        const priorityVehicles = updated.filter(
          (v) => v.isPriority && v.position > 100
        );
        let detectedPriority = null;

        if (priorityVehicles.length > 0 && !priorityActive) {
          // Find the priority vehicle closest to intersection
          const closestPriority = priorityVehicles.reduce(
            (closest, current) => {
              return current.position > closest.position ? current : closest;
            },
            priorityVehicles[0]
          );

          detectedPriority = closestPriority.direction;
        }

        // Handle priority vehicle detection - IMMEDIATE response
        if (
          detectedPriority &&
          (!priorityActive || priorityDirection !== detectedPriority)
        ) {
          setPriorityActive(true);
          setPriorityDirection(detectedPriority);
          setGreenLight(detectedPriority);
          timerRef.current = emergencyGreenTime;
          setTimer(emergencyGreenTime);

          const priorityVehicle = priorityVehicles.find(
            (v) => v.direction === detectedPriority
          );
          const vehicleNames = {
            ambulance: "Ambulance",
            fire: "Fire Engine",
            police: "Police Vehicle",
          };

          addEvent(
            setEventLog,
            `🚨 IMMEDIATE RESPONSE: ${
              vehicleNames[priorityVehicle.priorityType]
            } detected in ${detectedPriority} lane - Priority override activated!`,
            "emergency"
          );

          setStats((prev) => ({
            ...prev,
            priorityResponses: prev.priorityResponses + 1,
          }));
        }

        // Check if priority vehicle left
        if (priorityActive) {
          const remainingPriority = updated.filter(
            (v) => v.isPriority && v.direction === priorityDirection
          );
          if (remainingPriority.length === 0) {
            setPriorityActive(false);
            setPriorityDirection(null);
            addEvent(
              setEventLog,
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
          const avgWait =
            waitingVehicles.reduce((sum, v) => sum + v.waitTime, 0) /
            waitingVehicles.length;
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
          const nextGreen = decideNextGreenLane(
            vehiclesRef.current,
            greenLight
          );

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
    initialVehicles.forEach((vehicle) => {
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
    addEvent(
      setEventLog,
      "System reset. All parameters restored to default.",
      "system"
    );
    addEvent(
      setEventLog,
      "DECISION LOGIC: 1. Priority Vehicles → 2. Max Vehicles → 3. Lane Rotation",
      "success"
    );
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
        <div
          className={`
          relative transition-all duration-200
          ${vehicle.waiting || !isCurrentLane ? "opacity-80" : "opacity-100"}
          ${vehicle.isPriority ? "animate-pulse" : ""}
        `}
        >
          {/* Vehicle body with shadow and glow */}
          <div
            className={`
            rounded-lg p-1
            ${config.bgColor}
            ${
              vehicle.isPriority
                ? "shadow-[0_0_15px_rgba(239,68,68,0.8)]"
                : "shadow-lg"
            }
            border-2 ${
              vehicle.isPriority
                ? "border-white"
                : "border-gray-200 border-opacity-30"
            }
          `}
          >
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
                <div
                  className="w-1 h-1 bg-blue-600 rounded-full animate-pulse"
                  style={{ animationDelay: "0.5s" }}
                ></div>
              </div>

              {/* Priority badge with siren icon */}
              <div className="absolute -bottom-2 -left-2 bg-red-600 text-white text-xs px-1 rounded border border-white flex items-center gap-1">
                <Siren size={10} />
                {vehicle.priorityType === "ambulance"
                  ? "AMB"
                  : vehicle.priorityType === "fire"
                  ? "FIRE"
                  : "POLICE"}
              </div>

              {/* Emergency vehicle trail effect when moving */}
              {!vehicle.waiting && isCurrentLane && (
                <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
                  <div className="flex space-x-1">
                    {[1, 2, 3].map((i) => (
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
              {[1, 2, 3].map((i) => (
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
          Smart Traffic Solution
        </h1>
        <p className="text-gray-300">
          Priority vehicle detection with AI-optimized signal control using
          historical data
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
                    setEventLog,
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
              <span
                className={`font-semibold ${
                  priorityActive ? "text-red-400" : "text-green-400"
                }`}
              >
                {priorityActive ? "🚨 Priority Override" : "📊 Smart Traffic"}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
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
                      <div
                        className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
                        style={{ animationDelay: "0.5s" }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-red-300 text-sm">
                    Priority clearance activated for {priorityDirection} lane |
                    All other lanes stopped
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

              switch (dir) {
                case "N":
                  position = {
                    top: "140px",
                    left: "50%",
                    transform: "translateX(-50%)",
                  };
                  break;
                case "S":
                  position = {
                    bottom: "140px",
                    left: "50%",
                    transform: "translateX(-50%)",
                  };
                  break;
                case "E":
                  position = {
                    right: "140px",
                    top: "50%",
                    transform: "translateY(-50%)",
                  };
                  break;
                case "W":
                  position = {
                    left: "140px",
                    top: "50%",
                    transform: "translateY(-50%)",
                  };
                  break;
              }

              return (
                <div
                  key={dir}
                  className="absolute bg-gray-900 p-3 rounded-xl border-2 border-gray-600 shadow-lg"
                  style={position}
                >
                  <div
                    className={`w-8 h-8 rounded-full border-2 ${
                      isGreen
                        ? "bg-green-500 border-green-300 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                        : "bg-red-500 border-red-300"
                    } transition-all duration-300`}
                  ></div>
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
            <div
              className={`absolute ${
                greenLight === "N"
                  ? "top-0 left-1/2 transform -translate-x-1/2 w-20 h-48 bg-green-500 bg-opacity-20 border-b-4 border-green-400"
                  : greenLight === "S"
                  ? "bottom-0 left-1/2 transform -translate-x-1/2 w-20 h-48 bg-green-500 bg-opacity-20 border-t-4 border-green-400"
                  : greenLight === "E"
                  ? "right-0 top-1/2 transform -translate-y-1/2 w-48 h-20 bg-green-500 bg-opacity-20 border-l-4 border-green-400"
                  : "left-0 top-1/2 transform -translate-y-1/2 w-48 h-20 bg-green-500 bg-opacity-20 border-r-4 border-green-400"
              } transition-all duration-300`}
            ></div>

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
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white font-bold bg-gray-900 bg-opacity-80 px-3 py-1 rounded-lg border border-gray-600">
              NORTH
            </div>
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white font-bold bg-gray-900 bg-opacity-80 px-3 py-1 rounded-lg border border-gray-600">
              SOUTH
            </div>
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white font-bold bg-gray-900 bg-opacity-80 px-3 py-1 rounded-lg border border-gray-600">
              WEST
            </div>
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white font-bold bg-gray-900 bg-opacity-80 px-3 py-1 rounded-lg border border-gray-600">
              EAST
            </div>
          </div>

          {/* 🚘 Vehicle Legend — Elegant Version */}
          <div className="mt-8 bg-gray-900/70 backdrop-blur-md border border-gray-700 rounded-xl p-6 shadow-lg">
            <h3 className="text-xl font-semibold text-white mb-5 flex items-center gap-2">
              <Siren className="text-yellow-400" size={20} />
              Vehicle Types & Emergency Indicators
            </h3>

            {/* Vehicle Type Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-5">
              {Object.entries(VEHICLE_TYPES).map(([type, config]) => {
                const IconComponent = config.icon;
                return (
                  <div
                    key={type}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border 
          ${
            config.isPriority
              ? "border-red-600 bg-red-900/20"
              : "border-gray-700 bg-gray-800/30"
          } hover:border-yellow-500 transition-all`}
                  >
                    <IconComponent
                      className={`${config.color}`}
                      size={26}
                      strokeWidth={1.5}
                    />
                    <span className="mt-2 text-gray-300 text-sm font-medium tracking-wide">
                      {config.displayName ||
                        type.charAt(0).toUpperCase() + type.slice(1)}
                    </span>

                    {config.isPriority && (
                      <div className="flex items-center gap-1 mt-1">
                        <Siren
                          size={12}
                          className="text-red-400 animate-pulse"
                        />
                        <span className="text-xs text-red-400 font-semibold">
                          PRIO
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Emergency Symbol Guide */}
            <div className="border-t border-gray-700 pt-4 mt-2">
              <h4 className="text-yellow-400 font-semibold mb-3 text-sm uppercase tracking-wide">
                Emergency Vehicle Indicators
              </h4>

              <div className="grid sm:grid-cols-2 gap-2 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                  <span>Red Flashing Light</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                  <span>Blue Flashing Light</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-red-500 rounded-full animate-spin"></div>
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
