import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import useEditorStore from '../store/useEditorStore';

export default function CanvasArea() {
  const containerRef = useRef(null);
  const { canvasSize, zoomLevel } = useEditorStore();
  
  // Calculate scaling to fit or apply zoom
  const scale = zoomLevel / 100;
  
  return (
    <div 
      ref={containerRef}
      className="flex-1 bg-[#0a0a0a] overflow-auto flex items-center justify-center relative p-8"
      style={{
        backgroundImage: 'radial-gradient(#333 1px, transparent 0)',
        backgroundSize: '24px 24px',
      }}
    >
      <div 
        className="shadow-2xl transition-transform duration-200"
        style={{
          width: canvasSize.width * scale,
          height: canvasSize.height * scale,
          backgroundColor: '#000000',
        }}
      >
        <Stage 
          width={canvasSize.width * scale} 
          height={canvasSize.height * scale}
          scaleX={scale}
          scaleY={scale}
        >
          <Layer>
            {/* Future layout items will be rendered here */}
            {/* Background Rect is technically handled by CSS above, but Konva can also hold it */}
            <Rect
              x={0}
              y={0}
              width={canvasSize.width}
              height={canvasSize.height}
              fill="#000000"
            />
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
