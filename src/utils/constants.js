import { Truck, Car, Bus, Bike, Shield, Flame, AlertTriangle } from "lucide-react";

export const normalGreenTime = 15;
export const emergencyGreenTime = 25;
export const MAX_LOG_ITEMS = 80;

export const VEHICLE_TYPES = {
  car: { icon: Car, color: "text-blue-400", bgColor: "bg-blue-500", speed: 1, size: 24, spawnRate: 0.4, isPriority: false },
  bus: { icon: Bus, color: "text-orange-400", bgColor: "bg-orange-500", speed: 0.7, size: 28, spawnRate: 0.15, isPriority: false },
  truck: { icon: Truck, color: "text-gray-400", bgColor: "bg-gray-500", speed: 0.6, size: 30, spawnRate: 0.1, isPriority: false },
  bike: { icon: Bike, color: "text-green-400", bgColor: "bg-green-500", speed: 1.2, size: 20, spawnRate: 0.1, isPriority: false },
  ambulance: { icon: AlertTriangle, color: "text-white", bgColor: "bg-red-600", speed: 1.5, size: 32, spawnRate: 0.02, isPriority: true, priorityType: "ambulance" },
  fire: { icon: Flame, color: "text-white", bgColor: "bg-red-500", speed: 1.4, size: 30, spawnRate: 0.02, isPriority: true, priorityType: "fire" },
  police: { icon: Shield, color: "text-white", bgColor: "bg-blue-600", speed: 1.6, size: 28, spawnRate: 0.02, isPriority: true, priorityType: "police" },
};
