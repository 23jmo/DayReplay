import * as React from 'react';
import { DayEntry } from '@/src/shared/types';
import { formatDisplayTitle } from '@/src/shared/utils';
import { useCallback, useEffect, useState } from 'react';
import DayEntryButton from './day-entry-button';
import type { Entry } from '../../shared/types';

interface TimeGroup {
  label: string;
  entries: Entry[];
  isOpen: boolean;
}

let Days: TimeGroup[] = [
  {
    label: 'Today',
    isOpen: true,
    entries: [],
  },
  {
    label: 'Previous 7 Days',
    isOpen: true,
    entries: [],
  },
  {
    label: 'Previous 30 Days',
    isOpen: true,
    entries: [],
  },
  {
    label: 'Long time ago',
    isOpen: true,
    entries: [],
  },
];

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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Reset the Days array
  Days = [
    { label: 'Today', isOpen: true, entries: [] },
    { label: 'Previous 7 Days', isOpen: true, entries: [] },
    { label: 'Previous 30 Days', isOpen: true, entries: [] },
    { label: 'Long time ago', isOpen: true, entries: [] },
  ];

  let id = 0;

  for (const day of days) {
    const date = new Date(parseInt(day.startDate));
    date.setHours(0, 0, 0, 0);

    if (date.getTime() >= today.getTime()) {
      Days[0].entries.push({ day, id: id++ });
    } else if (date >= sevenDaysAgo) {
      Days[1].entries.push({ day, id: id++ });
    } else if (date >= thirtyDaysAgo) {
      Days[2].entries.push({ day, id: id++ });
    } else {
      Days[3].entries.push({ day, id: id++ });
    }
  }

  // Sort each group's entries by timestamp (newest first)
  Days.forEach((group) => {
    group.entries.sort(
      (a, b) => parseInt(b.day.startDate) - parseInt(a.day.startDate),
    );
  });

  return Days;
};

interface LibrarySidebarProps {
  onDaySelect: (info: { day: DayEntry; id: string }) => void;
  selectedEntryId: string | null;
}

const LibrarySidebar: React.FC<LibrarySidebarProps> = ({
  onDaySelect,
  selectedEntryId,
}) => {
  const [groups, setGroups] = useState<TimeGroup[]>(Days);
  const [initialLoad, setInitialLoad] = useState(true);

  const loadDays = useCallback(async () => {
    try {
      const days = await window.electronAPI.getDays();
      const organized = organizeTimeGroups(days);

      // If we have a selectedEntryId, ensure the group containing it is open
      if (selectedEntryId && initialLoad) {
        // Find which group contains the selected entry
        organized.forEach((group) => {
          const hasSelectedEntry = group.entries.some(
            (entry) =>
              entry.id.toString() === selectedEntryId ||
              entry.day.startDate === selectedEntryId,
          );

          if (hasSelectedEntry) {
            group.isOpen = true;
          }
        });

        setInitialLoad(false);
      }

      setGroups(organized);
    } catch (error) {
      console.error('Error loading days in sidebar:', error);
    }
  }, [selectedEntryId, initialLoad]);

  useEffect(() => {
    loadDays();
  }, [loadDays]);

  // Reload when selectedEntryId changes
  useEffect(() => {
    if (selectedEntryId) {
      loadDays();
    }
  }, [selectedEntryId, loadDays]);

  const handleEntryClick = useCallback(
    (entry: Entry) => {
      onDaySelect({ day: entry.day, id: entry.id.toString() });
    },
    [onDaySelect],
  );

  const toggleGroup = React.useCallback((index: number) => {
    setGroups((prev) =>
      prev.map((group, i) =>
        i === index ? { ...group, isOpen: !group.isOpen } : group,
      ),
    );
  }, []);

  return (
    <aside className="w-80 border-r bg-white flex flex-col">
      <nav className="flex-1 overflow-y-auto">
        {groups.map((group, index) => (
          <div key={group.label}>
            <button
              onClick={() => toggleGroup(index)}
              className="flex w-full items-center justify-between p-2 hover:bg-gray-100 sticky top-0 bg-white z-10"
            >
              <span className="text-sm font-medium text-gray-500">
                {group.label}
              </span>
              <svg
                className={`h-4 w-4 text-gray-500 transition-transform ${
                  group.isOpen ? 'rotate-180' : ''
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
                  <DayEntryButton
                    key={entry.id}
                    entry={entry}
                    selectedEntryId={selectedEntryId || ''}
                    handleEntryClick={handleEntryClick}
                    displayTitle={formatDisplayTitle(
                      entry.day.startDate,
                      entry.day.duration,
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default LibrarySidebar;
