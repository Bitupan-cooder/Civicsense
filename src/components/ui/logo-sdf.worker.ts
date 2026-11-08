// Builds the logo's distance field off the main thread (~390 ms of blocking on a throttled phone otherwise).
import { sdfFromAlpha } from "./logo-sdf"

self.onmessage = (e: MessageEvent<Uint8ClampedArray>) => {
  const sdf = sdfFromAlpha(e.data)
  ;(self as unknown as Worker).postMessage(sdf, [sdf.buffer])
}
