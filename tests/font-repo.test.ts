import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('idb-keyval', () => import('./helpers/fakeKv'))

const { queryLocalFonts } = await import('@/shared/lib/storage/fontRepo')

/** テスト環境は node なので、queryLocalFonts を持つ window だけを差し込む */
function stubWindow(query: () => Promise<unknown>) {
  vi.stubGlobal('window', { queryLocalFonts: query })
}

describe('queryLocalFonts', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('family で重複を除き、名前順に返す', async () => {
    stubWindow(async () => [
      { family: 'B', fullName: 'B Bold', postscriptName: 'B-Bold' },
      { family: 'A', fullName: 'A', postscriptName: 'A' },
      { family: 'B', fullName: 'B', postscriptName: 'B' },
    ])
    const fonts = await queryLocalFonts()
    expect(fonts.map((f) => f.label)).toEqual(['A', 'B'])
    expect(fonts[0]).toMatchObject({ id: 'local:A', family: '"A"', source: 'local' })
  })

  it.each(['NotAllowedError', 'SecurityError'])(
    '%s のときは許可のしかたを案内する',
    async (name) => {
      stubWindow(async () => {
        throw new DOMException('Permission denied.', name)
      })
      await expect(queryLocalFonts()).rejects.toThrow('「フォント」を「許可」')
    },
  )

  it('権限以外のエラーはそのまま投げる', async () => {
    stubWindow(async () => {
      throw new Error('boom')
    })
    await expect(queryLocalFonts()).rejects.toThrow('boom')
  })
})
