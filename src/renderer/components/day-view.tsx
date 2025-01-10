import { DayEntry } from '@/src/shared/types'
import { formatDuration } from '@/src/shared/utils'
import React, { useEffect, useState, useRef } from 'react'
import ReactPlayer from 'react-player'
import Timeline from './timeline'
import { Tag } from './tag'

interface DayViewProps {
  day: DayEntry
  children?: React.ReactNode
}

const DayView = ({ day, children }: DayViewProps) => {
  const [videoUrl, setVideoUrl] = useState<string>('')
  const [error, setError] = useState<string>('')
  const playerRef = useRef<ReactPlayer>(null)

  useEffect(() => {
    const loadVideo = async () => {
      try {
        const url = await window.electronAPI.getVideoUrl(day.videoPath);
        if (!url) {
          setError('Video file not found');
          return;
        }
        setVideoUrl(url);
        setError('');
      } catch (err) {
        console.error('Error loading video:', err);
        setError('Error loading video');
      }
    };

    loadVideo();
  }, [day.videoPath]);

  // Calculate total duration for timeline
  const totalDuration = day.appUsage && day.appUsage.length > 0
    ? day.appUsage[day.appUsage.length - 1].endTime - day.appUsage[0].startTime
    : 0;

  const handleSeek = (timestamp: number) => {
    if (playerRef.current && day.appUsage?.length) {
      // Convert timestamp to seconds relative to video start with millisecond precision
      const startTime = day.appUsage[0].startTime;
      const totalDuration = day.appUsage[day.appUsage.length - 1].endTime - startTime;
      const seekTime = (timestamp - startTime) / totalDuration;

      playerRef.current.seekTo(seekTime, 'fraction');
    }
  };

  return (
    <div className="absolute inset-0 overflow-y-auto">
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">
            {new Date(parseInt(day.startDate)).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </h1>
        </div>
        <div id="descriptors" className="flex flex-wrap gap-1 mb-4">
            <Tag text={`${day.fps} FPS`} />
            <Tag text={`${day.resolution}`} />
            <Tag text={`${day.interval}s Interval`} />
        </div>

        <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-6">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              {error}
            </div>
          ) : videoUrl ? (
            <ReactPlayer
              ref={playerRef}
              url={videoUrl}
              controls={true}
              width="100%"
              height="100%"
              className="absolute inset-0 w-full h-full object-contain"
              onError={(e) => {
                console.error('Video error:', e);
                setError('Error playing video');
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              Loading video...
            </div>
          )}
        </div>

        {day.appUsage && day.appUsage.length > 0 && (
          <div className="space-y-6">

              <h2 className="text-lg font-semibold mb-4">Your Timeline</h2>
              <Timeline appUsage={day.appUsage} totalDuration={totalDuration} onSeek={handleSeek} />

            {/* <div className="p-6 bg-white rounded-lg shadow-sm">
              <h2 className="text-lg font-semibold mb-4">App Details</h2>
              <div className="space-y-3">
                {day.appUsage.map((usage, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex-1">
                      <div className="font-medium">{usage.appName}</div>
                      {usage.title && (
                        <div className="text-sm text-gray-500 truncate">{usage.title}</div>
                      )}
                      <div className="text-xs text-gray-400">
                        {new Date(usage.startTime).toLocaleTimeString()} - {new Date(usage.endTime).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 ml-4">
                      {formatDuration(Math.floor(usage.duration / 1000))}
                    </div>
                  </div>
                ))}
              </div>
            </div> */}
          </div>
        )}

        <div className="grid grid-cols-2 gap-6 mt-6">
          <div className="p-6 bg-white rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Stats</h2>
            <div className="space-y-2">
              <p>Duration: {formatDuration(day.duration)}</p>
              <p>Screenshots: {day.numShots}</p>
              <p>Productivity: {(day.productivity * 100).toFixed(1)}%</p>
            </div>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {day.tags.map(tag => (
                <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {children}
      </div>
    </div>
  )
}

export default DayView
