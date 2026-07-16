export type StorageClass = 'archived' | 'generated'

export type RoutingType = 'public' | 'individual' | 'group'

export interface GenerationRecipe {
  source: string
  params: Record<string, any>
}

export interface IngestionInput {
  namespace: string
  key: string
  routingType: RoutingType
  storageClass: StorageClass
  payloadStream: ReadableStream<Uint8Array>
  targetId: string // Firebase GUID for Individual routing, Group ID for Group routing
  generation?: GenerationRecipe
}

export interface IngestionResult {
  publicPath: string
  sizeBytes: number
  hashEtag: string
}

