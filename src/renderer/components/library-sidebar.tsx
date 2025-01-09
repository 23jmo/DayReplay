import * as React from "react"
import { DayEntry } from "@/src/shared/types"
import { formatTimestampToArray } from "@/src/shared/utils"
import { useCallback, useEffect, useState } from "react"

interface Entry {
  day: DayEntry
  id: number
}

interface TimeGroup {
  label: string
  entries: Entry[]
  isOpen: boolean
}

let Days: TimeGroup[] = [
  {
    label: "Today",
    isOpen: true,
    entries: []
  },
  {
    label: "Previous 7 Days",
    isOpen: true,
    entries: []
  },
  {
    label: "Previous 30 Days",
    isOpen: true,
    entries: []
  },
  {
    label: "Long time ago",
    isOpen: true,
    entries: []
  }
]

// Sample data
// const Days: TimeGroup[] = [
//   {
//     label: "Today",
//     isOpen: true,
//     entries: [
//       {
//         id: "1",
//         day:{
//           startDate: new Date(Date.now()).toISOString(),
//           interval: 10,
//           fps: 30,
//           resolution: "1920x1080",
//           numShots: 100,
//           videoPath: "path/to/video.mp4",
//           timelinePath: "path/to/timeline.json",
//           productivity: 0.8,
//           duration: 1000,
//           thumbnailPath: "path/to/thumbnail.png",
//           tags: ["tag1", "tag2"],
//         }
//       },
//       {
//         id: "2",
//         day:{
//           startDate: new Date(Date.now()).toISOString(),
//           interval: 10,
//           fps: 30,
//           resolution: "1920x1080",
//           numShots: 100,
//           videoPath: "path/to/video.mp4",
//           timelinePath: "path/to/timeline.json",
//           productivity: 0.8,
//           duration: 1000,
//           thumbnailPath: "path/to/thumbnail.png",
//           tags: ["tag1", "tag2"],
//         }
//       },
//     ],
//   },
//   {
//     label: "Previous 7 Days",
//     isOpen: true,
//     entries: [
//       {
//         id: "3",
//         day:{
//           startDate: new Date(Date.now()).toISOString(),
//           interval: 10,
//           fps: 30,
//           resolution: "1920x1080",
//           numShots: 100,
//           videoPath: "path/to/video.mp4",
//           timelinePath: "path/to/timeline.json",
//           productivity: 0.8,
//           duration: 1000,
//           thumbnailPath: "path/to/thumbnail.png",
//           tags: ["tag1", "tag2"],
//         }
//       },
//     ],
//   },
//   {
//     label: "Previous 30 Days",
//     isOpen: true,
//     entries: [
//       {
//         id: "4",
//         day:{
//           startDate: new Date(Date.now()).toISOString(),
//           interval: 10,
//           fps: 30,
//           resolution: "1920x1080",
//           numShots: 100,
//           videoPath: "path/to/video.mp4",
//           timelinePath: "path/to/timeline.json",
//           productivity: 0.8,
//           duration: 1000,
//           thumbnailPath: "path/to/thumbnail.png",
//           tags: ["tag1", "tag2"],
//         }
//       },
//     ],
//   },
// ]

const organizeTimeGroups = (days: DayEntry[]) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Reset the Days array
  Days = [
    { label: "Today", isOpen: true, entries: [] },
    { label: "Previous 7 Days", isOpen: true, entries: [] },
    { label: "Previous 30 Days", isOpen: true, entries: [] },
    { label: "Long time ago", isOpen: true, entries: [] }
  ]

  let id = 0

  for (const day of days) {
    const date = new Date(parseInt(day.startDate))
    date.setHours(0, 0, 0, 0)

    if (date.getTime() >= today.getTime()) {
      Days[0].entries.push({ day, id: id++ })
    } else if (date >= sevenDaysAgo) {
      Days[1].entries.push({ day, id: id++ })
    } else if (date >= thirtyDaysAgo) {
      Days[2].entries.push({ day, id: id++ })
    } else {
      Days[3].entries.push({ day, id: id++ })
    }
  }

  return Days
}

interface LibrarySidebarProps {
  onDaySelect: (info: { day: DayEntry; id: string }) => void;
  selectedEntryId: string | null;
}

const LibrarySidebar: React.FC<LibrarySidebarProps> = ({ onDaySelect, selectedEntryId }) => {
  const [groups, setGroups] = useState<TimeGroup[]>(Days)

  const loadDays = useCallback(async () => {
    const days = await window.electronAPI.getDays()
    const organized = organizeTimeGroups(days)
    setGroups(organized)
  }, [])

  useEffect(() => {
    loadDays()
  }, [])

  const handleEntryClick =  useCallback((entry: Entry) => {
    onDaySelect({ day: entry.day, id: entry.id.toString() })
  }, [onDaySelect])

  const toggleGroup = React.useCallback((index: number) => {
    setGroups(prev => prev.map((group, i) =>
      i === index ? { ...group, isOpen: !group.isOpen } : group
    ))
  }, [])

  return (
    <aside className="w-80 border-r bg-white">
      <nav className="h-full">
        {groups.map((group, index) => (
          <div key={group.label}>
            <button
              onClick={() => toggleGroup(index)}
              className="flex w-full items-center justify-between p-2 hover:bg-gray-100"
            >
              <span className="text-sm font-medium text-gray-500">{group.label}</span>
              <svg
                className={`h-4 w-4 text-gray-500 transition-transform ${
                  group.isOpen ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {group.isOpen && (
              <div className="space-y-1 px-2">
                {group.entries.map((entry) => {

                  const [month, day, time, dayOfWeek] = formatTimestampToArray(entry.day.startDate);
                  const today = new Date();
                  const entryDate = new Date(parseInt(entry.day.startDate));
                  const diffDays = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));

                  const displayTitle = diffDays === 0 ? `Today ${time}` :
                    diffDays <= 7 ? `${dayOfWeek} ${time}` :
                    diffDays <= 30 ? `${new Date(parseInt(entry.day.startDate)).toLocaleString('default', { month: 'long' })} ${day} ${time}` :
                    `${month}/${day} ${time}`;
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
                })}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  )
}

export default LibrarySidebar;
