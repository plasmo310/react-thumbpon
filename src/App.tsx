import { useEffect } from 'react'
import AssetPanel from './components/AssetPanel'
import CanvasStage from './components/canvas/CanvasStage'
import Header from './components/Header'
import LayerPanel from './components/LayerPanel'
import ThumbnailPanel from './components/ThumbnailPanel'
import { useKeyboardShortcuts } from './lib/useKeyboardShortcuts'
import { restoreWorkspace, startAutoSave } from './lib/workspace'

export default function App() {
  useKeyboardShortcuts()

  useEffect(() => {
    const unsubscribe = startAutoSave()
    void restoreWorkspace()
    return unsubscribe
  }, [])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Header />
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[340px] shrink-0 flex-col border-r border-line bg-panel">
          <ThumbnailPanel />
          <LayerPanel />
          <AssetPanel />
        </aside>
        <CanvasStage />
      </div>
    </div>
  )
}
