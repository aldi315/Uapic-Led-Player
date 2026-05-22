import React from 'react';
import { Minus, Square, X } from 'lucide-react';

export default function Titlebar() {
  const handleMinimize = () => {
    window.electronAPI?.windowMinimize();
  };

  const handleMaximize = () => {
    window.electronAPI?.windowMaximize();
  };

  const handleClose = () => {
    window.electronAPI?.windowClose();
  };

  return (
    <div className="h-8 bg-surface border-b border-border flex justify-between items-center titlebar-drag-region select-none w-full">
      <div className="flex items-center px-3">
        <span className="text-xs font-semibold text-text/80 tracking-wider">UAPIC LED PLAYER</span>
      </div>
      
      <div className="flex h-full titlebar-no-drag">
        <button 
          onClick={handleMinimize}
          className="h-full px-3 text-muted hover:bg-white/10 hover:text-white transition-colors"
        >
          <Minus size={16} />
        </button>
        <button 
          onClick={handleMaximize}
          className="h-full px-3 text-muted hover:bg-white/10 hover:text-white transition-colors"
        >
          <Square size={14} />
        </button>
        <button 
          onClick={handleClose}
          className="h-full px-3 text-muted hover:bg-red-500 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
