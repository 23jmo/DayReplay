import React from 'react'
import { AppUsageData } from '@/src/shared/types'
import TimelineItem from './timeline-item'
import { TimelineMarkers } from './timeline-markers'

interface TimelineProps {
  appUsage: AppUsageData[]
  totalDuration: number
  onSeek: (timestamp: number) => void
}

const Timeline: React.FC<TimelineProps> = ({ appUsage, totalDuration, onSeek }) => {
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
                onSeek={onSeek}
              />
            )
          })}
        </div>
      </div>
      <TimelineMarkers startTime={startTime} endTime={endTime} />
    </div>
  )
}

export default Timeline
