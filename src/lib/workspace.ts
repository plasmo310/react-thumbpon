import { get, set } from 'idb-keyval'
import { kv } from './db'
import { loadAssets } from './assetStore'
import { loadStoredFonts } from './fontStore'
import { useEditorStore } from '../store/editorStore'
import type { BackgroundPreset, Folder, TextPreset, Thumbnail } from '../types/editor'

const WORKSPACE_KEY = 'project:current'

type Workspace = {
  folders: Folder[]
  thumbnails: Thumbnail[]
  currentThumbnailId: string | null
  textPresets: TextPreset[]
  backgroundPresets: BackgroundPreset[]
  snapEnabled: boolean
}

/** 起動時の復元：素材 → フォント → 作業中プロジェクトの順に読み込む */
export async function restoreWorkspace() {
  const store = useEditorStore.getState()

  const assets = await loadAssets()
  useEditorStore.setState({ assets })

  try {
    const fonts = await loadStoredFonts()
    if (fonts.length > 0) store.addFonts(fonts)
  } catch (error) {
    console.error('フォントの復元に失敗しました', error)
  }

  const saved = await get<Workspace>(WORKSPACE_KEY, kv)
  if (saved && saved.thumbnails?.length > 0) {
    store.loadProject(saved)
    if (typeof saved.snapEnabled === 'boolean') store.setSnapEnabled(saved.snapEnabled)
  }

  useEditorStore.getState().setReady(true)
}

/**
 * 編集内容を自動保存する。素材欄をなくさない設計でも、
 * サムネイル自体はここにしか無いのでリロードで失われないようにする。
 */
export function startAutoSave() {
  let timer: number | undefined
  let previous = pick(useEditorStore.getState())

  return useEditorStore.subscribe((state) => {
    if (!state.ready) return
    const next = pick(state)
    if (
      next.folders === previous.folders &&
      next.thumbnails === previous.thumbnails &&
      next.currentThumbnailId === previous.currentThumbnailId &&
      next.textPresets === previous.textPresets &&
      next.backgroundPresets === previous.backgroundPresets &&
      next.snapEnabled === previous.snapEnabled
    ) {
      return
    }
    previous = next
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      void set(WORKSPACE_KEY, next, kv).catch((error) =>
        console.error('自動保存に失敗しました', error),
      )
    }, 400)
  })
}

function pick(state: ReturnType<typeof useEditorStore.getState>): Workspace {
  return {
    folders: state.folders,
    thumbnails: state.thumbnails,
    currentThumbnailId: state.currentThumbnailId,
    textPresets: state.textPresets,
    backgroundPresets: state.backgroundPresets,
    snapEnabled: state.snapEnabled,
  }
}
