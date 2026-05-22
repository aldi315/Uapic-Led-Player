import React from 'react';
import Titlebar from '../components/Titlebar';
import Sidebar from '../components/Sidebar';
import Toolbar from '../components/Toolbar';
import PropertiesPanel from '../components/PropertiesPanel';
import CanvasArea from '../../editor/CanvasArea';

export default function MainLayout() {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <Titlebar />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        
        <div className="flex flex-col flex-1 overflow-hidden">
          <Toolbar />
          
          <div className="flex flex-1 overflow-hidden">
            <CanvasArea />
            <PropertiesPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
