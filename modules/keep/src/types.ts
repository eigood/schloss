export interface StorageMetadata {
  key: string
  hashEtag: string
  sizeBytes: number
  lastModified: number
}

export interface ListOptions {
  prefix?: string
  cursor?: string
  limit?: number
}

export interface ListPage {
  items: StorageMetadata[]
  nextCursor?: string
}

