import { formatTimestampToArray } from '@/src/shared/utils';
import React from 'react'

interface DayEntryButtonProps {
  entry: any;
  selectedEntryId: string;
  handleEntryClick: (entry: any) => void;
  displayTitle: string;
}

const DayEntryButton = ({ entry, selectedEntryId, handleEntryClick, displayTitle }: DayEntryButtonProps) => {
  return (
    <button
      key={entry.id}
      className={`w-full rounded-md p-2 text-left transition-colors duration-200 ${
        selectedEntryId === entry.id.toString()
          ? "bg-blue-100 text-blue-900"
          : "hover:bg-gray-100"
      }`}
      onClick={() => handleEntryClick(entry)}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium">
          {displayTitle}
        </span>
        <span className="text-xs text-gray-500">
          {formatTimestampToArray(entry.day.startDate)[1]}
        </span>
      </div>
      <p className="text-xs text-gray-500 truncate">
        {entry.day.duration}s, {entry.day.numShots} shots
      </p>
    </button>
  )
}

export default DayEntryButton
