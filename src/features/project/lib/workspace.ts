import { get, set } from 'idb-keyval'
import { shallow } from 'zustand/shallow'
import { kv } from '@/shared/lib/storage/db'
import { replaceAssets } from '@/shared/lib/storage/assetRepo'
import { loadStoredFonts } from '@/shared/lib/storage/fontRepo'
import { pickDocument, useEditorStore, type SavedDocument } from '@/app/store'
import { disconnectProjectFolder, restoreProjectFolder } from './projectFolder'

const WORKSPACE_KEY = 'project:current'

/**
 * 起動時の復元。素材 → フォント → 作業中プロジェクト → ワークスペースフォルダの順に読み込む。
 *
 * 保存先が2つあるので、どちらが正かをここで一本化する:
 * **フォルダに繋がっている間はフォルダが唯一の正本**。フォルダを読めたら IndexedDB の
 * スナップショットは捨てて上書きする。IndexedDB は「まだフォルダに保存していないもの」の
 * 置き場（フォルダ未接続時の作業・非対応ブラウザ・明示保存前のクラッシュ復旧）に徹する。
 *
 * 最後に ready を立てるまで自動保存は動かないので、この間に上書きされることはない。
 */
export async function restoreWorkspace() {
  const store = useEditorStore.getState()

  await store.initAssets()

  try {
    const fonts = await loadStoredFonts()
    if (fonts.length > 0) store.addFonts(fonts)
  } catch (error) {
    console.error('フォントの復元に失敗しました', error)
  }

  const saved = await get<SavedDocument>(WORKSPACE_KEY, kv)
  if (saved && saved.thumbnails?.length > 0) {
    store.loadProject(saved)
    if (typeof saved.snapEnabled === 'boolean') store.setSnapEnabled(saved.snapEnabled)
  }

  try {
    await restoreProjectFolder()
  } catch (error) {
    console.error('ワークスペースフォルダの復元に失敗しました', error)
  }

  useEditorStore.getState().setReady(true)
}

/**
 * すべてを白紙に戻して新しいプロジェクトを始める。
 *
 * フォルダに繋がっていたら切り離す。繋いだままだと、次の「保存」で
 * 別プロジェクトのフォルダを空の内容で上書きしてしまうため。
 * フォントは環境側に溜めたもので、プロジェクトには含めないので消さない。
 */
export async function newProject() {
  await replaceAssets([])
  useEditorStore.setState({ assets: [], missingFontLabels: [] })
  useEditorStore.getState().loadProject({
    folders: [],
    thumbnails: [],
    textPresets: [],
    backgroundPresets: [],
  })
  await disconnectProjectFolder()
}

/**
 * 編集内容の自動保存を始める。素材と違いサムネイル自体はここにしか無いので、
 * リロードで失われないようにする。フォルダへは書かない（保存は明示操作のみ）ため、
 * 未保存の変更があることだけ記録する。
 *
 * @returns 購読を止める関数。App のクリーンアップでそのまま呼ぶ
 */
export function startAutoSave() {
  let timer: number | undefined

  return useEditorStore.subscribe(
    pickDocument,
    (document) => {
      const store = useEditorStore.getState()
      if (!store.ready) return
      if (!store.workspaceDirty) store.setWorkspaceDirty(true)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        void set(WORKSPACE_KEY, document, kv).catch((error) =>
          console.error('自動保存に失敗しました', error),
        )
      }, 400)
    },
    { equalityFn: shallow },
  )
}
