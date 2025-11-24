import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Truck,
  Car,
  Clock,
  Activity,
} from "lucide-react";

const normalGreenTime = 20;
const emergencyGreenTime = 35;
const MAX_LOG_ITEMS = 80;

// Decide which axis should be green next
function decideNextGreen(
  vehicles,
  emergencyActive,
  emergencyDirection,
  currentGreen
) {
  // 1. Emergency always has first priority
  if (emergencyActive && emergencyDirection) {
    if (emergencyDirection === "N" || emergencyDirection === "S") return "NS";
    return "EW";
  }

  // 2. Otherwise, pick axis with more vehicles
  let nsCount = 0;
  let ewCount = 0;

  vehicles.forEach((v) => {
    if (v.direction === "N" || v.direction === "S") nsCount++;
    else if (v.direction === "E" || v.direction === "W") ewCount++;
  });

  if (nsCount === ewCount) return currentGreen; // avoid unnecessary flicker
  return nsCount > ewCount ? "NS" : "EW";
}

const TrafficSimulation = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [greenLight, setGreenLight] = useState("NS");
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
  const [ambulanceDirection, setAmbulanceDirection] = useState("N");

  const animationRef = useRef(null);
  const lastTimeRef = useRef(0);
  const vehiclesRef = useRef([]);
  const timerRef = useRef(normalGreenTime);

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

  // --- INITIAL VEHICLES --------------------------------------------------

  const createInitialVehicles = () => {
    const initial = [];
    const directions = ["N", "S", "E", "W"];

    directions.forEach((dir) => {
      for (let i = 0; i < 4; i++) {
        initial.push({
          id: `${dir}-init-${i}`,
          direction: dir,
          position: i * 90 + 80, // distance from intersection
          waiting: false,
          waitTime: 0,
          isEmergency: false,
          speed: 1, // base speed
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
    addEvent("Traffic simulation initialized with starter vehicles.", "system");
    timerRef.current = normalGreenTime;
    setTimer(normalGreenTime);
  }, []);

  // --- AMBULANCE SPAWN ---------------------------------------------------

  const spawnAmbulance = (dir) => {
    if (emergencyActive) return;

    const ambulance = {
      id: `AMB-${Date.now()}`,
      direction: dir,
      position: 300, // closer so it's clearly visible
      waiting: false,
      waitTime: 0,
      isEmergency: true,
      speed: 1.2, // slightly faster than normal
    };

    setVehicles((prev) => {
      const updated = [...prev, ambulance];
      vehiclesRef.current = updated;
      return updated;
    });

    setEmergencyActive(true);
    setEmergencyDirection(dir);

    // Immediately give green to ambulance axis
    if (dir === "N" || dir === "S") {
      setGreenLight("NS");
      addEvent(
        `🚨 Ambulance dispatched from ${dir} direction - NS signal override activated.`,
        "emergency"
      );
    } else {
      setGreenLight("EW");
      addEvent(
        `🚨 Ambulance dispatched from ${dir} direction - EW signal override activated.`,
        "emergency"
      );
    }

    timerRef.current = emergencyGreenTime;
    setTimer(emergencyGreenTime);

    setStats((prev) => ({
      ...prev,
      emergencyResponses: prev.emergencyResponses + 1,
    }));
  };

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
            const axisIsNS =
              vehicle.direction === "N" || vehicle.direction === "S";
            const canMoveOnAxis = greenLight === (axisIsNS ? "NS" : "EW");

            let waiting = vehicle.waiting;
            let waitTime = vehicle.waitTime;
            let position = vehicle.position;

            // If red → entire lane waits (no movement)
            if (!canMoveOnAxis) {
              waiting = true;
              waitTime += safeDelta;
            } else {
              waiting = false;
              // Slower movement for better visibility
              position = position - vehicle.speed * 0.6;
            }

            // remove vehicles that left the scene
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

        // Lane-wise counts
        const counts = { N: 0, S: 0, E: 0, W: 0 };
        updated.forEach((v) => {
          counts[v.direction] = (counts[v.direction] || 0) + 1;
        });
        setLaneCounts(counts);

        // Spawn normal vehicles occasionally (light random rate)
        if (Math.random() < 0.012) {
          const directions = ["N", "S", "E", "W"];
          const dir = directions[Math.floor(Math.random() * directions.length)];
          updated.push({
            id: `${dir}-${Date.now()}`,
            direction: dir,
            position: 300,
            waiting: false,
            waitTime: 0,
            isEmergency: false,
            speed: 1,
          });
          setStats((prev) => ({
            ...prev,
            totalVehicles: prev.totalVehicles + 1,
          }));
          addEvent(`New vehicle entered from ${dir} direction.`, "traffic");
        }

        // Check emergency status
        const emergencyVehicles = updated.filter((v) => v.isEmergency);
        if (emergencyActive && emergencyVehicles.length === 0) {
          setEmergencyActive(false);
          setEmergencyDirection(null);
          addEvent(
            "✓ Emergency vehicle cleared the intersection. Normal operation resumed.",
            "success"
          );
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

      // --- TIMER + SIGNAL UPDATE ----------------------------------------
      timerRef.current -= safeDelta;
      if (timerRef.current <= 0) {
        const nextLight = decideNextGreen(
          vehiclesRef.current,
          emergencyActive,
          emergencyDirection,
          greenLight
        );

        if (nextLight !== greenLight) {
          setGreenLight(nextLight);
          addEvent(
            `Signal changed to ${
              nextLight === "NS" ? "North-South GREEN" : "East-West GREEN"
            }.`,
            "signal"
          );
        }

        timerRef.current = emergencyActive
          ? emergencyGreenTime
          : normalGreenTime;
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
  }, [isRunning, greenLight, emergencyActive, emergencyDirection]);

  // --- RESET -------------------------------------------------------------

  const reset = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    setIsRunning(false);
    setTime(0);
    timerRef.current = normalGreenTime;
    setTimer(normalGreenTime);
    setGreenLight("NS");
    setEmergencyActive(false);
    setEmergencyDirection(null);
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
    addEvent("System reset. All parameters restored to default.", "system");
    setLaneCounts({ N: 0, S: 0, E: 0, W: 0 });
  };

  // --- VEHICLE POSITIONING (ALIGNED TO ROADS) ----------------------------

  const getVehicleStyle = (vehicle) => {
    const d = vehicle.position;
    const laneOffset = 20; // move cars slightly off the divider

    switch (vehicle.direction) {
      case "N": // coming from top
        return {
          left: `calc(50% - ${laneOffset}px)`,
          top: `calc(50% - ${d}px)`,
          transform: "translate(-50%, -50%) rotate(0deg)",
        };
      case "S": // coming from bottom
        return {
          left: `calc(50% + ${laneOffset}px)`,
          top: `calc(50% + ${d}px)`,
          transform: "translate(-50%, -50%) rotate(180deg)",
        };
      case "E": // coming from right
        return {
          left: `calc(50% + ${d}px)`,
          top: `calc(50% + ${laneOffset}px)`,
          transform: "translate(-50%, -50%) rotate(90deg)",
        };
      case "W": // coming from left
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

  // --- JSX (UI stays the same) ------------------------------------------

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <Activity className="text-green-400" />
          Smart Traffic Management System
        </h1>
        <p className="text-gray-300">
          Dynamic Signal Control with Emergency Vehicle Priority
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

            {/* Ambulance lane selector */}
            <div className="flex items-center gap-2 bg-gray-800 px-3 py-2 rounded-lg border border-gray-700">
              <span className="text-gray-300 text-sm">Ambulance from:</span>
              <select
                value={ambulanceDirection}
                onChange={(e) => setAmbulanceDirection(e.target.value)}
                className="bg-gray-900 text-gray-100 text-sm rounded-md px-2 py-1 border border-gray-700 focus:outline-none"
              >
                <option value="N">North</option>
                <option value="S">South</option>
                <option value="E">East</option>
                <option value="W">West</option>
              </select>
              <button
                onClick={() => spawnAmbulance(ambulanceDirection)}
                disabled={emergencyActive}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all text-sm"
              >
                <Truck size={18} />
                Dispatch Ambulance
              </button>
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

          {/* Lane counts */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {["N", "S", "E", "W"].map((dir) => {
              const isGreen =
                (greenLight === "NS" && (dir === "N" || dir === "S")) ||
                (greenLight === "EW" && (dir === "E" || dir === "W"));

              return (
                <div
                  key={dir}
                  className={`p-3 rounded-lg border text-center transition-all duration-300 ${
                    isGreen
                      ? "bg-green-900 border-green-500 shadow-lg scale-105"
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
                    className={`text-xl font-bold ${
                      isGreen ? "text-green-300" : "text-white"
                    }`}
                  >
                    {laneCounts[dir] || 0}
                  </div>
                  <div className="text-gray-500 text-xs">vehicles</div>
                </div>
              );
            })}
          </div>

          {/* Emergency banner */}
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

          {/* Intersection visualization */}
          <div
            className="relative bg-gray-700 rounded-lg p-8 overflow-hidden mx-auto"
            style={{ height: "600px", width: "600px" }}
          >
            {/* Vertical road */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 h-full bg-gray-600">
              <div className="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full border-l-2 border-dashed border-yellow-300"></div>
            </div>

            {/* Horizontal road */}
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-20 bg-gray-600">
              <div className="absolute top-1/2 transform -translate-y-1/2 w-full h-0.5 border-t-2 border-dashed border-yellow-300"></div>
            </div>

            {/* Center box */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-gray-500 border-4 border-yellow-400"></div>

            {/* NS signals */}
            <div className="absolute top-32 left-1/2 transform -translate-x-1/2 flex flex-col gap-1 bg-gray-900 p-2 rounded">
              <div
                className={`w-4 h-4 rounded-full ${
                  greenLight === "NS" ? "bg-green-500" : "bg-gray-700"
                }`}
              ></div>
              <div
                className={`w-4 h-4 rounded-full ${
                  greenLight === "NS" ? "bg-gray-700" : "bg-red-500"
                }`}
              ></div>
            </div>
            <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 flex flex-col gap-1 bg-gray-900 p-2 rounded">
              <div
                className={`w-4 h-4 rounded-full ${
                  greenLight === "NS" ? "bg-green-500" : "bg-gray-700"
                }`}
              ></div>
              <div
                className={`w-4 h-4 rounded-full ${
                  greenLight === "NS" ? "bg-gray-700" : "bg-red-500"
                }`}
              ></div>
            </div>

            {/* EW signals */}
            <div className="absolute right-32 top-1/2 transform -translate-y-1/2 flex gap-1 bg-gray-900 p-2 rounded">
              <div
                className={`w-4 h-4 rounded-full ${
                  greenLight === "EW" ? "bg-green-500" : "bg-gray-700"
                }`}
              ></div>
              <div
                className={`w-4 h-4 rounded-full ${
                  greenLight === "EW" ? "bg-gray-700" : "bg-red-500"
                }`}
              ></div>
            </div>
            <div className="absolute left-32 top-1/2 transform -translate-y-1/2 flex gap-1 bg-gray-900 p-2 rounded">
              <div
                className={`w-4 h-4 rounded-full ${
                  greenLight === "EW" ? "bg-green-500" : "bg-gray-700"
                }`}
              ></div>
              <div
                className={`w-4 h-4 rounded-full ${
                  greenLight === "EW" ? "bg-gray-700" : "bg-red-500"
                }`}
              ></div>
            </div>

            {/* Timer display */}
            <div className="absolute top-4 left-4 bg-gray-900 px-4 py-2 rounded-lg border border-gray-600">
              <div className="flex items-center gap-2 text-white">
                <Clock size={16} />
                <span className="font-mono text-lg">{Math.ceil(timer)}s</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {greenLight === "NS" ? "N-S Green" : "E-W Green"}
              </div>
            </div>

            {/* Vehicles */}
            {vehicles.map((vehicle) => {
              const style = getVehicleStyle(vehicle);
              return (
                <div
                  key={vehicle.id}
                  className="absolute car-animation transition-all duration-100"
                  style={style}
                >
                  {vehicle.isEmergency ? (
                    <Truck
                      className="text-red-500 animate-pulse drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]"
                      size={36}
                      fill="white"
                    />
                  ) : (
                    <Car
                      className={`${
                        vehicle.waiting
                          ? "text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.7)]"
                          : "text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.7)]"
                      }`}
                      size={30}
                    />
                  )}
                </div>
              );
            })}

            {/* Direction labels */}
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

          {/* Legend */}
          <div className="mt-6 bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h3 className="text-white font-bold mb-3">Legend</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Car className="text-blue-400" size={20} />
                <span className="text-gray-300">Normal Vehicle</span>
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
            </div>
          </div>

          {/* Features */}
          <div className="mt-6 bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg p-4">
            <h3 className="text-blue-300 font-bold mb-2">System Features</h3>
            <ul className="text-blue-200 text-sm space-y-1">
              <li>✓ Dynamic traffic light timing based on vehicle density</li>
              <li>✓ Emergency vehicle priority with signal override</li>
              <li>✓ Real-time monitoring of wait times and congestion</li>
              <li>✓ Automatic priority lane clearance for ambulances</li>
              <li>✓ Adaptive signal timing (20s normal / 35s emergency)</li>
            </ul>
          </div>
        </div>

        {/* RIGHT: Event Log */}
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
