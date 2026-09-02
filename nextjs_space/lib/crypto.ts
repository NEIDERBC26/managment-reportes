import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY ?? ''
  // Expect 64 hex chars (32 bytes). Fallback: hash whatever we got to 32 bytes.
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex')
  }
  return crypto.createHash('sha256').update(raw || 'default-insecure-key').digest()
}

/** Encrypts a plaintext string. Returns iv:authTag:ciphertext (all hex). */
export function encrypt(plainText: string): string {
  try {
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
    const encrypted = Buffer.concat([
      cipher.update(plainText ?? '', 'utf8'),
      cipher.final(),
    ])
    const authTag = cipher.getAuthTag()
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
  } catch (err) {
    console.error('[crypto] encrypt error:', err)
    throw new Error('No se pudo encriptar el valor.')
  }
}

/** Decrypts a value produced by encrypt(). Returns the original plaintext. */
export function decrypt(payload: string): string {
  try {
    const parts = (payload ?? '').split(':')
    if (parts.length !== 3) return ''
    const [ivHex, tagHex, dataHex] = parts
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, 'hex'))
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ])
    return decrypted.toString('utf8')
  } catch (err) {
    console.error('[crypto] decrypt error:', err)
    return ''
  }
}
