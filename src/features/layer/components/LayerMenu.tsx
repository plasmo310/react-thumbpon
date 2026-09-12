import { useCurrentThumbnail, useEditorStore } from '@/app/store'
import { ContextMenu, type ContextMenuItem } from '@/shared/ui'

/**
 * レイヤーの右クリックメニュー。
 *
 * レイヤー一覧（layer）とキャンバス（canvas）の両方から同じメニューを出すが、
 * 中身はレイヤーの操作しかないので layer が持つ。開く側は
 * 「どのレイヤーをどこで右クリックしたか」を `openLayerMenu` でストアに伝えるだけなので、
 * canvas からこの feature を import せずに済む。描くのは App が1つだけ。
 */
export function LayerMenu() {
  const { layers } = useCurrentThumbnail()
  const menu = useEditorStore((s) => s.layerMenu)
  const closeLayerMenu = useEditorStore((s) => s.closeLayerMenu)
  const updateLayer = useEditorStore((s) => s.updateLayer)
  const removeLayer = useEditorStore((s) => s.removeLayer)
  const duplicateLayer = useEditorStore((s) => s.duplicateLayer)
  const moveLayer = useEditorStore((s) => s.moveLayer)
  const setCropping = useEditorStore((s) => s.setCropping)

  const index = menu ? layers.findIndex((l) => l.id === menu.layerId) : -1
  // サムネイルを切り替えた直後など、対象が今の一覧に無ければ出さない
  if (!menu || index < 0) return null

  const layer = layers[index]
  const isFront = index === layers.length - 1
  const isBack = index === 0

  /** 反転とクロップは画像だけの操作なので、テキストでは出さない */
  const imageItems: ContextMenuItem[] =
    layer.type === 'image'
      ? [
          {
            label: layer.flipX ? '左右反転を戻す' : '左右反転',
            onSelect: () => updateLayer(layer.id, { flipX: !layer.flipX }),
          },
          { label: 'クロップを調整', onSelect: () => setCropping(true) },
        ]
      : []

  /*
   * 一覧は配列順に上から並べるので、下にあるものが前面。
   * 「前面へ」は一覧では下に動くため、矢印ではなく言葉で出す。
   */
  const items: ContextMenuItem[] = [
    { label: '最前面へ移動', onSelect: () => moveLayer(layer.id, 'front'), disabled: isFront },
    { label: '前面へ移動', onSelect: () => moveLayer(layer.id, 'forward'), disabled: isFront },
    { label: '背面へ移動', onSelect: () => moveLayer(layer.id, 'backward'), disabled: isBack },
    { label: '最背面へ移動', onSelect: () => moveLayer(layer.id, 'back'), disabled: isBack },
    { label: '複製', onSelect: () => duplicateLayer(layer.id), separated: true },
    {
      label: layer.visible ? '非表示にする' : '表示する',
      onSelect: () => updateLayer(layer.id, { visible: !layer.visible }),
    },
    {
      label: layer.locked ? 'ロックを解除' : 'ロック',
      onSelect: () => updateLayer(layer.id, { locked: !layer.locked }),
    },
    ...imageItems,
    { label: '削除', onSelect: () => removeLayer(layer.id), separated: true },
  ]

  return <ContextMenu items={items} x={menu.x} y={menu.y} onClose={closeLayerMenu} />
}
