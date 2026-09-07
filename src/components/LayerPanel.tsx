import { useEditorStore } from '../store/editorStore'
import { BACKGROUND_ID, type Layer } from '../types/editor'
import { BackgroundProperties, LayerProperties } from './PropertiesPanel'
import { IconButton } from './ui/Field'

function LayerRow({ layer, index, total }: { layer: Layer; index: number; total: number }) {
  const selectedId = useEditorStore((s) => s.selectedId)
  const select = useEditorStore((s) => s.select)
  const updateLayer = useEditorStore((s) => s.updateLayer)
  const removeLayer = useEditorStore((s) => s.removeLayer)
  const duplicateLayer = useEditorStore((s) => s.duplicateLayer)
  const moveLayer = useEditorStore((s) => s.moveLayer)

  const selected = selectedId === layer.id

  return (
    <li
      className={`overflow-hidden rounded-md border transition ${
        selected ? 'border-accent bg-accent-soft' : 'border-transparent bg-white hover:bg-app'
      }`}
    >
      {/* 行内にボタンを含むため button ではなく div にする */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => select(layer.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') select(layer.id)
        }}
        className="flex w-full cursor-pointer items-center gap-2 px-2 py-1.5 text-left"
      >
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold ${
            layer.type === 'text' ? 'bg-accent text-white' : 'bg-line text-ink-sub'
          }`}
        >
          {layer.type === 'text' ? 'T' : 'I'}
        </span>
        <span
          className={`min-w-0 flex-1 truncate text-xs ${
            layer.visible ? 'text-ink' : 'text-ink-sub line-through'
          }`}
        >
          {layer.name}
        </span>
        <IconButton
          title={layer.visible ? '非表示にする' : '表示する'}
          onClick={() => updateLayer(layer.id, { visible: !layer.visible })}
          active={!layer.visible}
        >
          {layer.visible ? '◉' : '◌'}
        </IconButton>
        <IconButton
          title={layer.locked ? 'ロック解除' : 'ロック'}
          onClick={() => updateLayer(layer.id, { locked: !layer.locked })}
          active={layer.locked}
        >
          {layer.locked ? '🔒' : '🔓'}
        </IconButton>
      </div>

      {selected && (
        <>
          <div className="flex items-center gap-1 border-t border-line bg-app px-2 py-1">
            <IconButton
              title="前面へ"
              onClick={() => moveLayer(layer.id, 1)}
              active={index < total - 1}
            >
              ↑
            </IconButton>
            <IconButton title="背面へ" onClick={() => moveLayer(layer.id, -1)} active={index > 0}>
              ↓
            </IconButton>
            <IconButton title="複製" onClick={() => duplicateLayer(layer.id)}>
              ⧉
            </IconButton>
            <div className="flex-1" />
            <IconButton title="削除" onClick={() => removeLayer(layer.id)}>
              🗑
            </IconButton>
          </div>
          <LayerProperties layer={layer} />
        </>
      )}
    </li>
  )
}

export default function LayerPanel() {
  const layers = useEditorStore((s) => s.layers)
  const selectedId = useEditorStore((s) => s.selectedId)
  const select = useEditorStore((s) => s.select)
  const addTextLayer = useEditorStore((s) => s.addTextLayer)

  const backgroundSelected = selectedId === BACKGROUND_ID

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-line px-3">
        <h2 className="text-xs font-bold">レイヤー</h2>
        <button
          type="button"
          onClick={addTextLayer}
          className="rounded-md border border-line px-2 py-1 text-[11px] text-ink-sub transition hover:border-accent hover:text-accent"
        >
          ＋ テキスト
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {layers.length === 0 && (
          <p className="px-1 py-6 text-center text-[11px] leading-relaxed text-ink-sub">
            素材をキャンバスにドラッグするか
            <br />
            「＋ テキスト」から追加してください
          </p>
        )}
        <ul className="flex flex-col gap-1">
          {/* 配列の末尾が最前面なので、表示は逆順にする */}
          {layers
            .map((layer, index) => ({ layer, index }))
            .reverse()
            .map(({ layer, index }) => (
              <LayerRow key={layer.id} layer={layer} index={index} total={layers.length} />
            ))}
        </ul>

        <div
          className={`mt-1 overflow-hidden rounded-md border transition ${
            backgroundSelected ? 'border-accent bg-accent-soft' : 'border-transparent bg-white'
          }`}
        >
          <button
            type="button"
            onClick={() => select(BACKGROUND_ID)}
            className="flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-app"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-line text-[9px] font-bold text-ink-sub">
              BG
            </span>
            <span className="flex-1 truncate text-xs">背景</span>
          </button>
          {backgroundSelected && <BackgroundProperties />}
        </div>
      </div>
    </section>
  )
}
