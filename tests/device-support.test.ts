import { describe, expect, it } from 'vitest'
import { isUnsupportedDevice } from '@/app/config/deviceSupport'

describe('isUnsupportedDevice', () => {
  it('PC is supported regardless of viewport width', () => {
    expect(
      isUnsupportedDevice({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        platform: 'Win32',
        maxTouchPoints: 0,
      }),
    ).toBe(false)
  })

  it.each([
    {
      userAgent:
        'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
      platform: 'iPad',
      maxTouchPoints: 5,
    },
    {
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',
      platform: 'MacIntel',
      maxTouchPoints: 5,
    },
    {
      userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel Tablet) AppleWebKit/537.36 Chrome/140.0',
      platform: 'Linux armv81',
      maxTouchPoints: 5,
    },
  ])('phone and tablet are unsupported', (device) => {
    expect(isUnsupportedDevice(device)).toBe(true)
  })
})
