import { useEffect, useRef, useState } from 'react'
import AssetPanel from '@/components/asset/AssetPanel'
import CanvasStage from '@/components/canvas/CanvasStage'
import Header from '@/components/header/Header'
import { WorkspaceNotice } from '@/components/header/WorkspaceNotice'
import LayerPanel from '@/components/layer/LayerPanel'
import ThumbnailPanel from '@/components/thumbnail/ThumbnailPanel'
import { Splitter } from '@/components/ui'
import { clamp } from '@/core/model/geometry'
import { loadPanelLayout, savePanelLayout } from '@/core/storage/panelLayout'
import { useKeyboardShortcuts } from '@/services/shortcuts'
import { restoreWorkspace, startAutoSave } from '@/services/workspace'

const MIN_SIDEBAR = 240
const MAX_SIDEBAR = 640
const MIN_PANEL = 80
/** 上下のパネルを広げてもレイヤーパネルに残す高さ(px) */
const MIN_LAYER_PANEL = 120

export default function App() {
  useKeyboardShortcuts()
  const sidebarRef = useRef<HTMLElement>(null)
  const [layout, setLayout] = useState(loadPanelLayout)

  useEffect(() => {
    const unsubscribe = startAutoSave()
    void restoreWorkspace()
    return unsubscribe
  }, [])

  useEffect(() => savePanelLayout(layout), [layout])

  /**
   * サイドバー内のパネルの高さを、レイヤーパネルを潰さない範囲に収める。
   *
   * @param next  ドラッグで求めた高さ(px)
   * @param other 反対側にあるパネルの高さ(px)
   */
  const clampPanelHeight = (next: number, other: number) => {
    const total = sidebarRef.current?.clientHeight ?? 0
    return clamp(next, MIN_PANEL, Math.max(MIN_PANEL, total - other - MIN_LAYER_PANEL))
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Header />
      <WorkspaceNotice />
      <div className="flex min-h-0 flex-1">
        <aside
          ref={sidebarRef}
          className="flex shrink-0 flex-col bg-panel"
          style={{ width: layout.sidebarWidth }}
        >
          <div className="flex min-h-0 flex-col" style={{ height: layout.thumbnailHeight }}>
            <ThumbnailPanel />
          </div>
          <Splitter
            axis="y"
            size={layout.thumbnailHeight}
            title="ドラッグでサムネイルの高さを変える"
            onResize={(height) =>
              setLayout((current) => ({
                ...current,
                thumbnailHeight: clampPanelHeight(height, current.assetHeight),
              }))
            }
          />

          <LayerPanel />

          <Splitter
            axis="y"
            size={layout.assetHeight}
            invert
            title="ドラッグで素材の高さを変える"
            onResize={(height) =>
              setLayout((current) => ({
                ...current,
                assetHeight: clampPanelHeight(height, current.thumbnailHeight),
              }))
            }
          />
          <div className="flex min-h-0 flex-col" style={{ height: layout.assetHeight }}>
            <AssetPanel />
          </div>
        </aside>

        <Splitter
          axis="x"
          size={layout.sidebarWidth}
          title="ドラッグで左パネルの幅を変える"
          onResize={(width) =>
            setLayout((current) => ({
              ...current,
              sidebarWidth: clamp(width, MIN_SIDEBAR, MAX_SIDEBAR),
            }))
          }
        />

        <CanvasStage />
      </div>
    </div>
  )
}
