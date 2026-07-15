import type { UserRegistrationPacket, EscrowBundle, AuthState } from './types'

export interface SchlossState {
  status: AuthState
  appGuid?: string
}

export class SchlossAuthEngine {
  private apiBaseUrl: string
  private cdnBaseUrl: string
  private rawKeyMaterial: CryptoKey | null = null

  constructor(apiBaseUrl: string, cdnBaseUrl: string) {
    this.apiBaseUrl = apiBaseUrl
    this.cdnBaseUrl = cdnBaseUrl
  }

  async boot(firebaseToken: string): Promise<SchlossState> {
    const response = await fetch(`${this.apiBaseUrl}/api/users/status`, { headers: { 'Authorization': `Bearer ${firebaseToken}` } })

    if (!response.ok) {
      if (response.status === 403) return { status: 'locked' }
      throw new Error('Failed to synchronize status with backend')
    }

    const data = await response.json()
    return {
      status: data.status,
      appGuid: data.appGuid
    }
  }

  async onboard(firebaseToken: string, passcode: string): Promise<void> {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    this.rawKeyMaterial = await this.deriveMasterKey(passcode, salt)

    const exportedJwk = await crypto.subtle.exportKey('jwk', this.rawKeyMaterial)

    const payload: UserRegistrationPacket = {
      keyBackup: exportedJwk,
      salt: btoa(String.fromCharCode(...salt))
    }

    const response = await fetch(`${this.apiBaseUrl}/api/onboard`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${firebaseToken}` }, body: JSON.stringify(payload) })

    if (!response.ok) throw new Error('Onboarding handshake failed with backend')
  }

  async unlock(passcode: string): Promise<boolean> {
    try {
      const storedSaltBase64 = localStorage.getItem('schloss_local_salt')
      if (!storedSaltBase64) return false

      const salt = Uint8Array.from(atob(storedSaltBase64), c => c.charCodeAt(0))
      this.rawKeyMaterial = await this.deriveMasterKey(passcode, salt)
      return true
    } catch {
      return false
    }
  }

  async linkDevice(firebaseToken: string, passcode: string): Promise<void> {
    const response = await fetch(`${this.apiBaseUrl}/api/keys/escrow`, { headers: { 'Authorization': `Bearer ${firebaseToken}` } })

    if (!response.ok) throw new Error('Escrow key retrieval rejected')
    const { keyBackup, salt: saltBase64 }: EscrowBundle = await response.json()

    const salt = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0))
    this.rawKeyMaterial = await this.deriveMasterKey(passcode, salt)

    localStorage.setItem('schloss_local_salt', saltBase64)
  }

  async requestAdminGatedRekey(firebaseToken: string, temporaryPasscode: string): Promise<void> {
    const response = await fetch(`${this.apiBaseUrl}/api/rekey/request`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${firebaseToken}` }, body: JSON.stringify({ tempPass: temporaryPasscode }) })

    if (!response.ok) throw new Error('Reset request refused by backend')
  }

  clearSession(): void {
    this.rawKeyMaterial = null
  }

  private async deriveMasterKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder()
    const baseKey = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey'])

    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, baseKey, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
  }
}

