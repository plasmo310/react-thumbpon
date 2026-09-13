type DeviceInfo = Pick<Navigator, 'platform' | 'userAgent' | 'maxTouchPoints'>

/**
 * モバイル・タブレット端末を判定する。
 *
 * iPadOS はデスクトップ表示時に Mac の User-Agent を返すため、
 * `MacIntel` とタッチポイント数の組み合わせでも判定する。
 *
 * @param device ブラウザーが公開する端末情報
 */
export function isUnsupportedDevice(device: DeviceInfo): boolean {
  const { platform, userAgent, maxTouchPoints } = device
  return (
    /Android|iPhone|iPad|iPod/i.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1)
  )
}
