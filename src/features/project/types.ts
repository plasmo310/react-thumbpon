import type { AssetMeta } from '@/domain/asset'

/** 書き出し前に集めた素材。path は ZIP のエントリ名にもフォルダ内のパスにもそのまま使う */
export type AssetPayload = { meta: AssetMeta; blob: Blob; path: string }
