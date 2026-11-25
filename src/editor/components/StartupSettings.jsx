import React, { useEffect, useState } from 'react'
import { FolderOpen, Save } from 'lucide-react'
import useEditorStore from '../../store/useEditorStore'
import { saveProject } from '../projectActions'

const api = () => window.electronAPI

/**
 * Startup & Autoplay settings: start the app with Windows and play a chosen
 * project automatically, so the LED wall comes back by itself after a reboot.
 */
export default function StartupSettings() {
  const [s, setS] = useState(null)
  const [note, setNote] = useState(null)
  const currentFilePath = useEditorStore((st) => st.currentFilePath)
  const isDirty = useEditorStore((st) => st.isDirty)
  const showToast = useEditorStore((st) => st.showToast)

  useEffect(() => {
    api()?.getAppSettings?.().then(setS)
  }, [])

  const change = async (changes) => {
    const next = await api().setAppSettings(changes)
    setS(next)
    setNote(next.loginNote || null)
  }

  const useCurrent = async () => {
    // The start-up player reads the file on disk, so save first
    if (!currentFilePath || isDirty) {
      if (!(await saveProject(!currentFilePath))) return
    }
    const path = useEditorStore.getState().currentFilePath
    if (path) {
      await change({ startupProject: path })
      showToast('Startup project set', 'success')
    }
  }

  const browse = async () => {
    const res = await api().openFileDialog([{ name: 'UAPIC Project', extensions: ['ulp'] }], 'Choose startup project')
    if (res?.path) await change({ startupProject: res.path })
  }

  if (!api()?.getAppSettings) return <div className="startup-empty">Only available in the desktop app.</div>
  if (!s) return <div className="startup-empty">Loading…</div>

  const fileName = s.startupProject ? s.startupProject.split(/[\/]/).pop() : null
  const hasProject = !!s.startupProject && s.startupProjectExists
  const restartReady = hasProject && s.startWithWindows && s.canStartWithWindows

  return (
    <div className="startup">
      <div className={`startup-status ${restartReady ? 'startup-status--on' : ''}`}>
        {restartReady
          ? `Ready: after a restart Windows opens the player and plays "${fileName}" by itself${s.startupDelay ? ` (after ${s.startupDelay} s)` : ''}.`
          : !hasProject
            ? 'Step 1: choose the project to play at start-up.'
            : 'Step 2: turn on "Start with Windows".'}
      </div>

      <section className="startup-section">
        <div className="prop-field">
          <label className="prop-label">1 · STARTUP PROJECT</label>
          <div className="prop-file-row">
            <input className="prop-input prop-input--mono" readOnly value={s.startupProject || ''}
              placeholder="No project chosen" title={s.startupProject || ''} />
            <button className="prop-browse-btn" onClick={browse} title="Choose a .ulp file"><FolderOpen size={13} /></button>
          </div>
          {s.startupProject && !s.startupProjectExists && (
            <div className="prop-hint prop-hint--error">File not found — choose the project again.</div>
          )}
          <button className="prop-fit-btn startup-current" onClick={useCurrent}>
            <Save size={12} /> {currentFilePath && !isDirty ? 'Use the open project' : 'Save and use the open project'}
          </button>
        </div>
      </section>

      <section className="startup-section">
        <label className="prop-checkbox-label startup-check">
          <input type="checkbox" checked={!!s.startWithWindows} disabled={!s.canStartWithWindows}
            onChange={(e) => change({ startWithWindows: e.target.checked })} />
          2 · Start with Windows and play the startup project
        </label>
        <div className="prop-hint">
          Windows opens UAPIC LED Player when it signs in; the startup project is loaded, pushed and played.
          {!s.canStartWithWindows && ' Only available in the installed app.'}
        </div>
        {note && <div className="prop-hint prop-hint--error">{note}</div>}

        <div className="prop-grid-2">
          <div className="prop-field">
            <label className="prop-label">DELAY BEFORE PLAY</label>
            <div className="prop-input-wrap">
              <input type="number" className="prop-input" min={0} max={300} value={s.startupDelay}
                onChange={(e) => setS({ ...s, startupDelay: e.target.value })}
                onBlur={(e) => change({ startupDelay: Number(e.target.value) })} />
              <span className="prop-unit">s</span>
            </div>
          </div>
        </div>
        <div className="prop-hint">Gives displays, the LED sender card and the network time to come up first.</div>

        <label className="prop-checkbox-label">
          <input type="checkbox" checked={!!s.minimizeEditor} onChange={(e) => change({ minimizeEditor: e.target.checked })} />
          Minimize the editor after a Windows start
        </label>
      </section>

      <section className="startup-section">
        <label className="prop-checkbox-label">
          <input type="checkbox" checked={!!s.autoPlay} onChange={(e) => change({ autoPlay: e.target.checked })} />
          Also play the startup project when I open the app myself
        </label>
      </section>

      <div className="startup-footer prop-hint">
        The output opens at the position and size saved in the project. For an unattended screen, also set
        Windows to sign in automatically and never sleep.
      </div>
    </div>
  )
}
