/**
 * 字形のアルファ画像を円形に広げる。輪郭線をオフセットしないため、小さな穴でも自己交差しない。
 * 距離変換は縦横の二段階で行い、縁の太さに関係なく画素数に比例する計算量にする。
 * @param rgba 元の字形のRGBA画素。アルファだけを書き換える
 * @param width 画像の幅（物理px）
 * @param height 画像の高さ（物理px）
 * @param radius 字形から広げる距離（物理px）
 */
export function expandTextAlpha(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
) {
  if (radius <= 0) return
  const distance = new Float64Array(width * height)
  const far = (width + height + radius + 1) ** 2
  let hasInk = false
  for (let i = 0; i < distance.length; i++) {
    const alpha = rgba[i * 4 + 3] / 255
    // 半透明の境界は画素中心からの距離として扱い、二値化による段差を抑える。
    distance[i] = alpha > 0 ? Math.max(0, 0.5 - alpha) ** 2 : far
    hasInk ||= alpha > 0
  }
  if (!hasInk) return
  const length = Math.max(width, height)
  const input = new Float64Array(length)
  const sites = new Int32Array(length)
  const edges = new Float64Array(length + 1)
  const transform = (start: number, step: number, count: number) => {
    for (let i = 0; i < count; i++) input[i] = distance[start + i * step]
    let last = 0
    sites[0] = 0
    edges[0] = -Infinity
    edges[1] = Infinity
    for (let q = 1; q < count; q++) {
      let intersection: number
      do {
        const p = sites[last]
        intersection = (input[q] + q * q - input[p] - p * p) / (2 * (q - p))
        if (intersection > edges[last]) break
        last--
      } while (last >= 0)
      sites[++last] = q
      edges[last] = intersection
      edges[last + 1] = Infinity
    }
    last = 0
    for (let q = 0; q < count; q++) {
      while (edges[last + 1] < q) last++
      const p = sites[last]
      distance[start + q * step] = (q - p) ** 2 + input[p]
    }
  }
  for (let x = 0; x < width; x++) transform(x, width, height)
  for (let y = 0; y < height; y++) transform(y * width, 1, width)
  for (let i = 0; i < distance.length; i++) {
    rgba[i * 4 + 3] = Math.max(
      rgba[i * 4 + 3],
      Math.min(1, Math.max(0, radius + 0.5 - Math.sqrt(distance[i]))) * 255,
    )
  }
}
