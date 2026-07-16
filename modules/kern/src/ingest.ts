// packages/schloss-kern/src/ingest.ts
import { assets, users, groups } from '@schloss/core/schemas'
import { eq, and } from 'drizzle-orm'
import { IngestionInput, IngestionResult } from './types'

import { CIPHER_CONFIG, deriveBlockIv } from '@schloss/core/ciphers'

const { plaintextBlockSizeBytes } = CIPHER_CONFIG.streaming

// Helper to construct our unencrypted binary envelope header prefix
function buildEnvelopeHeader(
  routingType: 'individual' | 'group',
  keyVersion: number,
  ivEnvelope: Uint8Array,
  ivData: Uint8Array,
  envelopedDek: Uint8Array
): Uint8Array {
  const magic = new TextEncoder().encode('SCHL') // 4 Bytes
  const routeByte = routingType === 'individual' ? 0x01 : 0x02 // 1 Byte
  
  const headerBuf = new ArrayBuffer(14)
  const view = new DataView(headerBuf)
  
  view.setUint8(0, routeByte)
  view.setUint32(1, keyVersion, false) // UInt32BE (4 Bytes)
  view.setUint8(5, ivEnvelope.length) // L_ive (1 Byte)
  view.setUint8(6, ivData.length) // L_ivd (1 Byte)
  view.setUint16(7, envelopedDek.length, false) // L_ek (2 Bytes)
  view.setUint8(9, 16) // Auth tag length (1 Byte, default AES-GCM 16B)

  const headerMeta = new Uint8Array(headerBuf)
  const packet = new Uint8Array(magic.length + headerMeta.length + ivEnvelope.length + ivData.length + envelopedDek.length)
  
  let offset = 0
  packet.set(magic, offset)
  offset += magic.length
  packet.set(headerMeta, offset)
  offset += headerMeta.length
  packet.set(ivEnvelope, offset)
  offset += ivEnvelope.length
  packet.set(ivData, offset)
  offset += ivData.length
  packet.set(envelopedDek, offset)
  
  return packet
}

// 1. Individual Key Agreement and Encryption Path
async function wrapIndividualKey(
  db: any,
  targetId: string,
  dek: Uint8Array,
  ivEnvelope: Uint8Array
): Promise<Uint8Array> {
  const [recipient] = await db.select()
    .from(users)
    .where(eq(users.firebase_guid, targetId))
    .limit(1)

  if (!recipient || !recipient.publicKey) {
    throw new Error(`Target individual recipient '${targetId}' key structure not found`)
  }

  // Import recipient's public key (assuming ECDH P-256)
  const recipientPubKey = await crypto.subtle.importKey(
    'jwk',
    JSON.parse(recipient.publicKey),
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  )

  // Ephemeral client key generation for key agreement
  const ephemeralKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey']
  )

  const derivedKey = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: recipientPubKey },
    ephemeralKeyPair.privateKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt']
  )

  // Encrypt the DEK using the derived Shared Secret (Key Wrapping Key)
  const encryptedBytes = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivEnvelope },
    derivedKey,
    dek
  )

  return new Uint8Array(encryptedBytes)
}

// 2. Group Key Retrieval and Symmetric Wrapping Path
async function wrapGroupKey(
  db: any,
  targetId: string,
  dek: Uint8Array,
  ivEnvelope: Uint8Array
): Promise<{ envelopedDek: Uint8Array, keyVersion: number }> {
  const [groupRecord] = await db.select()
    .from(groups)
    .where(eq(groups.id, parseInt(targetId)))
    .limit(1)

  if (!groupRecord || !groupRecord.masterKey) {
    throw new Error(`Target security group '${targetId}' master key parameters missing`)
  }

  const keyVersion = groupRecord.keyVersion ?? 1
  const rawMasterKey = groupRecord.masterKey // Uint8Array blob

  // Import Group Master Key
  const importedMasterKey = await crypto.subtle.importKey(
    'raw',
    rawMasterKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  )

  // Encrypt DEK with Group Master Key
  const encryptedBytes = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivEnvelope },
    importedMasterKey,
    dek
  )

  return {
    envelopedDek: new Uint8Array(encryptedBytes),
    keyVersion
  }
}

// Helper function to build the encryption TransformStream with prepended binary header
export function createEncryptionStream(
  importDek: CryptoKey,
  ivData: Uint8Array,
  headerBytes: Uint8Array
): TransformStream<Uint8Array, Uint8Array> {
  let accumulator = new Uint8Array(0)
  let blockIndex = 0
  let headerSent = false

  return new TransformStream<Uint8Array, Uint8Array>({
    async transform(chunk, controller) {
      // Step 1: Prepend the unencrypted binary envelope header on start
      if (!headerSent) {
        controller.enqueue(headerBytes)
        headerSent = true
      }

      // Step 2: Queue incoming bytes into the block accumulator
      const merged = new Uint8Array(accumulator.length + chunk.length)
      merged.set(accumulator, 0)
      merged.set(chunk, accumulator.length)
      accumulator = merged

      // Step 3: Segment stream and encrypt
      while (accumulator.length >= plaintextBlockSizeBytes) {
        const block = accumulator.slice(0, plaintextBlockSizeBytes)
        accumulator = accumulator.slice(plaintextBlockSizeBytes)
        const blockIv = deriveBlockIv(ivData, blockIndex)

        const encrypted = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: blockIv, tagLength: 128 },
          importDek,
          block
        )

        controller.enqueue(new Uint8Array(encrypted))
        blockIndex++
      }
    },

    async flush(controller) {
      // In case we process a zero-byte or tiny-byte file where transform never runs
      if (!headerSent) {
        controller.enqueue(headerBytes)
        headerSent = true
      }

      // Step 4: Handle trailing block segment
      if (accumulator.length > 0) {
        const blockIv = deriveBlockIv(ivData, blockIndex)

        const encrypted = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: blockIv, tagLength: 128 },
          importDek,
          accumulator
        )

        controller.enqueue(new Uint8Array(encrypted))
      }
    }
  })
}

