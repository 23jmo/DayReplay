import React from 'react'

const Navbar = () => {
  return (
    <header className="sticky top-0 z-10 w-full bg-background/50 shadow backdrop-blur m-2 rounded-sm app-region-drag h-10">
      <div className="flex justify-center items-center space-x-4 h-full">
        <p className="text-sm font-semibold text-gray-900/50">Day Replay</p>
      </div>
    </header>
  )
}

export default Navbar
