import React, { useState, useEffect, useMemo } from 'react';

interface CurrentTimeIndicatorProps {
  hourHeight: number;
}

/**
 * ⚡ Performance Optimization:
 * Isolated component for the current time indicator line.
 * This prevents the entire parent view (WeekView/DayView) from re-rendering
 * every minute when the time updates.
 */
const CurrentTimeIndicator: React.FC<CurrentTimeIndicatorProps> = React.memo(({ hourHeight }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Initial set
    setCurrentTime(new Date());

    // Update every minute to keep the line accurate
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const topPosition = useMemo(() => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    // Position is proportional to the time of day
    // hourHeight is the height of 1 hour in pixels
    return (hours + minutes / 60) * hourHeight;
  }, [currentTime, hourHeight]);

  return (
    <div
      className="absolute left-0 right-0 z-20 pointer-events-none transition-all duration-1000 ease-in-out"
      style={{ top: topPosition }}
      aria-hidden="true"
    >
      <div className="relative flex items-center">
        <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shadow-sm" />
        <div className="flex-1 h-0.5 bg-red-500 shadow-sm opacity-50" />
      </div>
    </div>
  );
});

export default CurrentTimeIndicator;
