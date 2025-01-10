import React from 'react'
import { AppUsageData } from '@/src/shared/types'
import TimelineItem from './timeline-item'

interface TimelineProps {
  appUsage: AppUsageData[]
  totalDuration: number
}

const Timeline: React.FC<TimelineProps> = ({ appUsage, totalDuration }) => {
  if (!appUsage.length) return null

  const startTime = appUsage[0]?.startTime || 0
  const endTime = appUsage[appUsage.length - 1]?.endTime || startTime

  // Create time markers every hour
  const markers = []
  const startDate = new Date(startTime)
  const endDate = new Date(endTime)

  // Round down to the nearest hour for start
  startDate.setMinutes(0, 0, 0)

  // Round up to the next hour for end
  endDate.setHours(endDate.getHours() + 1)
  endDate.setMinutes(0, 0, 0)

  const hoursBetween = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60))

  for (let i = 0; i <= hoursBetween; i++) {
    const markerTime = new Date(startDate.getTime() + i * 60 * 60 * 1000)
    const left = ((markerTime.getTime() - startTime) / totalDuration) * 100
    if (left >= 0 && left <= 100) {
      markers.push({
        time: markerTime,
        left,
      })
    }
  }

  return (
    <div>

      {/* Timeline container */}
      <div className="relative">
        {/* Grid lines */}
        <div className="absolute inset-0">
          {markers.map((marker, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-px bg-gray-200"
              style={{ left: `${marker.left}%` }}
            />
          ))}
        </div>

        {/* Timeline bar */}
        <div className="relative w-full h-4 bg-gray-100 rounded-lg overflow-hidden">
          {/* App segments */}
          {appUsage.map((usage, index) => {
            const left = ((usage.startTime - startTime) / totalDuration) * 100
            const width = (usage.duration / totalDuration) * 100
            const color = `hsl(${Math.abs(usage.appName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 360}, 70%, 50%)`

            return (
              <TimelineItem
                key={index}
                usage={usage}
                index={index}
                totalItems={appUsage.length}
                left={left}
                width={width}
                color={color}
              />
            )
          })}
        </div>

        {/* Time markers */}
        <div className="relative w-full h-6 mt-2">
          {markers.map((marker, i) => (
            <div
              key={i}
              className="absolute text-xs text-gray-600"
              style={{
                left: `${marker.left}%`,
                transform: 'translateX(-50%)'
              }}
            >
              {marker.time.toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Timeline
