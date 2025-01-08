import React from 'react'

class DayEntry{

  startDate: string;
  framerate: number;
  resolution: string;
  interval: number;
  duration: number;
  numShots: number;
  video: string;
  timeline: string;
  productivity: number;
  thumbnail: string;
  tags: string[];

  constructor(startDate: string, framerate: number, resolution: string, interval: number, duration: number, numShots: number, video: string, timeline: string, productivity: number, thumbnail: string, tags: string[]) {
    this.startDate = startDate;
    this.framerate = framerate;
    this.resolution = resolution;
    this.interval = interval;
    this.duration = duration;
    this.numShots = numShots;
    this.video = video;
    this.timeline = timeline;
    this.productivity = productivity;
    this.thumbnail = thumbnail;
    this.tags = tags;
  }

  toJSON() {
    return {
      startDate: this.startDate,
      framerate: this.framerate,
      resolution: this.resolution,
      interval: this.interval,
      duration: this.duration,
      numShots: this.numShots,
      video: this.video,
      timeline: this.timeline,
      productivity: this.productivity,
      thumbnail: this.thumbnail,
      tags: this.tags,
    };
  }

}


const loadDays = async () => {

}

/*

the days should be stored like this:

{
  "startDate": "202401011159", - something that stores date and time
  "framerate": 24,
  "resolution": "1920x1080",
  "interval": 1,
  "duration": 10, (in seconds)
  "numShots": 100,
  "video": "path/to/video.mp4",
  "timeline": "path/to/timeline.json",
  "productivity": 0.8
  "thumbnail": "path/to/thumbnail.png"
  "tags": ["tag1", "tag2", "tag3"]
}

*/

const Library = () => {




  return (
    <div>
      <p>Library</p>
    </div>

    // Here's what I need:
    // 1. Render a sidebar similar to notes app that displays all the days in the library
    // 2. Each day should have a thumbnail and a title
    // 3. When you click on a day, it should open with the day's details
    // 4. The day's details should include the date, the framerate, the resolution, and the number of shots
    // 6. There should be a button to export the day
    // On the right, there is a video player that plays the day's video
    // As well as a timeline that shows the day's timeline
    // And a productivity score

  )
}

export default Library
