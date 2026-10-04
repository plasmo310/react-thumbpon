// README 用スクリーンショットを撮る。
//
// 事前準備: 開発サーバーを起動しておく（npm run dev）。
//           Playwright は依存に入れていないので、別途用意する。
//           例: npm i --no-save playwright && npx playwright install chromium
// 実行:     node scripts/capture-readme.mjs
//
// samples/readme-sample（ワークスペースフォルダ形式）を素材にする。
// フォルダ選択ダイアログは自動操作できないため、一時的に ZIP へ固めて「インポート」から読み込む。
import { chromium } from 'playwright'
import { zipSync } from 'fflate'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const SAMPLE = join(ROOT, 'samples/readme-sample')
const OUT = join(ROOT, 'docs/readme')
const URL = process.env.THUMBPON_URL ?? 'http://localhost:5173/'

const manifest = JSON.parse(readFileSync(join(SAMPLE, 'readme-sample.thumbpon'), 'utf8'))
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
      readFileSync(join(SAMPLE, file)),
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

const shot = async (name, target = page) => {
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(Array.from(document.images, (image) => image.decode().catch(() => {})))
  })
  await target.screenshot({ path: join(OUT, name) })
}
const settle = () => page.waitForTimeout(300)
const tiles = page.locator('button[title*="クリックで中央に配置"]')

const captureUrl = new globalThis.URL(URL)
captureUrl.searchParams.set('lang', 'ja')
await page.goto(captureUrl.href)
await page.getByText('サムネぽん！').waitFor()
await settle()

// 基本1: 空のサムネイル
await shot('03_usage_step1_thumbnail.png')

// 基本2: 素材を追加
await page.setInputFiles('input[type=file][accept*="image/png"]', sampleAssets)
await settle()
await shot('04_usage_step2_assets.png')

// 基本3: 画像を配置して選択枠を出す
await tiles.last().click()
await settle()
await shot('05_usage_step3_layout.png')

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
await shot('06_usage_step4_export.png', page.locator('header').first())

await selectLayer(imageLayer.name)
await page.getByRole('button', { name: '枠で調整' }).click()
await settle()
await shot('07_detail_crop.png')
await page.getByRole('button', { name: '調整を終える' }).click()

// 選択中の行をもう一度押すとプロパティ欄が畳まれ、一覧全体が見える
await selectLayer(shapeLayer.name)
await selectLayer(shapeLayer.name)
await shot('08_detail_layers.png')

await selectLayer(textLayer.name)
// 長いプロパティ欄をスクロールし、内容と書式の設定を撮影範囲に収める。
await page
  .locator('[data-text-properties]')
  .getByRole('textbox', { name: 'テキスト編集' })
  .evaluate((input) => input.parentElement.parentElement.scrollIntoView({ block: 'start' }))
await shot('09_detail_content.png')

await page.locator('button').filter({ hasText: '背景' }).first().click()
await settle()
await shot('10_detail_background.png')

await page.getByRole('button', { name: 'プロジェクト', exact: true }).click()
await page.waitForTimeout(250)
await shot('11_detail_project.png')

await browser.close()
console.log('DONE')
