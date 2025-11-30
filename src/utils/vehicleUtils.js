import { VEHICLE_TYPES } from "./constants.js";

// Pick random vehicle type based on spawn rate
export function getRandomVehicleType() {
  const rand = Math.random();
  let cumulative = 0;
  for (const [type, config] of Object.entries(VEHICLE_TYPES)) {
    cumulative += config.spawnRate;
    if (rand <= cumulative) return type;
  }
  return "car";
}
