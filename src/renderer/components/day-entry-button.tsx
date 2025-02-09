import { formatTimestampToArray, formatDuration } from '@/src/shared/utils';
import React from 'react'
import type { Entry } from '../../shared/types';

interface DayEntryButtonProps {
  entry: Entry;
  selectedEntryId: string;
  handleEntryClick: (entry: Entry) => void;
  displayTitle: { display: string, timeRange: string };
}

const DayEntryButton = ({ entry, selectedEntryId, handleEntryClick, displayTitle }: DayEntryButtonProps) => {
  return (
    <button
      key={entry.id}
      className={`w-full p-2 text-left transition-colors duration-200 rounded-xl ${
        selectedEntryId === entry.id.toString()
          ? "bg-yellow-100 text-yellow-900"
          : "hover:bg-gray-100"
      }`}
      onClick={() => handleEntryClick(entry)}
    >
      <div className="flex items-center justify-between">
        <div className="">
          <div className="flex items-center justify-between">
            <span className="font-medium">
              {displayTitle.display}
            </span>
          </div>
          <p className="text-xs text-gray-500 truncate">
            {displayTitle.timeRange}, ({formatDuration(entry.day.duration)})
          </p>
        </div>
        <div className="relative w-8 h-8">
          <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
            <circle
              cx="16"
              cy="16"
              r="14"
              fill="none"
              stroke={selectedEntryId === entry.id.toString() ? "#d1d5db" : "#e5e7eb"}
              strokeWidth="3"
            />
            <circle
              cx="16"
              cy="16"
              r="14"
              fill="none"
              stroke={
                selectedEntryId === entry.id.toString()
                  ? (entry.day.productivity <= 33 ? "#dc2626" :
                     entry.day.productivity <= 66 ? "#ca8a04" :
                     "#16a34a")
                  : (entry.day.productivity <= 33 ? "#f87171" :
                     entry.day.productivity <= 66 ? "#facc15" :
                     "#4ade80")
              }
              strokeWidth="3"
              strokeDasharray={`${Math.max(2, (entry.day.productivity / 100) * 88)} 88`}
            />
          </svg>
          <span className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-sm font-bold ${
            selectedEntryId === entry.id.toString()
              ? (entry.day.productivity <= 33 ? "text-red-600" :
                 entry.day.productivity <= 66 ? "text-yellow-600" :
                 "text-green-600")
              : (entry.day.productivity <= 33 ? "text-red-400" :
                 entry.day.productivity <= 66 ? "text-yellow-400" :
                 "text-green-400")
          }`}>
            {Math.round(entry.day.productivity)}
          </span>
        </div>
      </div>
    </button>
  )
}

export default DayEntryButton
