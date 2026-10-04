import { useEffect, useId, useLayoutEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { normalizeTextRange, reconcileText, replaceTextRange } from '@/domain/text'
import type { InlineTextStyle, TextContent, TextRange } from '@/domain/text'
import type { TextStyle } from '@/domain/layer'
import {
  paintEditorText,
  paintEditorOutline,
  readEditorSelection,
  readEditorText,
  restoreEditorSelection,
} from '@/shared/lib/textEditorDom'
import { cx } from '@/shared/lib/cx'
import styles from './styles.module.css'

type Props = {
  value: TextContent
  editable?: boolean
  active?: boolean
  canvas?: boolean
  style?: CSSProperties
  previewStyle?: TextStyle
  baseStyle?: TextStyle
  selection?: TextRange
  revision?: number
  pendingStyle?: InlineTextStyle | null
  disabled?: boolean
  onActivate?: () => void
  onSelectionChange?: (range: TextRange) => void
  onChange?: (
    value: TextContent,
    range: TextRange,
    kind: 'typing' | 'composition' | 'replace',
  ) => void
  onFinish?: () => void
  onUndo?: () => void
  onRedo?: () => void
}

/**
 * Canvasとプロパティ欄で共有する部分書式付き入力。
 * 変換中にReactで子要素を差し替えるとIMEが切れるため、DOMの同期境界をここに集約する。
 * @param props.value 確定済みの文章と部分書式
 * @param props.selection 保存した文字選択範囲。UTF-16位置
 * @param props.canvas キャンバス実寸の書式をそのまま表示するか
 * @param props.active 選択・カーソルを管理する入力欄か
 * @param props.baseStyle キャンバスの全体書式。背面の縁取りの継承に使う
 */
export function RichTextInput(props: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const outlineRef = useRef<HTMLDivElement>(null)
  const outlineId = useId().replace(/:/g, '')
  const latest = useRef(props)
  latest.current = props
  const composing = useRef(false)
  const before = useRef<{ content: TextContent; range: TextRange } | null>(null)
  const painted = useRef('')
  const wasActive = useRef(false)
  const revision = useRef(props.revision)
  const selectionRef = useRef(props.selection)

  const paintOutline = () => {
    const root = rootRef.current
    const outline = outlineRef.current
    if (!root || !outline) return
    const current = latest.current
    const enabled =
      ((current.previewStyle ?? current.baseStyle)?.outerStrokeWidth ?? 0) > 0 ||
      current.value.inlineStyles?.some((range) => (range.style.outerStrokeWidth ?? 0) > 0)
    if (!enabled) {
      outline.replaceChildren()
      return
    }
    paintEditorOutline(
      root,
      outline,
      outlineId,
      cx(
        styles.richText,
        props.canvas && styles.richTextCanvas,
        (current.previewStyle ?? current.baseStyle)?.fixedLineHeight != null &&
          styles.richTextFixed,
      ),
      current.previewStyle?.fontSize,
    )
  }

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (composing.current) {
      paintOutline()
      return
    }
    const signature = JSON.stringify([
      props.value.text,
      props.value.inlineStyles,
      props.previewStyle?.fontSize,
    ])
    const changed = signature !== painted.current
    const activated = props.active && !wasActive.current
    const requested = props.revision !== revision.current
    const selected = props.selection ?? readEditorSelection(root)
    if (changed) {
      paintEditorText(root, props.value, props.previewStyle?.fontSize)
      painted.current = signature
    }
    if (props.active && props.editable) {
      if (activated || requested) root.focus({ preventScroll: true })
      if (
        selected &&
        (document.activeElement === root || activated || requested) &&
        (changed || activated || requested || selectionRef.current !== props.selection)
      )
        restoreEditorSelection(root, selected)
    }
    wasActive.current = !!props.active
    revision.current = props.revision
    selectionRef.current = props.selection
    paintOutline()
  })

  useEffect(() => {
    const handleSelection = () => {
      const root = rootRef.current
      if (!root || composing.current || !latest.current.active || document.activeElement !== root)
        return
      const selection = readEditorSelection(root)
      if (selection) latest.current.onSelectionChange?.(selection)
    }
    document.addEventListener('selectionchange', handleSelection)
    return () => document.removeEventListener('selectionchange', handleSelection)
  }, [])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    // ReactのbeforeinputはブラウザによってTextEventになるため、inputTypeはネイティブで読む。
    const handleBeforeInput = (input: InputEvent) => {
      if (!latest.current.editable || composing.current || input.isComposing) return
      if (input.inputType === 'insertParagraph' || input.inputType === 'insertLineBreak') {
        input.preventDefault()
        insert('\n')
        return
      }
      if (input.inputType === 'historyUndo' || input.inputType === 'historyRedo') {
        input.preventDefault()
        if (input.inputType === 'historyUndo') latest.current.onUndo?.()
        else latest.current.onRedo?.()
        return
      }
      capture()
    }
    root.addEventListener('beforeinput', handleBeforeInput)
    return () => root.removeEventListener('beforeinput', handleBeforeInput)
  }, [])

  const capture = () => {
    const root = rootRef.current
    if (!root) return
    before.current = {
      content: latest.current.value,
      range: readEditorSelection(root) ?? latest.current.selection ?? { start: 0, end: 0 },
    }
  }

  const sync = (kind: 'typing' | 'composition') => {
    const root = rootRef.current
    if (!root || composing.current) return
    const current = latest.current
    const original = before.current ?? {
      content: current.value,
      range: current.selection ?? { start: 0, end: 0 },
    }
    const selection = readEditorSelection(root) ?? original.range
    const content = reconcileText(
      original.content,
      readEditorText(root),
      Math.min(original.range.start, selection.start),
      current.pendingStyle ?? undefined,
    )
    before.current = null
    current.onChange?.(content, normalizeTextRange(content.text, selection), kind)
  }

  const insert = (text: string) => {
    const root = rootRef.current
    if (!root || composing.current) return
    const current = latest.current
    const selected = readEditorSelection(root) ?? current.selection ?? { start: 0, end: 0 }
    const range = normalizeTextRange(current.value.text, selected)
    const content = replaceTextRange(current.value, range, text, current.pendingStyle ?? undefined)
    const cursor = { start: range.start + text.length, end: range.start + text.length }
    current.onChange?.(content, cursor, 'replace')
    paintEditorText(root, content, current.previewStyle?.fontSize)
    painted.current = JSON.stringify([
      content.text,
      content.inlineStyles,
      current.previewStyle?.fontSize,
    ])
    restoreEditorSelection(root, cursor)
    paintOutline()
  }

  return (
    <div
      className={cx(!props.canvas && styles.richTextField)}
      style={
        {
          '--text-outer-stroke-width':
            (props.previewStyle ?? props.baseStyle)?.outerStrokeWidth ?? 0,
          '--text-outer-stroke-color':
            (props.previewStyle ?? props.baseStyle)?.outerStrokeColor ?? '#FFFFFF',
        } as CSSProperties
      }
    >
      <div className={styles.richTextStack}>
        <div
          ref={outlineRef}
          className={styles.richTextOutline}
          aria-hidden="true"
          contentEditable={false}
        />
        <div
          ref={rootRef}
          className={cx(
            styles.richText,
            props.canvas && styles.richTextCanvas,
            (props.previewStyle ?? props.baseStyle)?.fixedLineHeight != null &&
              styles.richTextFixed,
            styles.richTextFront,
            props.active && props.canvas && styles.richTextEditing,
          )}
          style={
            props.previewStyle
              ? {
                  color: props.previewStyle.color,
                  fontFamily: props.previewStyle.fontFamily,
                  fontWeight: props.previewStyle.fontWeight,
                  fontStyle: props.previewStyle.fontStyle,
                  lineHeight:
                    props.previewStyle.fixedLineHeight == null
                      ? props.previewStyle.lineHeight
                      : `${props.previewStyle.fixedLineHeight / props.previewStyle.fontSize}em`,
                  paintOrder: 'stroke fill',
                  WebkitTextStrokeWidth: `${props.previewStyle.strokeWidth / props.previewStyle.fontSize}em`,
                  WebkitTextStrokeColor: props.previewStyle.strokeColor,
                }
              : props.style
          }
          contentEditable={!!props.editable && !props.disabled}
          suppressContentEditableWarning
          role={props.editable ? 'textbox' : undefined}
          aria-label={props.editable ? 'テキスト編集' : undefined}
          aria-multiline={props.editable ? true : undefined}
          spellCheck={false}
          tabIndex={props.editable && !props.disabled ? 0 : undefined}
          onFocus={() => {
            if (!props.active) props.onActivate?.()
          }}
          onPointerDown={(event) => {
            if (props.editable) event.stopPropagation()
          }}
          onContextMenu={(event) => {
            if (props.editable) event.stopPropagation()
          }}
          onBlur={() => {
            if (composing.current) {
              composing.current = false
              sync('composition')
            }
          }}
          onInput={() => {
            if (!composing.current) sync('typing')
            paintOutline()
          }}
          onCompositionStart={() => {
            capture()
            composing.current = true
          }}
          onCompositionEnd={() => {
            composing.current = false
            sync('composition')
            paintOutline()
          }}
          onPaste={(event) => {
            event.preventDefault()
            insert(event.clipboardData.getData('text/plain').replace(/\r\n?/g, '\n'))
          }}
          onDrop={(event) => {
            if (props.editable) {
              event.preventDefault()
              event.stopPropagation()
            }
          }}
          onKeyDown={(event) => {
            if (!props.editable) return
            if (composing.current || event.nativeEvent.isComposing || event.keyCode === 229) return
            const modifier = event.ctrlKey || event.metaKey
            if (modifier && ['z', 'y'].includes(event.key.toLowerCase())) {
              event.preventDefault()
              event.stopPropagation()
              if (event.shiftKey || event.key.toLowerCase() === 'y') props.onRedo?.()
              else props.onUndo?.()
            } else if (modifier && ['b', 'i', 'u'].includes(event.key.toLowerCase())) {
              // ブラウザによる任意のHTML書式がモデルと食い違わないようにする。
              event.preventDefault()
            } else if (event.key === 'Enter') {
              event.preventDefault()
              insert('\n')
            } else if (event.key === 'Escape') {
              event.preventDefault()
              event.stopPropagation()
              event.currentTarget.blur()
              props.onFinish?.()
            }
          }}
        />
      </div>
    </div>
  )
}
