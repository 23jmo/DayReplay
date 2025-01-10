import { DayEntry } from '@/src/shared/types'
import { formatDuration } from '@/src/shared/utils'
import React, { useEffect, useState } from 'react'

interface DayViewProps {
  day: DayEntry
  children?: React.ReactNode
}

const DayView = ({ day, children }: DayViewProps) => {
  const [videoUrl, setVideoUrl] = useState<string>('')
  const [error, setError] = useState<string>('')

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
          <div className="text-sm text-gray-500">
            {day.fps} FPS · {day.resolution} · {day.interval}s interval
          </div>
        </div>

        <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-6">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              {error}
            </div>
          ) : videoUrl ? (
            <video
              key={videoUrl}
              src={videoUrl}
              className="absolute inset-0 w-full h-full object-contain"
              controls
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

        <div className="grid grid-cols-2 gap-6">
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
