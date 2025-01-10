import React from 'react'

interface TimelineMarkersProps {
  startTime: number;
  endTime: number;
}

export function TimelineMarkers({ startTime, endTime }: TimelineMarkersProps) {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="relative w-full h-10 mt-2">
      <div className="absolute left-[1%] text-sm text-gray-600">
        {formatTime(startTime)}
      </div>
      <div className="absolute right-[1%] text-sm text-gray-600">
        {formatTime(endTime)}
      </div>
    </div>
  );
}
