import React from 'react'
import EditorTitlebar from '../components/Titlebar'
import EditorToolbar from '../components/EditorToolbar'
import MediaLibrary from '../components/MediaLibrary'
import EditorCanvas from '../components/EditorCanvas'
import PropertiesInspector from '../components/PropertiesInspector'

export default function EditorLayout() {
  return (
    <div className="editor-root">
      <EditorTitlebar />

      <div className="editor-body">
        {/* Left: Media Library */}
        <MediaLibrary />

        {/* Center: Canvas + Toolbar */}
        <div className="editor-center">
          <EditorToolbar />
          <EditorCanvas />
        </div>

        {/* Right: Properties Inspector */}
        <PropertiesInspector />
      </div>
    </div>
  )
}
