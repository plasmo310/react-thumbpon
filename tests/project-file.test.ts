import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/lib/storage/assetRepo', () => import('./helpers/fakeAssetRepo'))
// 読み込み後にワークスペースを切り離すので、フォルダ側もメモリ実装に差し替える
vi.mock('@/shared/lib/storage/fsAccess', () => import('./helpers/fakeFs'))
vi.mock('@/features/project/lib/download', () => ({
  downloadBlob: (blob: Blob, filename: string) => {
    downloaded = { blob, filename }
  },
  downloadDataUrl: () => {},
}))

import { zipSync, strToU8, unzipSync } from 'fflate'
import { blobs, resetAssets, seedAsset } from './helpers/fakeAssetRepo'
import { fake, makeDir, resetFake } from './helpers/fakeFs'
import { exportProjectFile, importProjectFile } from '@/features/project/lib/projectFile'
import { useEditorStore } from '@/app/store'
import type { AssetMeta } from '@/domain/asset'
import { DEFAULT_BACKGROUND } from '@/domain/background'
import { DEFAULT_EFFECTS } from '@/domain/effects'
import { BUILTIN_FONTS } from '@/domain/font'
import type { TextLayer } from '@/domain/layer'
import type { Thumbnail } from '@/domain/thumbnail'

let downloaded: { blob: Blob; filename: string } | null = null

const meta = (id: string, folderId: string | null = null): AssetMeta => ({
  id,
  name: `${id}.png`,
  mime: 'image/png',
  width: 10,
  height: 10,
  createdAt: 0,
  folderId,
})

const textLayer = (fontFamily: string): TextLayer => ({
  id: 'tx1',
  name: 'text',
  type: 'text',
  x: 0,
  y: 0,
  width: 100,
  rotation: 0,
  opacity: 1,
  visible: true,
  locked: false,
  effects: DEFAULT_EFFECTS,
  text: 'あ',
  fontFamily,
  fontSize: 40,
  fontWeight: 400,
  fontStyle: 'normal',
  textAlign: 'left',
  letterSpacing: 0,
  lineHeight: 1.2,
  color: '#000000',
  strokeWidth: 0,
  strokeColor: '#ffffff',
})

const thumbnail = (layers: Thumbnail['layers']): Thumbnail => ({
  id: 'th1',
  name: 'サムネイル 1',
  folderId: null,
  canvas: { width: 1920, height: 1080 },
  background: DEFAULT_BACKGROUND,
  layers,
})

/** ZIP のバイト列を、読み込み側に渡せる File にする */
const zipped2 = (bytes: Uint8Array) => new File([bytes as BlobPart], 'x.thumbpon.zip')

/** エントリの組から、読み込み側に渡せる ZIP の File を作る */
const zipped = (entries: Record<string, Uint8Array>) => zipped2(zipSync(entries))

/** 書き出したものを、そのまま読み込み側に渡せる File にする */
async function exported(): Promise<File> {
  await exportProjectFile()
  if (!downloaded) throw new Error('書き出されていません')
  return new File([downloaded.blob], downloaded.filename)
}

beforeEach(() => {
  resetAssets()
  resetFake()
  downloaded = null
  useEditorStore.setState({
    folders: [],
    thumbnails: [thumbnail([])],
    currentThumbnailId: 'th1',
    assets: [],
    assetFolders: [],
    fonts: BUILTIN_FONTS,
    missingFontLabels: [],
    workspaceFileName: null,
    workspaceFolderName: null,
  })
})

