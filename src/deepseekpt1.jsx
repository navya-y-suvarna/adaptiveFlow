import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Truck, Car, Clock, Activity, Download, Upload, Bike } from 'lucide-react';
import * as Papa from 'papaparse';

const TrafficSimulation = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [greenLight, setGreenLight] = useState('NS');
  const [timer, setTimer] = useState(20);
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [emergencyDirection, setEmergencyDirection] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [stats, setStats] = useState({
    totalVehicles: 0,
    avgWaitTime: 0,
    emergencyResponses: 0,
    avgEmergencyTime: 2.3
  });
  const [eventLog, setEventLog] = useState([]);
  const [laneCounts, setLaneCounts] = useState({ N: 0, S: 0, E: 0, W: 0 });
  const [datasetData, setDatasetData] = useState([]);
  const [currentDataIndex, setCurrentDataIndex] = useState(0);
  const [isDatasetLoaded, setIsDatasetLoaded] = useState(false);

  const animationRef = useRef(null);
  const lastTimeRef = useRef(0);
  const vehiclesRef = useRef([]);
  const timerRef = useRef(20);

  const normalGreenTime = 20;
  const emergencyGreenTime = 35;
  const MAX_LOG_ITEMS = 80;

  // Vehicle types with different properties
  const VEHICLE_TYPES = {
    CAR: { 
      icon: Car, 
      color: 'text-blue-400',
      waitingColor: 'text-purple-400',
      size: 20,
      speed: 1.0,
      spawnChance: 0.6
    },
    BIKE: { 
      icon: Bike, 
      color: 'text-green-400',
      waitingColor: 'text-yellow-400',
      size: 18,
      speed: 1.3,
      spawnChance: 0.3
    },
    TRUCK: { 
      icon: Truck, 
      color: 'text-orange-400',
      waitingColor: 'text-red-400',
      size: 24,
      speed: 0.7,
      spawnChance: 0.1
    }
  };

  // Sample dataset structure
  const sampleDataset = [
    { time: '08:00:00', vehicle_count: 12, emergency_vehicle: false, congestion_level: 'medium' },
    { time: '08:05:00', vehicle_count: 15, emergency_vehicle: false, congestion_level: 'high' },
    { time: '08:10:00', vehicle_count: 8, emergency_vehicle: true, congestion_level: 'low' },
    { time: '08:15:00', vehicle_count: 20, emergency_vehicle: false, congestion_level: 'high' },
    { time: '08:20:00', vehicle_count: 6, emergency_vehicle: false, congestion_level: 'low' },
    { time: '08:25:00', vehicle_count: 18, emergency_vehicle: true, congestion_level: 'high' },
  ];

  // --- DATASET HANDLING -------------------------------------------------

  const loadSampleDataset = () => {
    setDatasetData(sampleDataset);
    setIsDatasetLoaded(true);
    addEvent('Sample dataset loaded successfully.', 'system');
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const processedData = results.data
            .filter(row => row && row.length >= 3)
            .map((row, index) => ({
              time: row[0] || `08:${(index * 5).toString().padStart(2, '0')}:00`,
              vehicle_count: parseInt(row[1]) || Math.floor(Math.random() * 25) + 5,
              emergency_vehicle: Boolean(parseInt(row[2])) || Math.random() < 0.3,
              congestion_level: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
            }));
          
          setDatasetData(processedData);
          setIsDatasetLoaded(true);
          addEvent(`CSV dataset loaded with ${processedData.length} records.`, 'system');
        }
      },
      header: false
    });
  };

  // --- EVENT LOG HELPERS -------------------------------------------------

  const addEvent = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString('en-IN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    setEventLog(prev => {
      const next = [
        {
          id: `${Date.now()}-${Math.random()}`,
          time: timestamp,
          message,
          type
        },
        ...prev
      ];
      return next.slice(0, MAX_LOG_ITEMS);
    });
  };

  // --- TIME FORMATTER ----------------------------------------------------

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // --- VEHICLE GENERATION -------------------------------------------------

  const getRandomVehicleType = () => {
    const rand = Math.random();
    let cumulative = 0;
    
    for (const [type, config] of Object.entries(VEHICLE_TYPES)) {
      cumulative += config.spawnChance;
      if (rand <= cumulative) {
        return type;
      }
    }
    return 'CAR'; // fallback
  };

  const generateVehiclesFromDataset = useCallback(() => {
    if (!isDatasetLoaded || datasetData.length === 0) {
      return createInitialVehicles();
    }

    const currentData = datasetData[currentDataIndex];
    const vehicleCount = currentData.vehicle_count;
    const hasEmergency = currentData.emergency_vehicle;
    
    const directions = ['N', 'S', 'E', 'W'];
    const vehicles = [];

    // Generate normal vehicles with different types
    for (let i = 0; i < vehicleCount; i++) {
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const vehicleType = getRandomVehicleType();
      const vehicleConfig = VEHICLE_TYPES[vehicleType];
      
      vehicles.push({
        id: `${dir}-${vehicleType}-${currentDataIndex}-${i}`,
        direction: dir,
        position: Math.random() * 300 + 150,
        waiting: false,
        waitTime: 0,
        isEmergency: false,
        vehicleType: vehicleType,
        speed: vehicleConfig.speed,
        size: vehicleConfig.size
      });
    }

    // Add emergency vehicle if detected
    if (hasEmergency) {
      const emergencyDir = directions[Math.floor(Math.random() * directions.length)];
      vehicles.push({
        id: `AMB-${currentDataIndex}-emergency`,
        direction: emergencyDir,
        position: 450,
        waiting: false,
        waitTime: 0,
        isEmergency: true,
        vehicleType: 'TRUCK',
        speed: 1.5,
        size: 24
      });

      addEvent(`🚨 Emergency vehicle detected from ${emergencyDir} direction.`, 'emergency');
      
      setEmergencyActive(true);
      setEmergencyDirection(emergencyDir);
      
      if (emergencyDir === 'N' || emergencyDir === 'S') {
        setGreenLight('NS');
      } else {
        setGreenLight('EW');
      }
      
      timerRef.current = emergencyGreenTime;
      setTimer(emergencyGreenTime);

      setStats(prev => ({
        ...prev,
        emergencyResponses: prev.emergencyResponses + 1
      }));
    }

    addEvent(`Generated ${vehicleCount} vehicles (${hasEmergency ? 'with emergency' : 'no emergency'})`, 'traffic');
    setCurrentDataIndex(prev => (prev + 1) % datasetData.length);

    return vehicles;
  }, [isDatasetLoaded, datasetData, currentDataIndex]);

  const createInitialVehicles = () => {
    const initial = [];
    const directions = ['N', 'S', 'E', 'W'];
    const vehicleTypes = Object.keys(VEHICLE_TYPES);

    directions.forEach(dir => {
      for (let i = 0; i < 2; i++) {
        const vehicleType = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
        const config = VEHICLE_TYPES[vehicleType];
        
        initial.push({
          id: `${dir}-${vehicleType}-init-${i}`,
          direction: dir,
          position: i * 120 + 100,
          waiting: false,
          waitTime: 0,
          isEmergency: false,
          vehicleType: vehicleType,
          speed: config.speed,
          size: config.size
        });
      }
    });
    return initial;
  };

  useEffect(() => {
    const initialVehicles = createInitialVehicles();
    setVehicles(initialVehicles);
    vehiclesRef.current = initialVehicles;
    setStats(prev => ({
      ...prev,
      totalVehicles: initialVehicles.length
    }));
    addEvent('Traffic simulation initialized with multiple vehicle types.', 'system');
    timerRef.current = normalGreenTime;
    setTimer(normalGreenTime);
  }, []);

  // --- DECIDE NEXT GREEN AXIS --------------------------------------------

  const decideNextGreen = useCallback(() => {
    if (emergencyActive && emergencyDirection) {
      if (emergencyDirection === 'N' || emergencyDirection === 'S') {
        return 'NS';
      }
      return 'EW';
    }

    if (isDatasetLoaded && datasetData.length > 0) {
      const currentData = datasetData[currentDataIndex];
      if (currentData.congestion_level === 'high') {
        timerRef.current = 15;
      }
    }

    const currentVehicles = vehiclesRef.current || [];
    let nsCount = 0;
    let ewCount = 0;

    currentVehicles.forEach(v => {
      if (v.direction === 'N' || v.direction === 'S') nsCount++;
      else if (v.direction === 'E' || v.direction === 'W') ewCount++;
    });

    if (nsCount === ewCount) return greenLight;
    return nsCount > ewCount ? 'NS' : 'EW';
  }, [emergencyActive, emergencyDirection, greenLight, isDatasetLoaded, datasetData, currentDataIndex]);

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

      setTime(prev => prev + safeDelta);

      // Timer and signal logic
      timerRef.current -= safeDelta;
      if (timerRef.current <= 0) {
        const newLight = decideNextGreen();
        setGreenLight(newLight);
        addEvent(
          `Signal changed to ${newLight === 'NS' ? 'North-South GREEN' : 'East-West GREEN'}.`,
          'signal'
        );
        timerRef.current = emergencyActive ? emergencyGreenTime : normalGreenTime;
        
        // Generate new vehicles from dataset
        if (isDatasetLoaded) {
          const newVehicles = generateVehiclesFromDataset();
          setVehicles(prev => {
            const updated = [...prev, ...newVehicles];
            vehiclesRef.current = updated;
            return updated;
          });
          
          setStats(prev => ({
            ...prev,
            totalVehicles: prev.totalVehicles + newVehicles.length
          }));
        }
      }
      setTimer(timerRef.current);

      // Update vehicles
      setVehicles(prevVehicles => {
        const updated = prevVehicles
          .map(vehicle => {
            const axisIsNS = vehicle.direction === 'N' || vehicle.direction === 'S';
            const canMoveOnAxis = greenLight === (axisIsNS ? 'NS' : 'EW');

            let waiting = vehicle.waiting;
            let waitTime = vehicle.waitTime;
            let position = vehicle.position;

            if (!canMoveOnAxis) {
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
              waitTime
            };
          })
          .filter(Boolean);

        // Lane counts
        const counts = { N: 0, S: 0, E: 0, W: 0 };
        updated.forEach(v => {
          counts[v.direction] = (counts[v.direction] || 0) + 1;
        });
        setLaneCounts(counts);

        // Spawn random vehicles if no dataset
        if (!isDatasetLoaded && Math.random() < 0.006) {
          const directions = ['N', 'S', 'E', 'W'];
          const dir = directions[Math.floor(Math.random() * directions.length)];
          const isEmergency = Math.random() < 0.03;
          const vehicleType = getRandomVehicleType();
          const config = VEHICLE_TYPES[vehicleType];
          
          const newVehicle = {
            id: `${dir}-${vehicleType}-${Date.now()}`,
            direction: dir,
            position: 450,
            waiting: false,
            waitTime: 0,
            isEmergency,
            vehicleType,
            speed: isEmergency ? 1.5 : config.speed,
            size: config.size
          };
          
          updated.push(newVehicle);
          
          if (isEmergency) {
            addEvent(`🚨 Emergency ${vehicleType.toLowerCase()} spawned from ${dir} direction.`, 'emergency');
            setEmergencyActive(true);
            setEmergencyDirection(dir);
            setStats(prev => ({
              ...prev,
              emergencyResponses: prev.emergencyResponses + 1
            }));
          }
          
          setStats(prev => ({
            ...prev,
            totalVehicles: prev.totalVehicles + 1
          }));
        }

        // Check emergency status
        const emergencyVehicles = updated.filter(v => v.isEmergency);
        if (emergencyActive && emergencyVehicles.length === 0) {
          setEmergencyActive(false);
          setEmergencyDirection(null);
          addEvent('✓ Emergency vehicle cleared. Normal operation resumed.', 'success');
        }

        // Update average wait time
        const waitingVehicles = updated.filter(v => v.waiting);
        if (waitingVehicles.length > 0) {
          const avgWait = waitingVehicles.reduce((sum, v) => sum + v.waitTime, 0) / waitingVehicles.length;
          setStats(prev => ({
            ...prev,
            avgWaitTime: avgWait
          }));
        } else {
          setStats(prev => ({
            ...prev,
            avgWaitTime: 0
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
  }, [isRunning, greenLight, emergencyActive, decideNextGreen, isDatasetLoaded, generateVehiclesFromDataset]);

  // --- RESET -------------------------------------------------------------

  const reset = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    setIsRunning(false);
    setTime(0);
    timerRef.current = normalGreenTime;
    setTimer(normalGreenTime);
    setGreenLight('NS');
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
      avgEmergencyTime: 2.3
    });

    setEventLog([]);
    addEvent('System reset. All parameters restored to default.', 'system');
    setLaneCounts({ N: 0, S: 0, E: 0, W: 0 });
  };

  // --- VEHICLE RENDERING -------------------------------------------------

  const getVehicleStyle = (vehicle) => {
    const d = vehicle.position;

    switch (vehicle.direction) {
      case 'N':
        return {
          left: '50%',
          top: `calc(50% - ${d}px)`,
          transform: 'translate(-50%, -50%) rotate(0deg)'
        };
      case 'S':
        return {
          left: '50%',
          top: `calc(50% + ${d}px)`,
          transform: 'translate(-50%, -50%) rotate(180deg)'
        };
      case 'E':
        return {
          left: `calc(50% + ${d}px)`,
          top: '50%',
          transform: 'translate(-50%, -50%) rotate(90deg)'
        };
      case 'W':
        return {
          left: `calc(50% - ${d}px)`,
          top: '50%',
          transform: 'translate(-50%, -50%) rotate(270deg)'
        };
      default:
        return {
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)'
        };
    }
  };

  const renderVehicle = (vehicle) => {
    if (vehicle.isEmergency) {
      return <Truck className="text-red-500 animate-pulse" size={24} fill="white" />;
    }

    const config = VEHICLE_TYPES[vehicle.vehicleType];
    const IconComponent = config.icon;
    const colorClass = vehicle.waiting ? config.waitingColor : config.color;

    return <IconComponent className={colorClass} size={config.size} />;
  };

  // --- JSX ---------------------------------------------------------------

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <Activity className="text-green-400" />
          National Highway Four-Way Intersection
        </h1>
        <p className="text-gray-300">
          Realistic 4-lane traffic simulation with proper signal placement
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Controls + Simulation */}
        <div className="lg:col-span-2">
          {/* Controls */}
          <div className="flex gap-3 mb-6 flex-wrap items-center">
            <button
              onClick={() => setIsRunning(prev => {
                const next = !prev;
                addEvent(next ? 'Simulation started.' : 'Simulation paused.', 'system');
                return next;
              })}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all"
            >
              {isRunning ? <Pause size={20} /> : <Play size={20} />}
              {isRunning ? 'Pause' : 'Start'}
            </button>
            <button
              onClick={reset}
              className="flex items-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-all"
            >
              <RotateCcw size={20} />
              Reset
            </button>

            {/* Dataset Controls */}
            <div className="flex items-center gap-2 bg-gray-800 px-3 py-2 rounded-lg border border-gray-700">
              <span className="text-gray-300 text-sm">Dataset:</span>
              <button
                onClick={loadSampleDataset}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all text-sm"
              >
                <Download size={16} />
                Load Sample
              </button>
              <label className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all text-sm cursor-pointer">
                <Upload size={16} />
                Upload CSV
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Dataset Status */}
          {isDatasetLoaded && (
            <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-blue-300 font-bold">Dataset Active</div>
                  <div className="text-blue-200 text-sm">
                    {datasetData.length} data points | Current: {datasetData[currentDataIndex]?.vehicle_count} vehicles
                  </div>
                </div>
                <div className="text-blue-300 text-sm">
                  {datasetData[currentDataIndex]?.congestion_level?.toUpperCase()} CONGESTION
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm mb-1">Simulation Time</div>
              <div className="text-2xl font-bold text-white font-mono">{formatTime(time)}</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm mb-1">Total Vehicles</div>
              <div className="text-2xl font-bold text-white">{stats.totalVehicles}</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm mb-1">Avg Wait Time</div>
              <div className="text-2xl font-bold text-white">{stats.avgWaitTime.toFixed(1)}s</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm mb-1">Emergency Responses</div>
              <div className="text-2xl font-bold text-red-400">{stats.emergencyResponses}</div>
            </div>
          </div>

          {/* Lane counts */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {['N', 'S', 'E', 'W'].map(dir => (
              <div key={dir} className="bg-gray-800 p-3 rounded-lg border border-gray-700 text-center">
                <div className="text-gray-400 text-xs mb-1">
                  {dir === 'N' ? 'North Bound' : dir === 'S' ? 'South Bound' : dir === 'E' ? 'East Bound' : 'West Bound'}
                </div>
                <div className="text-xl font-bold text-white">{laneCounts[dir] || 0}</div>
                <div className="text-gray-500 text-xs">vehicles</div>
              </div>
            ))}
          </div>

          {/* Emergency banner */}
          {emergencyActive && (
            <div className="bg-red-900 border-2 border-red-500 rounded-lg p-4 mb-6 animate-pulse">
              <div className="flex items-center gap-3">
                <Truck className="text-red-300" size={24} />
                <div>
                  <div className="text-red-100 font-bold">EMERGENCY VEHICLE DETECTED</div>
                  <div className="text-red-300 text-sm">
                    Direction: {emergencyDirection} | Signal override active | Priority green enabled
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Intersection visualization */}
          <div className="relative bg-gray-700 rounded-lg p-8 overflow-hidden mx-auto" style={{ height: '600px', width: '600px' }}>
            {/* 4-Lane Roads with proper markings */}
            {/* North-South Road (Vertical - 4 lanes) */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-full bg-gray-600">
              {/* Lane markings for 4-lane vertical road */}
              <div className="absolute left-1/4 transform -translate-x-1/2 w-1 h-full border-l-2 border-dashed border-yellow-300"></div>
              <div className="absolute left-2/4 transform -translate-x-1/2 w-1 h-full border-l-2 border-dashed border-yellow-300"></div>
              <div className="absolute left-3/4 transform -translate-x-1/2 w-1 h-full border-l-2 border-dashed border-yellow-300"></div>
            </div>

            {/* East-West Road (Horizontal - 4 lanes) */}
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-32 bg-gray-600">
              {/* Lane markings for 4-lane horizontal road */}
              <div className="absolute top-1/4 transform -translate-y-1/2 w-full h-1 border-t-2 border-dashed border-yellow-300"></div>
              <div className="absolute top-2/4 transform -translate-y-1/2 w-full h-1 border-t-2 border-dashed border-yellow-300"></div>
              <div className="absolute top-3/4 transform -translate-y-1/2 w-full h-1 border-t-2 border-dashed border-yellow-300"></div>
            </div>

            {/* Center intersection box */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gray-500 border-4 border-yellow-400"></div>

            {/* REALISTIC TRAFFIC SIGNALS - One signal per approach on the right side */}
            
            {/* North Signal (Right side of northbound approach) */}
            <div className="absolute top-32 right-1/4 transform translate-x-4 flex flex-col items-center">
              <div className="bg-black p-3 rounded-lg border-2 border-gray-500 shadow-lg">
                <div className={`w-8 h-8 rounded-full mb-2 border-2 border-gray-300 ${greenLight === 'NS' ? 'bg-green-500' : 'bg-gray-800'}`}></div>
                <div className={`w-8 h-8 rounded-full border-2 border-gray-300 ${greenLight === 'NS' ? 'bg-gray-800' : 'bg-red-500'}`}></div>
              </div>
              <div className="text-white text-sm mt-2 font-bold bg-black bg-opacity-50 px-2 py-1 rounded">NORTH</div>
            </div>

            {/* South Signal (Right side of southbound approach) */}
            <div className="absolute bottom-32 left-1/4 transform -translate-x-4 flex flex-col items-center">
              <div className="bg-black p-3 rounded-lg border-2 border-gray-500 shadow-lg">
                <div className={`w-8 h-8 rounded-full mb-2 border-2 border-gray-300 ${greenLight === 'NS' ? 'bg-green-500' : 'bg-gray-800'}`}></div>
                <div className={`w-8 h-8 rounded-full border-2 border-gray-300 ${greenLight === 'NS' ? 'bg-gray-800' : 'bg-red-500'}`}></div>
              </div>
              <div className="text-white text-sm mt-2 font-bold bg-black bg-opacity-50 px-2 py-1 rounded">SOUTH</div>
            </div>

            {/* East Signal (Right side of eastbound approach) */}
            <div className="absolute right-32 bottom-1/4 transform translate-y-4 flex items-center">
              <div className="bg-black p-3 rounded-lg border-2 border-gray-500 shadow-lg flex gap-2">
                <div className={`w-8 h-8 rounded-full border-2 border-gray-300 ${greenLight === 'EW' ? 'bg-green-500' : 'bg-gray-800'}`}></div>
                <div className={`w-8 h-8 rounded-full border-2 border-gray-300 ${greenLight === 'EW' ? 'bg-gray-800' : 'bg-red-500'}`}></div>
              </div>
              <div className="text-white text-sm ml-2 font-bold bg-black bg-opacity-50 px-2 py-1 rounded">EAST</div>
            </div>

            {/* West Signal (Right side of westbound approach) */}
            <div className="absolute left-32 top-1/4 transform -translate-y-4 flex items-center">
              <div className="text-white text-sm mr-2 font-bold bg-black bg-opacity-50 px-2 py-1 rounded">WEST</div>
              <div className="bg-black p-3 rounded-lg border-2 border-gray-500 shadow-lg flex gap-2">
                <div className={`w-8 h-8 rounded-full border-2 border-gray-300 ${greenLight === 'EW' ? 'bg-green-500' : 'bg-gray-800'}`}></div>
                <div className={`w-8 h-8 rounded-full border-2 border-gray-300 ${greenLight === 'EW' ? 'bg-gray-800' : 'bg-red-500'}`}></div>
              </div>
            </div>

            {/* Signal poles */}
            <div className="absolute top-32 right-1/4 transform translate-x-4">
              <div className="w-2 h-20 bg-gray-400 absolute -top-20 left-1/2 transform -translate-x-1/2"></div>
            </div>
            <div className="absolute bottom-32 left-1/4 transform -translate-x-4">
              <div className="w-2 h-20 bg-gray-400 absolute -bottom-20 left-1/2 transform -translate-x-1/2"></div>
            </div>
            <div className="absolute right-32 bottom-1/4 transform translate-y-4">
              <div className="h-2 w-20 bg-gray-400 absolute -right-20 top-1/2 transform -translate-y-1/2"></div>
            </div>
            <div className="absolute left-32 top-1/4 transform -translate-y-4">
              <div className="h-2 w-20 bg-gray-400 absolute -left-20 top-1/2 transform -translate-y-1/2"></div>
            </div>

            {/* Timer display */}
            <div className="absolute top-4 left-4 bg-gray-900 px-4 py-2 rounded-lg border-2 border-gray-600">
              <div className="flex items-center gap-2 text-white">
                <Clock size={16} />
                <span className="font-mono text-lg">{Math.ceil(timer)}s</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {greenLight === 'NS' ? 'North-South Green' : 'East-West Green'}
              </div>
            </div>

            {/* Road names */}
            <div className="absolute top-10 left-10 bg-yellow-500 bg-opacity-90 px-3 py-1 rounded rotate-45">
              <div className="text-black text-sm font-bold -rotate-45">NH-48</div>
            </div>
            <div className="absolute bottom-10 right-10 bg-yellow-500 bg-opacity-90 px-3 py-1 rounded -rotate-45">
              <div className="text-black text-sm font-bold rotate-45">NH-48</div>
            </div>

            {/* Vehicles */}
            {vehicles.map(vehicle => {
              const style = getVehicleStyle(vehicle);
              return (
                <div key={vehicle.id} className="absolute transition-all duration-100" style={style}>
                  {renderVehicle(vehicle)}
                </div>
              );
            })}

            {/* Direction labels */}
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-white font-bold text-lg bg-black bg-opacity-50 px-3 py-1 rounded">
              NORTH BOUND
            </div>
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-white font-bold text-lg bg-black bg-opacity-50 px-3 py-1 rounded">
              SOUTH BOUND
            </div>
            <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white font-bold text-lg bg-black bg-opacity-50 px-3 py-1 rounded">
              WEST BOUND
            </div>
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white font-bold text-lg bg-black bg-opacity-50 px-3 py-1 rounded">
              EAST BOUND
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h3 className="text-white font-bold mb-3">National Highway Traffic System</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Car className="text-blue-400" size={20} />
                <span className="text-gray-300">Car</span>
              </div>
              <div className="flex items-center gap-2">
                <Bike className="text-green-400" size={18} />
                <span className="text-gray-300">Bike</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="text-orange-400" size={24} />
                <span className="text-gray-300">Truck</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="text-red-500" size={24} />
                <span className="text-gray-300">Emergency</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-full border border-white"></div>
                <span className="text-gray-300">Green Light</span>
              </div>
            </div>
            <div className="mt-3 text-gray-400 text-xs">
              • 4-lane national highway intersection • Signals on right side of each approach • NH-48 East-West corridor
            </div>
          </div>
        </div>

        {/* RIGHT: Event Log */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 h-full flex flex-col">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Activity size={20} className="text-green-400" />
              Traffic Event Log
            </h3>
            <div className="space-y-2 overflow-y-auto" style={{ maxHeight: '800px' }}>
              {eventLog.length === 0 ? (
                <div className="text-gray-500 text-sm italic">No events yet. Start the simulation to see activity.</div>
              ) : (
                eventLog.map(event => (
                  <div key={event.id} className={`p-3 rounded text-sm border-l-4 ${
                    event.type === 'emergency' ? 'bg-red-900 bg-opacity-30 border-red-500 text-red-200' :
                    event.type === 'success' ? 'bg-green-900 bg-opacity-30 border-green-500 text-green-200' :
                    event.type === 'signal' ? 'bg-yellow-900 bg-opacity-30 border-yellow-500 text-yellow-200' :
                    event.type === 'traffic' ? 'bg-blue-900 bg-opacity-30 border-blue-500 text-blue-200' :
                    'bg-gray-700 border-gray-600 text-gray-300'
                  }`}>
                    <div className="font-mono text-xs opacity-70 mb-1">{event.time}</div>
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