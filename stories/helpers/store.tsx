import { useEffect, useState, type ReactNode } from 'react'
import type { Decorator } from '@storybook/react-vite'
import { BUILTIN_FONTS } from '@/domain/font'
import { useEditorStore, type EditorState } from '@/app/store'
import {
  sampleBackgroundPresets,
  sampleFolders,
  sampleTextPresets,
  sampleThumbnails,
} from './fixtures'
import { SAMPLE_ASSETS, SAMPLE_ASSET_FOLDERS, installSampleAssets } from './sampleAssets'

/*
 * 機能側のコンポーネントはほぼすべてストアを直に読むので、ストーリーは props ではなく
 * 「ストアの状態」で見せ方を決める。ここが唯一の流し込み口。
 *
 * setState は浅いマージなので、前のストーリーで立てたフラグ（cropping など）が残らないよう、
 * baseline() には各 slice の state を漏れなく並べてある。
 */
function baseline(): Partial<EditorState> {
  const thumbnails = sampleThumbnails()
  return {
    // thumbnail
    folders: sampleFolders(),
    thumbnails,
    currentThumbnailId: thumbnails[0].id,
    clipboard: null,
    // layer
    selectedId: null,
    // asset
    assets: SAMPLE_ASSETS.map((asset) => ({ ...asset })),
    assetFolders: SAMPLE_ASSET_FOLDERS.map((folder) => ({ ...folder })),
    // font
    fonts: BUILTIN_FONTS,
    // preset
    textPresets: sampleTextPresets(),
    backgroundPresets: sampleBackgroundPresets(),
    // ui
    ready: true,
    snapEnabled: true,
    guides: { x: [], y: [] },
    propertiesOpen: true,
    cropping: false,
    layerMenu: null,
    // workspace
    workspaceFolderName: null,
    workspaceFileName: null,
    workspaceStatus: 'none',
    workspaceDirty: false,
    workspaceSavedAt: null,
    missingFontLabels: [],
    missingAssetNames: [],
  }
}

function SeededStore({ patch, children }: { patch: Partial<EditorState>; children: ReactNode }) {
  // 子より先に一度だけ流し込む。購読者がまだ居ないうちに終えたいので effect ではなく初期化子で行う
  useState(() => useEditorStore.setState({ ...baseline(), ...patch }))

  const [ready, setReady] = useState(false)
  useEffect(() => {
    let alive = true
    void installSampleAssets().then(() => alive && setReady(true))
    return () => {
      alive = false
    }
  }, [])

  // 実体が入る前に描くと素材だけ空で出るので、入れ終わるまで待つ
  return ready ? <>{children}</> : null
}

/**
 * ストアをサンプルのプロジェクトで初期化してから描くデコレータ。
 *
 * @param patch 初期状態から変えたい項目だけ（選択中のレイヤー、接続状態など）
 */
export function withStore(patch: Partial<EditorState> = {}): Decorator {
  return (Story) => (
    <SeededStore patch={patch}>
      <Story />
    </SeededStore>
  )
}