describe('exportProjectFile', () => {
  it('拡張子 .thumbpon.zip の ZIP として書き出す', async () => {
    await exportProjectFile()
    expect(downloaded?.filename).toMatch(/^thumbpon-\d{4}-\d{2}-\d{2}\.thumbpon\.zip$/)
    const head = new Uint8Array(await (downloaded as { blob: Blob }).blob.arrayBuffer())
    expect([head[0], head[1]]).toEqual([0x50, 0x4b])
  })

  it('フォルダに接続していれば、その名前で書き出す', async () => {
    // フォルダとZIPで別の名前になると、同じプロジェクトだと分からなくなる
    useEditorStore.setState({ workspaceFileName: '夜景シリーズ.thumbpon' })
    await exportProjectFile()
    expect(downloaded?.filename).toBe('夜景シリーズ.thumbpon.zip')
    expect(
      Object.keys(unzipSync(new Uint8Array(await (await exported()).arrayBuffer()))),
    ).toContain('夜景シリーズ.thumbpon')
  })

  it('実体を失った素材は書き出さない', async () => {
    // メタだけ残っていても復元できないので落とす
    useEditorStore.setState({ assets: [meta('ghost')] })
    const file = await exported()
    useEditorStore.setState({ assets: [] })
    await importProjectFile(file)
    expect(useEditorStore.getState().assets).toEqual([])
  })
})

describe('往復', () => {
  it('サムネイルと素材が書き出し前の状態に戻る', async () => {
    useEditorStore.setState({
      folders: [{ id: 'f1', name: 'フォルダ 1', collapsed: false }],
      thumbnails: [{ ...thumbnail([textLayer('"Mine"')]), folderId: 'f1' }],
      assets: [meta('a1')],
    })
    seedAsset('a1', new Blob(['image-bytes']))

    const file = await exported()
    useEditorStore.setState({ folders: [], thumbnails: [thumbnail([])], assets: [] })
    resetAssets()

    await importProjectFile(file)

    const state = useEditorStore.getState()
    expect(state.folders.map((f) => f.id)).toEqual(['f1'])
    expect(state.thumbnails[0].layers.map((l) => l.id)).toEqual(['tx1'])
    expect(state.assets.map((a) => a.id)).toEqual(['a1'])
    expect(await (blobs.get('a1') as Blob).text()).toBe('image-bytes')
  })

  it('素材フォルダは ZIP の中でもフォルダ分けされ、そのまま戻る', async () => {
    useEditorStore.setState({
      assets: [meta('a1', 'f1')],
      assetFolders: [{ id: 'f1', name: '風景', collapsed: false }],
    })
    seedAsset('a1', new Blob(['image-bytes']))

    const file = await exported()
    const entries = unzipSync(new Uint8Array(await file.arrayBuffer()))
    expect(Object.keys(entries)).toContain('assets/風景/a1.png')

    useEditorStore.setState({ assets: [], assetFolders: [] })
    resetAssets()
    await importProjectFile(file)

    const state = useEditorStore.getState()
    expect(state.assetFolders.map((f) => f.name)).toEqual(['風景'])
    expect(state.assets[0].folderId).toBe('f1')
    expect(await (blobs.get('a1') as Blob).text()).toBe('image-bytes')
  })

  it('素材フォルダを持たない古いバージョンは、素材を未分類として読む', async () => {
    // 素材の実体はブラウザ内に残っているものが使われる
    seedAsset('a1', new Blob(['image-bytes']))
    const older = {
      format: 'thumbpon-project',
      version: 3,
      folders: [],
      thumbnails: [thumbnail([])],
      currentThumbnailId: 'th1',
      assets: [{ meta: { ...meta('a1'), folderId: 'gone' } }],
    }
    await importProjectFile(zipped({ 'old.thumbpon': strToU8(JSON.stringify(older)) }))

    const state = useEditorStore.getState()
    expect(state.assetFolders).toEqual([])
    expect(state.assets[0].folderId).toBeNull()
  })

  it('使用フォントは名前だけ引き継がれ、解決できないものが告知される', async () => {
    useEditorStore.setState({
      thumbnails: [thumbnail([textLayer('"Mine"')])],
      fonts: [
        ...BUILTIN_FONTS,
        { id: 'file:Mine', family: '"Mine"', label: 'Mine', source: 'file' },
      ],
    })

    const file = await exported()
    // フォントを持たない環境で開いた状況
    useEditorStore.setState({ fonts: BUILTIN_FONTS })
    await importProjectFile(file)

    expect(useEditorStore.getState().missingFontLabels).toEqual(['Mine'])
  })

  it('フォントが揃っていれば告知しない', async () => {
    const mine = { id: 'file:Mine', family: '"Mine"', label: 'Mine', source: 'file' as const }
    useEditorStore.setState({
      thumbnails: [thumbnail([textLayer('"Mine"')])],
      fonts: [...BUILTIN_FONTS, mine],
    })

    const file = await exported()
    await importProjectFile(file)

    expect(useEditorStore.getState().missingFontLabels).toEqual([])
  })
})

