import React, { useCallback, useEffect, useState, useRef } from 'react';
import { DayEntry } from '@/src/shared/types';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { formatDuration } from '@/src/shared/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Time period options
type TimePeriod = 'day' | 'week' | 'month';

// Interface for trend data
interface TrendData {
  currentTotal: number;
  previousTotal: number;
  percentChange: number;
  direction: 'up' | 'down' | 'same';
}

const Home = () => {
  // State for days data
  const [days, setDays] = useState<DayEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State for time period selection
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('day');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Analytics data
  const [analytics, setAnalytics] = useState<{
    totalTime: number;
    avgProductivity: number;
    mostUsedApps: { appName: string; duration: number; percentage: number }[];
    timeByDay: {
      date: string;
      duration: number;
      productivity: number;
      startTime: number;
      endTime: number;
      description?: string;
    }[];
    trends: {
      time: TrendData;
      productivity: TrendData;
      sessions: TrendData;
    };
  }>({
    totalTime: 0,
    avgProductivity: 0,
    mostUsedApps: [],
    timeByDay: [],
    trends: {
      time: {
        currentTotal: 0,
        previousTotal: 0,
        percentChange: 0,
        direction: 'same',
      },
      productivity: {
        currentTotal: 0,
        previousTotal: 0,
        percentChange: 0,
        direction: 'same',
      },
      sessions: {
        currentTotal: 0,
        previousTotal: 0,
        percentChange: 0,
        direction: 'same',
      },
    },
  });

  // Add ref for timeline container
  const timelineRef = useRef<HTMLDivElement>(null);

  // Add state for hover tooltip
  const [tooltipSession, setTooltipSession] = useState<{
    id: number;
    date: string;
    startTime: number;
    endTime: number;
    duration: number;
    productivity: number;
    appName?: string;
  } | null>(null);

  // Load days data
  const loadDays = useCallback(async () => {
    try {
      setLoading(true);
      const daysData = await window.electronAPI.getDays();
      setDays(daysData || []);
      setError(null);
    } catch (err) {
      console.error('Error loading days:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate date range based on selected period and current date
  const getDateRange = useCallback(
    (date: Date = currentDate, period: TimePeriod = selectedPeriod) => {
      const startDate = new Date(date);
      const endDate = new Date(date);

      if (period === 'day') {
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
      } else if (period === 'week') {
        const day = date.getDay();
        startDate.setDate(date.getDate() - day);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
      } else if (period === 'month') {
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setMonth(date.getMonth() + 1);
        endDate.setDate(0);
        endDate.setHours(23, 59, 59, 999);
      }

      return { startDate, endDate };
    },
    [currentDate, selectedPeriod],
  );

  // Get previous period date
  const getPreviousPeriodDate = useCallback(
    (date: Date = currentDate, period: TimePeriod = selectedPeriod) => {
      const prevDate = new Date(date);

      if (period === 'day') {
        prevDate.setDate(prevDate.getDate() - 1);
      } else if (period === 'week') {
        prevDate.setDate(prevDate.getDate() - 7);
      } else if (period === 'month') {
        prevDate.setMonth(prevDate.getMonth() - 1);
      }

      return prevDate;
    },
    [currentDate, selectedPeriod],
  );

  // Navigate to previous period
  const goToPrevious = () => {
    const newDate = getPreviousPeriodDate();
    setCurrentDate(newDate);
  };

  // Navigate to next period
  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (selectedPeriod === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    } else if (selectedPeriod === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else if (selectedPeriod === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  // Format the current period for display
  const formatPeriodDisplay = () => {
    const options: Intl.DateTimeFormatOptions = {};

    if (selectedPeriod === 'day') {
      options.weekday = 'long';
      options.year = 'numeric';
      options.month = 'long';
      options.day = 'numeric';
      return currentDate.toLocaleDateString('en-US', options);
    } else if (selectedPeriod === 'week') {
      const { startDate, endDate } = getDateRange();
      return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else if (selectedPeriod === 'month') {
      options.year = 'numeric';
      options.month = 'long';
      return currentDate.toLocaleDateString('en-US', options);
    }

    return '';
  };

  // Calculate trend data
  const calculateTrend = (current: number, previous: number): TrendData => {
    if (current === 0 && previous === 0) {
      return {
        currentTotal: current,
        previousTotal: previous,
        percentChange: 0,
        direction: 'same',
      };
    }

    if (previous === 0) {
      return {
        currentTotal: current,
        previousTotal: previous,
        percentChange: 100,
        direction: 'up',
      };
    }

    const percentChange = ((current - previous) / previous) * 100;
    const direction =
      percentChange > 0 ? 'up' : percentChange < 0 ? 'down' : 'same';

    return {
      currentTotal: current,
      previousTotal: previous,
      percentChange: Math.abs(percentChange),
      direction,
    };
  };

  // Filter days by date range
  const filterDaysByDateRange = useCallback(
    (startTime: number, endTime: number) => {
      return days.filter((day) => {
        const dayTime = parseInt(day.startDate);
        return dayTime >= startTime && dayTime <= endTime;
      });
    },
    [days],
  );

  // Calculate analytics based on selected period
  const calculateAnalytics = useCallback(() => {
    if (days.length === 0) return;

    // Current period
    const { startDate, endDate } = getDateRange();
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();

    // Previous period
    const previousDate = getPreviousPeriodDate();
    const { startDate: prevStartDate, endDate: prevEndDate } =
      getDateRange(previousDate);
    const prevStartTime = prevStartDate.getTime();
    const prevEndTime = prevEndDate.getTime();

    // Filter days within the selected periods
    const filteredDays = filterDaysByDateRange(startTime, endTime);
    const previousFilteredDays = filterDaysByDateRange(
      prevStartTime,
      prevEndTime,
    );

    if (filteredDays.length === 0 && previousFilteredDays.length === 0) {
      setAnalytics({
        totalTime: 0,
        avgProductivity: 0,
        mostUsedApps: [],
        timeByDay: [],
        trends: {
          time: {
            currentTotal: 0,
            previousTotal: 0,
            percentChange: 0,
            direction: 'same',
          },
          productivity: {
            currentTotal: 0,
            previousTotal: 0,
            percentChange: 0,
            direction: 'same',
          },
          sessions: {
            currentTotal: 0,
            previousTotal: 0,
            percentChange: 0,
            direction: 'same',
          },
        },
      });
      return;
    }

    // Calculate current period stats
    const totalTime = filteredDays.reduce((sum, day) => sum + day.duration, 0);
    const avgProductivity =
      filteredDays.length > 0
        ? filteredDays.reduce((sum, day) => sum + day.productivity, 0) /
          filteredDays.length
        : 0;

    // Calculate previous period stats
    const prevTotalTime = previousFilteredDays.reduce(
      (sum, day) => sum + day.duration,
      0,
    );
    const prevAvgProductivity =
      previousFilteredDays.length > 0
        ? previousFilteredDays.reduce((sum, day) => sum + day.productivity, 0) /
          previousFilteredDays.length
        : 0;

    // Calculate trends
    const timeTrend = calculateTrend(totalTime, prevTotalTime);
    const productivityTrend = calculateTrend(
      avgProductivity,
      prevAvgProductivity,
    );
    const sessionsTrend = calculateTrend(
      filteredDays.length,
      previousFilteredDays.length,
    );

    // Calculate most used apps
    const appUsageMap = new Map<string, number>();
    let totalAppDuration = 0;

    filteredDays.forEach((day) => {
      if (day.appUsage) {
        day.appUsage.forEach((usage) => {
          const current = appUsageMap.get(usage.appName) || 0;
          const newDuration = current + usage.duration;
          appUsageMap.set(usage.appName, newDuration);
          totalAppDuration += usage.duration;
        });
      }
    });

    const mostUsedApps = Array.from(appUsageMap.entries())
      .map(([appName, duration]) => ({
        appName,
        duration,
        percentage:
          totalAppDuration > 0 ? (duration / totalAppDuration) * 100 : 0,
      }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5);

    // Calculate time by day (sessions)
    const timeByDay = filteredDays
      .map((day) => ({
        date: new Date(parseInt(day.startDate)).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        duration: day.duration,
        productivity: day.productivity,
        startTime: parseInt(day.startDate),
        endTime: parseInt(day.startDate) + day.duration * 1000,
        description: day.description,
      }))
      .sort((a, b) => a.startTime - b.startTime);

    setAnalytics({
      totalTime,
      avgProductivity,
      mostUsedApps,
      timeByDay,
      trends: {
        time: timeTrend,
        productivity: productivityTrend,
        sessions: sessionsTrend,
      },
    });
  }, [days, getDateRange, getPreviousPeriodDate, filterDaysByDateRange]);

  // Load data on mount
  useEffect(() => {
    loadDays();
  }, [loadDays]);

  // Recalculate analytics when days, period, or current date changes
  useEffect(() => {
    calculateAnalytics();
  }, [days, selectedPeriod, currentDate, calculateAnalytics]);

  // Go to today/this week/this month
  const goToCurrent = () => {
    setCurrentDate(new Date());
  };

  // Format trend display
  const renderTrendIndicator = (trend: TrendData) => {
    if (trend.direction === 'up') {
      return (
        <div className="flex items-center text-green-600">
          <ArrowUp className="h-4 w-4 mr-1" />
          <span>{trend.percentChange.toFixed(1)}%</span>
        </div>
      );
    } else if (trend.direction === 'down') {
      return (
        <div className="flex items-center text-red-600">
          <ArrowDown className="h-4 w-4 mr-1" />
          <span>{trend.percentChange.toFixed(1)}%</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center text-gray-500">
          <Minus className="h-4 w-4 mr-1" />
          <span>0%</span>
        </div>
      );
    }
  };

  // Format time of day
  const formatTimeOfDay = (timestamp: number) => {
    const date = new Date(timestamp);
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12; // Convert to 12-hour format
    return `${hours}:${minutes} ${ampm}`;
  };

  // Navigate to library with specific day
  const navigateToLibrary = (startDate: number) => {
    // Ensure startDate is a valid number
    if (isNaN(startDate)) {
      console.error('Invalid startDate for navigation:', startDate);
      window.location.href = '#/library';
      return;
    }

    // Create the URL with the date parameter
    const url = `#/library?date=${startDate}`;

    // Use history API for smoother navigation
    if (window.history && window.history.pushState) {
      window.history.pushState({ path: url }, '', url);
      // Force a navigation to ensure the Library component loads with the new URL
      window.location.href = url;
    } else {
      // Fallback for older browsers
      window.location.href = url;
    }

    // Log for debugging
    console.log(
      `Navigating to library with date: ${new Date(startDate).toLocaleString()}`,
    );
  };

  // Calculate the earliest and latest times across all sessions
  const getTimeRange = useCallback(() => {
    if (analytics.timeByDay.length === 0) {
      return {
        earliestHour: 0,
        latestHour: 24,
        earliestTime: 0,
        latestTime: 24 * 60 * 60 * 1000,
      };
    }

    let earliestTime = Number.MAX_SAFE_INTEGER;
    let latestTime = 0;

    analytics.timeByDay.forEach((session) => {
      earliestTime = Math.min(earliestTime, session.startTime);
      latestTime = Math.max(latestTime, session.endTime);
    });

    // Round to nearest hour for display
    const earliestDate = new Date(earliestTime);
    const latestDate = new Date(latestTime);

    const earliestHour = Math.max(0, earliestDate.getHours() - 1);
    const latestHour = Math.min(24, latestDate.getHours() + 1);

    return {
      earliestHour,
      latestHour,
      earliestTime,
      latestTime,
    };
  }, [analytics.timeByDay]);

  // Format hour for timeline
  const formatHour = (hour: number) => {
    if (hour === 0 || hour === 24) return '12 AM';
    if (hour === 12) return '12 PM';
    return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
  };

  // Calculate session position on timeline
  const calculateSessionPosition = (startTime: number, endTime: number) => {
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    // Get start of day for the start date
    const dayStart = new Date(startDate);
    dayStart.setHours(0, 0, 0, 0);

    // Get end of day for the start date
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    // Calculate milliseconds since start of day
    const startMs = startDate.getTime() - dayStart.getTime();

    // Handle sessions that span across midnight
    let durationMs = endDate.getTime() - startDate.getTime();
    if (endDate.getTime() > dayEnd.getTime()) {
      durationMs = dayEnd.getTime() - startDate.getTime();
    }

    // Calculate as percentage of day
    const totalDayMs = 24 * 60 * 60 * 1000;
    const startPercent = (startMs / totalDayMs) * 100;
    const durationPercent = (durationMs / totalDayMs) * 100;

    // Ensure the bar is visible even for very short sessions
    const visibleDuration = Math.max(durationPercent, 0.5);

    return {
      startPercent,
      durationPercent: visibleDuration,
    };
  };

  return (
    <div className="flex flex-col p-6 bg-gray-50 min-h-screen">
      {/* Period selector and navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold">Analytics</h1>
          <Select
            value={selectedPeriod}
            onValueChange={(value) => setSelectedPeriod(value as TimePeriod)}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={goToPrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToCurrent}>
            <Calendar className="h-4 w-4 mr-2" />
            {selectedPeriod === 'day'
              ? 'Today'
              : selectedPeriod === 'week'
                ? 'This Week'
                : 'This Month'}
          </Button>
          <Button variant="outline" size="icon" onClick={goToNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Period display */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold">{formatPeriodDisplay()}</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p>Loading analytics...</p>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-red-500">{error}</p>
        </div>
      ) : days.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-2">No data available</h3>
          <p className="text-gray-500">
            Start recording to see your analytics here.
          </p>
        </div>
      ) : (
        <>
          {/* Summary cards with trends */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Total Time
                  </h3>
                  <p className="text-3xl font-bold">
                    {formatDuration(analytics.totalTime)}
                  </p>
                </div>
                <div className="text-sm">
                  {renderTrendIndicator(analytics.trends.time)}
                  <p className="text-xs text-gray-500 mt-1">
                    vs previous {selectedPeriod}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Productivity Score
                  </h3>
                  <p className="text-3xl font-bold">
                    {analytics.avgProductivity.toFixed(1)}%
                  </p>
                </div>
                <div className="text-sm">
                  {renderTrendIndicator(analytics.trends.productivity)}
                  <p className="text-xs text-gray-500 mt-1">
                    vs previous {selectedPeriod}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Sessions
                  </h3>
                  <p className="text-3xl font-bold">
                    {analytics.timeByDay.length}
                  </p>
                </div>
                <div className="text-sm">
                  {renderTrendIndicator(analytics.trends.sessions)}
                  <p className="text-xs text-gray-500 mt-1">
                    vs previous {selectedPeriod}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* App usage with timebars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">
                Most Used Applications
              </h3>
              {analytics.mostUsedApps.length > 0 ? (
                <div className="space-y-4">
                  {analytics.mostUsedApps.map((app, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{app.appName}</p>
                        </div>
                        <p className="text-sm text-gray-500">
                          {formatDuration(Math.floor(app.duration / 1000))}
                          <span className="text-xs ml-1 text-gray-400">
                            ({app.percentage.toFixed(1)}%)
                          </span>
                        </p>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${app.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No application data available.</p>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Sessions Timeline</h3>
              {analytics.timeByDay.length > 0 ? (
                <div className="space-y-4">
                  <div
                    className="relative w-full overflow-x-hidden"
                    ref={timelineRef}
                  >
                    {/* Timeline header with hours - reduced to 7 markers */}
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      {[
                        '12 AM',
                        '4 AM',
                        '8 AM',
                        '12 PM',
                        '4 PM',
                        '8 PM',
                        '12 AM',
                      ].map((label, i) => (
                        <span key={i} className="text-[10px]">
                          {label}
                        </span>
                      ))}
                    </div>

                    {/* Timeline background grid - reduced height */}
                    <div className="relative w-full h-16 bg-gray-100 rounded mb-1">
                      {/* Vertical hour markers - reduced to 6 dividers */}
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div
                          key={i}
                          className="absolute top-0 bottom-0 w-px bg-gray-200"
                          style={{ left: `${i * (100 / 6)}%` }}
                        />
                      ))}

                      {/* Session bars */}
                      <TooltipProvider>
                        {analytics.timeByDay.map((session, index) => {
                          const { startPercent, durationPercent } =
                            calculateSessionPosition(
                              session.startTime,
                              session.endTime,
                            );

                          return (
                            <Tooltip key={index}>
                              <TooltipTrigger asChild>
                                <div
                                  className="absolute h-6 rounded cursor-pointer hover:ring-1 hover:ring-blue-400 transition-all"
                                  style={{
                                    left: `${startPercent}%`,
                                    width: `${durationPercent}%`,
                                    top: '5px',
                                    backgroundColor: `rgba(59, 130, 246, ${0.3 + session.productivity * 0.7})`,
                                    maxWidth: `${100 - startPercent}%`, // Ensure it doesn't go beyond the timeline
                                  }}
                                  onClick={() =>
                                    navigateToLibrary(session.startTime)
                                  }
                                />
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                className="p-0 bg-white shadow-sm rounded-md border border-gray-200 max-w-[250px]"
                              >
                                <div className="p-2">
                                  <div className="font-medium text-sm mb-1">
                                    {session.date}
                                  </div>
                                  <div className="text-xs text-gray-500 mb-1">
                                    {formatTimeOfDay(session.startTime)} -{' '}
                                    {formatTimeOfDay(session.endTime)}
                                  </div>
                                  <div className="text-xs text-gray-500 mb-1">
                                    Duration: {formatDuration(session.duration)}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Productivity:{' '}
                                    {session.productivity.toFixed(1)}%
                                  </div>
                                  {session.description && (
                                    <div className="text-xs text-gray-700 mt-2 border-t pt-1">
                                      {session.description}
                                    </div>
                                  )}
                                  <div className="text-xs text-blue-500 mt-1">
                                    Click to view in library
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </TooltipProvider>
                    </div>

                    {/* Date labels - more compact */}
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span className="text-[10px]">
                        {selectedPeriod === 'day'
                          ? 'Today'
                          : selectedPeriod === 'week'
                            ? 'This Week'
                            : 'This Month'}
                      </span>
                      <span
                        className="text-[10px] text-blue-500 cursor-pointer"
                        onClick={() => navigateToLibrary(Date.now())}
                      >
                        View all in library →
                      </span>
                    </div>
                  </div>

                  {/* Session list - more compact */}
                  <div className="mt-3">
                    <h4 className="text-sm font-medium text-gray-500 mb-1">
                      Recent Sessions
                    </h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {analytics.timeByDay.slice(0, 5).map((session, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-1.5 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer"
                          onClick={() => navigateToLibrary(session.startTime)}
                        >
                          <div className="flex-1 mr-2">
                            <p className="font-medium text-xs">
                              {session.date}
                            </p>
                            <p className="text-[10px] text-gray-500">
                              {formatTimeOfDay(session.startTime)} -{' '}
                              {formatTimeOfDay(session.endTime)}
                            </p>
                            {session.description && (
                              <p className="text-[10px] text-gray-600 mt-0.5 truncate max-w-[180px]">
                                {session.description}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs">
                              {formatDuration(session.duration)}
                            </p>
                            <p className="text-[10px] text-gray-500">
                              {session.productivity.toFixed(1)}% productive
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No session data available.</p>
              )}
            </div>
          </div>

          {/* Insights */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Insights</h3>
            {analytics.timeByDay.length > 0 ? (
              <div className="space-y-4">
                <p className="text-gray-700">
                  {selectedPeriod === 'day'
                    ? `You spent ${formatDuration(analytics.totalTime)} on your computer today with a productivity score of ${analytics.avgProductivity.toFixed(1)}%.`
                    : selectedPeriod === 'week'
                      ? `This week, you've spent ${formatDuration(analytics.totalTime)} on your computer across ${analytics.timeByDay.length} sessions with an average productivity of ${analytics.avgProductivity.toFixed(1)}%.`
                      : `This month, you've spent ${formatDuration(analytics.totalTime)} on your computer across ${analytics.timeByDay.length} sessions with an average productivity of ${analytics.avgProductivity.toFixed(1)}%.`}
                </p>

                {analytics.trends.time.direction !== 'same' && (
                  <p className="text-gray-700">
                    Your computer usage{' '}
                    {analytics.trends.time.direction === 'up'
                      ? 'increased'
                      : 'decreased'}{' '}
                    by {analytics.trends.time.percentChange.toFixed(1)}%
                    compared to the previous {selectedPeriod}.
                  </p>
                )}

                {analytics.trends.productivity.direction !== 'same' && (
                  <p className="text-gray-700">
                    Your productivity{' '}
                    {analytics.trends.productivity.direction === 'up'
                      ? 'improved'
                      : 'decreased'}{' '}
                    by {analytics.trends.productivity.percentChange.toFixed(1)}%
                    compared to the previous {selectedPeriod}.
                  </p>
                )}

                {analytics.mostUsedApps.length > 0 && (
                  <p className="text-gray-700">
                    Your most used application was{' '}
                    <strong>{analytics.mostUsedApps[0].appName}</strong> with{' '}
                    {formatDuration(
                      Math.floor(analytics.mostUsedApps[0].duration / 1000),
                    )}{' '}
                    of usage time (
                    {analytics.mostUsedApps[0].percentage.toFixed(1)}% of
                    total).
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500">
                No insights available for this period.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Home;
