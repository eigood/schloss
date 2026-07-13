import { BaseStorageProvider, StorageMetadata, ListOptions, ListPage } from '@schloss/keep'

export type R2ProviderOptions = {
  customMetadata?: Record<string, string>
  httpMetadata?: {
    contentType?: string
    contentLanguage?: string
    contentDisposition?: string
    cacheControl?: string
  }
  onlyIf?: {
    etagMatches?: string
    etagDoesNotMatch?: string
  }
}

export class R2StorageProvider extends BaseStorageProvider<R2ProviderOptions> {
  constructor(public readonly namespace: string, private bucket: any) {
    super()
  }

  private mapMetadata(key: string, obj: any): StorageMetadata {
    return {
      key,
      hashEtag: obj.httpEtag.replace(/^"|"$/g, ''),
      sizeBytes: obj.size,
      lastModified: obj.uploaded.getTime(),
    }
  }

  async head(key: string): Promise<StorageMetadata | null> {
    const obj = await this.bucket.head(key)
    if (!obj) return null
    return this.mapMetadata(key, obj)
  }

  async writeBinary(key: string, body: ArrayBuffer | ReadableStream<Uint8Array>, options?: R2ProviderOptions): Promise<void> {
    await this.bucket.put(key, body, {
      customMetadata: options?.customMetadata,
      httpMetadata: options?.httpMetadata,
      onlyIf: options?.onlyIf,
    })
  }

  async readBinary(key: string): Promise<ReadableStream<Uint8Array> | null> {
    const obj = await this.bucket.get(key)
    if (!obj || !obj.body) return null
    return obj.body as ReadableStream<Uint8Array>
  }

  async list(options?: ListOptions): Promise<ListPage> {
    const result = await this.bucket.list({
      prefix: options?.prefix,
      cursor: options?.cursor,
      limit: options?.limit ?? 1000,
    })

    const items = result.objects.map((obj: any) => this.mapMetadata(obj.key, obj))

    return {
      items,
      nextCursor: result.truncated ? result.cursor : undefined,
    }
  }
}
