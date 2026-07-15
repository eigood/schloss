import { HashRingConfig } from "@schloss/core/src/schemas"

export interface HashRingRouterOptions {
  storagePrefix: string
  maxSliceByteSize: number
  vnodeFactor: number
  maxProfilesPerSlice: number
}

export function murmurHash3(key: string): number {
  let h1 = 0
  const c1 = 0xcc9e2d51
  const c2 = 0x1b873593
  const len = key.length
  let i = 0
  while (len - i >= 4) {
    let k1 = (key.charCodeAt(i) & 0xff) | ((key.charCodeAt(i + 1) & 0xff) << 8) | ((key.charCodeAt(i + 2) & 0xff) << 16) | ((key.charCodeAt(i + 3) & 0xff) << 24)
    i += 4
    k1 = Math.imul(k1, c1)
    k1 = (k1 << 15) | (k1 >>> 17)
    k1 = Math.imul(k1, c2)
    h1 ^= k1
    h1 = (h1 << 13) | (h1 >>> 19)
    h1 = Math.imul(h1, 5) + 0xe6546b64
  }
  let k1 = 0
  switch (len - i) {
    case 3:
      k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16
    case 2:
      k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8
    case 1:
      k1 ^= key.charCodeAt(i) & 0xff
      k1 = Math.imul(k1, c1)
      k1 = (k1 << 15) | (k1 >>> 17)
      k1 = Math.imul(k1, c2)
      h1 ^= k1
  }
  h1 ^= len
  h1 ^= h1 >>> 16
  h1 = Math.imul(h1, 0x85ebca6b)
  h1 ^= h1 >>> 13
  h1 = Math.imul(h1, 0xc2b2ae35)
  h1 ^= h1 >>> 16
  return h1 >>> 0
}

export class HashRingRouter {
  private options: HashRingRouterOptions
  constructor(options: HashRingRouterOptions) {
    this.options = options
  }

  public getConfigFileKey(): string {
    const base = this.options.storagePrefix.endsWith("/") ? this.options.storagePrefix : `${this.options.storagePrefix}/`
    return `${base}keys/config.json`
  }

  public resolveSliceFileName(appGuid: string, config: HashRingConfig): string | null {
    if (!config || !config.ringTokens || config.ringTokens.length === 0) {
      return null
    }
    const token = murmurHash3(appGuid)
    let low = 0
    let high = config.ringTokens.length - 1
    while (low <= high) {
      const mid = (low + high) >>> 1
      if (config.ringTokens[mid] >= token) {
        high = mid - 1
      } else {
        low = mid + 1
      }
    }
    const targetIdx = low >= config.ringTokens.length ? 0 : low
    const sliceIndex = config.ringSliceIndices[targetIdx]
    const sliceMeta = config.slices[sliceIndex]
    return sliceMeta ? sliceMeta.fileName : null
  }

  public resolveSliceFileKey(appGuid: string, config: HashRingConfig): string | null {
    const fileName = this.resolveSliceFileName(appGuid, config)
    if (!fileName) {
      return null
    }
    const base = this.options.storagePrefix.endsWith("/") ? this.options.storagePrefix : `${this.options.storagePrefix}/`
    return `${base}keys/slices/${fileName}`
  }
}

