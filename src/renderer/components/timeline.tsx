import React from 'react'
import { AppUsageData } from '@/src/shared/types'
import TimelineItem from './timeline-item'
import { TimelineMarkers } from './timeline-markers'

interface TimelineProps {
  appUsage: AppUsageData[]
  totalDuration: number
  onSeek: (timestamp: number) => void
}

interface GroupedUsage {
  appName: string
  startTime: number
  endTime: number
  duration: number
  activities: AppUsageData[]
}

const Timeline: React.FC<TimelineProps> = ({ appUsage, totalDuration, onSeek }) => {
  if (!appUsage.length) return null

  const startTime = appUsage[0]?.startTime || 0
  const endTime = appUsage[appUsage.length - 1]?.endTime || startTime

  // Group adjacent items by app name
  const groupedUsage: GroupedUsage[] = []
  let currentGroup: GroupedUsage | null = null

  appUsage.forEach((usage) => {
    if (!currentGroup || currentGroup.appName !== usage.appName) {
      // Start a new group
      if (currentGroup) {
        groupedUsage.push(currentGroup)
      }
      currentGroup = {
        appName: usage.appName,
        startTime: usage.startTime,
        endTime: usage.endTime,
        duration: usage.duration,
        activities: [usage]
      }
    } else {
      // Add to current group
      currentGroup.endTime = usage.endTime
      currentGroup.duration += usage.duration
      currentGroup.activities.push(usage)
    }
  })

  // Add the last group
  if (currentGroup) {
    groupedUsage.push(currentGroup)
  }

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
          {groupedUsage.map((group, index) => {
            const left = ((group.startTime - startTime) / totalDuration) * 100
            const width = (group.duration / totalDuration) * 100
            const color = `hsl(${Math.abs(group.appName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 360}, 70%, 50%)`

            return (
              <TimelineItem
                key={index}
                group={group}
                index={index}
                totalItems={groupedUsage.length}
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
