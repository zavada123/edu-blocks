/**
 * Loaded pictures for the canvas. Each picture loads once per page; `whenLoaded` tells the field to draw again
 * when a picture it asked for arrives.
 */

const cache = new Map<string, HTMLImageElement>()
const waiting = new Set<() => void>()

/** Tells the fields that something they draw has arrived: a picture or an asset pack. */
export const notifyLoaded = () => {
  for (const callback of [...waiting]) callback()
}

/** The picture, ready to draw, or null while it loads. */
export const image = (href: string): HTMLImageElement | null => {
  let img = cache.get(href)
  if (img === undefined) {
    img = new Image()
    img.decoding = "async"
    img.onload = notifyLoaded
    img.src = href
    cache.set(href, img)
  }
  return img.complete && img.naturalWidth > 0 ? img : null
}

/** Calls back each time a picture arrives, until the returned function is called. */
export const whenLoaded = (callback: () => void): (() => void) => {
  waiting.add(callback)
  return () => {
    waiting.delete(callback)
  }
}
