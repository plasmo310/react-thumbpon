import { useRef, useState } from 'react'
import { notifyError } from '@/lib/dom/notify'
import { addFontFiles, canQueryLocalFonts, queryLocalFonts } from '@/core/storage/fontRepo'
import { useEditorStore } from '@/core/store'

/**
 * ローカルフォントの読み込み（PCのフォント一覧の取得 / フォントファイルの追加）。
 * 一覧の取得は Chrome 系でしか使えないため、非対応ブラウザではボタン自体を出さない。
 */
export function FontLoader() {
  const addFonts = useEditorStore((s) => s.addFonts)
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const loadLocalFonts = async () => {
    setBusy(true)
    try {
      addFonts(await queryLocalFonts())
    } catch (error) {
      notifyError('ローカルフォントを読み込めませんでした', error)
    } finally {
      setBusy(false)
    }
  }

  const loadFontFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setBusy(true)
    try {
      const added = await addFontFiles(Array.from(files))
      if (added.length === 0) window.alert('追加できるフォントがありませんでした')
      else addFonts(added)
    } catch (error) {
      notifyError('フォントを読み込めませんでした', error)
    } finally {
      setBusy(false)
    }
  }

  const buttonClass =
    'flex-1 rounded-md border border-line px-2 py-1 text-[11px] text-ink-sub transition hover:border-accent hover:text-accent disabled:opacity-50'

  return (
    <div className="flex gap-1">
      {canQueryLocalFonts() && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void loadLocalFonts()}
          className={buttonClass}
        >
          PCのフォントを読み込む
        </button>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className={buttonClass}
      >
        フォントファイル追加
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".ttf,.otf,.woff,.woff2,font/*"
        multiple
        hidden
        onChange={(event) => {
          void loadFontFiles(event.target.files)
          event.target.value = ''
        }}
      />
    </div>
  )
}
