import React from "react";
import { Car, Truck, Bus, Bike, Shield, Flame, AlertTriangle, Siren } from "lucide-react";
import { VEHICLE_TYPES } from "../utils/constants";
import { Play, Pause, RotateCcw, Activity, Clock, Siren } from "lucide-react";
import { Car, Truck, Bus, Bike, Shield, Flame, AlertTriangle, Siren } from "lucide-react";


// Simple reusable component to render a single vehicle icon with styling
export const VehicleIconCard = ({ type }) => {
  const config = VEHICLE_TYPES[type];
  if (!config) return null;

  const IconComponent = config.icon;

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded ${
        config.isPriority ? "bg-red-900 bg-opacity-50" : "bg-gray-700"
      }`}
    >
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
};

// Component to show all vehicle icons together (like your legend)
export const VehicleLegend = () => {
  return (
    <div className="mt-6 bg-gray-800 p-4 rounded-lg border border-gray-700">
      <h3 className="text-white font-bold mb-3">Vehicle Types & Emergency Symbols</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
        {Object.keys(VEHICLE_TYPES).map((type) => (
          <VehicleIconCard key={type} type={type} />
        ))}
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
  );
};

export default VehicleLegend;
