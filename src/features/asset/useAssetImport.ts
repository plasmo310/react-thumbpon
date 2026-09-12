import { useEditorStore } from '@/app/store'
import { notifyError } from '@/shared/lib/notify'

/**
 * 画像ファイルを素材に取り込む操作。
 * 素材パネルと各フォルダのドロップ領域から同じ手順で呼ぶので、ここにまとめている。
 *
 * @returns importFiles は取り込み先のフォルダ（null で未分類）を指定して呼ぶ。
 *          画像が1つも無ければその場で知らせるので、呼び出し側は結果を見なくてよい
 */
export function useAssetImport() {
  const addAssetFiles = useEditorStore((s) => s.addAssetFiles)

  const importFiles = async (files: FileList | File[], folderId: string | null) => {
    const list = Array.from(files)
    if (list.length === 0) return
    try {
      const added = await addAssetFiles(list, folderId)
      if (added.length === 0) {
        window.alert('画像ファイル（PNG / JPEG / WebP / SVG）を選んでください')
      }
    } catch (error) {
      notifyError('素材の追加に失敗しました', error)
    }
  }

  return { importFiles }
}