// Main Orchestrator Function
export async function ingestAsset(
  db: any,
  privateStorage: any,
  publicStorage: any,
  input: IngestionInput
): Promise<IngestionResult> {
  let rawHash = ''
  let sizeBytes = 0

  // 1. Instantly tee the stream if we have to both archive AND encrypt
  let archiveStream: ReadableStream<Uint8Array> | null = null
  let publicSourceStream: ReadableStream<Uint8Array>

  if (input.storageClass === 'archived') {
    // [archiveStream] goes to Private R2; [publicSourceStream] goes to Stage 2 Encryption
    const [s1, s2] = input.payloadStream.tee()
    archiveStream = s1
    publicSourceStream = s2
  } else {
    rawHash = `gen_${crypto.randomUUID().replace(/-/g, '')}`
    sizeBytes = 0
    publicSourceStream = input.payloadStream
  }

  try {
    let publicPath = ''
    let finalPublicStream: ReadableStream<Uint8Array>

    // 2. Classify and Key Wrapping
    if (input.routingType === 'public') {
      publicPath = `public/${input.namespace}/${input.key}`
      finalPublicStream = publicSourceStream
    } else {
      const dek = crypto.getRandomValues(new Uint8Array(32))
      const ivData = crypto.getRandomValues(new Uint8Array(12))
      const ivEnvelope = crypto.getRandomValues(new Uint8Array(12))

      let envelopedDek: Uint8Array
      let keyVersion = 1

      if (input.routingType === 'individual') {
        publicPath = `ind/${input.targetId}/${input.namespace}/${input.key}`
        envelopedDek = await wrapIndividualKey(db, input.targetId, dek, ivEnvelope)
      } else {
        const wrapResult = await wrapGroupKey(db, input.targetId, dek, ivEnvelope)
        envelopedDek = wrapResult.envelopedDek
        keyVersion = wrapResult.keyVersion
        publicPath = `grp/${input.targetId}/v${keyVersion}/${input.namespace}/${input.key}`
      }

      // Generate the Binary Header Packet
      const headerBytes = buildEnvelopeHeader(
        input.routingType as 'individual' | 'group',
        keyVersion,
        ivEnvelope,
        ivData,
        envelopedDek
      )

      const importDek = await crypto.subtle.importKey(
        'raw',
        dek,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      )

      finalPublicStream = publicSourceStream.pipeThrough(
        createEncryptionStream(importDek, ivData, headerBytes)
      )
    }

    // 3. Run both I/O operations concurrently in parallel
    const uploadPromises: Promise<any>[] = [
      publicStorage.writeBinary(publicPath, finalPublicStream, {
        metadata: {
          'x-schloss-routing': input.routingType,
          'x-schloss-storage-class': input.storageClass,
          'x-schloss-hash-etag': rawHash
        }
      })
    ]

    // If archived, kick off the raw master cache upload simultaneously
    let archivePromise: Promise<any> | null = null
    if (archiveStream) {
      const archivePath = `archive/${input.namespace}/${input.key}`
      archivePromise = privateStorage.writeBinary(archivePath, archiveStream)
      uploadPromises.push(archivePromise)
    }

    // Wait for both storage buckets to fully process the streams
    const results = await Promise.all(uploadPromises)

    if (archiveStream && results[1]) {
      // Capture actual written specs from the private storage result
      rawHash = results[1].hashEtag
      sizeBytes = results[1].sizeBytes
    }

    // 4. Save metadata transactional record in D1 DB
    await db.insert(assets).values({
      namespace: input.namespace,
      key: input.key,
      hashEtag: rawHash,
      sizeBytes,
      syncedAt: Date.now(),
      routingType: input.routingType,
      storageClass: input.storageClass,
      generationSource: input.generation?.source ?? null,
      generationParams: input.generation ? JSON.stringify(input.generation.params) : null,
      isDirty: false
    })

    return {
      publicPath,
      sizeBytes,
      hashEtag: rawHash
    }
  } catch (error) {
    // Clean up private master cache storage on failure
    if (input.storageClass === 'archived') {
      const archivePath = `archive/${input.namespace}/${input.key}`
      await privateStorage.delete(archivePath).catch(() => {})
    }
    throw error
  }
}

