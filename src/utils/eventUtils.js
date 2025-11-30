import { MAX_LOG_ITEMS } from "./constants.js";

export const addEvent = (setEventLog, message, type = "info") => {
  const timestamp = new Date().toLocaleTimeString("en-IN", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  setEventLog((prev) => {
    const next = [
      { id: `${Date.now()}-${Math.random()}`, time: timestamp, message, type },
      ...prev,
    ];
    return next.slice(0, MAX_LOG_ITEMS);
  });
};
