import { useTranslation } from '@/shared/lib/i18n'
import { useEffect, useRef, useState } from 'react'
import { AssetPanel } from '@/features/asset'
import { CanvasStage } from '@/features/canvas'
import { Header } from '@/features/project'
import { WorkspaceNotice } from '@/features/project'
import { LayerMenu, LayerPanel } from '@/features/layer'
import { ThumbnailPanel } from '@/features/thumbnail'
import { Splitter } from '@/shared/ui'
import styles from './styles.module.css'
import { clamp } from '@/domain/geometry'
import { isUnsupportedDevice } from '@/app/config/deviceSupport'
import { loadPanelLayout, savePanelLayout } from '@/app/layout/panelLayout'
import { useKeyboardShortcuts } from '@/app/config/shortcuts'
import { restoreWorkspace, startAutoSave } from '@/features/project'
import { useEditorStore } from '@/app/store'

const MIN_SIDEBAR = 240
const MAX_SIDEBAR = 640
const MIN_PANEL = 80
/** 上下のパネルを広げてもレイヤーパネルに残す高さ(px) */
const MIN_LAYER_PANEL = 120

export function App() {
  const t = useTranslation()
  const locale = useEditorStore((s) => s.locale)
  useEffect(() => {
    document.documentElement.lang = locale
    document.title = locale === 'ja' ? 'サムネぽん！ / ThumbPon' : 'ThumbPon — Thumbnail editor'
  }, [locale])

  const unsupportedDevice = isUnsupportedDevice(navigator)
  useKeyboardShortcuts()
  const sidebarRef = useRef<HTMLElement>(null)
  const [layout, setLayout] = useState(loadPanelLayout)

  useEffect(() => {
    const unsubscribe = startAutoSave()
    void restoreWorkspace()
    return unsubscribe
  }, [])

  useEffect(() => savePanelLayout(layout), [layout])

  useEffect(() => {
    let active = true
    const refresh = () => {
      if (active) useEditorStore.getState().refreshTextLayout()
    }
    void document.fonts.ready.then(refresh)
    document.fonts.addEventListener('loadingdone', refresh)
    const unsubscribe = useEditorStore.subscribe((state) => state.fonts, refresh)
    return () => {
      active = false
      document.fonts.removeEventListener('loadingdone', refresh)
      unsubscribe()
    }
  }, [])

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
    <div className={`${styles.appShell} ${unsupportedDevice ? styles.unsupported : ''}`}>
      <div className={styles.app}>
        <Header />
        <WorkspaceNotice />
        <div className={styles.main}>
          <aside ref={sidebarRef} className={styles.sidebar} style={{ width: layout.sidebarWidth }}>
            <div className={styles.pane} style={{ height: layout.thumbnailHeight }}>
              <ThumbnailPanel />
            </div>
            <Splitter
              axis="y"
              size={layout.thumbnailHeight}
              title={t('ドラッグでサムネイルの高さを変える')}
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
              title={t('ドラッグで素材の高さを変える')}
              onResize={(height) =>
                setLayout((current) => ({
                  ...current,
                  assetHeight: clampPanelHeight(height, current.thumbnailHeight),
                }))
              }
            />
            <div className={styles.pane} style={{ height: layout.assetHeight }}>
              <AssetPanel />
            </div>
          </aside>

          <Splitter
            axis="x"
            size={layout.sidebarWidth}
            title={t('ドラッグで左パネルの幅を変える')}
            onResize={(width) =>
              setLayout((current) => ({
                ...current,
                sidebarWidth: clamp(width, MIN_SIDEBAR, MAX_SIDEBAR),
              }))
            }
          />

          <CanvasStage />
        </div>

        {/* レイヤー一覧とキャンバスの両方から出すので、ここで1つだけ描く */}
        <LayerMenu />
      </div>
      <main className={styles.mobileUnsupported}>
        <p>{t('ThumbPon はモバイル端末に対応していません。')}</p>
        <p>{t('PC からアクセスしてください。')}</p>
      </main>
    </div>
  )
}
