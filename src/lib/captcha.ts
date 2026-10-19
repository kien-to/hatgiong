const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

interface Turnstile {
  render: (el: HTMLElement, options: Record<string, unknown>) => string
  remove: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: Turnstile
  }
}

let scriptPromise: Promise<void> | undefined

function loadScript(): Promise<void> {
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Turnstile failed to load'))
    document.head.appendChild(script)
  })
  return scriptPromise
}

export const captchaEnabled = Boolean(SITE_KEY)

/** Resolves to a Cloudflare Turnstile token for Supabase Auth, or undefined when CAPTCHA isn't configured. */
export async function captchaToken(): Promise<string | undefined> {
  if (!SITE_KEY) return undefined
  await loadScript()
  const turnstile = window.turnstile
  if (!turnstile) throw new Error('Turnstile unavailable')
  return new Promise((resolve, reject) => {
    const el = document.createElement('div')
    el.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:60'
    document.body.appendChild(el)
    const cleanup = (id: string) =>
      setTimeout(() => {
        turnstile.remove(id)
        el.remove()
      }, 0)
    const id = turnstile.render(el, {
      sitekey: SITE_KEY,
      appearance: 'interaction-only',
      callback: (token: string) => {
        cleanup(id)
        resolve(token)
      },
      'error-callback': () => {
        cleanup(id)
        reject(new Error('CAPTCHA failed'))
      },
    })
  })
}
