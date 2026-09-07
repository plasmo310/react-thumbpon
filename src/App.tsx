import { useEffect } from 'react'
import AssetPanel from './components/AssetPanel'
import CanvasStage from './components/canvas/CanvasStage'
import Header from './components/Header'
import LayerPanel from './components/LayerPanel'
import { useKeyboardShortcuts } from './lib/useKeyboardShortcuts'
import { useEditorStore } from './store/editorStore'

export default function App() {
  const initAssets = useEditorStore((s) => s.initAssets)
  useKeyboardShortcuts()

  useEffect(() => {
    void initAssets()
  }, [initAssets])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Header />
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[320px] shrink-0 flex-col border-r border-line bg-panel">
          <LayerPanel />
          <AssetPanel />
        </aside>
        <CanvasStage />
      </div>
    </div>
  )
}
