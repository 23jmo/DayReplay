import React from 'react'

import Navbar from './components/Navbar'

const RenderLayout = ({children} : {children: React.ReactNode}) => {
  return (
    <div className="w-full overflow-hidden">
      <Navbar />
      <div className="container px-2 pb-8 ">
        {children}
      </div>
    </div>
  )
}

export default RenderLayout
