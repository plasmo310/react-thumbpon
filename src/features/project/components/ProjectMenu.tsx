import { useTranslation } from '@/shared/lib/i18n'
import { useEffect, useRef, useState } from 'react'
import { notifyError } from '@/shared/lib/notify'
import { canUseFileSystemAccess } from '@/shared/lib/storage/fsAccess'
import { useEditorStore } from '@/app/store'
import { PROJECT_ZIP_EXTENSION } from '@/domain/project'
import { cx } from '@/shared/lib/cx'
import { Button, useFilePicker } from '@/shared/ui'
import { exportProjectFile, importProjectFile } from '../lib/projectFile'
import { confirmFolderOverwrite } from '../lib/confirmOverwrite'
import { openProjectFolder, saveProjectFolder, switchRecentProject } from '../lib/projectFolder'
import { newProject } from '../lib/workspace'
import styles from '../styles.module.css'

/** インポートで受け付ける形式。素の .zip も許すのは、受け渡しで .thumbpon を落とされた場合のため */
const IMPORT_ACCEPT = `${PROJECT_ZIP_EXTENSION},.zip,application/zip`

/**
 * 新規作成からファイル書き出しまで、プロジェクト単位の操作をまとめたメニュー。
 * どれも編集中にたまに使うだけの操作なので、ボタンを並べるよりメニューに畳んで
 * PNG書き出しを目立たせる。
 */
export function ProjectMenu() {
  const t = useTranslation()

  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const canUseFolder = canUseFileSystemAccess()
  const recentProjects = useEditorStore((s) => s.recentProjects)
  const workspaceStatus = useEditorStore((s) => s.workspaceStatus)
  const workspaceFolderName = useEditorStore((s) => s.workspaceFolderName)
  const workspaceFileName = useEditorStore((s) => s.workspaceFileName)
  const connected = workspaceStatus === 'connected'
  const locale = useEditorStore((s) => s.locale)

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

  /** 現在の内容を捨てる操作の確認。取り消せないので必ず挟む */
  const confirmDiscard = (what: string) =>
    window.confirm(t('現在の内容を破棄して{0}。よろしいですか？', what))

  const handleNew = async () => {
    if (!confirmDiscard(t('新しいプロジェクトを作成します'))) return
    await newProject()
  }

  /**
   * 選ばれたファイルを読み込む。
   *
   * @param file 選択されたファイル
   */
  const handleImport = async (file: File) => {
    if (!confirmDiscard(t('プロジェクトを読み込みます'))) return
    await importProjectFile(file)
  }

  const picker = useFilePicker(IMPORT_ACCEPT, (files) => {
    void run(t('読み込みに失敗しました'), () => handleImport(files[0]))
  })

  const handleOpen = async () => {
    if (!confirmDiscard(t('プロジェクトを開きます'))) return
    await openProjectFolder()
  }

  /**
   * 最近使ったプロジェクトへ切り替える。
   * フォルダに繋がっていれば切り替え前に保存されるので確認しない。未接続の作業は
   * どこにも残らないため、捨ててよいか確かめる。
   *
   * @param id 切り替え先の履歴の id
   */
  const handleSwitch = async (id: string) => {
    if (!connected && !confirmDiscard(t('プロジェクトを切り替えます'))) return
    await switchRecentProject(id)
  }

  return (
    <div className={styles.menuRoot} ref={rootRef}>
      <Button size="md" disabled={busy} onClick={() => setOpen((current) => !current)}>
        {t('プロジェクト')}{' '}
        <span aria-hidden className={styles.menuCaret}>
          ▼
        </span>
      </Button>

      {open && (
        <div role="menu" className={styles.menu}>
          <button
            type="button"
            role="menuitem"
            className={styles.menuItem}
            title={t('現在の内容を破棄して新しいプロジェクトを作る（フォルダ接続も解除される）')}
            onClick={() => void run(t('新規作成に失敗しました'), handleNew)}
          >
            {t('新規')}
          </button>

          {/* フォルダ連携は Chromium 系のみ。非対応ブラウザでは区切りごと出さない */}
          {canUseFolder && (
            <>
              <div className={styles.menuSeparator} />
              <button
                type="button"
                role="menuitem"
                className={styles.menuItem}
                title={t('プロジェクトのフォルダを開いて作業を再開する')}
                onClick={() => void run(t('プロジェクトを開けませんでした'), handleOpen)}
              >
                {t('プロジェクトを開く')}
              </button>
              {/*
                「開く」の直後に置き、履歴は子メニューへ畳む。項目数が増えてもメニュー本体の
                高さが変わらず、空のときも機能の場所が分かるよう常に出しておく。
                開閉はホバーとフォーカスだけで決まるので CSS で完結させる。
              */}
              <div className={styles.submenuRoot}>
                <button
                  type="button"
                  role="menuitem"
                  aria-haspopup="menu"
                  className={styles.menuItem}
                >
                  {t('最近使ったプロジェクトを開く')}
                  <span aria-hidden className={styles.submenuArrow}>
                    ▸
                  </span>
                </button>
                <div role="menu" className={cx(styles.menu, styles.submenu)}>
                  {recentProjects.length === 0 && (
                    <div className={styles.menuLabel}>{t('履歴はありません')}</div>
                  )}
                  {recentProjects.map((project, index) => {
                    // 接続のたびに先頭へ記録されるので、接続中のものは必ず先頭にある
                    const current =
                      connected &&
                      index === 0 &&
                      project.folderName === workspaceFolderName &&
                      project.manifestName === workspaceFileName
                    return (
                      <button
                        key={project.id}
                        type="button"
                        role="menuitem"
                        className={styles.menuItem}
                        disabled={current}
                        onClick={() =>
                          void run(t('プロジェクトを切り替えられませんでした'), () =>
                            handleSwitch(project.id),
                          )
                        }
                      >
                        {/*
                          ブラウザはフォルダの絶対パスを渡さないので、同名フォルダは
                          最終使用日時で見分けてもらう
                        */}
                        <span className={styles.recentText}>
                          <span className={styles.menuItemText}>{project.folderName}</span>
                          <span className={cx(styles.menuItemText, styles.recentDetail)}>
                            {new Date(project.openedAt).toLocaleString(locale)}
                          </span>
                        </span>
                        {current && <span className={styles.shortcut}>✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className={styles.menuSeparator} />
              <button
                type="button"
                role="menuitem"
                className={styles.menuItem}
                title={t('ワークスペースフォルダに保存する（未接続なら保存先を選ぶ）')}
                onClick={() =>
                  void run(t('保存に失敗しました'), () => saveProjectFolder(confirmFolderOverwrite))
                }
              >
                {t('プロジェクトを保存')}
                <span className={styles.shortcut}>Ctrl+S</span>
              </button>
            </>
          )}

          <div className={styles.menuSeparator} />
          <button
            type="button"
            role="menuitem"
            className={styles.menuItem}
            title={t('.thumbpon.zip ファイルを読み込む')}
            onClick={() => {
              setOpen(false)
              picker.open()
            }}
          >
            {t('インポート')}
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.menuItem}
            title={t('プロジェクトを .thumbpon.zip ファイル1つとして書き出す')}
            onClick={() => void run(t('書き出しに失敗しました'), exportProjectFile)}
          >
            {t('エクスポート')}
          </button>
        </div>
      )}

      {picker.element}
    </div>
  )
}