describe('importProjectFile', () => {
  it('読み込んだらワークスペースフォルダを切り離す', async () => {
    // 繋いだままだと、次の保存が前のフォルダを別プロジェクトの内容で上書きしてしまう
    const dir = makeDir('work')
    fake.current = dir
    fake.stored = dir
    useEditorStore.setState({ workspaceStatus: 'connected', workspaceFolderName: 'work' })

    await importProjectFile(await exported())

    expect(useEditorStore.getState().workspaceStatus).toBe('none')
    expect(fake.current).toBeNull()
    expect(fake.stored).toBeNull()
  })

  it('ZIP でないファイルは受け付けない', async () => {
    const file = new File([JSON.stringify({ hello: 'world' })], 'x.json')
    await expect(importProjectFile(file)).rejects.toThrow('サムネぽんのプロジェクトファイル')
  })

  it('フォルダごと圧縮して中が一段深くなった ZIP も読める', async () => {
    // OS の「フォルダを圧縮」は中身を「フォルダ名/」の下に入れる
    useEditorStore.setState({ assets: [meta('a1')] })
    seedAsset('a1', new Blob(['image-bytes']))
    const flat = unzipSync(new Uint8Array(await (await exported()).arrayBuffer()))
    const nested = zipSync(
      Object.fromEntries(Object.entries(flat).map(([name, bytes]) => [`work/${name}`, bytes])),
    )

    useEditorStore.setState({ assets: [] })
    resetAssets()
    await importProjectFile(zipped2(nested))

    expect(useEditorStore.getState().assets.map((a) => a.id)).toEqual(['a1'])
    expect(await (blobs.get('a1') as Blob).text()).toBe('image-bytes')
  })

  it('マニフェストの名前は何でもよい', async () => {
    const project = {
      format: 'thumbpon-project',
      version: 4,
      folders: [],
      thumbnails: [{ ...thumbnail([]), id: 'renamed' }],
      currentThumbnailId: 'renamed',
      assets: [],
    }
    await importProjectFile(zipped({ '夜景シリーズ.thumbpon': strToU8(JSON.stringify(project)) }))
    expect(useEditorStore.getState().thumbnails.map((t) => t.id)).toEqual(['renamed'])
  })

  it('マニフェストが無い ZIP は受け付けない', async () => {
    const zip = zipSync({ 'readme.txt': strToU8('hello') })
    await expect(importProjectFile(zipped2(zip))).rejects.toThrow(
      'サムネぽんのプロジェクトファイル',
    )
  })

  it('サムネぽん以外の JSON が入った ZIP は受け付けない', async () => {
    const zip = zipSync({ 'x.thumbpon': strToU8(JSON.stringify({ hello: 'world' })) })
    await expect(importProjectFile(zipped2(zip))).rejects.toThrow(
      'サムネぽんのプロジェクトファイル',
    )
  })

  it('fonts を持たない古いバージョンではフォントを告知しない', async () => {
    const older = {
      format: 'thumbpon-project',
      version: 1,
      folders: [],
      thumbnails: [thumbnail([textLayer('"Gone"')])],
      currentThumbnailId: 'th1',
      assets: [],
    }
    await importProjectFile(zipped({ 'old.thumbpon': strToU8(JSON.stringify(older)) }))
    expect(useEditorStore.getState().missingFontLabels).toEqual([])
  })
})
