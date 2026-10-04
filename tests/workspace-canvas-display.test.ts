import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('idb-keyval', () => import('./helpers/fakeKv'))
vi.mock('@/shared/lib/storage/fsAccess', () => import('./helpers/fakeFs'))

import { resetKv, store } from './helpers/fakeKv'
import { resetFake } from './helpers/fakeFs'
import { restoreWorkspace, startAutoSave } from '@/features/project/lib/workspace'
import { buildProjectFile } from '@/features/project/lib/projectData'
import { useEditorStore, pickDocument } from '@/app/store'
import { createThumbnail } from '@/domain/thumbnail'
import { DEFAULT_GRID } from '@/domain/canvasLayout'

const state = () => useEditorStore.getState()
let stop: (() => void) | undefined

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('window', { setTimeout, clearTimeout })
  resetKv()
  resetFake()
  state().setReady(false)
  state().loadProject({ folders: [], thumbnails: [createThumbnail('a'), createThumbnail('b')] })
  state().restoreCanvasDisplay({})
  state().setWorkspaceDirty(false)
})

afterEach(() => {
  stop?.()
  stop = undefined
  useEditorStore.setState({ locale: 'ja' })
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('ブラウザ専用のCanvas表示設定', () => {
  it('言語切替だけでは自動保存や未保存フラグを変更せず、プロジェクト復元でも言語を保持する', async () => {
    state().setReady(true)
    stop = startAutoSave()
    state().setLocale('en')
    await vi.advanceTimersByTimeAsync(400)
    expect(store.has('project:current')).toBe(false)
    expect(store.has('view:canvas')).toBe(false)
    expect(state().workspaceDirty).toBe(false)
    expect(buildProjectFile([])).not.toHaveProperty('locale')

    store.set('project:current', pickDocument(state()))
    await restoreWorkspace()
    expect(state().locale).toBe('en')
    expect(state().thumbnails.map((thumbnail) => thumbnail.name)).toEqual(['a', 'b'])
  })

  it('チェックと配置を別キーへ保存し、プロジェクト未保存扱いにはしない', async () => {
    state().setReady(true)
    stop = startAutoSave()
    const id = state().thumbnails[1].id
    state().toggleThumbnailPinned(id)
    state().setGridSettings({ axis: 'rows', count: 3 })
    await vi.advanceTimersByTimeAsync(400)
    expect(store.get('view:canvas')).toEqual({
      pinnedThumbnailIds: [id],
      gridSettings: { axis: 'rows', count: 3 },
    })
    expect(store.has('project:current')).toBe(false)
    expect(state().workspaceDirty).toBe(false)
    const project = buildProjectFile([])
    expect(project).not.toHaveProperty('pinnedThumbnailIds')
    expect(project).not.toHaveProperty('gridSettings')
  })

  it('ドキュメント復元後にチェックと配置を復元する', async () => {
    const id = state().thumbnails[1].id
    store.set('project:current', pickDocument(state()))
    store.set('view:canvas', {
      pinnedThumbnailIds: [id, 'missing'],
      gridSettings: { axis: 'rows', count: 2 },
    })
    state().loadProject({ folders: [], thumbnails: [] })
    stop = startAutoSave()
    await restoreWorkspace()
    expect(state().pinnedThumbnailIds).toEqual([id])
    expect(state().gridSettings).toEqual({ axis: 'rows', count: 2 })
    expect(state().ready).toBe(true)
    expect(state().workspaceDirty).toBe(false)
  })

  it('表示設定を持たない古い保存データでは既定表示にする', async () => {
    store.set('project:current', pickDocument(state()))
    await restoreWorkspace()
    expect(state().pinnedThumbnailIds).toEqual([])
    expect(state().gridSettings).toEqual(DEFAULT_GRID)
  })

  it('別プロジェクトを読み込むと保存済みチェックも解除する', async () => {
    state().setReady(true)
    stop = startAutoSave()
    state().toggleThumbnailPinned(state().thumbnails[0].id)
    state().setGridSettings({ axis: 'rows', count: 3 })
    await vi.advanceTimersByTimeAsync(400)
    state().loadProject({ folders: [], thumbnails: [createThumbnail('別プロジェクト')] })
    await vi.advanceTimersByTimeAsync(400)
    expect(store.get('view:canvas')).toEqual({
      pinnedThumbnailIds: [],
      gridSettings: { axis: 'rows', count: 3 },
    })
  })
})
