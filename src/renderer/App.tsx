import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import '../index.css';
import FrameratePicker from './FrameratePicker';
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

import Library from './Library';
import { AppSidebar } from './components/Sidebar';
import { Title } from '@radix-ui/react-dialog';
import Settings from './Settings';
import RenderLayout from './render-layout';

declare global {
  interface Window {
    electron: {
      store: {
        get: (key: string) => any;
        set: (key: string, val: any) => void;
      };
      ipcRenderer: {
        close: () => void;
        minimize: () => void;
        maximize: () => void;
        send: (channel: string, ...args: any[]) => void;
        on: (channel: string, callback: (data: any) => void) => void;
      };
    };
  }
}

function TitleBar() {
  return (
    <div className="app-region-drag h-12 top-0 right-0 left-0 bg-gray-50 position-fixed flex items-center rounded-sm m-1">
      <p className="text-sm font-semibold text-foreground">Day Replay</p>
    </div>
  );
}



export default function App() {
  return (
    <>
    <div className="flex">

      <SidebarProvider>
      <AppSidebar />

      <main className="w-full">
        <RenderLayout>
          <Router>
              <Routes>
                <Route path="/" element={<Settings />} />
                <Route path="/frameratePicker" element={<FrameratePicker />} />
                <Route path="/library" element={<Library />} />
              </Routes>
          </Router>
        </RenderLayout>
        <div className="absolute bottom-4 left-4">
          <SidebarTrigger />
        </div>
      </main>
      </SidebarProvider>
    </div>
    </>
  );
}
