/**
 * 접속 환경 표기.
 *
 * 명세 §T1-4: clientOs·clientBrowser 는 서버의 UA 간이 파싱값이고, 원본 UA 도 함께 옵니다.
 * 서버 값이 비어 있으면 원본 UA 에서 직접 뽑아 "Windows 11 · Chrome 141" 처럼 적습니다.
 */

function osOf(ua: string): string | null {
  if (/Windows NT 10\.0/.test(ua)) return /Windows NT 10\.0; Win64/.test(ua) ? 'Windows 10/11' : 'Windows 10'
  const windows = /Windows NT ([\d.]+)/.exec(ua)
  if (windows) return `Windows ${windows[1]}`
  const mac = /Mac OS X ([\d_]+)/.exec(ua)
  if (mac) return `macOS ${mac[1].replace(/_/g, '.')}`
  if (/Android ([\d.]+)/.test(ua)) return `Android ${/Android ([\d.]+)/.exec(ua)![1]}`
  if (/(iPhone|iPad) OS ([\d_]+)/.test(ua)) {
    return `iOS ${/(?:iPhone|iPad) OS ([\d_]+)/.exec(ua)![1].replace(/_/g, '.')}`
  }
  if (/Linux/.test(ua)) return 'Linux'
  return null
}

function browserOf(ua: string): string | null {
  // 데스크톱 앱은 Electron 으로 옵니다 — 크롬 문자열이 함께 있어 먼저 봅니다.
  const electron = /Electron\/([\d.]+)/.exec(ua)
  if (electron) return `Electron ${electron[1].split('.')[0]}`
  const edge = /Edg\/([\d.]+)/.exec(ua)
  if (edge) return `Edge ${edge[1].split('.')[0]}`
  const chrome = /Chrome\/([\d.]+)/.exec(ua)
  if (chrome) return `Chrome ${chrome[1].split('.')[0]}`
  const firefox = /Firefox\/([\d.]+)/.exec(ua)
  if (firefox) return `Firefox ${firefox[1].split('.')[0]}`
  const safari = /Version\/([\d.]+).*Safari/.exec(ua)
  if (safari) return `Safari ${safari[1].split('.')[0]}`
  return null
}

/** "Windows 11 · Chrome 141" — 아무것도 못 알아내면 null */
export function clientEnvironment(request: {
  clientOs: string | null
  clientBrowser: string | null
  clientUserAgent: string | null
}): string | null {
  const ua = request.clientUserAgent ?? ''
  const os = request.clientOs ?? (ua ? osOf(ua) : null)
  const browser = request.clientBrowser ?? (ua ? browserOf(ua) : null)
  const parts = [os, browser].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
}
