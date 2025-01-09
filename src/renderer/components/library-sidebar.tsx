import * as React from "react"

import { DayEntry } from "@/src/shared/types"

interface Entry {
  day: DayEntry
  isSelected?: boolean
  isHighlighted?: boolean
}

interface TimeGroup {
  label: string
  entries: Entry[]
  isOpen: boolean
}

// Sample data
const Days: TimeGroup[] = [
  {
    label: "Today",
    isOpen: true,
    entries: [
      {
        day:{
          startDate: new Date(Date.now()).toISOString(),
          interval: 10,
          fps: 30,
          resolution: "1920x1080",
          numShots: 100,
          videoPath: "path/to/video.mp4",
          timelinePath: "path/to/timeline.json",
          productivity: 0.8,
          duration: 1000,
          thumbnailPath: "path/to/thumbnail.png",
          tags: ["tag1", "tag2"],
        }
      },
      {
        day:{
          startDate: new Date(Date.now()).toISOString(),
          interval: 10,
          fps: 30,
          resolution: "1920x1080",
          numShots: 100,
          videoPath: "path/to/video.mp4",
          timelinePath: "path/to/timeline.json",
          productivity: 0.8,
          duration: 1000,
          thumbnailPath: "path/to/thumbnail.png",
          tags: ["tag1", "tag2"],
        }
      },
    ],
  },
  {
    label: "Previous 7 Days",
    isOpen: true,
    entries: [
      {
        day:{
          startDate: new Date(Date.now()).toISOString(),
          interval: 10,
          fps: 30,
          resolution: "1920x1080",
          numShots: 100,
          videoPath: "path/to/video.mp4",
          timelinePath: "path/to/timeline.json",
          productivity: 0.8,
          duration: 1000,
          thumbnailPath: "path/to/thumbnail.png",
          tags: ["tag1", "tag2"],
        }
      },
    ],
  },
  {
    label: "Previous 30 Days",
    isOpen: true,
    entries: [
      {
        day:{
          startDate: new Date(Date.now()).toISOString(),
          interval: 10,
          fps: 30,
          resolution: "1920x1080",
          numShots: 100,
          videoPath: "path/to/video.mp4",
          timelinePath: "path/to/timeline.json",
          productivity: 0.8,
          duration: 1000,
          thumbnailPath: "path/to/thumbnail.png",
          tags: ["tag1", "tag2"],
        }
      },
    ],
  },
]

const LibrarySidebar = () => {
  const [groups, setGroups] = React.useState<TimeGroup[]>(Days)

  const toggleGroup = (index: number) => {
    setGroups(groups.map((group, i) =>
      i === index ? { ...group, isOpen: !group.isOpen } : group
    ))
  }

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
                {group.entries.map((entry) => (
                  <button
                    key={entry.day.startDate}
                    className={`w-full rounded-md p-2 text-left ${
                      entry.isSelected
                        ? "bg-blue-100 text-blue-900"
                        : "hover:bg-gray-100"
                    } ${entry.isHighlighted ? "bg-yellow-100" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{entry.day.startDate}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(entry.day.startDate).toLocaleDateString('en-US', {month: '2-digit', day: 'numeric', year: '2-digit'})}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{entry.day.interval}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  )
}

export default LibrarySidebar;
