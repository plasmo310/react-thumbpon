import { t } from '@/shared/lib/i18n'
/**
 * 保存先に選んだフォルダに別のプロジェクトがあるとき、上書きしてよいかを聞く。
 *
 * 取り消せない操作なので必ず確認を挟むが、ダイアログは feature の入口だけに置き、
 * projectFolder.ts 側はブラウザAPIに触らせない（DOM 無しでテストできるようにするため）。
 *
 * @param folderName 保存先に選ばれたフォルダの名前
 * @returns 上書きしてよければ true
 */
export const confirmFolderOverwrite = (folderName: string): boolean =>
  window.confirm(
    t('「{0}」には別のプロジェクトがあります。今のプロジェクトで置き換えますか？\n', folderName) +
      t('（今のプロジェクトが使っていない素材ファイルは削除されます）'),
  )
