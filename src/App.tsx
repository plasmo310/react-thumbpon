import { useEffect } from 'react'
import AssetPanel from './components/asset/AssetPanel'
import CanvasStage from './components/canvas/CanvasStage'
import Header from './components/header/Header'
import { WorkspaceNotice } from './components/header/WorkspaceNotice'
import LayerPanel from './components/layer/LayerPanel'
import ThumbnailPanel from './components/thumbnail/ThumbnailPanel'
import { useKeyboardShortcuts } from './services/shortcuts'
import { restoreWorkspace, startAutoSave } from './services/workspace'

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
      <WorkspaceNotice />
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
