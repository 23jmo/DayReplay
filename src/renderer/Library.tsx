import React from 'react'
import { DayEntry } from '../shared/types'
import LibrarySidebar from './components/library-sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';

const loadDays = async (): Promise<DayEntry[]> => {

  console.log("Loading days");

  const days = await window.electronAPI.getDays();

  console.log("Days loaded", days);

  return days;

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

const dayButton = (day: DayEntry) => {
  return (

    <div className="bg-background p-4 rounded-md hover:bg-muted-foreground hover:text-foreground transition-all duration-300">


    </div>
    // <div className="bg-background p-4 rounded-md shadow-sm border-black border-2 hover:bg-muted-foreground hover:text-foreground transition-all duration-300">
    //   <p>{day.startDate}</p>
    //   <p>{day.fps} FPS</p>
    //   <p>{day.resolution}</p>
    //   <p>{day.interval}s interval</p>
    //   <p>{day.duration}s duration</p>
    //   <p>{day.numShots} shots</p>
    // </div>
  )
}

// const LibrarySidebar = () => {
//   const [days, setDays] = React.useState<DayEntry[]>([]);

//   React.useEffect(() => {
//     loadDays().then((loadedDays) => {
//       console.log("Days loaded in sidebar", loadedDays);
//       if (loadedDays) {
//         setDays(loadedDays);
//       }
//     });
//   }, []);

//   return (
//     <div>
//       {days?.map((day) => {
//         console.log("Rendering day:", day);
//         return dayButton(day);
//       })}
//     </div>
//   )
// }

const Library = () => {




  return (
    <div>
      Library
      <LibrarySidebar />


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
