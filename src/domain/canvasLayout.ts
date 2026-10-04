import type { Folder, Thumbnail } from './thumbnail'
import { DEFAULT_CANVAS } from './thumbnail'

/** グリッドで指定する方向と、その方向のセル数 */
export type GridSettings = { axis: 'columns' | 'rows'; count: number }

export const DEFAULT_GRID: GridSettings = { axis: 'columns', count: 2 }

/**
 * 保存値や数値入力を安全なグリッド設定に揃える。
 * @param value ブラウザ内の保存値、または入力中の値
 */
export function normalizeGrid(value: Partial<GridSettings> | null | undefined): GridSettings {
  return {
    axis: value?.axis === 'rows' ? 'rows' : 'columns',
    count:
      typeof value?.count === 'number' && Number.isFinite(value.count)
        ? Math.max(1, Math.floor(value.count))
        : DEFAULT_GRID.count,
  }
}

/**
 * 一覧順で、常時表示のサムネイルと編集中の1枚を取り出す。
 * @param thumbnails 全サムネイル
 * @param folders 一覧のフォルダ順
 * @param pinnedIds 常時表示のID
 * @param currentId 編集対象のID
 */
export function visibleThumbnails(
  thumbnails: Thumbnail[],
  folders: Folder[],
  pinnedIds: string[],
  currentId: string,
): Thumbnail[] {
  const visible = new Set([...pinnedIds, currentId])
  const ordered = [
    ...thumbnails.filter((t) => t.folderId === null),
    ...folders.flatMap((folder) => thumbnails.filter((t) => t.folderId === folder.id)),
    ...thumbnails.filter((t) => t.folderId !== null && !folders.some((f) => f.id === t.folderId)),
  ]
  return ordered.filter((t) => visible.has(t.id))
}

/**
 * 同じ大きさのセルに収める配置を、全体ズーム前の座標で計算する。
 * @param thumbnails 表示順のサムネイル
 * @param settings 行数か列数の指定
 */
export function canvasLayout(thumbnails: Thumbnail[], settings: GridSettings) {
  if (thumbnails.length === 1) {
    const thumbnail = thumbnails[0]
    return {
      ...thumbnail.canvas,
      rows: 1,
      columns: 1,
      cells: [
        {
          id: thumbnail.id,
          x: 0,
          y: 0,
          width: thumbnail.canvas.width,
          height: thumbnail.canvas.height,
          canvasX: 0,
          canvasY: 0,
          scale: 1,
        },
      ],
    }
  }
  const { axis, count } = normalizeGrid(settings)
  // 表示枚数を超える指定は保持しつつ、画面に不要な空の行・列は増やさない。
  const specified = Math.min(count, Math.max(1, thumbnails.length))
  const columns = axis === 'columns' ? specified : Math.ceil(thumbnails.length / specified)
  const rows = axis === 'rows' ? specified : Math.ceil(thumbnails.length / specified)
  const { width, height } = DEFAULT_CANVAS
  const gap = 128
  const labelHeight = 80
  return {
    width: columns * width + (columns - 1) * gap,
    height: rows * (height + labelHeight) + (rows - 1) * gap,
    rows,
    columns,
    cells: thumbnails.map((thumbnail, index) => {
      const scale = Math.min(width / thumbnail.canvas.width, height / thumbnail.canvas.height)
      const x = (index % columns) * (width + gap)
      const y = Math.floor(index / columns) * (height + labelHeight + gap)
      return {
        id: thumbnail.id,
        x,
        y,
        width,
        height: height + labelHeight,
        scale,
        canvasX: x + (width - thumbnail.canvas.width * scale) / 2,
        canvasY: y + labelHeight + (height - thumbnail.canvas.height * scale) / 2,
      }
    }),
  }
}
