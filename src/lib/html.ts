/**
 * 메일 문의 본문 다루기.
 *
 * 명세 §문의: 메일 본문은 "text/plain 우선(없으면 HTML 원문), 최대 10,000자" 입니다.
 * HTML 원문이 오면 화면에 태그가 그대로 보이므로 글자만 남겨 읽히게 만듭니다.
 *
 * **HTML 로 렌더링하지 않습니다.** 바깥에서 들어온 메일이라 그대로 그리면 XSS 가 됩니다.
 * DOMParser 로 파싱만 하고(파싱은 스크립트를 실행하지 않습니다) textContent 만 꺼냅니다.
 */

const HTML_TAG = /<\/?[a-z][\s\S]*>/i

/** 줄바꿈으로 살려둘 블록 태그 */
const BLOCK_END = /<\/\s*(p|div|tr|li|h[1-6]|blockquote|table|ul|ol|section|article)\s*>/gi
const LINE_BREAK = /<\s*(br|hr)\s*\/?\s*>/gi
/** 표 칸은 줄을 바꾸지 않고 띄어만 둡니다 — 안 그러면 칸마다 줄이 생겨 읽기 나쁩니다. */
const CELL_END = /<\/\s*(td|th)\s*>/gi

export function looksLikeHtml(raw: string): boolean {
  return HTML_TAG.test(raw)
}

export function htmlToText(raw: string | null | undefined): string {
  if (!raw) return ''
  if (!looksLikeHtml(raw)) return raw

  // 태그를 지우기 전에 줄 구분부터 살려 둡니다.
  const withBreaks = raw.replace(LINE_BREAK, '\n').replace(CELL_END, ' ').replace(BLOCK_END, '\n')

  const doc = new DOMParser().parseFromString(withBreaks, 'text/html')
  doc.querySelectorAll('script, style, head, noscript').forEach((node) => node.remove())

  return (doc.body?.textContent ?? '')
    .replace(/ /g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
