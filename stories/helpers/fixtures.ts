import { DEFAULT_BACKGROUND, type Background } from '@/domain/background'
import { DEFAULT_CROP } from '@/domain/crop'
import { DEFAULT_EFFECTS, type Effects } from '@/domain/effects'
import { BUILTIN_FONTS } from '@/domain/font'
import type { ImageLayer, TextLayer } from '@/domain/layer'
import type { BackgroundPreset, TextPreset } from '@/domain/preset'
import type { Folder, Thumbnail } from '@/domain/thumbnail'
import { SAMPLE_LOGO_ID, SAMPLE_PHOTO_ID } from './sampleAssets'

/*
 * ストーリー用の作りかけのプロジェクト。
 *
 * id は createId() ではなく決め打ちにする。ストーリーから「このレイヤーを選択した状態」を
 * 名指しで作れるようにし、再読み込みしても同じ見た目になるようにするため。
 */

export const SAMPLE_TEXT_LAYER_ID = 'layer-title'
export const SAMPLE_IMAGE_LAYER_ID = 'layer-photo'
export const SAMPLE_FOLDER_ID = 'folder-series'

/** 影と光彩を両方効かせた値。エフェクト欄が開いた状態を見るために使う */
export const SAMPLE_EFFECTS: Effects = {
  ...DEFAULT_EFFECTS,
  blur: 0,
  shadowEnabled: true,
  shadowX: 8,
  shadowY: 8,
  shadowBlur: 12,
  glowEnabled: true,
  glowBlur: 18,
}

/** グラデーションに水玉を重ねない、絵柄を持つ背景。エフェクト欄が出る状態 */
export const SAMPLE_GRADIENT_BACKGROUND: Background = {
  ...DEFAULT_BACKGROUND,
  type: 'gradient',
  gradientFrom: '#FF8A5B',
  gradientTo: '#5BC8FF',
  gradientAngle: 120,
}

/**
 * 見出しのテキストレイヤー。
 *
 * @param overrides 上書きしたい項目だけ
 */
export function sampleTextLayer(overrides: Partial<TextLayer> = {}): TextLayer {
  return {
    id: SAMPLE_TEXT_LAYER_ID,
    type: 'text',
    name: '見出し',
    x: 160,
    y: 620,
    width: 1600,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    effects: { ...SAMPLE_EFFECTS },
    text: 'サムネイルを\n量産する',
    fontFamily: BUILTIN_FONTS[0].family,
    fontSize: 140,
    fontWeight: 900,
    fontStyle: 'normal',
    textAlign: 'center',
    letterSpacing: 0,
    lineHeight: 1.2,
    color: '#25282D',
    strokeWidth: 8,
    strokeColor: '#FFFFFF',
    ...overrides,
  }
}

/**
 * 素材を貼った画像レイヤー。
 *
 * @param overrides 上書きしたい項目だけ
 */
export function sampleImageLayer(overrides: Partial<ImageLayer> = {}): ImageLayer {
  return {
    id: SAMPLE_IMAGE_LAYER_ID,
    type: 'image',
    name: '写真',
    x: 200,
    y: 120,
    width: 640,
    height: 360,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    effects: { ...DEFAULT_EFFECTS },
    assetId: SAMPLE_PHOTO_ID,
    crop: { ...DEFAULT_CROP },
    flipX: false,
    ...overrides,
  }
}

/** 編集中のサムネイル。画像とテキストが1枚ずつ載っている */
export function sampleThumbnail(): Thumbnail {
  return {
    id: 'thumb-main',
    name: '第1回 オープニング',
    folderId: null,
    canvas: { width: 1920, height: 1080 },
    background: { ...SAMPLE_GRADIENT_BACKGROUND },
    layers: [sampleImageLayer(), sampleTextLayer()],
  }
}

/** 未分類2枚 + フォルダ内2枚。一覧の入れ子とフォルダの畳みを見るための組み合わせ */
export function sampleThumbnails(): Thumbnail[] {
  const main = sampleThumbnail()
  return [
    main,
    {
      ...main,
      id: 'thumb-draft',
      name: '第2回 ゲスト回',
      layers: [sampleTextLayer({ id: 'layer-title-2', text: 'ゲスト回' })],
    },
    {
      ...main,
      id: 'thumb-series-1',
      name: '入門編 #1',
      folderId: SAMPLE_FOLDER_ID,
      canvas: { width: 800, height: 600 },
      layers: [],
    },
    {
      ...main,
      id: 'thumb-series-2',
      name: '入門編 #2',
      folderId: SAMPLE_FOLDER_ID,
      layers: [],
    },
  ]
}

export function sampleFolders(): Folder[] {
  return [{ id: SAMPLE_FOLDER_ID, name: '入門シリーズ', collapsed: false }]
}

export function sampleTextPresets(): TextPreset[] {
  return [
    {
      id: 'preset-title',
      name: '太字タイトル',
      style: {
        fontFamily: BUILTIN_FONTS[0].family,
        fontSize: 140,
        fontWeight: 900,
        fontStyle: 'normal',
        textAlign: 'center',
        letterSpacing: 0,
        lineHeight: 1.2,
        color: '#25282D',
        strokeWidth: 8,
        strokeColor: '#FFFFFF',
      },
    },
    {
      id: 'preset-caption',
      name: '細めのキャプション',
      style: {
        fontFamily: BUILTIN_FONTS[2].family,
        fontSize: 64,
        fontWeight: 400,
        fontStyle: 'italic',
        textAlign: 'left',
        letterSpacing: 2,
        lineHeight: 1.4,
        color: '#7A8088',
        strokeWidth: 0,
        strokeColor: '#FFFFFF',
      },
    },
  ]
}

export function sampleBackgroundPresets(): BackgroundPreset[] {
  return [
    { id: 'bg-preset-gradient', name: '夕焼けグラデ', background: { ...SAMPLE_GRADIENT_BACKGROUND } },
    {
      id: 'bg-preset-dots',
      name: '水玉',
      background: { ...DEFAULT_BACKGROUND, type: 'pattern', color: '#FFF7F2' },
    },
  ]
}

export { SAMPLE_LOGO_ID, SAMPLE_PHOTO_ID }
