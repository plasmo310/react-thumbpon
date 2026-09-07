import { useRef, useState } from 'react'
import { getAssetUrl } from '../lib/assetStore'
import { useEditorStore } from '../store/editorStore'

export const ASSET_DND_TYPE = 'application/x-thumbpon-asset'

export default function AssetPanel() {
  const assets = useEditorStore((s) => s.assets)
  const addAssetFiles = useEditorStore((s) => s.addAssetFiles)
  const removeAsset = useEditorStore((s) => s.removeAsset)
  const addImageLayer = useEditorStore((s) => s.addImageLayer)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    try {
      const added = await addAssetFiles(Array.from(files))
      if (added.length === 0) window.alert('画像ファイル（PNG / JPEG / WebP / SVG）を選んでください')
    } catch (error) {
      console.error(error)
      window.alert(`素材の追加に失敗しました\n${error instanceof Error ? error.message : error}`)
    }
  }

  return (
    <section
      className={`flex h-[42%] shrink-0 flex-col border-t transition ${
        dragOver ? 'border-accent bg-accent-soft' : 'border-line'
      }`}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes('Files')) {
          event.preventDefault()
          setDragOver(true)
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return
        event.preventDefault()
        setDragOver(false)
        void handleFiles(event.dataTransfer.files)
      }}
    >
      <div className="flex h-10 shrink-0 items-center justify-between px-3">
        <h2 className="text-xs font-bold">素材</h2>
        <span className="text-[11px] text-ink-sub">{assets.length}件</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <div className="grid grid-cols-3 gap-2">
          {assets.map((asset) => {
            const url = getAssetUrl(asset.id)
            return (
              <div
                key={asset.id}
                className="group relative aspect-square overflow-hidden rounded-md border border-line bg-app"
              >
                <button
                  type="button"
                  title={`${asset.name}（クリックで中央に配置 / キャンバスへドラッグ）`}
                  onClick={() => addImageLayer(asset.id)}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData(ASSET_DND_TYPE, asset.id)
                    event.dataTransfer.effectAllowed = 'copy'
                  }}
                  className="h-full w-full cursor-grab"
                >
                  {url && (
                    <img
                      src={url}
                      alt={asset.name}
                      className="h-full w-full object-contain"
                      draggable={false}
                    />
                  )}
                </button>
                <button
                  type="button"
                  title="素材を削除"
                  onClick={() => void removeAsset(asset.id)}
                  className="absolute right-0.5 top-0.5 hidden h-5 w-5 items-center justify-center rounded bg-white/90 text-[11px] text-ink-sub shadow group-hover:flex hover:text-accent"
                >
                  ✕
                </button>
              </div>
            )
          })}

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square items-center justify-center rounded-md border border-dashed border-line text-[11px] text-ink-sub transition hover:border-accent hover:text-accent"
          >
            ＋ 追加
          </button>
        </div>

        {assets.length === 0 && (
          <p className="pt-3 text-center text-[11px] leading-relaxed text-ink-sub">
            画像をここにドロップしても追加できます
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        multiple
        hidden
        onChange={(event) => {
          void handleFiles(event.target.files)
          event.target.value = ''
        }}
      />
    </section>
  )
}
