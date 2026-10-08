import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('html-to-image', () => ({ toBlob: vi.fn(async () => new Blob(['fake'])) }))
// フォント埋め込みは DOM と通信が前提のため、組み立て済みの CSS を返す偽物にする
vi.mock('@/features/project/lib/fontEmbed', () => ({
  buildFontEmbedCss: vi.fn(async () => '@font-face{}'),
}))
vi.mock('idb-keyval', () => import('./helpers/fakeKv'))

import { toBlob } from 'html-to-image'
import { exportPngs } from '@/features/project/lib/exportImage'
import { getSurface, setSurface } from '@/shared/lib/surfaceRef'
import { useEditorStore } from '@/app/store'
import { createThumbnail } from '@/domain/thumbnail'

afterEach(() => {
  for (const thumbnail of useEditorStore.getState().thumbnails) setSurface(thumbnail.id, null)
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('複数表示中のPNG書き出し', () => {
  it('他のCanvasの登録・解除に影響されず、編集対象の1枚を実寸で書き出す', async () => {
    const a = createThumbnail('横長', null, { width: 1920, height: 1080 })
    const b = createThumbnail('縦長', null, { width: 1080, height: 1920 })
    useEditorStore
      .getState()
      .loadProject({ folders: [], thumbnails: [a, b], currentThumbnailId: b.id })
    const first = { dataset: {} } as HTMLElement
    const second = { dataset: {} } as HTMLElement
    setSurface(a.id, first)
    setSurface(b.id, second)
    setSurface(a.id, null)
    expect(getSurface(b.id)).toBe(second)
    const link = { href: '', download: '', click: vi.fn() }
    vi.stubGlobal('document', { fonts: { ready: Promise.resolve() }, createElement: () => link })
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 0
    })
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:fake', revokeObjectURL: vi.fn() })
    await exportPngs([b])
    expect(toBlob).toHaveBeenLastCalledWith(
      second,
      expect.objectContaining({
        width: 1080,
        height: 1920,
        pixelRatio: 1,
        fontEmbedCSS: '@font-face{}',
        style: { transform: 'none', transformOrigin: 'top left' },
      }),
    )
    expect(link.download).toBe('縦長.png')
    expect(link.click).toHaveBeenCalledOnce()
  })

  it('表示中の全枚を表示順に実寸で書き出し、同名は連番で区別する', async () => {
    const a = createThumbnail('表紙', null, { width: 1920, height: 1080 })
    const b = createThumbnail('表紙', null, { width: 1080, height: 1920 })
    useEditorStore
      .getState()
      .loadProject({ folders: [], thumbnails: [a, b], currentThumbnailId: a.id })
    const first = { dataset: {} } as HTMLElement
    const second = { dataset: {} } as HTMLElement
    setSurface(a.id, first)
    setSurface(b.id, second)
    const downloads: string[] = []
    vi.stubGlobal('document', {
      fonts: { ready: Promise.resolve() },
      createElement: () => ({
        href: '',
        download: '',
        click() {
          downloads.push(this.download)
        },
      }),
    })
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 0
    })
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:fake', revokeObjectURL: vi.fn() })
    await exportPngs([a, b])
    expect(toBlob).toHaveBeenCalledWith(
      first,
      expect.objectContaining({ width: 1920, height: 1080 }),
    )
    expect(toBlob).toHaveBeenCalledWith(
      second,
      expect.objectContaining({ width: 1080, height: 1920 }),
    )
    expect(downloads).toEqual(['表紙.png', '表紙 (2).png'])
  })

  it('描画できない1枚があれば、どれも保存しない', async () => {
    const a = createThumbnail('表示中', null, { width: 1920, height: 1080 })
    const b = createThumbnail('未描画', null, { width: 1920, height: 1080 })
    useEditorStore
      .getState()
      .loadProject({ folders: [], thumbnails: [a, b], currentThumbnailId: a.id })
    setSurface(a.id, { dataset: {} } as HTMLElement)
    const click = vi.fn()
    vi.stubGlobal('document', {
      fonts: { ready: Promise.resolve() },
      createElement: () => ({ href: '', download: '', click }),
    })
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 0
    })
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:fake', revokeObjectURL: vi.fn() })
    await expect(exportPngs([a, b])).rejects.toThrow()
    expect(click).not.toHaveBeenCalled()
  })
})
