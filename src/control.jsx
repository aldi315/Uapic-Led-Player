import React from 'react'
import ReactDOM from 'react-dom/client'
import EditorApp from './editor/EditorApp'
import './index.css'
import './editor/editor.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <EditorApp />
  </React.StrictMode>
)
