export interface CipherEnvelopeHeader {
  routingType: string
  keyVersion: number
  ivEnvelope: Uint8Array
  ivData: Uint8Array
  envelopedDekLength: number
  envelopedDek: Uint8Array
}

export const CIPHER_CONFIG = {
  symmetric: {
    name: 'AES-GCM',
    tagLength: 128
  },
  keyAgreement: {
    name: 'ECDH',
    namedCurve: 'P-256'
  },
  keyWrap: {
    name: 'AES-KW'
  },
  streaming: {
    plaintextBlockSizeBytes: 65536,
    tagOverheadBytes: 16,
    get encryptedBlockSizeBytes() {
      return this.plaintextBlockSizeBytes + this.tagOverheadBytes
    }
  }
}

export function deriveBlockIv(baseIv: Uint8Array, blockIndex: number): Uint8Array {
  const iv = new Uint8Array(baseIv)
  const view = new DataView(iv.buffer, iv.byteOffset, iv.length)
  const baseCounter = view.getUint32(8, false)
  const nextCounter = (baseCounter + blockIndex) >>> 0
  view.setUint32(8, nextCounter, false)
  return iv
}

export function parseEnvelopeHeader(buffer: Uint8Array): CipherEnvelopeHeader | null {
  if (buffer.length < 29) {
    return null
  }

  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.length)
  const routingTypeByte = view.getUint8(0)

  let routingType = 'public'
  if (routingTypeByte === 1) {
    routingType = 'individual'
  } else if (routingTypeByte === 2) {
    routingType = 'group'
  }

  const keyVersion = view.getUint16(1, false)
  const ivEnvelope = new Uint8Array(buffer.buffer, buffer.byteOffset + 3, 12)
  const ivData = new Uint8Array(buffer.buffer, buffer.byteOffset + 15, 12)
  const envelopedDekLength = view.getUint16(27, false)

  if (buffer.length < 29 + envelopedDekLength) {
    return null
  }

  const envelopedDek = new Uint8Array(buffer.buffer, buffer.byteOffset + 29, envelopedDekLength)

  return {
    routingType,
    keyVersion,
    ivEnvelope,
    ivData,
    envelopedDekLength,
    envelopedDek
  }
}

