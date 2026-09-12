/** ドラッグ中に挿入位置を示す線を、どの行のどちら側に出すか */
export type DropMark = { index: number; position: 'before' | 'after' } | null
