import { SchlossAuthEngine } from '../auth'

class SchlossAuthEngineElement extends HTMLElement {
  private engine: SchlossAuthEngine
  private statusText: HTMLElement | null = null
  private screens: HTMLElement[] = []
  private currentFirebaseToken: string = ''
  private handleTokenBound: (e: Event) => void

  constructor() {
    super()
    const api = this.getAttribute('data-api') || ''
    const cdn = this.getAttribute('data-cdn') || ''
    this.engine = new SchlossAuthEngine(api, cdn)
    this.handleTokenBound = this.handleTokenEvent.bind(this)
  }

  connectedCallback() {
    this.statusText = this.querySelector('.auth-status-text')
    this.screens = Array.from(this.querySelectorAll('.auth-screen')) as HTMLElement[]

    this.setupOnboard()
    this.setupUnlock()
    this.setupLink()
    this.setupDashboard()

    // Listen for asynchronous token state changes from your application's Firebase handler
    this.addEventListener('schloss-token-changed', this.handleTokenBound)

    this.updateStatus('Status: Awaiting authentication credentials...')
  }

  disconnectedCallback() {
    this.removeEventListener('schloss-token-changed', this.handleTokenBound)
  }

  private updateStatus(msg: string) {
    if (this.statusText) {
      this.statusText.innerText = msg
    }
  }

  private handleTokenEvent(e: Event) {
    const customEvent = e as CustomEvent<{ token: string | null }>
    const newToken = customEvent.detail?.token || ''

    if (!newToken) {
      this.handleLogout()
    } else if (newToken !== this.currentFirebaseToken) {
      this.processNewToken(newToken)
    }
  }

  private async processNewToken(token: string) {
    this.currentFirebaseToken = token
    
    this.updateStatus('Status: Synchronizing security layers...')
    try {
      const state = await this.engine.boot(token)

      if (state.status === 'locked') {
        this.transitionTo('schloss-screen-locked')
        this.updateStatus('Status: Access Blocked')
        return
      }

      if (state.status === 'pending_approval') {
        this.transitionTo('schloss-screen-pending')
        this.updateStatus('Status: Awaiting Approval')
        return
      }

      const hasLocalKey = !!localStorage.getItem('schloss_local_salt')
      if (!hasLocalKey && state.status === 'unprovisioned') {
        const cdnUrl = this.getAttribute('data-cdn')
        const response = await fetch(`${cdnUrl}/profiles/${state.appGuid}.json`, { method: 'HEAD' })
        if (response.status === 200) {
          this.transitionTo('schloss-screen-link')
          this.updateStatus('Status: Link Device')
          return
        }
      }

      if (state.status === 'unprovisioned') {
        this.transitionTo('schloss-screen-onboard')
        this.updateStatus('Status: First-Time Initialization')
        return
      }

      if (state.status === 'active') {
        this.transitionTo('schloss-screen-unlock')
        this.updateStatus('Status: Identity Locked')
      }
    } catch (err: any) {
      console.error(err)
      this.updateStatus('Status: Handshake failed.')
    }
  }

  private handleLogout() {
    this.currentFirebaseToken = ''
    this.engine.clearSession()
    
    // Clear passwords from inputs for security
    this.querySelectorAll('.pass-input').forEach(input => {
      (input as HTMLInputElement).value = ''
    })

    this.screens.forEach(screen => screen.removeAttribute('active'))
    this.updateStatus('Status: Session terminated. Please sign in.')
  }

  private transitionTo(screenTagName: string) {
    this.screens.forEach(screen => {
      if (screen.tagName.toLowerCase() === screenTagName) {
        screen.setAttribute('active', '')
      } else {
        screen.removeAttribute('active')
      }
    })
  }

  private setupOnboard() {
    const onboardScreen = this.querySelector('schloss-screen-onboard')
    if (!onboardScreen) return

    const form = onboardScreen.querySelector('.action-form')
    form?.addEventListener('submit', async (e) => {
      e.preventDefault()
      this.updateStatus('Status: Deriving keys on device...')
      const pass = (form.querySelector('.pass-input') as HTMLInputElement).value
      try {
        await this.engine.onboard(this.currentFirebaseToken, pass)
        this.transitionTo('schloss-screen-dashboard')
        this.updateStatus('Status: Operational')
      } catch (err: any) {
        alert(err.message)
        this.updateStatus('Status: Initialization Error')
      }
    })
  }

  private setupUnlock() {
    const unlockScreen = this.querySelector('schloss-screen-unlock')
    if (!unlockScreen) return

    const form = unlockScreen.querySelector('.action-form')
    const errorDiv = unlockScreen.querySelector('.auth-error') as HTMLElement
    const forgotBtn = unlockScreen.querySelector('.btn-forgot')

    form?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const pass = (form.querySelector('.pass-input') as HTMLInputElement).value
      const success = await this.engine.unlock(pass)
      if (success) {
        this.transitionTo('schloss-screen-dashboard')
        this.updateStatus('Status: Operational')
      } else if (errorDiv) {
        errorDiv.innerText = 'Cryptographic auth failed. Bad passphrase.'
      }
    })

    forgotBtn?.addEventListener('click', async () => {
      const confirmReset = confirm('Warning: Resetting your keys destroys local encrypted files until approved by an administrator. Proceed?')
      if (!confirmReset) return

      const newPass = prompt('Set a brand new master passphrase to request key generation:')
      if (!newPass) return

      this.updateStatus('Status: Registering identity reset request...')
      try {
        await this.engine.requestAdminGatedRekey(this.currentFirebaseToken, newPass)
        this.transitionTo('schloss-screen-pending')
        this.updateStatus('Status: Awaiting Approval')
      } catch (err: any) {
        alert(err.message)
        this.updateStatus('Status: Error sending rotation request')
      }
    })
  }

  private setupLink() {
    const linkScreen = this.querySelector('schloss-screen-link')
    if (!linkScreen) return

    const form = linkScreen.querySelector('.action-form')
    const errorDiv = linkScreen.querySelector('.auth-error') as HTMLElement

    form?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const pass = (form.querySelector('.pass-input') as HTMLInputElement).value
      try {
        await this.engine.linkDevice(this.currentFirebaseToken, pass)
        this.transitionTo('schloss-screen-dashboard')
        this.updateStatus('Status: Operational')
      } catch (err: any) {
        if (errorDiv) {
          errorDiv.innerText = err.message
        }
      }
    })
  }

  private setupDashboard() {
    const dashboardScreen = this.querySelector('schloss-screen-dashboard')
    if (!dashboardScreen) return

    const lockBtn = dashboardScreen.querySelector('.btn-lock')
    lockBtn?.addEventListener('click', () => {
      this.engine.clearSession()
      const passInput = this.querySelector('schloss-screen-unlock .pass-input') as HTMLInputElement
      if (passInput) passInput.value = ''
      this.transitionTo('schloss-screen-unlock')
      this.updateStatus('Status: Locked')
    })
  }
}

customElements.define('schloss-auth-engine', SchlossAuthEngineElement)
customElements.define('schloss-screen-locked', class extends HTMLElement {})
customElements.define('schloss-screen-onboard', class extends HTMLElement {})
customElements.define('schloss-screen-unlock', class extends HTMLElement {})
customElements.define('schloss-screen-link', class extends HTMLElement {})
customElements.define('schloss-screen-pending', class extends HTMLElement {})
customElements.define('schloss-screen-dashboard', class extends HTMLElement {})

