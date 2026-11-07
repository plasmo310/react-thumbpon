// README 用スクリーンショットを撮る。
//
// 事前準備: 開発サーバーを起動しておく（npm run dev）。
//           Playwright は依存に入れていないので、別途用意する。
//           例: npm i --no-save playwright && npx playwright install chromium
// 実行:     node scripts/capture-readme.mjs [--lang=ja|en]
//
// samples/readme-sample（ワークスペースフォルダ形式）を素材にする。
// フォルダ選択ダイアログは自動操作できないため、一時的に ZIP へ固めて「インポート」から読み込む。
import { chromium } from 'playwright'
import { zipSync } from 'fflate'
import { mkdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const SAMPLE = join(ROOT, 'samples/readme-sample')
const language = process.argv.find((arg) => arg.startsWith('--lang='))?.split('=')[1] ?? 'ja'
if (!['ja', 'en'].includes(language)) throw new Error('--lang must be ja or en')
const OUT = join(ROOT, language === 'en' ? 'docs/readme/en' : 'docs/readme')
mkdirSync(OUT, { recursive: true })
const URL = process.env.THUMBPON_URL ?? 'http://localhost:5173/'
const labels =
  language === 'en'
    ? {
        app: 'ThumbPon!',
        asset: 'click to place in the center',
        crop: 'Adjust frame',
        finishCrop: 'Finish cropping',
        text: 'Edit text',
        background: 'Background',
        project: 'Project',
      }
    : {
        app: 'サムネぽん！',
        asset: 'クリックで中央に配置',
        crop: '枠で調整',
        finishCrop: '調整を終える',
        text: 'テキスト編集',
        background: '背景',
        project: 'プロジェクト',
      }

const manifest = JSON.parse(readFileSync(join(SAMPLE, 'readme-sample.thumbpon'), 'utf8'))
// 撮影用コピーの既定名だけを英語にし、元のサンプルは保持する。
if (language === 'en') {
  for (const thumbnail of manifest.thumbnails) {
    thumbnail.name = thumbnail.name.replace(/^サムネイル (\d+)$/, 'Thumbnail $1')
  }
}
const sampleAssets = manifest.assets.map(({ meta, file }) => ({
  name: meta.name,
  mimeType: meta.mime,
  buffer: readFileSync(join(SAMPLE, file)),
}))

// OS 固有の ZIP コマンドを使わず、サンプルに含まれる素材だけをまとめる。
const sampleZip = zipSync(
  Object.fromEntries(
    ['readme-sample.thumbpon', ...manifest.assets.map(({ file }) => file)].map((file) => [
      file,
      file === 'readme-sample.thumbpon'
        ? Buffer.from(JSON.stringify(manifest))
        : readFileSync(join(SAMPLE, file)),
    ]),
  ),
)
const thumbnail = manifest.thumbnails.find(({ id }) => id === manifest.currentThumbnailId)
const imageLayer = thumbnail.layers.findLast(({ type }) => type === 'image')
const shapeLayer = thumbnail.layers.find(({ type }) => type === 'shape')
const textLayer = thumbnail.layers.find(({ type }) => type === 'text')

const browser = await chromium.launch({ channel: process.env.THUMBPON_BROWSER_CHANNEL })
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message))
page.on('dialog', (dialog) => dialog.accept())

// 領域名 → 切り抜く要素。全画面ではなく、説明したい部分だけを撮る。
const regions = {
  thumbnails: () => document.querySelector('aside').children[0],
  layers: () => document.querySelector('aside').children[2],
  assets: () => document.querySelector('aside').children[4],
  canvas: () => document.querySelector('aside').parentElement.lastElementChild,
}
const clipOf = (name, pad = 0) =>
  page.evaluate(
    ([source, margin]) => {
      const rect = new Function(`return (${source})()`)().getBoundingClientRect()
      const x = Math.max(0, rect.x - margin)
      const y = Math.max(0, rect.y - margin)
      return {
        x,
        y,
        width: Math.min(innerWidth - x, rect.width + margin * 2),
        height: Math.min(innerHeight - y, rect.height + margin * 2),
      }
    },
    [regions[name].toString(), pad],
  )
// region: 領域名（省略は全画面）。clip: 直接指定する範囲。
const shot = async (name, { region, clip } = {}) => {
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(Array.from(document.images, (image) => image.decode().catch(() => {})))
  })
  const area = clip ?? (region ? await clipOf(region) : undefined)
  await page.screenshot({ path: join(OUT, name), clip: area })
}
// 1920×1080 のアートボード（表示 54%）とその周囲だけを切り抜く。
const ARTBOARD = { x: 356, y: 180, width: 1072, height: 620 }
const settle = () => page.waitForTimeout(300)
const tiles = page.locator(`button[title*="${labels.asset}"]`)

const captureUrl = new globalThis.URL(URL)
captureUrl.searchParams.set('lang', language)
await page.goto(captureUrl.href)
await page.getByText(labels.app, { exact: true }).waitFor()
await settle()

// 基本1: 空のサムネイル
await shot('03_usage_step1_thumbnail.png', { region: 'thumbnails' })

// 基本2: 素材を追加
await page.setInputFiles('input[type=file][accept*="image/png"]', sampleAssets)
await settle()
await shot('04_usage_step2_assets.png', { region: 'assets' })

// 基本3: 画像を配置して選択枠を出す
await tiles.last().click()
await settle()
await shot('05_usage_step3_layout.png', { clip: ARTBOARD })

// ここからは完成したサンプルを読み込んで撮る
await page.setInputFiles('input[type=file][accept*=".zip"]', {
  name: 'readme-sample.thumbpon.zip',
  mimeType: 'application/zip',
  buffer: Buffer.from(sampleZip),
})
await page.locator('[role="button"]').filter({ hasText: textLayer.name }).first().waitFor()
await settle()

const selectLayer = async (name) => {
  await page
    .locator('[role="button"]')
    .filter({ has: page.getByTitle(name, { exact: true }) })
    .click()
  await page.waitForTimeout(400)
}
const deselect = async () => {
  await page.mouse.click(900, 850)
  await settle()
}

await deselect()
await shot('01_thumbpon_ui.png')
await shot('06_usage_step4_export.png', { clip: { x: 1000, y: 0, width: 440, height: 56 } })

await selectLayer(imageLayer.name)
await page.getByRole('button', { name: labels.crop }).click()
await settle()
await shot('07_detail_crop.png', { clip: ARTBOARD })
await page.getByRole('button', { name: labels.finishCrop }).click()

// 選択中の行をもう一度押すとプロパティ欄が畳まれ、一覧全体が見える
await selectLayer(shapeLayer.name)
await selectLayer(shapeLayer.name)
await shot('08_detail_layers.png', { region: 'layers' })

await selectLayer(textLayer.name)
// 長いプロパティ欄をスクロールし、内容と書式の設定を撮影範囲に収める。
await page
  .locator('[data-text-properties]')
  .getByRole('textbox', { name: labels.text })
  .evaluate((input) => input.parentElement.parentElement.scrollIntoView({ block: 'start' }))
await shot('09_detail_content.png', { region: 'layers' })

await page.getByRole('button', { name: `BG ${labels.background}`, exact: true }).click()
await settle()
await shot('10_detail_background.png', { region: 'layers' })

await page.getByRole('button', { name: labels.project, exact: true }).click()
await page.waitForTimeout(250)
await shot('11_detail_project.png', { clip: { x: 1040, y: 0, width: 400, height: 280 } })

await browser.close()
console.log('DONE')
