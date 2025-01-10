import React from 'react'
import { DayEntry } from '../shared/types'
import LibrarySidebar from './components/library-sidebar'
import DayView from './components/day-view'

interface DaySelectInfo {
  day: DayEntry;
  id: string;
}

const Library = () => {
  const [selectedDay, setSelectedDay] = React.useState<DayEntry | null>(null)
  const [selectedEntryId, setSelectedEntryId] = React.useState<string | null>(null)

  const handleDaySelect = React.useCallback(({ day, id }: DaySelectInfo) => {
    setSelectedDay(day)
    setSelectedEntryId(id)
  }, [])

  return (
    <div className="flex h-[calc(100vh-theme(spacing.14))]">
      <LibrarySidebar
        onDaySelect={handleDaySelect}
        selectedEntryId={selectedEntryId}
      />
      <main className="flex-1 relative">
        {selectedDay ? (
          <DayView day={selectedDay} />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-500">
            Select a day to view its details
          </div>
        )}
      </main>
    </div>
  )
}

export default Library
