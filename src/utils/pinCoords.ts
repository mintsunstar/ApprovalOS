export const toPercent = (
  clientX: number,
  clientY: number,
  rect: DOMRect
): { pin_x: number; pin_y: number } => ({
  pin_x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
  pin_y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
})

export const toPixel = (
  pin_x: number,
  pin_y: number,
  rect: DOMRect
): { left: number; top: number } => ({
  left: pin_x * rect.width,
  top: pin_y * rect.height,
})
