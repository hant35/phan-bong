/** Phát hiện iOS / PWA standalone — dùng cho hướng dẫn Web Push. */
export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
}

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia("(display-mode: standalone)").matches
    || ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
}

export function needsIosPushInstallGuide(): boolean {
  return isIosDevice() && !isStandalonePwa()
}
