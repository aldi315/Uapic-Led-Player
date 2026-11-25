import React, { useEffect } from 'react'
import EditorLayout from './layouts/EditorLayout'
import useEditorStore from '../store/useEditorStore'
import {
  newProject, openProject, saveProject, requestExit,
  handleOpenResult, importMedia, pushScene, confirmDiscardChanges, startupPlayback,
} from './projectActions'

function isTypingTarget(el) {
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

export default function EditorApp() {
  // ── Main-process events: close request, file association, player status
  useEffect(() => {
    const api = window.electronAPI
    if (!api) return
    const openFromMain = async (res) => {
      if (!res || !(await confirmDiscardChanges())) return
      handleOpenResult(res)
      if (res.autoPlay && res.data && !res.error) startupPlayback(res.delay)
    }
    const unsubs = [
      api.onCloseRequested?.(() => requestExit()),
      api.onOpenProjectFile?.(openFromMain),
      api.onPlayerStatus?.((status) => useEditorStore.getState().setPlayerStatus(status)),
    ]
    // Now subscribed: pick up a project opened before the editor was ready
    // (double-clicked .ulp, start-up autoplay)
    api.editorReady?.().then(openFromMain)
    api.requestPlayerStatus?.()
    return () => unsubs.forEach((u) => typeof u === 'function' && u())
  }, [])

  // ── Window title reflects scene + dirty state
  useEffect(() => {
    const update = (s) => {
      const file = s.currentFilePath ? s.currentFilePath.split(/[\\/]/).pop() : 'Untitled'
      const title = `${s.isDirty ? '• ' : ''}${file} — UAPIC LED Player`
      document.title = title
      window.electronAPI?.setWindowTitle?.(title)
    }
    update(useEditorStore.getState())
    return useEditorStore.subscribe((s, prev) => {
      if (s.isDirty !== prev.isDirty || s.currentFilePath !== prev.currentFilePath) update(s)
    })
  }, [])

  // ── Live mode: mirror every scene change to the output (debounced)
  useEffect(() => {
    let timer = null
    const unsub = useEditorStore.subscribe((s, prev) => {
      if (!s.liveUpdate) return
      if (s.scene === prev.scene && s.liveUpdate === prev.liveUpdate) return
      clearTimeout(timer)
      timer = setTimeout(() => {
        window.electronAPI?.liveSceneUpdate?.(useEditorStore.getState().scene)
      }, 60)
    })
    return () => { clearTimeout(timer); unsub() }
  }, [])

  // ── Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e) {
      const s = useEditorStore.getState()
      const mod = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()
      const typing = isTypingTarget(document.activeElement)

      // Shortcuts that work everywhere (even inside inputs)
      if (mod && key === 's') { e.preventDefault(); saveProject(e.shiftKey); return }
      if (mod && key === 'o') { e.preventDefault(); openProject(); return }
      if (mod && key === 'n') { e.preventDefault(); newProject(); return }
      if (mod && key === 'i') { e.preventDefault(); importMedia(); return }
      if (e.key === 'F5')     { e.preventDefault(); pushScene(); return }

      if (typing) {
        if (e.key === 'Escape') document.activeElement.blur()
        return
      }

      const sel = s.selectedObjectId
      if (mod && key === 'z' && !e.shiftKey) { e.preventDefault(); s.undo(); return }
      if (mod && (key === 'y' || (key === 'z' && e.shiftKey))) { e.preventDefault(); s.redo(); return }
      if (mod && (key === '=' || key === '+')) { e.preventDefault(); s.setZoomLevel(s.zoomLevel + 10); return }
      if (mod && key === '-') { e.preventDefault(); s.setZoomLevel(s.zoomLevel - 10); return }
      if (mod && key === '0') { e.preventDefault(); s.requestFit(); return }
      if (mod && key === '1') { e.preventDefault(); s.setZoomLevel(100); return }
      if (mod && key === 'v') { e.preventDefault(); s.pasteObject(); return }
      if (e.key === 'Escape') { s.clearSelection(); return }

      if (!sel) return
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); s.removeMediaObject(sel); return }
      if (mod && key === 'd') { e.preventDefault(); s.duplicateMediaObject(sel); return }
      if (mod && key === 'c') { e.preventDefault(); s.copyObject(sel); return }
      if (mod && key === 'x') { e.preventDefault(); s.copyObject(sel); s.removeMediaObject(sel); return }
      if (mod && key === ']') { e.preventDefault(); s.moveObjectLayer(sel, e.shiftKey ? 'top' : 'up'); return }
      if (mod && key === '[') { e.preventDefault(); s.moveObjectLayer(sel, e.shiftKey ? 'bottom' : 'down'); return }

      const step = e.shiftKey ? 10 : 1
      const arrows = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
      if (arrows[e.key]) {
        e.preventDefault()
        s.nudgeObject(sel, ...arrows[e.key])
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return <EditorLayout />
}
