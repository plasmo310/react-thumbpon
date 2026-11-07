// コマンドだけでサムネイルを PNG に書き出す（画面操作なし）。
//
// 実行:
//   npm run export -- --project <プロジェクトのフォルダ> --out <出力先> [--thumbnail <名前>]...
//
//   --project    マニフェスト（*.thumbpon）と assets/ があるフォルダ。または .thumbpon.zip
//   --out        PNG の保存先。無ければ作る
//   --thumbnail  書き出すサムネイル名。省略すると全部。複数回指定できる
//   --lang       画面の言語 ja | en（既定 ja）
//
// 仕組み: dist/ を一時サーバーで配り、ヘッドレスのブラウザでアプリを開いて ZIP インポートし、
// 画面の「PNG書き出し」ボタンを押してダウンロードを受け取る。画面の書き出しと同じ処理なので見た目は一致する。
// ブラウザは入っている Chrome を使う（THUMBPON_BROWSER_CHANNEL で msedge なども可）。
// フォントは Google Fonts から取得するため、ネットワークが要る。
import { chromium } from 'playwright-core'
import { strFromU8, unzipSync, zipSync } from 'fflate'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  statSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { build, preview } from 'vite'

const { values } = parseArgs({
  options: {
    project: { type: 'string' },
    out: { type: 'string' },
    thumbnail: { type: 'string', multiple: true },
    lang: { type: 'string', default: 'ja' },
  },
})
if (!values.project || !values.out) {
  console.error(
    '使い方: npm run export -- --project <フォルダ|zip> --out <出力先> [--thumbnail <名前>]...',
  )
  process.exit(2)
}

/** サムネイル一覧の行の名前。レイヤー一覧など他の li と区別するため、先頭のチェックボックスを目印にする */
const ROW_NAME = 'li > div > input[type=checkbox] ~ span[title]'

const ROOT = resolve(import.meta.dirname, '..')
const project = resolve(values.project)
const out = resolve(values.out)
const lang = values.lang
if (!['ja', 'en'].includes(lang)) throw new Error('--lang は ja か en')
if (!existsSync(project)) throw new Error(`プロジェクトが見つかりません: ${project}`)
mkdirSync(out, { recursive: true })

/** ワークスペースフォルダを、画面の「インポート」が読める ZIP にする。バックアップ類は含めない */
function zipProject(dir) {
  const files = {}
  const walk = (current) => {
    for (const name of readdirSync(current)) {
      const path = join(current, name)
      if (statSync(path).isDirectory()) walk(path)
      else if (name.endsWith('.thumbpon') || relative(dir, path).split(/[\\/]/)[0] === 'assets')
        files[relative(dir, path).replaceAll('\\', '/')] = readFileSync(path)
    }
  }
  walk(dir)
  if (!Object.keys(files).some((name) => name.endsWith('.thumbpon')))
    throw new Error(`*.thumbpon が見つかりません: ${dir}`)
  return { zip: Buffer.from(zipSync(files, { level: 0 })), files }
}

/** マニフェストに書かれたサムネイル名を、画面の一覧と同じ並び（未分類 → フォルダ順）で返す */
function thumbnailNames(files) {
  const path = Object.keys(files)
    .filter((name) => name.endsWith('.thumbpon'))
    .sort((a, b) => a.split('/').length - b.split('/').length)[0]
  if (!path) throw new Error('ZIP に *.thumbpon がありません')
  const manifest = JSON.parse(strFromU8(files[path]))
  const { thumbnails, folders = [] } = manifest
  const ordered = [
    ...thumbnails.filter((t) => !t.folderId),
    ...folders.flatMap((f) => thumbnails.filter((t) => t.folderId === f.id)),
  ]
  return ordered.map((t) => t.name)
}
const { zip, files } = statSync(project).isDirectory()
  ? zipProject(project)
  : { zip: readFileSync(project), files: unzipSync(readFileSync(project)) }
const names = thumbnailNames(files)

// dist/ が無いときだけビルドする。アプリを直したあとは npm run build を先に実行する
if (!existsSync(join(ROOT, 'dist/index.html'))) await build({ root: ROOT, logLevel: 'warn' })
const server = await preview({ root: ROOT, preview: { port: 0, host: '127.0.0.1' } })
const url = server.resolvedUrls.local[0]

const profile = mkdtempSync(join(tmpdir(), 'thumbpon-export-'))
// setInputFiles に渡せるバッファは 50MB までなので、ZIP はファイル経由で渡す
const zipPath = join(profile, 'project.thumbpon.zip')
writeFileSync(zipPath, zip)
const context = await chromium.launchPersistentContext(profile, {
  channel: process.env.THUMBPON_BROWSER_CHANNEL ?? 'chrome',
  headless: true,
  viewport: { width: 1600, height: 1000 },
  acceptDownloads: true,
})
let failed = false
try {
  const page = context.pages()[0] ?? (await context.newPage())
  page.on('pageerror', (err) => console.error('PAGE ERROR:', err.message))
  page.on('dialog', (dialog) => dialog.accept())

  await page.goto(`${url}?lang=${lang}`)
  await page.setInputFiles('input[type=file][accept*=".zip"]', zipPath)

  // インポートが終わるまで待つ。折りたたまれたフォルダは開き、全サムネイルが一覧に並ぶのを確かめる
  const rows = page.locator(ROW_NAME)
  await page.waitForFunction(
    ({ expected, rowName }) => {
      for (const button of document.querySelectorAll('button')) {
        if (button.textContent === '▶') button.click()
      }
      const titles = [...document.querySelectorAll(rowName)].map((el) => el.title)
      return titles.length === expected.length && titles.every((title, i) => title === expected[i])
    },
    { expected: names, rowName: ROW_NAME },
    { timeout: 60000 },
  )
  await rows.first().waitFor()
  const targets = values.thumbnail?.length ? values.thumbnail : names
  const missing = targets.filter((name) => !names.includes(name))
  if (missing.length)
    throw new Error(
      `サムネイルが見つかりません: ${missing.join(', ')}\n  あるもの: ${names.join(', ')}`,
    )

  const exportButton = page.locator('header button', {
    hasText: lang === 'en' ? 'Export PNG' : 'PNG書き出し',
  })
  // 同名のサムネイルは上から順に別々に出す。ファイル名は「名前 (2).png」のように重ならなくする
  const seen = new Map()
  for (const name of targets) {
    const nth = seen.get(name) ?? 0
    seen.set(name, nth + 1)
    await page
      .locator(ROW_NAME)
      .and(page.getByTitle(name, { exact: true }))
      .nth(nth)
      .click()
    await page.waitForTimeout(400)
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 60000 }),
      exportButton.click(),
    ])
    const suggested = download.suggestedFilename()
    const file = join(out, nth === 0 ? suggested : suggested.replace(/\.png$/, ` (${nth + 1}).png`))
    await download.saveAs(file)
    console.log(`書き出し: ${file}`)
  }
} catch (error) {
  failed = true
  console.error(error instanceof Error ? error.message : error)
} finally {
  await context.close()
  await server.close()
  rmSync(profile, { recursive: true, force: true })
}
process.exit(failed ? 1 : 0)
