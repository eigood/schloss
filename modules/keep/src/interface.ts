import { StorageMetadata, ListOptions, ListPage } from './types'

export abstract class BaseStorageProvider<OptionsExtend extends Record<string, any> = Record<string, any>> {
  abstract readonly namespace: string

  abstract head(key: string): Promise<StorageMetadata | null>
  
  abstract writeBinary(
    key: string, 
    body: ArrayBuffer | ReadableStream<Uint8Array>, 
    options?: OptionsExtend
  ): Promise<void>
  
  abstract readBinary(key: string): Promise<ReadableStream<Uint8Array> | null>
  
  abstract list(options?: ListOptions): Promise<ListPage>

  async writeText(key: string, text: string, options?: OptionsExtend): Promise<void> {
    const encoder = new TextEncoder()
    const payload = encoder.encode(text)

    const baseOptions = {
      ...options,
      httpMetadata: {
        ...(options as any)?.httpMetadata,
        contentType: (options as any)?.httpMetadata?.contentType ?? 'text/plain',
      }
    } as OptionsExtend

    await this.writeBinary(key, payload.buffer, baseOptions)
  }

  async readText(key: string): Promise<string | null> {
    const stream = await this.readBinary(key)
    if (!stream) return null

    const response = new Response(stream)
    return response.text()
  }

  async writeJson<T>(key: string, data: T, options?: OptionsExtend): Promise<void> {
    const baseOptions = {
      ...options,
      httpMetadata: {
        ...(options as any)?.httpMetadata,
        contentType: 'application/json',
      }
    } as OptionsExtend

    await this.writeText(key, JSON.stringify(data), baseOptions)
  }

  async readJson<T>(key: string): Promise<T | null> {
    const text = await this.readText(key)
    if (!text) return null
    return JSON.parse(text) as T
  }
}

