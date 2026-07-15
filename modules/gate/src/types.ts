export type AuthState = 'unprovisioned' | 'active' | 'pending_approval' | 'locked'

export interface UserRegistrationPacket {
  keyBackup: JsonWebKey
  salt: string
}

export interface EscrowBundle {
  keyBackup: JsonWebKey
  salt: string
  appGuid: string
}

