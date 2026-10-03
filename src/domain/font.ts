export type FontSource = 'builtin' | 'local' | 'file'

/** family は CSS にそのまま渡す値、label は画面に出す名前 */
export type FontEntry = { id: string; family: string; label: string; source: FontSource }

export const BUILTIN_FONTS: FontEntry[] = [
  { id: 'noto', family: '"Noto Sans JP", sans-serif', label: 'Noto Sans JP', source: 'builtin' },
  { id: 'mplus1p', family: '"M PLUS 1p", sans-serif', label: 'M PLUS 1p', source: 'builtin' },
  { id: 'mplus2', family: '"M PLUS 2", sans-serif', label: 'M PLUS 2', source: 'builtin' },
  { id: 'roboto', family: '"Roboto", sans-serif', label: 'Roboto', source: 'builtin' },
  {
    id: 'gothic',
    family: '"Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", sans-serif',
    label: 'ゴシック体',
    source: 'builtin',
  },
  {
    id: 'mincho',
    family: '"Hiragino Mincho ProN", "Yu Mincho", "MS Mincho", serif',
    label: '明朝体',
    source: 'builtin',
  },
  { id: 'system', family: 'system-ui, sans-serif', label: 'System UI', source: 'builtin' },
  {
    id: 'mono',
    family: 'ui-monospace, "Consolas", monospace',
    label: 'Monospace',
    source: 'builtin',
  },
]

export const FONT_WEIGHTS = [400, 700, 900]
