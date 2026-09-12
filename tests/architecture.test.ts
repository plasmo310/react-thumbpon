import { describe, expect, it } from 'vitest'

/*
 * 層と feature の境界を機械で守る。
 *
 * Feature-based は放っておくと feature 同士の横 import で腐るので、
 * CLAUDE.md の散文ではなく npm test で落ちるようにしておく。
 * 依存を増やしたくないので、ファイルの読み出しは Vite の import.meta.glob で行う
 * （@types/node も ESLint も要らない）。
 */

const sources = import.meta.glob('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/**
 * core/model から順に、下から上へ。上は下を import できるが、逆はできない。
 * styles/ は Tailwind のクラス文字列だけを持つ置き場で、CSS Modules への移行が終わったら消える。
 */
const ORDER = ['domain', 'shared', 'app/store', 'features', 'app'] as const

/** どのパスがどの層か。app/store はアプリ全体の状態なので features より下に置く */
const LAYERS: [prefix: string, layer: (typeof ORDER)[number]][] = [
  ['/src/domain', 'domain'],
  ['/src/shared', 'shared'],
  ['/src/app/store', 'app/store'],
  ['/src/features', 'features'],
]

/**
 * その階層の番号。
 * '@/app/store' のようにディレクトリを直接指す書き方も拾えるよう、境界まで含めて見る。
 * どれにも当てはまらない src/app 直下（App / main / shortcuts）が最上位で、
 * feature を組み立てる場所なので何を見てもよい。
 */
function rankOf(path: string): number {
  const found = LAYERS.find(
    ([prefix]) => path === prefix || path.startsWith(prefix + '/') || path.startsWith(prefix + '.'),
  )
  return ORDER.indexOf(found ? found[1] : 'app')
}

const layerName = (rank: number) => ORDER[rank]

/** features/<name>/... の <name>。features の外なら null */
function featureOf(path: string): string | null {
  const matched = /^\/src\/features\/([^/]+)\//.exec(path)
  return matched ? matched[1] : null
}

/** import 文と vi.mock の指定子を集める。相対指定は絶対パスに直す */
function importsOf(path: string, source: string): string[] {
  const specifiers = [...source.matchAll(/(?:from|import|vi\.mock\()\s*'([^']+)'/g)].map(
    (m) => m[1],
  )
  return specifiers
    .filter((s) => s.startsWith('@/') || s.startsWith('.'))
    .map((s) => {
      if (s.startsWith('@/')) return s.replace('@/', '/src/')
      // ./x や ../x を、その import 文が書かれたファイルの位置から解決する
      const segments = path.split('/').slice(0, -1).concat(s.split('/'))
      const stack: string[] = []
      for (const segment of segments) {
        if (segment === '.' || segment === '') continue
        if (segment === '..') stack.pop()
        else stack.push(segment)
      }
      return '/' + stack.join('/')
    })
}

const entries = Object.entries(sources)

/** 「使われているか」を見るときはテストも読み手に数える */
const consumers = Object.entries({
  ...sources,
  ...(import.meta.glob('/tests/**/*.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
})

describe('層の依存方向', () => {
  it('src 配下のファイルを読めている', () => {
    expect(entries.length).toBeGreaterThan(30)
  })

  it('下の層は上の層を import しない', () => {
    const violations: string[] = []
    for (const [path, source] of entries) {
      const from = rankOf(path)
      for (const target of importsOf(path, source)) {
        const to = rankOf(target)
        if (to > from) {
          violations.push(`${path} (${layerName(from)}) -> ${target} (${layerName(to)})`)
        }
      }
    }
    expect(violations).toEqual([])
  })

  it('domain は domain の外を import しない（node で検証できる状態を守る）', () => {
    const violations: string[] = []
    for (const [path, source] of entries) {
      if (!path.startsWith('/src/domain/')) continue
      for (const target of importsOf(path, source)) {
        if (!target.startsWith('/src/domain/')) violations.push(`${path} -> ${target}`)
      }
    }
    // react は型だけを使うので、CSSProperties のために import しているものは残る
    expect(violations).toEqual([])
  })
})

describe('feature の境界', () => {
  it('feature 同士は import しない', () => {
    const violations: string[] = []
    for (const [path, source] of entries) {
      const own = featureOf(path)
      if (!own) continue
      for (const target of importsOf(path, source)) {
        const other = featureOf(target)
        if (other && other !== own) violations.push(`${path} -> ${target}`)
      }
    }
    expect(violations).toEqual([])
  })

  it('feature には公開面(index.ts)がある', () => {
    const features = new Set(entries.map(([p]) => featureOf(p)).filter(Boolean))
    const missing = [...features].filter((name) => !sources[`/src/features/${name}/index.ts`])
    expect(missing).toEqual([])
  })
})

describe('使われていない export', () => {
  /** 再エクスポートは「使っている」に数えない（バレルが死にコードを隠すため） */
  const withoutReExports = (source: string) =>
    source.replace(/^export\s*\{[^}]*\}\s*from .*$/gm, '')

  /**
   * name がその定義ファイル以外で出てくるか。
   *
   * @param asMember ドット付きの参照を「使っている」に数えるか。
   *                 ストアのアクションは常に s.xxx の形で呼ばれるので数える。
   *                 モジュールの export は逆に、styles.panelBody のような同名の
   *                 プロパティ参照を数えてしまうと死んでいても気づけないので数えない。
   */
  function usedElsewhere(name: string, ownPath: string, asMember: boolean): boolean {
    const word = asMember
      ? new RegExp(String.raw`\b${name}\b`)
      : new RegExp(String.raw`(?<![.$\w])${name}\b`)
    return consumers.some(
      ([path, source]) => path !== ownPath && word.test(withoutReExports(source)),
    )
  }

  it('モジュールの値 export は必ずどこかで使われている', () => {
    const dead: string[] = []
    for (const [path, source] of entries) {
      if (path.endsWith('/index.ts')) continue // バレルは公開面なのでここでは見ない
      for (const m of source.matchAll(
        /^export\s+(?:async\s+)?(?:function|const|class)\s+(\w+)/gm,
      )) {
        if (!usedElsewhere(m[1], path, false)) dead.push(`${path} の ${m[1]}`)
      }
    }
    expect(dead).toEqual([])
  })

  it('ストアのアクションは必ずどこかで呼ばれている', () => {
    const dead: string[] = []
    for (const [path, source] of entries) {
      if (!/\/src\/app\/store\/\w+Slice\.ts$/.test(path)) continue
      const block = /export type \w+Slice = \{([\s\S]*?)\n\}/.exec(source)
      if (!block) continue
      for (const m of block[1].matchAll(/^ {2}(\w+): \(/gm)) {
        if (!usedElsewhere(m[1], path, true)) dead.push(`${path} の ${m[1]}`)
      }
    }
    expect(dead).toEqual([])
  })
})
