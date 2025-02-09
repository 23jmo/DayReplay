import React from 'react';
import { AppUsageData } from '@/src/shared/types';
import { formatDuration } from '@/src/shared/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from '@/lib/utils';

interface GroupedUsage {
  appName: string;
  startTime: number;
  endTime: number;
  duration: number;
  activities: AppUsageData[];
}

interface TimelineItemProps {
  group: GroupedUsage;
  index: number;
  totalItems: number;
  left: number;
  width: number;
  color: string;
  onSeek: (timestamp: number) => void;
}

const TimelineItem: React.FC<TimelineItemProps> = ({
  group,
  index,
  totalItems,
  left,
  width,
  color,
  onSeek,
}) => {
  const isFirst = index === 0;
  const isLast = index === totalItems - 1;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    // Calculate the exact position within the segment based on click position
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentageThrough = clickX / rect.width;

    // Calculate the exact timestamp based on click position
    const timeRange = group.endTime - group.startTime;
    const exactTimestamp = group.startTime + (timeRange * percentageThrough);

    onSeek(exactTimestamp);
  };

  const formatTimeWithMs = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString() + '.' +
           date.getMilliseconds().toString().padStart(3, '0');
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            onClick={handleClick}
            className={cn(
              "absolute h-full cursor-pointer hover:brightness-150 hover:scale-110 transition-all",
              isFirst && "rounded-l-full",
              isLast && "rounded-r-full",
              !isFirst && !isLast && "rounded-none"
            )}
            style={{
              left: `${left}%`,
              width: `${width}%`,
              backgroundColor: color,
            }}
          />
        </TooltipTrigger>
        <TooltipContent className="rounded-xl bg-white shadow-lg shadow-black/30 pt-2">
          <div className="flex">
            <div
              className="h-2 mt-2 mb-2 w-12 rounded-full"
              style={{ backgroundColor: color }}
            />
            <div className="flex-grow">
            </div>
          </div>
          <div className="font-bold text-lg text-black">{group.appName}</div>
          <div className="text-xs text-gray-700 mt-1">
            {formatTimeWithMs(group.startTime)} - {formatTimeWithMs(group.endTime)}
          </div>
          <div className="text-sm font-medium mt-1 text-gray-500">
            {formatDuration(Math.floor(group.duration / 1000))}
          </div>
          {/* Show individual activities */}
          <div className="mt-2 border-t border-gray-200 pt-2">
            <div className="text-sm font-medium text-gray-700 mb-1">Activities:</div>
            <div className="max-h-40 overflow-y-auto">
              {group.activities.map((activity, i) => (
                <div
                  key={i}
                  className="text-sm text-gray-600 mb-1 hover:bg-gray-50 p-1 rounded cursor-pointer transition-colors hover:cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering parent click
                    onSeek(activity.startTime);
                  }}
                >
                  {activity.title && (
                    <div className="truncate max-w-[300px] flex items-center gap-2">
                      <span>{activity.title}</span>
                      <span className="text-xs text-gray-400">
                        {formatTimeWithMs(activity.startTime)}
                      </span>
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    {formatDuration(Math.floor(activity.duration / 1000))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default TimelineItem;
