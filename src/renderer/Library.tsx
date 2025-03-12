import React, { useEffect } from 'react';
import { DayEntry } from '../shared/types';
import LibrarySidebar from './components/library-sidebar';
import DayView from './components/day-view';

interface DaySelectInfo {
  day: DayEntry;
  id: string;
}

const Library = () => {
  const [selectedDay, setSelectedDay] = React.useState<DayEntry | null>(null);
  const [selectedEntryId, setSelectedEntryId] = React.useState<string | null>(
    null,
  );
  const [allDays, setAllDays] = React.useState<DayEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Load all days
  useEffect(() => {
    const loadDays = async () => {
      try {
        setIsLoading(true);
        const days = await window.electronAPI.getDays();
        setAllDays(days || []);

        // Check for date parameter in URL
        const urlParams = new URLSearchParams(
          window.location.hash.split('?')[1],
        );
        const dateParam = urlParams.get('date');

        if (dateParam) {
          const timestamp = parseInt(dateParam);
          if (!isNaN(timestamp)) {
            // Find the day that matches the timestamp
            const matchingDay = days?.find((day) => {
              const dayTimestamp = parseInt(day.startDate);
              // Allow for some flexibility in matching (within 1 second)
              return Math.abs(dayTimestamp - timestamp) < 1000;
            });

            if (matchingDay) {
              // Generate a unique ID based on the timestamp
              const id = matchingDay.startDate;
              setSelectedDay(matchingDay);
              setSelectedEntryId(id);
            }
          }
        }
      } catch (error) {
        console.error('Error loading days:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDays();
  }, []);

  const handleDaySelect = React.useCallback(({ day, id }: DaySelectInfo) => {
    setSelectedDay(day);
    setSelectedEntryId(id);

    // Update URL without reloading the page
    const newUrl = `#/library?date=${day.startDate}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  }, []);

  return (
    <div className="flex h-[calc(100vh-theme(spacing.14))]">
      <LibrarySidebar
        onDaySelect={handleDaySelect}
        selectedEntryId={selectedEntryId}
      />
      <main className="flex-1 relative">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-gray-500">
            Loading...
          </div>
        ) : selectedDay ? (
          <div className="p-6">
            <DayView day={selectedDay} />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-500">
            Select a day to view its details
          </div>
        )}
      </main>
    </div>
  );
};

export default Library;
