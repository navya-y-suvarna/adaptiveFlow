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
    totalVehicles: 0,
    avgWaitTime: 0,
    emergencyResponses: 0,
    avgEmergencyTime: 2.3,
  });
  const [eventLog, setEventLog] = useState([]);
  const [laneCounts, setLaneCounts] = useState({ N: 0, S: 0, E: 0, W: 0 });
  const [laneWaitTimes, setLaneWaitTimes] = useState({ N: 0, S: 0, E: 0, W: 0 });
  const [datasetData, setDatasetData] = useState([]);
  const [currentDataIndex, setCurrentDataIndex] = useState(0);
  const [isDatasetLoaded, setIsDatasetLoaded] = useState(false);

  const animationRef = useRef(null);
  const lastTimeRef = useRef(0);
  const vehiclesRef = useRef([]);
  const timerRef = useRef(20);
  
  // FIXED: Proper traffic light sequence with timing
  const signalCycleRef = useRef([
    { direction: "N", duration: 20 },
    { direction: "S", duration: 15 },
    { direction: "E", duration: 15 },
    { direction: "W", duration: 15 }
  ]);
  const currentCycleIndexRef = useRef(0);

  const normalGreenTime = 20;
  const emergencyGreenTime = 35;
  const minGreenTime = 10;
  const maxGreenTime = 40;
  const vehicleThreshold = 5;
  const waitTimeThreshold = 15;
  const MAX_LOG_ITEMS = 80;

  const sampleDataset = [
    {
      time: "08:00:00",
      vehicle_count: 12,
      emergency_vehicle: false,
      congestion_level: "medium",
    },
    {
      time: "08:05:00",
      vehicle_count: 15,
      emergency_vehicle: false,
      congestion_level: "high",
    },
    {
      time: "08:10:00",
      vehicle_count: 8,
      emergency_vehicle: true,
      congestion_level: "low",
    },
    {
      time: "08:15:00",
      vehicle_count: 20,
      emergency_vehicle: false,
      congestion_level: "high",
    },
    {
      time: "08:20:00",
      vehicle_count: 6,
      emergency_vehicle: false,
      congestion_level: "low",
    },
    {
      time: "08:25:00",
      vehicle_count: 18,
      emergency_vehicle: true,
      congestion_level: "high",
    },
    {
      time: "08:30:00",
      vehicle_count: 10,
      emergency_vehicle: false,
      congestion_level: "medium",
    },
    {
      time: "08:35:00",
      vehicle_count: 22,
      emergency_vehicle: false,
      congestion_level: "high",
    },
    {
      time: "08:40:00",
      vehicle_count: 7,
      emergency_vehicle: true,
      congestion_level: "medium",
    },
    {
      time: "08:45:00",
      vehicle_count: 14,
      emergency_vehicle: false,
      congestion_level: "medium",
    },
  ];

  const loadSampleDataset = () => {
    setDatasetData(sampleDataset);
    setIsDatasetLoaded(true);
    addEvent("Sample dataset loaded successfully.", "system");
    addEvent(
      `Loaded ${sampleDataset.length} data points with automatic emergency vehicle detection.`,
      "system"
    );
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
              time:
                row[0] || `08:${(index * 5).toString().padStart(2, "0")}:00`,
              vehicle_count:
                parseInt(row[1]) || Math.floor(Math.random() * 25) + 5,
              emergency_vehicle:
                Boolean(parseInt(row[2])) || Math.random() < 0.3,
              congestion_level: ["low", "medium", "high"][
                Math.floor(Math.random() * 3)
              ],
            }));

          setDatasetData(processedData);
          setIsDatasetLoaded(true);
          addEvent(
            `CSV dataset loaded with ${processedData.length} records.`,
            "system"
          );
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

  const generateVehiclesFromDataset = useCallback(() => {
    if (!isDatasetLoaded || datasetData.length === 0) {
      return createInitialVehicles();
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
        position: Math.random() * 300 + 150,
        waiting: false,
        waitTime: 0,
        isEmergency: false,
        vehicleType: vehicleIcon,
        speed: vehicleSpeed,
      });
    }

    if (hasEmergency) {
      const emergencyDir =
        directions[Math.floor(Math.random() * directions.length)];
      vehicles.push({
        id: `AMB-${currentDataIndex}-emergency`,
        direction: emergencyDir,
        position: 450,
        waiting: false,
        waitTime: 0,
        isEmergency: true,
        vehicleType: "ambulance",
        speed: 1.5,
      });

      addEvent(
        `🚨 Emergency vehicle detected from ${emergencyDir} direction via dataset analysis.`,
        "emergency"
      );

      setEmergencyActive(true);
      setEmergencyDirection(emergencyDir);
      setGreenLight(emergencyDir);
      timerRef.current = emergencyGreenTime;
      setTimer(emergencyGreenTime);

      setStats((prev) => ({
        ...prev,
        emergencyResponses: prev.emergencyResponses + 1,
      }));
    }

    addEvent(
      `Generated ${vehicleCount} vehicles from dataset (${
        hasEmergency ? "with emergency vehicle" : "no emergency"
      })`,
      "traffic"
    );

    setCurrentDataIndex((prev) => (prev + 1) % datasetData.length);
    return vehicles;
  }, [isDatasetLoaded, datasetData, currentDataIndex]);

  const createInitialVehicles = () => {
    const initial = [];
    const directions = ["N", "S", "E", "W"];

    directions.forEach((dir) => {
      for (let i = 0; i < 3; i++) {
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
          position: i * 90 + 80,
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
    setStats((prev) => ({
      ...prev,
      totalVehicles: initialVehicles.length,
    }));
    addEvent(
      "Traffic simulation initialized. Load dataset for real-time data.",
      "system"
    );
    
    // FIXED: Initialize with first phase duration
    const initialDuration = signalCycleRef.current[0].duration;
    timerRef.current = initialDuration;
    setTimer(initialDuration);
  }, []);

  const decideNextGreen = useCallback(() => {
    if (emergencyActive && emergencyDirection) {
      addEvent(`Emergency priority: Giving green to ${emergencyDirection} lane`, "emergency");
      return emergencyDirection;
    }

    const counts = { N: 0, S: 0, E: 0, W: 0 };
    const maxWaitTimes = { N: 0, S: 0, E: 0, W: 0 };
    
    vehiclesRef.current.forEach((v) => {
      counts[v.direction] = (counts[v.direction] || 0) + 1;
      if (v.waiting && v.waitTime > maxWaitTimes[v.direction]) {
        maxWaitTimes[v.direction] = v.waitTime;
      }
    });

    setLaneWaitTimes(maxWaitTimes);

    const criticalLanes = Object.entries(maxWaitTimes)
      .filter(([dir, waitTime]) => waitTime > waitTimeThreshold)
      .sort(([, a], [, b]) => b - a);

    if (criticalLanes.length > 0) {
      const [criticalDir] = criticalLanes[0];
      addEvent(`Wait time priority: Giving extended green to ${criticalDir} lane (wait: ${maxWaitTimes[criticalDir].toFixed(1)}s)`, "signal");
      return criticalDir;
    }

    const congestedLanes = Object.entries(counts)
      .filter(([dir, count]) => count > vehicleThreshold)
      .sort(([, a], [, b]) => b - a);

    if (congestedLanes.length > 0) {
      const [congestedDir] = congestedLanes[0];
      addEvent(`Congestion priority: Giving extended green to ${congestedDir} lane (vehicles: ${counts[congestedDir]})`, "signal");
      return congestedDir;
    }

    // FIXED: Proper cycle progression
    currentCycleIndexRef.current = (currentCycleIndexRef.current + 1) % signalCycleRef.current.length;
    const nextPhase = signalCycleRef.current[currentCycleIndexRef.current];
    addEvent(`Regular cycle: Giving green to ${nextPhase.direction} lane for ${nextPhase.duration}s`, "signal");
    return nextPhase.direction;
  }, [emergencyActive, emergencyDirection]);

  const calculateGreenTime = useCallback((direction) => {
    if (emergencyActive && emergencyDirection === direction) {
      return emergencyGreenTime;
    }

    const counts = laneCounts;
    const waitTimes = laneWaitTimes;
    
    const vehicleCount = counts[direction] || 0;
    const maxWaitTime = waitTimes[direction] || 0;

    let calculatedTime = minGreenTime;

    if (vehicleCount > vehicleThreshold) {
      const extraVehicles = Math.min(vehicleCount - vehicleThreshold, 10);
      calculatedTime += extraVehicles * 2;
    }

    if (maxWaitTime > waitTimeThreshold) {
      const extraWait = Math.min(maxWaitTime - waitTimeThreshold, 20);
      calculatedTime += extraWait * 0.5;
    }

    // FIXED: Use base duration from cycle for regular operation
    const baseDuration = signalCycleRef.current.find(phase => phase.direction === direction)?.duration || normalGreenTime;
    calculatedTime = Math.max(calculatedTime, baseDuration);

    return Math.min(Math.max(calculatedTime, minGreenTime), maxGreenTime);
  }, [emergencyActive, emergencyDirection, laneCounts, laneWaitTimes]);

  // FIXED: Main animation loop with proper timer logic
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

      // FIXED: Proper timer decrement
      if (timerRef.current > 0) {
        timerRef.current -= safeDelta;
        setTimer(Math.ceil(timerRef.current));
      }

      // FIXED: Check for signal change only when timer reaches zero
      if (timerRef.current <= 0) {
        const newLight = decideNextGreen();
        const greenTime = calculateGreenTime(newLight);
        
        // Reset timer with new time
        timerRef.current = greenTime;
        setTimer(Math.ceil(greenTime));
        
        // Update green light state
        setGreenLight(newLight);

        const directionNames = {
          N: "North",
          S: "South", 
          E: "East",
          W: "West"
        };

        addEvent(
          `Signal changed to ${directionNames[newLight]} GREEN for ${Math.ceil(greenTime)}s.`,
          "signal"
        );

        if (isDatasetLoaded) {
          const newVehicles = generateVehiclesFromDataset();
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

      // Update vehicles
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
              position = position - vehicle.speed * 0.6;
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

        const counts = { N: 0, S: 0, E: 0, W: 0 };
        const maxWaitTimes = { N: 0, S: 0, E: 0, W: 0 };
        
        updated.forEach((v) => {
          counts[v.direction] = (counts[v.direction] || 0) + 1;
          if (v.waiting && v.waitTime > maxWaitTimes[v.direction]) {
            maxWaitTimes[v.direction] = v.waitTime;
          }
        });
        
        setLaneCounts(counts);
        setLaneWaitTimes(maxWaitTimes);

        if (!isDatasetLoaded && Math.random() < 0.008) {
          const directions = ["N", "S", "E", "W"];
          const dir = directions[Math.floor(Math.random() * directions.length)];
          const isEmergency = Math.random() < 0.05;

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
            position: 450,
            waiting: false,
            waitTime: 0,
            isEmergency,
            vehicleType: isEmergency ? "ambulance" : vehicleIcon,
            speed: isEmergency ? 1.2 : vehicleSpeed,
          };

          updated.push(newVehicle);

          if (isEmergency) {
            addEvent(
              `🚨 Random emergency vehicle spawned from ${dir} direction.`,
              "emergency"
            );
            setEmergencyActive(true);
            setEmergencyDirection(dir);
            setStats((prev) => ({
              ...prev,
              emergencyResponses: prev.emergencyResponses + 1,
            }));
          }

          setStats((prev) => ({
            ...prev,
            totalVehicles: prev.totalVehicles + 1,
          }));
        }

        const emergencyVehicles = updated.filter((v) => v.isEmergency);
        if (emergencyActive && emergencyVehicles.length === 0) {
          setEmergencyActive(false);
          setEmergencyDirection(null);
          addEvent(
            "✓ Emergency vehicle cleared the intersection. Normal operation resumed.",
            "success"
          );
        }

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

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      lastTimeRef.current = 0;
    };
  }, [
    isRunning,
    greenLight,
    emergencyActive,
    decideNextGreen,
    calculateGreenTime,
    isDatasetLoaded,
    generateVehiclesFromDataset,
  ]);

  const reset = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    setIsRunning(false);
    setTime(0);
    
    // FIXED: Reset to first phase with proper duration
    currentCycleIndexRef.current = 0;
    const initialDuration = signalCycleRef.current[0].duration;
    timerRef.current = initialDuration;
    setTimer(initialDuration);
    
    setGreenLight("N");
    setEmergencyActive(false);
    setEmergencyDirection(null);
    setCurrentDataIndex(0);
    lastTimeRef.current = 0;

    const initialVehicles = createInitialVehicles();
    setVehicles(initialVehicles);
    vehiclesRef.current = initialVehicles;
    setStats({
      totalVehicles: initialVehicles.length,
      avgWaitTime: 0,
      emergencyResponses: 0,
      avgEmergencyTime: 2.3,
    });

    setEventLog([]);
    setLaneWaitTimes({ N: 0, S: 0, E: 0, W: 0 });
    addEvent("System reset. All parameters restored to default.", "system");
    setLaneCounts({ N: 0, S: 0, E: 0, W: 0 });
  };

  const getVehicleStyle = (vehicle) => {
    const d = vehicle.position;
    const laneOffset = 30;

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
      size: 24,
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
        return (
          <Bike {...baseProps} className={`${baseProps.className}`} size={20} />
        );
      case "ambulance":
        return (
          <Truck
            {...baseProps}
            className="text-red-500 animate-pulse"
            fill="white"
          />
        );
      default:
        return <Car {...baseProps} />;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <Activity className="text-green-400" />
          AI Traffic Management System
        </h1>
        <p className="text-gray-300">
          Dynamic Traffic Control with Emergency Vehicle Priority
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
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
              <span className="text-gray-300 text-sm">Dataset:</span>
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
            <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-blue-300 font-bold">Dataset Active</div>
                  <div className="text-blue-200 text-sm">
                    {datasetData.length} data points loaded | Current index:{" "}
                    {currentDataIndex} | Next:{" "}
                    {datasetData[currentDataIndex]?.vehicle_count} vehicles
                    {datasetData[currentDataIndex]?.emergency_vehicle
                      ? " (with emergency)"
                      : ""}
                  </div>
                </div>
                <div className="text-blue-300 text-sm">
                  {datasetData[
                    currentDataIndex
                  ]?.congestion_level?.toUpperCase()} Congestion
                </div>
              </div>
            </div>
          )}

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

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {["N", "S", "E", "W"].map((dir) => {
              const isGreen = greenLight === dir;
              const vehicleCount = laneCounts[dir] || 0;
              const waitTime = laneWaitTimes[dir] || 0;
              const isCongested = vehicleCount > vehicleThreshold;
              const isWaitingCritical = waitTime > waitTimeThreshold;

              return (
                <div
                  key={dir}
                  className={`p-3 rounded-lg border text-center transition-all duration-300 ${
                    isGreen
                      ? "bg-green-900 border-green-500 shadow-lg scale-105"
                      : isWaitingCritical
                      ? "bg-orange-900 border-orange-500"
                      : isCongested
                      ? "bg-yellow-900 border-yellow-500"
                      : "bg-gray-800 border-gray-700"
                  }`}
                >
                  <div className="text-gray-400 text-xs mb-1">
                    {dir === "N"
                      ? "North Lane"
                      : dir === "S"
                      ? "South Lane"
                      : dir === "E"
                      ? "East Lane"
                      : "West Lane"}
                  </div>
                  <div
                    className={`text-2xl font-bold ${
                      isGreen 
                        ? "text-green-300" 
                        : isWaitingCritical
                        ? "text-orange-300"
                        : isCongested
                        ? "text-yellow-300"
                        : "text-white"
                    }`}
                  >
                    {vehicleCount}
                  </div>
                  <div className="text-gray-500 text-xs">
                    Max wait: {waitTime.toFixed(1)}s
                  </div>
                  <div className="text-xs mt-1">
                    {isWaitingCritical && "⏰ Priority"}
                    {isCongested && !isWaitingCritical && "🚗 Congested"}
                    {!isCongested && !isWaitingCritical && "Normal"}
                  </div>
                </div>
              );
            })}
          </div>

          {emergencyActive && (
            <div className="bg-red-900 border-2 border-red-500 rounded-lg p-4 mb-6 animate-pulse">
              <div className="flex items-center gap-3">
                <Truck className="text-red-300" size={24} />
                <div>
                  <div className="text-red-100 font-bold">
                    EMERGENCY VEHICLE DETECTED
                  </div>
                  <div className="text-red-300 text-sm">
                    Direction: {emergencyDirection} | Signal override active |
                    Priority green enabled
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Debug Info */}
          <div className="bg-gray-800 p-3 rounded-lg mb-4 border border-yellow-500">
            <div className="text-yellow-300 text-sm font-mono">
              Timer: {Math.ceil(timer)}s | Green Light: {greenLight} | Running: {isRunning.toString()}
            </div>
          </div>

          <div
            className="relative bg-gray-700 rounded-lg p-8 overflow-hidden mx-auto"
            style={{ height: "600px", width: "600px" }}
          >
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 h-full bg-black">
              <div className="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full border-l-2 border-dashed border-yellow-300"></div>
            </div>
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-20 bg-black">
              <div className="absolute top-1/2 transform -translate-y-1/2 w-full h-0.5 border-t-2 border-dashed border-yellow-300"></div>
            </div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-gray-500 border-4 border-yellow-400"></div>
    
            {["N", "S", "E", "W"].map((dir) => {
              const isGreen = greenLight === dir;
              return (
                <div
                  key={dir}
                  className={`absolute ${
                    dir === "N"
                      ? "top-[15%] left-1/2 transform -translate-x-1/2 flex-col"
                      : dir === "S"
                      ? "bottom-[15%] left-1/2 transform -translate-x-1/2 flex-col"
                      : dir === "W"
                      ? "top-1/2 left-[15%] transform -translate-y-1/2 flex-row"
                      : "top-1/2 right-[15%] transform -translate-y-1/2 flex-row"
                  } flex gap-1 bg-gray-900 p-2 rounded shadow-lg border-2 ${
                    isGreen ? "border-green-500" : "border-gray-600"
                  } z-10 transition-all duration-300`}
                >
                  <div
                    className={`w-6 h-6 rounded-full transition-all duration-300 ${
                      isGreen 
                        ? "bg-green-500 shadow-lg shadow-green-500/50" 
                        : "bg-gray-700"
                    }`}
                  ></div>
                  <div
                    className={`w-6 h-6 rounded-full transition-all duration-300 ${
                      isGreen 
                        ? "bg-gray-700" 
                        : "bg-red-500 shadow-lg shadow-red-500/50"
                    }`}
                  ></div>
                </div>
              );
            })}
            
            <div className="absolute top-4 left-4 bg-gray-900 px-4 py-2 rounded-lg border border-gray-600">
              <div className="flex items-center gap-2 text-white">
                <Clock size={16} />
                <span className="font-mono text-lg">{Math.ceil(timer)}s</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {greenLight === "N" ? "🟢 North Green" : 
                 greenLight === "S" ? "🟢 South Green" :
                 greenLight === "E" ? "🟢 East Green" : "🟢 West Green"}
              </div>
            </div>
            
            {vehicles.map((vehicle) => {
              const style = getVehicleStyle(vehicle);
              return (
                <div
                  key={vehicle.id}
                  className="absolute transition-all duration-100"
                  style={style}
                >
                  {renderVehicleIcon(vehicle)}
                </div>
              );
            })}
            
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-white font-bold">
              NORTH
            </div>
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-white font-bold">
              SOUTH
            </div>
            <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white font-bold">
              WEST
            </div>
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white font-bold">
              EAST
            </div>
          </div>

          <div className="mt-6 bg-green-900 bg-opacity-30 border border-green-700 rounded-lg p-4">
            <h3 className="text-green-300 font-bold mb-2">Dynamic Control System</h3>
            <div className="text-green-200 text-sm space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="font-semibold">Priority Levels:</div>
                  <ul className="text-xs space-y-1 mt-1">
                    <li>1. 🚨 Emergency Vehicles (35s)</li>
                    <li>2. ⏰ Long Wait Times ({waitTimeThreshold}+s)</li>
                    <li>3. 🚗 High Traffic ({vehicleThreshold}+ vehicles)</li>
                    <li>4. 🔄 Regular Cycle (10-40s)</li>
                  </ul>
                </div>
                <div>
                  <div className="font-semibold">Time Ranges:</div>
                  <ul className="text-xs space-y-1 mt-1">
                    <li>Minimum: {minGreenTime}s (empty lanes)</li>
                    <li>Normal: {normalGreenTime}s (balanced)</li>
                    <li>Maximum: {maxGreenTime}s (congested)</li>
                    <li>Emergency: {emergencyGreenTime}s (priority)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h3 className="text-white font-bold mb-3">Legend</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Car className="text-blue-400" size={20} />
                <span className="text-gray-300">Car</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="text-blue-400" size={20} />
                <span className="text-gray-300">Truck</span>
              </div>
              <div className="flex items-center gap-2">
                <Bus className="text-blue-400" size={20} />
                <span className="text-gray-300">Bus</span>
              </div>
              <div className="flex items-center gap-2">
                <Bike className="text-blue-400" size={20} />
                <span className="text-gray-300">Bike</span>
              </div>
              <div className="flex items-center gap-2">
                <Car className="text-purple-400" size={20} />
                <span className="text-gray-300">Waiting Vehicle</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="text-red-500" size={20} />
                <span className="text-gray-300">Emergency Vehicle</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span className="text-gray-300">Green Signal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span className="text-gray-300">Red Signal</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 h-full flex flex-col">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Activity size={20} className="text-green-400" />
              Event Log
            </h3>
            <div
              className="space-y-2 overflow-y-auto"
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
                    <div>{event.message}</div>
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