import type { AssetMeta } from '@/domain/asset'

/**
 * 保存する素材の参照。path は ZIP のエントリ名にもフォルダ内のパスにもそのまま使う。
 * 実体を持たないのは、コンテナ側に既にあるファイルをそのまま参照し続ける場合。
 */
export type AssetReference = { meta: AssetMeta; path: string }

/** 書き出し前に集めた素材。参照に実体を添えたもの */
export type AssetPayload = AssetReference & { blob: Blob }
