import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@/shared/lib/storage/assetRepo', () => import('./helpers/fakeAssetRepo'))

import { createImageLayer } from '@/domain/layer'
import { createThumbnail } from '@/domain/thumbnail'
import { LayerView } from '@/features/canvas/components/LayerView'
import { LayerProperties } from '@/features/layer/components/LayerProperties'

const image = () => createImageLayer('画像', 'a1', { x: 10, y: 20, width: 200, height: 100 })

describe('画像のオーバーレイマスク描画', () => {
  it('新規画像にはマスクを描かず、設定欄はチェックだけ表示する', () => {
    const layer = image()
    const canvas = renderToStaticMarkup(
      createElement(LayerView, { layer, thumbnail: createThumbnail('確認'), scale: 1 }),
    )
    expect(canvas).toContain('<img')
    expect(canvas).not.toContain('aria-hidden="true"')
    const properties = renderToStaticMarkup(createElement(LayerProperties, { layer }))
    expect(properties).toContain('オーバーレイマスク')
    expect(properties.indexOf('オーバーレイマスク')).toBeGreaterThan(
      properties.indexOf('エフェクト'),
    )
    expect(properties).not.toContain('マスクの色')
  })

  it.each([0, 0.5, 1])('クロップ・反転後の枠内に不透明度%sのマスクを重ねる', (opacity) => {
    const layer = {
      ...image(),
      crop: { top: 0.1, right: 0.2, bottom: 0.1, left: 0.2 },
      flipX: true,
      overlayEnabled: true,
      overlayColor: '#123456',
      overlayOpacity: opacity,
    }
    const canvas = renderToStaticMarkup(
      createElement(LayerView, { layer, thumbnail: createThumbnail('確認'), scale: 0.5 }),
    )
    expect(canvas).toContain('overflow:hidden')
    expect(canvas).toContain('transform:scaleX(-1)')
    expect(canvas).toMatch(
      new RegExp(
        `<img[^>]+/><div aria-hidden="true" style="position:absolute;inset:0;background-color:#123456;opacity:${opacity};pointer-events:none"></div>`,
      ),
    )
    const properties = renderToStaticMarkup(createElement(LayerProperties, { layer }))
    expect(properties).toContain('マスクの色')
    expect(properties).toContain(`${Math.round(opacity * 100)}%`)
  })
})
