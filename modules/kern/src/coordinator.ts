import { BaseStorageProvider } from '@schloss/keep'
import { HashRingConfig, bootstrapEmptyConfig, assets } from '@schloss/core'
import { HashRingRouter } from '@schloss/keep'

export interface ConfigCoordinatorOptions {
  db: any
  storage: BaseStorageProvider
  routerConfig: {
    storagePrefix: string
    maxSliceByteSize: number
    vnodeFactor: number
    maxProfilesPerSlice: number
    sliceCount: number
  }
}

export class ConfigCoordinator {
  private cachedConfig: HashRingConfig | null = null
  private cachedEtag: string | null = null
  private db: any
  private storage: BaseStorageProvider
  private routerConfig: ConfigCoordinatorOptions['routerConfig']

  constructor(options: ConfigCoordinatorOptions) {
    this.db = options.db
    this.storage = options.storage
    this.routerConfig = options.routerConfig
  }

  getConfigFileKey(): string {
    return `${this.routerConfig.storagePrefix}/config.json`
  }

  async getRouter(): Promise<HashRingRouter> {
    const config = await this.getConfig()
    return new HashRingRouter({
      storagePrefix: this.routerConfig.storagePrefix,
      maxSliceByteSize: this.routerConfig.maxSliceByteSize,
      vnodeFactor: config.vnodeFactor,
      maxProfilesPerSlice: this.routerConfig.maxProfilesPerSlice
    })
  }

  private buildAssetSyncStatement(key: string, etag: string, sizeBytes: number) {
    const cleanEtag = etag.replace(/"/g, '')
    return this.db
      .insert(assets)
      .values({
        namespace: this.routerConfig.storagePrefix,
        key: key,
        hashEtag: cleanEtag,
        sizeBytes: sizeBytes,
        syncedAt: Math.floor(Date.now() / 1000)
      })
      .onConflictDoUpdate({
        target: [assets.namespace, assets.key],
        set: {
          hashEtag: cleanEtag,
          sizeBytes: sizeBytes,
          syncedAt: Math.floor(Date.now() / 1000)
        }
      })
  }

  async getConfig(): Promise<HashRingConfig> {
    const key = this.getConfigFileKey()
    const metadata = await this.storage.head(key)

    if (!metadata) {
      return this.bootstrapColdStart()
    }

    if (this.cachedConfig && this.cachedEtag && metadata.hashEtag === this.cachedEtag) {
      return this.cachedConfig
    }

    const freshConfig = await this.storage.readJson<HashRingConfig>(key)
    if (!freshConfig) {
      return this.bootstrapColdStart()
    }

    this.cachedConfig = freshConfig
    this.cachedEtag = metadata.hashEtag
    
    await this.db.batch([this.buildAssetSyncStatement(key, metadata.hashEtag, metadata.sizeBytes)])
    return freshConfig
  }

  private async bootstrapColdStart(): Promise<HashRingConfig> {
    const key = this.getConfigFileKey()
    const emptyConfig = bootstrapEmptyConfig(this.routerConfig.sliceCount, this.routerConfig.vnodeFactor)

    try {
      await this.storage.writeJson(key, emptyConfig, {
        headers: { 'If-None-Match': '*' }
      })
      const metadata = await this.storage.head(key)
      this.cachedConfig = emptyConfig
      this.cachedEtag = metadata?.hashEtag ?? null

      if (metadata) {
        await this.db.batch([this.buildAssetSyncStatement(key, metadata.hashEtag, metadata.sizeBytes)])
      }
      return emptyConfig
    } catch (error: any) {
      if (error.status === 412 || error.statusCode === 412) {
        const metadata = await this.storage.head(key)
        const activeConfig = await this.storage.readJson<HashRingConfig>(key)
        if (activeConfig && metadata) {
          this.cachedConfig = activeConfig
          this.cachedEtag = metadata.hashEtag
          await this.db.batch([this.buildAssetSyncStatement(key, metadata.hashEtag, metadata.sizeBytes)])
          return activeConfig
        }
      }
      throw error
    }
  }

  async mutateAndCommit(
    mutationFn: (config: HashRingConfig) => HashRingConfig,
    dbOps: any[] = [],
    maxRetries = 3,
    attempt = 0
  ): Promise<HashRingConfig> {
    const key = this.getConfigFileKey()
    const currentConfig = await this.getConfig()
    const etagLock = this.cachedEtag

    const mutatedConfig = mutationFn(JSON.parse(JSON.stringify(currentConfig)))

    try {
      await this.storage.writeJson(key, mutatedConfig, {
        headers: { 'If-Match': etagLock ?? '' }
      })
      const metadata = await this.storage.head(key)
      this.cachedConfig = mutatedConfig
      this.cachedEtag = metadata?.hashEtag ?? null

      const batchQueue = [...dbOps]
      if (metadata) {
        batchQueue.push(this.buildAssetSyncStatement(key, metadata.hashEtag, metadata.sizeBytes))
      }
      if (batchQueue.length > 0) {
        await this.db.batch(batchQueue)
      }
      return mutatedConfig
    } catch (error: any) {
      if ((error.status === 412 || error.statusCode === 412) && attempt < maxRetries) {
        this.cachedConfig = null
        this.cachedEtag = null
        const backoffDelay = 50 * Math.pow(2, attempt) + Math.random() * 50
        await new Promise((resolve) => setTimeout(resolve, backoffDelay))
        return this.mutateAndCommit(mutationFn, dbOps, maxRetries, attempt + 1)
      }
      throw error
    }
  }

  async mutateAndCommitSlice<T>(
    sliceKey: string,
    mutationFn: (sliceData: T | null) => T,
    dbOps: any[] = [],
    maxRetries = 3,
    attempt = 0
  ): Promise<{ freshSlice: T; hashEtag: string }> {
    const metadata = await this.storage.head(sliceKey)
    const activeEtag = metadata?.hashEtag ?? null

    let sliceData: T | null = null
    if (activeEtag) {
      sliceData = await this.storage.readJson<T>(sliceKey)
    }

    const mutatedSlice = mutationFn(sliceData ? JSON.parse(JSON.stringify(sliceData)) : null)

    try {
      const writeHeaders: Record<string, string> = {}
      if (activeEtag) {
        writeHeaders['If-Match'] = activeEtag
      } else {
        writeHeaders['If-None-Match'] = '*'
      }

      await this.storage.writeJson(sliceKey, mutatedSlice, {
        headers: writeHeaders
      })

      const newMetadata = await this.storage.head(sliceKey)
      const batchQueue = [...dbOps]
      if (newMetadata) {
        batchQueue.push(this.buildAssetSyncStatement(sliceKey, newMetadata.hashEtag, newMetadata.sizeBytes))
      }
      if (batchQueue.length > 0) {
        await this.db.batch(batchQueue)
      }

      return {
        freshSlice: mutatedSlice,
        hashEtag: newMetadata?.hashEtag ?? ''
      }
    } catch (error: any) {
      if ((error.status === 412 || error.statusCode === 412) && attempt < maxRetries) {
        const backoffDelay = 50 * Math.pow(2, attempt) + Math.random() * 50
        await new Promise((resolve) => setTimeout(resolve, backoffDelay))
        return this.mutateAndCommitSlice<T>(sliceKey, mutationFn, dbOps, maxRetries, attempt + 1)
      }
      throw error
    }
  }
}

