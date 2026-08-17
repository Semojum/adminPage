/**
 * 기획서 §6 "화면 공통": 작업 상세·결과 미리보기·기관 정보·계정 정보는 새 창으로 엽니다.
 * 목록을 잃지 않고 여러 건을 비교하기 위해서입니다.
 *
 * name 을 건별로 다르게 주어 여러 건을 나란히 띄울 수 있게 합니다.
 */
export function openWindow(path: string, name: string, size = { width: 1180, height: 900 }) {
  const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - size.width) / 2))
  const top = Math.max(0, Math.round(window.screenY + 60))
  window.open(
    path,
    name,
    `popup=yes,width=${size.width},height=${size.height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
  )
}
