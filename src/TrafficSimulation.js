import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Truck,
  Car,
  Clock,
  Activity,
  Download,
  Upload,
  Bus,
  Bike,
  AlertTriangle,
} from "lucide-react";
import * as Papa from "papaparse";

const TrafficSimulation = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [greenLight, setGreenLight] = useState("N");
  const [timer, setTimer] = useState(20);
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [emergencyDirection, setEmergencyDirection] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [stats, setStats] = useState({
    totalVehicles: 19,
    avgWaitTime: 0.0,
    emergencyResponses: 0,
    maxWaitTime: 0.0,
  });
  const [eventLog, setEventLog] = useState([]);
  const [laneCounts, setLaneCounts] = useState({ N: 1, S: 4, E: 5, W: 4 });
  const [laneWaitTimes, setLaneWaitTimes] = useState({ N: 0.0, S: 0.0, E: 0.0, W: 0.0 });
  const [laneCongestion, setLaneCongestion] = useState({ N: "low", S: "medium", E: "medium", W: "low" });
  const [datasetData, setDatasetData] = useState([]);
  const [currentDataIndex, setCurrentDataIndex] = useState(0);
  const [isDatasetLoaded, setIsDatasetLoaded] = useState(false);

  const animationRef = useRef(null);
  const lastTimeRef = useRef(0);
  const vehiclesRef = useRef([]);
  const timerRef = useRef(20);
  
  // Traffic light sequence with congestion-based timing
  const signalCycleRef = useRef([
    { direction: "N", duration: 20, name: "North", maxWaitThreshold: 45 },
    { direction: "S", duration: 15, name: "South", maxWaitThreshold: 40 },
    { direction: "E", duration: 15, name: "East", maxWaitThreshold: 35 },
    { direction: "W", duration: 15, name: "West", maxWaitThreshold: 30 }
  ]);
  const currentCycleIndexRef = useRef(0);

  // Configuration constants
  const normalGreenTime = 20;
  const emergencyGreenTime = 25;
  const MAX_LOG_ITEMS = 50;
  
  // Congestion thresholds
  const CONGESTION_THRESHOLDS = {
    low: { vehicleCount: 5, waitTime: 20, priority: 1 },
    medium: { vehicleCount: 8, waitTime: 30, priority: 2 },
    high: { vehicleCount: 12, waitTime: 45, priority: 3 },
    critical: { vehicleCount: 15, waitTime: 60, priority: 4 }
  };

  // Emergency response thresholds
  const EMERGENCY_THRESHOLDS = {
    immediate: 10,    // Switch immediately if wait > 10s during emergency
    critical: 25,     // Critical wait time for any lane
    maxEmergencyWait: 15 // Maximum wait allowed during emergency response
  };

  const sampleDataset = [
    {
      time: "08:00:00",
      vehicle_count: 8,
      emergency_vehicle: false,
      congestion_level: "medium",
    },
    {
      time: "08:05:00",
      vehicle_count: 12,
      emergency_vehicle: false,
      congestion_level: "high",
    },
    {
      time: "08:10:00",
      vehicle_count: 6,
      emergency_vehicle: true,
      congestion_level: "low",
    },
    {
      time: "08:15:00",
      vehicle_count: 15,
      emergency_vehicle: false,
      congestion_level: "critical",
    },
  ];

  const loadSampleDataset = () => {
    setDatasetData(sampleDataset);
    setIsDatasetLoaded(true);
    addEvent("Sample dataset loaded successfully.", "system");
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const processedData = results.data
            .filter((row) => row && row.length >= 3)
            .map((row, index) => ({
              time: row[0] || `08:${(index * 5).toString().padStart(2, "0")}:00`,
              vehicle_count: parseInt(row[1]) || Math.floor(Math.random() * 20) + 5,
              emergency_vehicle: Boolean(parseInt(row[2])) || Math.random() < 0.2,
              congestion_level: ["low", "medium", "high", "critical"][Math.floor(Math.random() * 4)],
            }));

          setDatasetData(processedData);
          setIsDatasetLoaded(true);
          addEvent(`CSV dataset loaded with ${processedData.length} records.`, "system");
        }
      },
      header: false,
    });
  };

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

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  // Calculate congestion level based on vehicle count and wait time
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const calculateCongestionLevel = useCallback((vehicleCount, maxWaitTime) => {
    if (vehicleCount >= CONGESTION_THRESHOLDS.critical.vehicleCount || 
        maxWaitTime >= CONGESTION_THRESHOLDS.critical.waitTime) {
      return "critical";
    } else if (vehicleCount >= CONGESTION_THRESHOLDS.high.vehicleCount || 
               maxWaitTime >= CONGESTION_THRESHOLDS.high.waitTime) {
      return "high";
    } else if (vehicleCount >= CONGESTION_THRESHOLDS.medium.vehicleCount || 
               maxWaitTime >= CONGESTION_THRESHOLDS.medium.waitTime) {
      return "medium";
    } else {
      return "low";
    }
  }, []);

  // Check if any lane has exceeded maximum wait time
  const checkWaitTimeLimits = useCallback((laneWaitTimes, laneCounts) => {
    const criticalLanes = [];
    
    Object.entries(laneWaitTimes).forEach(([direction, waitTime]) => {
      const vehicleCount = laneCounts[direction];
      const phase = signalCycleRef.current.find(p => p.direction === direction);
      const maxAllowedWait = phase?.maxWaitThreshold || 40;
      
      if (waitTime >= maxAllowedWait && vehicleCount > 0) {
        criticalLanes.push({
          direction,
          waitTime,
          vehicleCount,
          priority: CONGESTION_THRESHOLDS[calculateCongestionLevel(vehicleCount, waitTime)].priority
        });
      }
    });

    // Return the most critical lane (highest priority)
    return criticalLanes.sort((a, b) => b.priority - a.priority)[0];
  }, [calculateCongestionLevel, CONGESTION_THRESHOLDS]);

  // FIXED: Immediate emergency vehicle detection and signal switching
  const detectEmergencyVehicle = useCallback((direction) => {
    addEvent(`🚨 Emergency vehicle detected from ${direction} direction.`, "emergency");
    addEvent(`Signal override active | Priority green enabled`, "emergency");
    
    // IMMEDIATELY switch signal to emergency direction
    setEmergencyActive(true);
    setEmergencyDirection(direction);
    setGreenLight(direction);
    
    // Set extended emergency time
    timerRef.current = emergencyGreenTime;
    setTimer(emergencyGreenTime);
    
    setStats((prev) => ({
      ...prev,
      emergencyResponses: prev.emergencyResponses + 1,
    }));

    addEvent(`Signal immediately changed to ${direction} for emergency vehicle`, "signal");
  }, []);

  // Adjust green time based on congestion and emergency status
  const calculateDynamicGreenTime = useCallback((direction, currentWaitTimes, currentCounts) => {
    // Emergency gets fixed extended time
    if (emergencyActive && emergencyDirection === direction) {
      return emergencyGreenTime;
    }

    const vehicleCount = currentCounts[direction] || 0;
    const waitTime = currentWaitTimes[direction] || 0;
    const congestionLevel = calculateCongestionLevel(vehicleCount, waitTime);
    
    const baseTime = signalCycleRef.current.find(p => p.direction === direction)?.duration || normalGreenTime;
    
    // Adjust time based on congestion
    switch (congestionLevel) {
      case "critical":
        return Math.min(baseTime + 20, 40); // Extra time for critical congestion
      case "high":
        return Math.min(baseTime + 15, 35);
      case "medium":
        return Math.min(baseTime + 5, 25);
      case "low":
      default:
        return Math.max(baseTime - 5, 10); // Reduce time for low congestion
    }
  }, [emergencyActive, emergencyDirection, calculateCongestionLevel]);

  const generateVehiclesFromDataset = useCallback(() => {
    if (!isDatasetLoaded || datasetData.length === 0) {
      return [];
    }

    const currentData = datasetData[currentDataIndex];
    const vehicleCount = currentData.vehicle_count;
    const hasEmergency = currentData.emergency_vehicle;

    const directions = ["N", "S", "E", "W"];
    const vehicles = [];

    for (let i = 0; i < vehicleCount; i++) {
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const vehicleType = Math.random();
      let vehicleIcon, vehicleSpeed;

      if (vehicleType < 0.6) {
        vehicleIcon = "car";
        vehicleSpeed = 0.8 + Math.random() * 0.4;
      } else if (vehicleType < 0.85) {
        vehicleIcon = "truck";
        vehicleSpeed = 0.6 + Math.random() * 0.3;
      } else if (vehicleType < 0.95) {
        vehicleIcon = "bus";
        vehicleSpeed = 0.7 + Math.random() * 0.3;
      } else {
        vehicleIcon = "bike";
        vehicleSpeed = 1.0 + Math.random() * 0.5;
      }

      vehicles.push({
        id: `${dir}-${currentDataIndex}-${i}`,
        direction: dir,
        position: Math.random() * 200 + 100,
        waiting: false,
        waitTime: 0,
        isEmergency: false,
        vehicleType: vehicleIcon,
        speed: vehicleSpeed,
      });
    }

    // FIXED: Immediate emergency detection
    if (hasEmergency) {
      const emergencyDir = directions[Math.floor(Math.random() * directions.length)];
      vehicles.push({
        id: `AMB-${currentDataIndex}-emergency`,
        direction: emergencyDir,
        position: 350,
        waiting: false,
        waitTime: 0,
        isEmergency: true,
        vehicleType: "ambulance",
        speed: 1.5,
      });

      // Immediately detect and switch for emergency vehicle
      detectEmergencyVehicle(emergencyDir);
    }

    setCurrentDataIndex((prev) => (prev + 1) % datasetData.length);
    return vehicles;
  }, [isDatasetLoaded, datasetData, currentDataIndex, detectEmergencyVehicle]);

  const createInitialVehicles = () => {
    const initial = [];
    const directions = ["N", "S", "E", "W"];

    directions.forEach((dir) => {
      const count = dir === "N" ? 1 : dir === "S" ? 4 : dir === "E" ? 5 : 4;
      
      for (let i = 0; i < count; i++) {
        const vehicleType = Math.random();
        let vehicleIcon, vehicleSpeed;

        if (vehicleType < 0.6) {
          vehicleIcon = "car";
          vehicleSpeed = 1;
        } else if (vehicleType < 0.85) {
          vehicleIcon = "truck";
          vehicleSpeed = 0.8;
        } else if (vehicleType < 0.95) {
          vehicleIcon = "bus";
          vehicleSpeed = 0.9;
        } else {
          vehicleIcon = "bike";
          vehicleSpeed = 1.2;
        }

        initial.push({
          id: `${dir}-init-${i}`,
          direction: dir,
          position: i * 60 + 80,
          waiting: false,
          waitTime: 0,
          isEmergency: false,
          vehicleType: vehicleIcon,
          speed: vehicleSpeed,
        });
      }
    });
    return initial;
  };

  useEffect(() => {
    const initialVehicles = createInitialVehicles();
    setVehicles(initialVehicles);
    vehiclesRef.current = initialVehicles;
    
    const initialDuration = signalCycleRef.current[0].duration;
    timerRef.current = initialDuration;
    setTimer(initialDuration);
    setGreenLight("N");
    
    addEvent("Traffic simulation initialized. Load dataset for real-time data.", "system");
  }, []);

  // FIXED: Smart signal switching with congestion and emergency priority
  const decideNextGreen = useCallback((currentWaitTimes, currentCounts) => {
    // 1. Emergency priority - highest priority
    if (emergencyActive && emergencyDirection) {
      // Check if emergency lane vehicles are waiting too long
      const emergencyWait = currentWaitTimes[emergencyDirection] || 0;
      if (emergencyWait > EMERGENCY_THRESHOLDS.immediate) {
        addEvent(`🚨 Emergency lane wait time critical (${emergencyWait.toFixed(1)}s) - maintaining priority`, "emergency");
      }
      return emergencyDirection;
    }

    // 2. Check for critical wait times that need immediate attention
    const criticalLane = checkWaitTimeLimits(currentWaitTimes, currentCounts);
    if (criticalLane) {
      addEvent(`⚠️ Critical wait time in ${criticalLane.direction} lane (${criticalLane.waitTime.toFixed(1)}s) - Priority override`, "traffic");
      return criticalLane.direction;
    }

    // 3. Normal cycle progression with congestion-based timing
    const nextIndex = (currentCycleIndexRef.current + 1) % signalCycleRef.current.length;
    currentCycleIndexRef.current = nextIndex;
    const nextPhase = signalCycleRef.current[nextIndex];
    
    const dynamicTime = calculateDynamicGreenTime(nextPhase.direction, currentWaitTimes, currentCounts);
    const baseTime = nextPhase.duration;
    
    if (dynamicTime !== baseTime) {
      addEvent(`Signal changed to ${nextPhase.name} for ${dynamicTime}s (Congestion adjusted)`, "signal");
    } else {
      addEvent(`Signal changed to ${nextPhase.name} for ${dynamicTime}s`, "signal");
    }
    
    return nextPhase.direction;
  }, [emergencyActive, emergencyDirection, checkWaitTimeLimits, calculateDynamicGreenTime, EMERGENCY_THRESHOLDS.immediate]);

  // FIXED: Main animation loop with congestion and emergency management
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

      setTime((prev) => prev + safeDelta);

      // Update timer
      timerRef.current -= safeDelta;
      setTimer(Math.max(0, Math.ceil(timerRef.current)));

      // Check for signal change
      if (timerRef.current <= 0) {
        const newLight = decideNextGreen(laneWaitTimes, laneCounts);
        const greenTime = calculateDynamicGreenTime(newLight, laneWaitTimes, laneCounts);
        
        timerRef.current = greenTime;
        setTimer(greenTime);
        setGreenLight(newLight);

        // Clear emergency if timer expired and we're changing signals
        if (emergencyActive && newLight !== emergencyDirection) {
          setEmergencyActive(false);
          setEmergencyDirection(null);
          addEvent("Emergency cleared. Returning to normal cycle.", "success");
        }

        // Generate new vehicles from dataset
        if (isDatasetLoaded) {
          const newVehicles = generateVehiclesFromDataset();
          if (newVehicles.length > 0) {
            setVehicles((prev) => {
              const updated = [...prev, ...newVehicles];
              vehiclesRef.current = updated;
              return updated;
            });
            setStats((prev) => ({
              ...prev,
              totalVehicles: prev.totalVehicles + newVehicles.length,
            }));
          }
        }
      }

      // Update vehicles and check wait time limits
      setVehicles((prevVehicles) => {
        const updated = prevVehicles
          .map((vehicle) => {
            const canMove = vehicle.direction === greenLight && 
                           (!emergencyActive || vehicle.direction === emergencyDirection || vehicle.isEmergency);

            let waiting = vehicle.waiting;
            let waitTime = vehicle.waitTime;
            let position = vehicle.position;

            if (!canMove) {
              waiting = true;
              waitTime += safeDelta;
            } else {
              waiting = false;
              position = position - vehicle.speed * 40 * safeDelta;
            }

            // Emergency vehicle priority movement
            if (vehicle.isEmergency && waiting && emergencyActive) {
              waitTime += safeDelta * 2; // Emergency vehicles accumulate wait time faster
              
              // Force move emergency vehicles if waiting too long
              if (waitTime > EMERGENCY_THRESHOLDS.maxEmergencyWait) {
                waiting = false;
                position = position - vehicle.speed * 60 * safeDelta; // Faster movement
                addEvent(`🚑 Emergency vehicle forced movement due to excessive wait`, "emergency");
              }
            }

            if (position < -50) {
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

        // Update lane counts, wait times, and congestion
        const counts = { N: 0, S: 0, E: 0, W: 0 };
        const maxWaitTimes = { N: 0, S: 0, E: 0, W: 0 };
        const congestionLevels = { N: "low", S: "low", E: "low", W: "low" };
        
        updated.forEach((v) => {
          counts[v.direction] = (counts[v.direction] || 0) + 1;
          if (v.waiting && v.waitTime > maxWaitTimes[v.direction]) {
            maxWaitTimes[v.direction] = v.waitTime;
          }
        });

        // Calculate congestion levels
        Object.keys(counts).forEach(dir => {
          congestionLevels[dir] = calculateCongestionLevel(counts[dir], maxWaitTimes[dir]);
        });
        
        setLaneCounts(counts);
        setLaneWaitTimes(maxWaitTimes);
        setLaneCongestion(congestionLevels);

        // Calculate statistics
        const waitingVehicles = updated.filter((v) => v.waiting);
        const allWaitTimes = updated.map(v => v.waitTime);
        const currentMaxWait = Math.max(...allWaitTimes, 0);
        
        if (waitingVehicles.length > 0) {
          const avgWait = waitingVehicles.reduce((sum, v) => sum + v.waitTime, 0) / waitingVehicles.length;
          setStats((prev) => ({
            ...prev,
            avgWaitTime: parseFloat(avgWait.toFixed(1)),
            maxWaitTime: parseFloat(currentMaxWait.toFixed(1)),
          }));
        } else {
          setStats((prev) => ({
            ...prev,
            avgWaitTime: 0.0,
            maxWaitTime: parseFloat(currentMaxWait.toFixed(1)),
          }));
        }

        // Check for critical wait time alerts
        Object.entries(maxWaitTimes).forEach(([dir, waitTime]) => {
          const phase = signalCycleRef.current.find(p => p.direction === dir);
          const maxAllowedWait = phase?.maxWaitThreshold || 40;
          
          if (waitTime >= maxAllowedWait - 5 && waitTime < maxAllowedWait && counts[dir] > 0) {
            addEvent(`⚠️ ${dir} lane approaching maximum wait time (${waitTime.toFixed(1)}s)`, "traffic");
          }
        });

        // Random vehicle generation when no dataset
        if (!isDatasetLoaded && Math.random() < 0.008) {
          const directions = ["N", "S", "E", "W"];
          const dir = directions[Math.floor(Math.random() * directions.length)];
          const isEmergency = Math.random() < 0.03;

          const vehicleType = Math.random();
          let vehicleIcon, vehicleSpeed;

          if (vehicleType < 0.6) {
            vehicleIcon = "car";
            vehicleSpeed = 1;
          } else if (vehicleType < 0.85) {
            vehicleIcon = "truck";
            vehicleSpeed = 0.8;
          } else if (vehicleType < 0.95) {
            vehicleIcon = "bus";
            vehicleSpeed = 0.9;
          } else {
            vehicleIcon = "bike";
            vehicleSpeed = 1.2;
          }

          const newVehicle = {
            id: `${dir}-${Date.now()}`,
            direction: dir,
            position: 350,
            waiting: false,
            waitTime: 0,
            isEmergency,
            vehicleType: isEmergency ? "ambulance" : vehicleIcon,
            speed: isEmergency ? 1.2 : vehicleSpeed,
          };

          updated.push(newVehicle);

          // FIXED: Immediate emergency detection for random vehicles
          if (isEmergency) {
            detectEmergencyVehicle(dir);
          }

          setStats((prev) => ({
            ...prev,
            totalVehicles: prev.totalVehicles + 1,
          }));
        }

        vehiclesRef.current = updated;
        return updated;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, greenLight, emergencyActive, decideNextGreen, calculateDynamicGreenTime, isDatasetLoaded, generateVehiclesFromDataset, detectEmergencyVehicle, laneWaitTimes, laneCounts, calculateCongestionLevel]);

  const reset = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    setIsRunning(false);
    setTime(0);
    currentCycleIndexRef.current = 0;
    const initialDuration = signalCycleRef.current[0].duration;
    timerRef.current = initialDuration;
    setTimer(initialDuration);
    setGreenLight("N");
    setEmergencyActive(false);
    setEmergencyDirection(null);
    setCurrentDataIndex(0);

    const initialVehicles = createInitialVehicles();
    setVehicles(initialVehicles);
    vehiclesRef.current = initialVehicles;
    setStats({
      totalVehicles: 19,
      avgWaitTime: 0.0,
      emergencyResponses: 0,
      maxWaitTime: 0.0,
    });

    setEventLog([]);
    setLaneWaitTimes({ N: 0.0, S: 0.0, E: 0.0, W: 0.0 });
    setLaneCounts({ N: 1, S: 4, E: 5, W: 4 });
    setLaneCongestion({ N: "low", S: "medium", E: "medium", W: "low" });
    addEvent("System reset. All parameters restored to default.", "system");
  };

  const getCongestionColor = (level) => {
    switch (level) {
      case "critical": return "text-red-500";
      case "high": return "text-orange-500";
      case "medium": return "text-yellow-500";
      case "low": return "text-green-500";
      default: return "text-gray-500";
    }
  };

  const getCongestionBgColor = (level) => {
    switch (level) {
      case "critical": return "bg-red-900";
      case "high": return "bg-orange-900";
      case "medium": return "bg-yellow-900";
      case "low": return "bg-green-900";
      default: return "bg-gray-900";
    }
  };

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
          top: `calc(50% + ${laneOffset}px)`,
          left: `calc(50% + ${d}px)`,
          transform: "translate(-50%, -50%) rotate(90deg)",
        };
      case "W":
        return {
          top: `calc(50% - ${laneOffset}px)`,
          left: `calc(50% - ${d}px)`,
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

  const renderVehicleIcon = (vehicle) => {
    const baseProps = {
      size: 20,
      className: vehicle.waiting
        ? "text-purple-400"
        : vehicle.isEmergency
        ? "text-red-500 animate-pulse"
        : "text-blue-400",
    };

    switch (vehicle.vehicleType) {
      case "car":
        return <Car {...baseProps} />;
      case "truck":
        return <Truck {...baseProps} />;
      case "bus":
        return <Bus {...baseProps} />;
      case "bike":
        return <Bike {...baseProps} size={16} />;
      case "ambulance":
        return <Truck {...baseProps} className="text-red-500 animate-pulse" />;
      default:
        return <Car {...baseProps} />;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-2xl">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-white mb-3 flex items-center justify-center gap-3">
          <Activity className="text-green-400" size={32} />
          Smart Traffic Management System
        </h1>
        <p className="text-gray-300 text-lg">
          Dynamic Traffic Control with Emergency Vehicle Priority
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Control Panel */}
          <div className="flex gap-4 mb-6 flex-wrap items-center justify-center">
            <button
              onClick={() => {
                setIsRunning((prev) => {
                  const next = !prev;
                  addEvent(next ? "Simulation started." : "Simulation paused.", "system");
                  return next;
                });
              }}
              className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all text-lg"
            >
              {isRunning ? <Pause size={24} /> : <Play size={24} />}
              {isRunning ? "Pause" : "Start"}
            </button>
            <button
              onClick={reset}
              className="flex items-center gap-2 px-8 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-all text-lg"
            >
              <RotateCcw size={24} />
              Reset
            </button>

            <div className="flex items-center gap-3 bg-gray-800 px-4 py-3 rounded-lg border border-gray-700">
              <span className="text-gray-300 text-sm font-semibold">Dataset:</span>
              <button
                onClick={loadSampleDataset}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all text-sm"
              >
                <Download size={16} />
                Load Sample Data
              </button>
              <label className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all text-sm cursor-pointer">
                <Upload size={16} />
                Upload CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {isDatasetLoaded && (
            <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg p-4 mb-6 text-center">
              <div className="text-blue-300 font-bold text-lg">Dataset Active</div>
              <div className="text-blue-200 text-sm">
                {datasetData.length} data points loaded | Current: {currentDataIndex + 1}/{datasetData.length}
              </div>
            </div>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 text-center">
              <div className="text-gray-400 text-sm mb-2">Simulation Time</div>
              <div className="text-2xl font-bold text-white font-mono">
                {formatTime(time)}
              </div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 text-center">
              <div className="text-gray-400 text-sm mb-2">Total Vehicles</div>
              <div className="text-2xl font-bold text-white">
                {stats.totalVehicles}
              </div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 text-center">
              <div className="text-gray-400 text-sm mb-2">Avg Wait Time</div>
              <div className="text-2xl font-bold text-white">
                {stats.avgWaitTime.toFixed(1)}s
              </div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 text-center">
              <div className="text-gray-400 text-sm mb-2">Max Wait Time</div>
              <div className={`text-2xl font-bold ${stats.maxWaitTime > 30 ? 'text-red-400' : 'text-white'}`}>
                {stats.maxWaitTime.toFixed(1)}s
              </div>
            </div>
          </div>

          {/* Lane Status with Congestion */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {["N", "S", "E", "W"].map((dir) => {
              const isGreen = greenLight === dir;
              const vehicleCount = laneCounts[dir] || 0;
              const waitTime = laneWaitTimes[dir] || 0;
              const congestion = laneCongestion[dir] || "low";
              const phase = signalCycleRef.current.find(p => p.direction === dir);
              const maxWaitThreshold = phase?.maxWaitThreshold || 40;

              return (
                <div
                  key={dir}
                  className={`p-4 rounded-lg border text-center transition-all duration-300 ${
                    isGreen
                      ? "bg-green-900 border-green-500 shadow-lg"
                      : getCongestionBgColor(congestion) + " border-gray-700"
                  }`}
                >
                  <div className="text-gray-400 text-sm mb-2 font-semibold">
                    {dir === "N" ? "North Lane" :
                     dir === "S" ? "South Lane" :
                     dir === "E" ? "East Lane" : "West Lane"}
                  </div>
                  <div className={`text-3xl font-bold ${
                    isGreen ? "text-green-300" : "text-white"
                  }`}>
                    {vehicleCount}
                  </div>
                  <div className={`text-xs mt-2 font-semibold ${getCongestionColor(congestion)}`}>
                    {congestion.toUpperCase()} CONGESTION
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    Wait: {waitTime.toFixed(1)}s / Max: {maxWaitThreshold}s
                  </div>
                  {waitTime > maxWaitThreshold - 10 && (
                    <div className="text-red-400 text-xs mt-1 flex items-center justify-center gap-1">
                      <AlertTriangle size={12} />
                      High Wait Time
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Emergency Alert */}
          {emergencyActive && (
            <div className="bg-red-900 border-2 border-red-500 rounded-lg p-4 mb-6 animate-pulse text-center">
              <div className="flex items-center justify-center gap-3">
                <Truck className="text-red-300" size={28} />
                <div>
                  <div className="text-red-100 font-bold text-lg">
                    EMERGENCY VEHICLE DETECTED
                  </div>
                  <div className="text-red-300 text-sm">
                    Direction: {emergencyDirection} | Signal override active | Priority green enabled
                  </div>
                  <div className="text-red-200 text-xs mt-1">
                    Max emergency wait: {EMERGENCY_THRESHOLDS.maxEmergencyWait}s
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Timer Display */}
          <div className="bg-gray-800 p-4 rounded-lg mb-6 border border-yellow-500 text-center">
            <div className="text-yellow-300 text-lg font-mono font-bold">
              Time: {Math.ceil(timer)}s | Green Light: {greenLight} | Running: {isRunning.toString()}
            </div>
            <div className="text-yellow-200 text-sm mt-1">
              {emergencyActive ? "🚨 EMERGENCY MODE" : "🟢 NORMAL OPERATION"}
            </div>
          </div>

          {/* Traffic Intersection */}
          <div className="relative bg-gray-700 rounded-lg p-8 overflow-hidden mx-auto mb-6"
               style={{ height: "500px", width: "500px" }}>
            
            {/* Road lines */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-16 h-full bg-black">
              <div className="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full border-l-2 border-dashed border-yellow-300"></div>
            </div>
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-16 bg-black">
              <div className="absolute top-1/2 transform -translate-y-1/2 w-full h-0.5 border-t-2 border-dashed border-yellow-300"></div>
            </div>
            
            {/* Intersection center */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-gray-600 border-4 border-yellow-400"></div>
    
            {/* Traffic lights */}
            {["N", "S", "E", "W"].map((dir) => {
              const isGreen = greenLight === dir;
              return (
                <div
                  key={dir}
                  className={`absolute ${
                    dir === "N" ? "top-[10%] left-1/2 transform -translate-x-1/2 flex-col" :
                    dir === "S" ? "bottom-[10%] left-1/2 transform -translate-x-1/2 flex-col" :
                    dir === "W" ? "top-1/2 left-[10%] transform -translate-y-1/2 flex-row" :
                    "top-1/2 right-[10%] transform -translate-y-1/2 flex-row"
                  } flex gap-2 bg-gray-900 p-3 rounded-xl shadow-lg border-2 ${
                    isGreen ? "border-green-500" : "border-gray-600"
                  } z-10 transition-all duration-300`}
                >
                  <div className={`w-6 h-6 rounded-full transition-all duration-300 ${
                    isGreen ? "bg-green-500 shadow-lg shadow-green-500/50" : "bg-gray-700"
                  }`}></div>
                  <div className={`w-6 h-6 rounded-full transition-all duration-300 ${
                    isGreen ? "bg-gray-700" : "bg-red-500 shadow-lg shadow-red-500/50"
                  }`}></div>
                </div>
              );
            })}
            
            {/* Timer display */}
            <div className="absolute top-4 left-4 bg-gray-900 px-4 py-3 rounded-lg border border-gray-600">
              <div className="flex items-center gap-2 text-white">
                <Clock size={20} />
                <span className="font-mono text-xl font-bold">{Math.ceil(timer)}s</span>
              </div>
              <div className="text-sm text-gray-400 mt-1 font-semibold">
                {greenLight === "N" ? "🟢 North Green" : 
                 greenLight === "S" ? "🟢 South Green" :
                 greenLight === "E" ? "🟢 East Green" : "🟢 West Green"}
              </div>
            </div>
            
            {/* Vehicles */}
            {vehicles.map((vehicle) => {
              const style = getVehicleStyle(vehicle);
              return (
                <div key={vehicle.id} className="absolute transition-all duration-100" style={style}>
                  {renderVehicleIcon(vehicle)}
                </div>
              );
            })}
            
            {/* Direction labels */}
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-white font-bold text-lg">NORTH</div>
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-white font-bold text-lg">SOUTH</div>
            <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white font-bold text-lg">WEST</div>
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white font-bold text-lg">EAST</div>
          </div>

          {/* Smart Traffic Management System */}
          <div className="bg-gradient-to-r from-purple-900 to-blue-900 border border-purple-700 rounded-lg p-6 mb-6">
            <h3 className="text-white font-bold text-xl mb-4 text-center">🚦 Smart Traffic Management</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <div className="font-semibold text-lg mb-3 text-green-300">Priority Levels:</div>
                <ul className="text-gray-200 space-y-2">
                  <li>1. 🚨 <strong>Emergency Vehicles</strong> - Immediate override</li>
                  <li>2. ⚠️ <strong>Critical Wait Times</strong> - {CONGESTION_THRESHOLDS.critical.waitTime}s+</li>
                  <li>3. 🟠 <strong>High Congestion</strong> - {CONGESTION_THRESHOLDS.high.vehicleCount}+ vehicles</li>
                  <li>4. 🟢 <strong>Normal Cycle</strong> - Adaptive timing</li>
                </ul>
              </div>
              <div>
                <div className="font-semibold text-lg mb-3 text-yellow-300">Wait Time Limits:</div>
                <ul className="text-gray-200 space-y-2">
                  <li>• North: Max {signalCycleRef.current[0].maxWaitThreshold}s</li>
                  <li>• South: Max {signalCycleRef.current[1].maxWaitThreshold}s</li>
                  <li>• East: Max {signalCycleRef.current[2].maxWaitThreshold}s</li>
                  <li>• West: Max {signalCycleRef.current[3].maxWaitThreshold}s</li>
                  <li>• Emergency: Max {EMERGENCY_THRESHOLDS.maxEmergencyWait}s during response</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Congestion Legend */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-white font-bold text-xl mb-4 text-center">Congestion Levels</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2 justify-center p-2 bg-green-900 rounded">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-300">Low</span>
              </div>
              <div className="flex items-center gap-2 justify-center p-2 bg-yellow-900 rounded">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-300">Medium</span>
              </div>
              <div className="flex items-center gap-2 justify-center p-2 bg-orange-900 rounded">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-gray-300">High</span>
              </div>
              <div className="flex items-center gap-2 justify-center p-2 bg-red-900 rounded">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-gray-300">Critical</span>
              </div>
            </div>
          </div>
        </div>

        {/* Event Log */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 h-full flex flex-col">
            <h3 className="text-white font-bold text-xl mb-4 flex items-center gap-2 justify-center">
              <Activity size={24} className="text-green-400" />
              Event Log
            </h3>
            <div className="space-y-3 overflow-y-auto flex-1">
              {eventLog.length === 0 ? (
                <div className="text-gray-500 text-sm italic text-center py-8">
                  No events yet. Start the simulation to see activity.
                </div>
              ) : (
                eventLog.map((event) => (
                  <div
                    key={event.id}
                    className={`p-3 rounded-lg text-sm border-l-4 ${
                      event.type === "emergency" ? "bg-red-900 bg-opacity-30 border-red-500 text-red-200" :
                      event.type === "success" ? "bg-green-900 bg-opacity-30 border-green-500 text-green-200" :
                      event.type === "signal" ? "bg-yellow-900 bg-opacity-30 border-yellow-500 text-yellow-200" :
                      event.type === "traffic" ? "bg-blue-900 bg-opacity-30 border-blue-500 text-blue-200" :
                      "bg-gray-700 border-gray-600 text-gray-300"
                    }`}
                  >
                    <div className="font-mono text-xs opacity-70 mb-1">{event.time}</div>
                    <div className="font-medium">{event.message}</div>
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