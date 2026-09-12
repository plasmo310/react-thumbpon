/**
 * ブラウザにファイルとして保存させる。
 *
 * @param href     保存対象。objectURL でも dataURL でもよい
 * @param filename 拡張子まで含めた保存名
 */
function clickDownloadLink(href: string, filename: string): void {
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  link.click()
}

/**
 * Blob をファイルとして保存させる。
 *
 * @param blob     保存する中身
 * @param filename 拡張子まで含めた保存名
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  try {
    clickDownloadLink(url, filename)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * dataURL をファイルとして保存させる。
 *
 * @param dataUrl  保存する中身
 * @param filename 拡張子まで含めた保存名
 */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  clickDownloadLink(dataUrl, filename)
}
