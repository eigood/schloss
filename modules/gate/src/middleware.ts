export interface AuthenticatedContext {
  uid: string
  email?: string
  appGuid?: string
}

export function decodeJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''))
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

export async function verifyFirebaseJwt(token: string, firebaseProjectId: string): Promise<AuthenticatedContext | null> {
  try {
    const payload = decodeJwt(token)
    if (!payload) return null

    const now = Math.floor(Date.now() / 1000)
    if (payload.exp < now) return null
    if (payload.aud !== firebaseProjectId) return null
    if (payload.iss !== `https://securetoken.google.com/${firebaseProjectId}`) return null

    const jwksResponse = await fetch('https://www.googleapis.com/robot/v1/metadata/jwk/securetoken@system.gserviceaccount.com')
    const { keys } = await jwksResponse.json()

    const header = JSON.parse(atob(token.split('.')[0]))
    const jwk = keys.find((key: any) => key.kid === header.kid)
    if (!jwk) return null

    const publicKey = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])

    const encoder = new TextEncoder()
    const dataSegment = encoder.encode(token.split('.').slice(0, 2).join('.'))
    const signatureSegment = Uint8Array.from(atob(token.split('.')[2].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))

    const isValid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publicKey, signatureSegment, dataSegment)

    if (!isValid) return null

    return {
      uid: payload.sub,
      email: payload.email,
      appGuid: payload.schloss_app_guid || undefined
    }
  } catch (error) {
    console.error('Cryptographic token validation failed:', error)
    return null
  }
}

export function guard(firebaseProjectId: string, handler: (req: Request, auth: AuthenticatedContext) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing bearer authorization' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }

    const token = authHeader.substring(7)
    const authContext = await verifyFirebaseJwt(token, firebaseProjectId)

    if (!authContext) {
      return new Response(JSON.stringify({ error: 'Identity verification failed' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
    }

    return handler(req, authContext)
  }
}

