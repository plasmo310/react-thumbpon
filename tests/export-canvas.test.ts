import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('html-to-image', () => ({ toBlob: vi.fn(async () => new Blob(['fake'])) }))
// フォント埋め込みは DOM と通信が前提のため、組み立て済みの CSS を返す偽物にする
vi.mock('@/features/project/lib/fontEmbed', () => ({
  buildFontEmbedCss: vi.fn(async () => '@font-face{}'),
}))
vi.mock('idb-keyval', () => import('./helpers/fakeKv'))

import { toBlob } from 'html-to-image'
import { exportPng } from '@/features/project/lib/exportImage'
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
    await exportPng(b.canvas, b.name)
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
})
