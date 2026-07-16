import { CIPHER_CONFIG, parseEnvelopeHeader, deriveBlockIv } from '@schloss/core/src/ciphers'

const { plaintextBlockSizeBytes, encryptedBlockSizeBytes } = CIPHER_CONFIG.streaming

export interface DecryptionContext {
  privateKey?: CryptoKey
  groupMasterKey?: CryptoKey
}

export function decryptAssetStream(
  encryptedStream: ReadableStream<Uint8Array>,
  context: DecryptionContext
): ReadableStream<Uint8Array> {
  const reader = encryptedStream.getReader()
  let accumulator = new Uint8Array(0)
  let header: any = null
  let unwrappedDek: CryptoKey | null = null
  let blockIndex = 0

  // We return the stream synchronously. No data is fetched or decrypted yet.
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          if (accumulator.length > 0) {
            if (accumulator.length <= CIPHER_CONFIG.streaming.tagOverheadBytes) {
              controller.error(new Error('Corrupted asset payload trail detected'))
              return
            }
            const blockIv = deriveBlockIv(header.ivData, blockIndex)
            try {
              const decrypted = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: blockIv, tagLength: 128 },
                unwrappedDek!,
                accumulator
              )
              controller.enqueue(new Uint8Array(decrypted))
            } catch (err) {
              controller.error(new Error('Cryptographic integrity check failed on final block'))
              return
            }
          }
          controller.close()
          break
        }

        const merged = new Uint8Array(accumulator.length + value.length)
        merged.set(accumulator, 0)
        merged.set(value, accumulator.length)
        accumulator = merged

        if (!header) {
          header = parseEnvelopeHeader(accumulator)
          if (header) {
            const headerSize = 29 + header.envelopedDekLength
            // Unwrap the DEK asynchronously only when the first bytes are demanded
            unwrappedDek = await decryptDataEncryptionKey(header, context)
            accumulator = accumulator.slice(headerSize)
          } else {
            continue
          }
        }

        while (accumulator.length >= encryptedBlockSizeBytes) {
          const encryptedBlock = accumulator.slice(0, encryptedBlockSizeBytes)
          accumulator = accumulator.slice(encryptedBlockSizeBytes)
          const blockIv = deriveBlockIv(header.ivData, blockIndex)

          try {
            const decrypted = await window.crypto.subtle.decrypt(
              { name: 'AES-GCM', iv: blockIv, tagLength: 128 },
              unwrappedDek!,
              encryptedBlock
            )
            controller.enqueue(new Uint8Array(decrypted))
            blockIndex++
          } catch (err) {
            controller.error(new Error(`Cryptographic integrity check failed at block index ${blockIndex}`))
            return
          }
        }
        break
      }
    },

    cancel() {
      reader.releaseLock()
    }
  })
}

async function decryptDataEncryptionKey(header: any, context: DecryptionContext): Promise<CryptoKey> {
  const subtle = window.crypto.subtle

  if (header.routingType === 'individual') {
    if (!context.privateKey) {
      throw new Error('Private key missing for individual decryption routing')
    }

    const rawPublicKey = header.envelopedDek.slice(0, 65)
    const encryptedDekBody = header.envelopedDek.slice(65)

    const ephemeralKey = await subtle.importKey(
      'raw',
      rawPublicKey,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      []
    )

    const derivedAesKey = await subtle.deriveKey(
      { name: 'ECDH', public: ephemeralKey },
      context.privateKey,
      { name: 'AES-GCM', length: 256 },
      true,
      ['decrypt']
    )

    const rawDekBytes = await subtle.decrypt(
      { name: 'AES-GCM', iv: header.ivEnvelope },
      derivedAesKey,
      encryptedDekBody
    )

    return await subtle.importKey(
      'raw',
      rawDekBytes,
      { name: 'AES-GCM' },
      true,
      ['decrypt']
    )
  }

  if (header.routingType === 'group') {
    if (!context.groupMasterKey) {
      throw new Error('Group Master Key missing for symmetric envelope decryption')
    }

    const rawDekBytes = await subtle.decrypt(
      { name: 'AES-GCM', iv: header.ivEnvelope },
      context.groupMasterKey,
      header.envelopedDek
    )

    return await subtle.importKey(
      'raw',
      rawDekBytes,
      { name: 'AES-GCM' },
      true,
      ['decrypt']
    )
  }

  throw new Error('Unsupported asset decryption routing scheme')
}

export function decryptResponse(
  response: Response,
  context: DecryptionContext
): Response {
  if (!response.ok) {
    throw new Error(`Cannot decrypt failed network response: ${response.status}`)
  }

  if (!response.body) {
    throw new Error('Response body is empty or unavailable for decryption')
  }

  // Returns synchronously and instantly. Pipeline is linked but idle.
  const decryptedStream = decryptAssetStream(response.body, context)

  return new Response(decryptedStream, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  })
}

