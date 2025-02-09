import React, { useCallback, useEffect } from 'react'

const Home = () => { // home page shows analytics

  // read in the day data


  // get the day data
   const loadDays = useCallback(async () => {
    const days = await window.electronAPI.getDays()
    console.log(days)
  }, [])

  useEffect(() => {
    loadDays()
  }, [])


  return (

    <div className='flex-col bg-gray-100'>
      <div className='flex flex-row max-w-screen-lg bg-red-200'>
        <h1 className='text-2xl font-bold'>
          Today
        </h1>
      </div>
      <div id='today-analytics' className='flex flex-row max-h-max max-w-screen-lg bg-green-200'>
        Analytics
      </div>
      <div id='week-analytics' className= 'flex flex-row bg-blue-200'>
        <div className='w-1/2'>
          This Week
        </div>
        <div id='month-analytics' className='w-1/2'>
          This Month
        </div>
      </div>

    </div>
  )
}

export default Home
