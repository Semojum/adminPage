/**
 * CSV 는 화면이 만듭니다.
 *
 * 명세 §T1-3: "CSV는 FE가 화면 필터 그대로 생성 (UTF-8 BOM) — BE 엔드포인트 없음".
 * 엑셀이 한글을 깨뜨리지 않도록 BOM 을 앞에 붙입니다.
 */

const escapeCell = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  const text = String(value)
  // 엑셀이 수식으로 읽지 않도록 =,+,-,@ 로 시작하면 따옴표를 씌워 막습니다.
  const needsQuote = /[",\n\r]/.test(text) || /^[=+\-@]/.test(text)
  return needsQuote ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsvBlob(header: string[], rows: Array<Array<unknown>>): Blob {
  const lines = [header, ...rows].map((row) => row.map(escapeCell).join(','))
  return new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
}
