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

interface TimelineItemProps {
  usage: AppUsageData;
  index: number;
  totalItems: number;
  left: number;
  width: number;
  color: string;
}

const TimelineItem: React.FC<TimelineItemProps> = ({
  usage,
  index,
  totalItems,
  left,
  width,
  color,
}) => {
  const isFirst = index === 0;
  const isLast = index === totalItems - 1;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "absolute h-full cursor-pointer hover:brightness-90 transition-all",
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
          <div className="font-bold text-lg text-black">{usage.appName}</div>
          {usage.title && (
            <div className="text-sm text-gray-900 truncate max-w-[200px]">{usage.title}</div>
          )}
          <div className="text-xs text-gray-700 mt-1">
            {new Date(usage.startTime).toLocaleTimeString()} - {new Date(usage.endTime).toLocaleTimeString()}
          </div>
          <div className="text-sm font-medium mt-1 text-gray-500">
            {formatDuration(Math.floor(usage.duration / 1000))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default TimelineItem;
