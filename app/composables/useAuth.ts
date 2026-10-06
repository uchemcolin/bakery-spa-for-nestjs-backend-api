interface User {
id: number
name: string
email: string | null
oidcIssuer: string | null
oidcSubject: string | null
}

export type AuthStatus =
| 'idle'
| 'loading'
| 'authenticated'
| 'unauthenticated'
| 'error'

export const useAuth = () => {
const config = useRuntimeConfig()

/*

NestJS application access token.

This is NOT the Keycloak access token.

NestJS creates this token after successful Keycloak

authentication and gives it to Nuxt through the

one-time exchange-code flow.
*/
const token = useCookie<string | null>('auth_token', {
default: () => null,

/*
 * JavaScript needs access to this token because
 * it must send:
 *
 * Authorization: Bearer <token>
 *
 * to NestJS.
 */
httpOnly: false,

sameSite: 'lax',

/*
 * HTTPS-only in production.
 */
secure: !import.meta.dev,

maxAge: 60 * 60 * 24,


})

const user = useState<User | null>(
'auth.user',
() => null
)

const loading = useState<boolean>(
'auth.loading',
() => false
)

const initialized = useState<boolean>(
'auth.initialized',
() => false
)

const error = useState<string | null>(
'auth.error',
() => null
)

const status = computed<AuthStatus>(() => {
if (loading.value) return 'loading'
if (error.value) return 'error'
if (user.value) return 'authenticated'
if (initialized.value) return 'unauthenticated'

return 'idle'


})

/**

Fetch the currently authenticated NestJS user.

GET:

http://localhost:8001/api/user

with:

Authorization: Bearer <application-token>
*/
async function fetchUser(
force = false
): Promise<User | null> {
if (initialized.value && !force) {
return user.value
}

/*
 * There is no application token.
 */
if (!token.value) {
  user.value = null
  initialized.value = true
  error.value = null

  return null
}

loading.value = true
error.value = null

try {
  const fetcher = useRequestFetch()

  const data = await fetcher<User>(
    `${config.public.apiBase}/api/user`,
    {
      method: 'GET',

      headers: {
        Accept: 'application/json',

        Authorization:
          `Bearer ${token.value}`,
      },
    }
  )

  user.value = data
  initialized.value = true
  error.value = null

  return data
} catch (e: any) {
  const code =
    e?.status ??
    e?.statusCode ??
    e?.response?.status

  /*
   * A 401 means the NestJS application token
   * is invalid, expired, or revoked.
   */
  if (code === 401) {
    token.value = null
    user.value = null
    error.value = null
  } else {
    user.value = null

    error.value =
      e?.data?.message ??
      e?.message ??
      'Failed to check authentication.'
  }

  initialized.value = true

  return null
} finally {
  loading.value = false
}


}

/**

Start the Keycloak OIDC login flow.

IMPORTANT:

Nuxt does NOT talk directly to Keycloak.

The browser first goes to NestJS:

http://localhost:8001/sso/redirect

NestJS then redirects to Keycloak.
*/
function login(): void {
if (!import.meta.client) {
return
}

window.location.href =
  config.public.loginUrl


}

/**

Exchange the short-lived NestJS authentication

code for the application's access token.

NestJS endpoint:

POST /api/auth/exchange
*/
async function exchangeCode(
code: string
): Promise<boolean> {
loading.value = true
error.value = null

try {
  const response = await $fetch<{
    token: string
    token_type: string
  }>(
    `${config.public.apiBase}/api/auth/exchange`,
    {
      method: 'POST',

      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },

      body: {
        code,
      },
    }
  )

  if (!response.token) {
    throw new Error(
      'Authentication token was not returned.'
    )
  }

  /*
   * Store the NestJS application token.
   */
  token.value = response.token

  /*
   * Reset authentication state so fetchUser()
   * performs a real API request.
   */
  user.value = null
  initialized.value = false
  error.value = null

  /*
   * Verify the new token against NestJS and
   * retrieve the authenticated user.
   */
  const authenticatedUser =
    await fetchUser(true)

  return !!authenticatedUser
} catch (e: any) {
  token.value = null
  user.value = null
  initialized.value = true

  error.value =
    e?.data?.message ??
    e?.message ??
    'Authentication failed.'

  return false
} finally {
  loading.value = false
}


}

/**

Log out from NestJS and then optionally

complete Keycloak federated logout.
*/
async function logout(): Promise<void> {
let logoutUrl: string | null = null

try {
  if (token.value) {
    const data =
      await $fetch<{
        message: string
        logout_url?: string | null
      }>(
        `${config.public.apiBase}/api/logout`,
        {
          method: 'POST',

          headers: {
            Accept: 'application/json',

            Authorization:
              `Bearer ${token.value}`,
          },
        }
      )

    logoutUrl =
      data.logout_url ?? null
  }
} catch {
  /*
   * Even if NestJS is unreachable,
   * clear the local authentication state.
   */
}

/*
 * Remove the NestJS application token.
 */
token.value = null

/*
 * Remove the authenticated user.
 */
user.value = null

initialized.value = true
error.value = null

if (import.meta.client) {
  if (logoutUrl) {
    /*
     * Complete Keycloak federated logout.
     */
    window.location.href = logoutUrl
  } else {
    /*
     * No Keycloak logout URL available.
     */
    await navigateTo('/', {
      replace: true,
    })
  }
}


}

return {
token,
user,
loading,
initialized,
error,
status,

fetchUser,
exchangeCode,
login,
logout,


}
}