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
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
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

const work = mkdtempSync(join(tmpdir(), 'thumbpon-sample-'))
const zipPath = join(work, 'readme-sample.thumbpon.zip')
execFileSync('zip', ['-qr', zipPath, '.'], { cwd: SAMPLE })

const browser = await chromium.launch()
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message))
page.on('dialog', (dialog) => dialog.accept())

const shot = (name, target = page) => target.screenshot({ path: join(OUT, name) })
const settle = () => page.waitForTimeout(300)
const tiles = page.locator('button[title*="クリックで中央に配置"]')

await page.goto(URL)
await page.getByText('サムネぽん！').waitFor()
await settle()

// 基本1: 空のサムネイル
await shot('03_usage_step1_thumbnail.png')

// 基本2: 素材を追加
await page.setInputFiles('input[type=file][accept*="image/png"]', sampleAssets)
await settle()
await shot('04_usage_step2_assets.png')

// 基本3: 画像を配置して選択枠を出す
await tiles.first().click()
await settle()
await shot('05_usage_step3_layout.png')

// ここからは完成したサンプルを読み込んで撮る
await page.setInputFiles('input[type=file][accept*=".zip"]', zipPath)
await page.getByText('night.png').first().waitFor()
await settle()

const selectLayer = async (name) => {
  await page.locator('[role="button"]').filter({ hasText: name }).first().click()
  await page.waitForTimeout(400)
}
const deselect = async () => {
  await page.mouse.click(900, 850)
  await settle()
}

await deselect()
await shot('01_thumbpon_ui.png')
await shot('06_usage_step4_export.png', page.locator('header').first())

await selectLayer('sky.png')
await page.getByRole('button', { name: '枠で調整' }).click()
await settle()
await shot('07_detail_crop.png')
await page.getByRole('button', { name: '調整を終える' }).click()

// 選択中の行をもう一度押すとプロパティ欄が畳まれ、一覧全体が見える
await selectLayer('四角形')
await selectLayer('四角形')
await shot('08_detail_layers.png')

await selectLayer('テキスト')
await shot('09_detail_content.png')

await page.locator('button').filter({ hasText: '背景' }).first().click()
await settle()
await shot('10_detail_background.png')

await page.getByRole('button', { name: 'プロジェクト', exact: true }).click()
await page.waitForTimeout(250)
await shot('11_detail_project.png')

await browser.close()
rmSync(work, { recursive: true, force: true })
console.log('DONE')
