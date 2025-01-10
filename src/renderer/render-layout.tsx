import React from 'react'
import Navbar from './components/Navbar'

interface RenderLayoutProps {
  children: React.ReactNode;
  noPadding?: boolean;
}

const RenderLayout = ({ children, noPadding }: RenderLayoutProps) => {
  return (
    <div className="w-full overflow-hidden">
      <Navbar />
      <div className={noPadding ? "" : "container px-2 pb-8"}>
        {children}
      </div>
    </div>
  )
}

export default RenderLayout
