export function getElementBounds(element: HTMLElement) {
  const rect = element.getBoundingClientRect()

  return {
    x: Math.round(rect.left),
    y: Math.round(rect.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  }
}
