/**
 * 中身のあるフォルダを開くとき、現在の内容を捨ててよいかを聞く。
 *
 * 取り消せない操作なので必ず確認を挟むが、ダイアログは feature の入口だけに置き、
 * projectFolder.ts 側はブラウザAPIに触らせない（DOM 無しでテストできるようにするため）。
 *
 * @param folderName 読み込もうとしているフォルダの名前
 * @returns 読み込んでよければ true
 */
export const confirmFolderOverwrite = (folderName: string): boolean =>
  window.confirm(`「${folderName}」の内容を読み込みます。現在の内容は破棄されます。`)
