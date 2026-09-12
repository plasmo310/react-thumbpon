import { useEffect, useRef, useState } from 'react'
import { notifyError } from '@/lib/dom/notify'
import { canUseFileSystemAccess } from '@/core/storage/fsAccess'
import { exportProjectFile, importProjectFile } from '../../services/projectFile'
import { openProjectFolder, saveProjectFolder } from '../../services/projectFolder'
import { newProject } from '../../services/workspace'
import { menuItem, menuSeparator, toolbarButton } from '@/styles'

/**
 * 新規作成からファイル書き出しまで、プロジェクト単位の操作をまとめたメニュー。
 * どれも編集中にたまに使うだけの操作なので、ボタンを並べるよりメニューに畳んで
 * PNG書き出しを目立たせる。
 */
export function ProjectMenu() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const canUseFolder = canUseFileSystemAccess()

  // メニューの外を触ったときと Escape で閉じる。開いている間だけ購読する
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  /**
   * メニューを閉じてから処理を走らせ、失敗をまとめて拾う。
   *
   * @param message 失敗したときに出す見出し
   * @param task    実際の処理
   */
  const run = async (message: string, task: () => Promise<unknown>) => {
    setOpen(false)
    setBusy(true)
    try {
      await task()
    } catch (error) {
      notifyError(message, error)
    } finally {
      setBusy(false)
    }
  }

  /** 取り消せない操作なので必ず確認を挟む */
  const handleNew = async () => {
    if (!window.confirm('現在の内容を破棄して新しいプロジェクトを作成します。よろしいですか？')) {
      return
    }
    await newProject()
  }

  /**
   * 選ばれたファイルを読み込む。
   *
   * @param file 選択されたファイル。キャンセル時は undefined
   */
  const handleImport = async (file: File | undefined) => {
    if (!file) return
    if (!window.confirm('現在の内容を破棄してプロジェクトを読み込みます。よろしいですか？')) return
    await importProjectFile(file)
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={`${toolbarButton} flex items-center gap-1.5`}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen((current) => !current)}
      >
        プロジェクト
        <span aria-hidden className="text-[8px] leading-none">
          ▼
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 w-60 rounded-md border border-line bg-panel py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            className={menuItem}
            title="現在の内容を破棄して新しいプロジェクトを作る（フォルダ接続も解除される）"
            onClick={() => void run('新規作成に失敗しました', handleNew)}
          >
            新規
          </button>

          {/* フォルダ連携は Chromium 系のみ。非対応ブラウザでは区切りごと出さない */}
          {canUseFolder && (
            <>
              <div className={menuSeparator} />
              <button
                type="button"
                role="menuitem"
                className={menuItem}
                title="ローカルのフォルダをワークスペースとして開く"
                onClick={() => void run('フォルダを開けませんでした', openProjectFolder)}
              >
                フォルダを開く
              </button>
              <button
                type="button"
                role="menuitem"
                className={menuItem}
                title="ワークスペースフォルダに保存する（未接続なら保存先を選ぶ）"
                onClick={() => void run('保存に失敗しました', saveProjectFolder)}
              >
                フォルダに保存
                <span className="ml-auto text-[10px] text-ink-sub">Ctrl+S</span>
              </button>
            </>
          )}

          <div className={menuSeparator} />
          <button
            type="button"
            role="menuitem"
            className={menuItem}
            title=".thumbpon.zip ファイルを読み込む"
            onClick={() => {
              setOpen(false)
              inputRef.current?.click()
            }}
          >
            インポート
          </button>
          <button
            type="button"
            role="menuitem"
            className={menuItem}
            title="プロジェクトを .thumbpon.zip ファイル1つとして書き出す"
            onClick={() => void run('書き出しに失敗しました', exportProjectFile)}
          >
            エクスポート
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".zip,.json,application/zip,application/json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          void run('読み込みに失敗しました', () => handleImport(file))
        }}
      />
    </div>
  )
}
