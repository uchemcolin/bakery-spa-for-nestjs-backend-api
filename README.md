================================================================================
BAKERY SPA — Nuxt 4 + NestJS 11 + Keycloak
================================================================================

A full-stack Single Sign-On (SSO) demonstration using Nuxt 4, NestJS 11, and
Keycloak.

The Nuxt 4 application acts as the frontend SPA.

NestJS acts as the Backend-for-Frontend (BFF) and owns the OpenID Connect
authentication flow with Keycloak.

Keycloak is the Identity Provider.

The Nuxt application does NOT communicate directly with Keycloak.

Instead, the browser is redirected to the NestJS authentication endpoints.
NestJS communicates with Keycloak, validates the OIDC callback, creates the
application authentication session, and exposes authenticated API endpoints
to the Nuxt application.

The frontend therefore does not need to understand the Keycloak OIDC flow.


================================================================================
ARCHITECTURE
================================================================================

Browser
   |
   v
Nuxt 4 SPA
   |
   | HTTP requests + authentication cookie
   v
NestJS API / BFF
   |
   | OpenID Connect
   v
Keycloak


Local development:

    Nuxt:
        http://localhost:3001

    NestJS:
        http://localhost:8001

    Keycloak:
        http://localhost:9000

    Keycloak Realm:
        myapp


The important separation is:

    Nuxt
       |
       | Browser authentication/navigation
       v
    NestJS
       |
       | OIDC
       v
    Keycloak


The Nuxt application does NOT directly communicate with:

    http://localhost:9000


All authentication-related communication is initiated through NestJS.


================================================================================
AUTHENTICATION MODEL
================================================================================

NestJS is the OIDC client.

Nuxt is NOT the OIDC client.

The browser does not need to receive or process Keycloak access tokens,
ID tokens, refresh tokens, or client secrets.

The intended authentication flow is:

    Browser
       |
       | 1. User clicks "Sign in"
       v
    Nuxt
       |
       | 2. Browser navigates to:
       |    http://localhost:8001/sso/redirect
       v
    NestJS
       |
       | 3. Creates OIDC authorization request
       v
    Keycloak
       |
       | 4. User authenticates
       |
       | 5. Keycloak redirects to:
       |    http://localhost:8001/sso/callback
       v
    NestJS
       |
       | 6. Validates callback
       | 7. Exchanges authorization code
       | 8. Resolves local user
       | 9. Creates application session
       v
    Browser
       |
       | 10. NestJS redirects browser to Nuxt
       v
    Nuxt /dashboard
       |
       | 11. GET /api/user
       v
    NestJS
       |
       | 12. Authenticated user JSON
       v
    Nuxt


IMPORTANT:

The Keycloak authorization callback belongs to NestJS.

It does NOT belong to Nuxt.

Therefore the Keycloak redirect URI should be:

    http://localhost:8001/sso/callback


NOT:

    http://localhost:3001/callback

and NOT:

    http://localhost:3001/sso/callback


================================================================================
KEY CHARACTERISTICS
================================================================================

- Nuxt 4 frontend
- NestJS backend API
- NestJS acts as the BFF
- Keycloak acts as the Identity Provider
- NestJS owns the OIDC flow
- NestJS owns the OIDC callback
- NestJS creates the authenticated application session
- Nuxt does not communicate directly with Keycloak
- Nuxt does not implement OIDC
- Nuxt does not exchange Keycloak authorization codes
- Nuxt does not validate Keycloak tokens
- Nuxt does not store Keycloak access tokens
- Nuxt does not store Keycloak ID tokens
- Nuxt does not store Keycloak refresh tokens
- Client secrets remain on NestJS
- Authentication state is obtained from NestJS
- Authenticated user information is obtained from NestJS
- Browser authentication uses the NestJS session cookie
- NestJS exposes authenticated application endpoints
- Federated logout can terminate the Keycloak SSO session


================================================================================
TABLE OF CONTENTS
================================================================================

1.  What This Project Does
2.  Architecture
3.  Authentication Model
4.  Requirements
5.  Local Development Ports
6.  Keycloak Configuration
7.  Nuxt Configuration
8.  Directory Structure
9.  Authentication Flow
10. Authentication Composable
11. Authentication Middleware
12. Login Page
13. Callback Page
14. Dashboard
15. NestJS API Endpoints
16. Cookie and CORS Configuration
17. Testing the Authentication Flow
18. Common Errors and Fixes
19. Production Migration Checklist
20. Security Notes
21. Related Projects
22. Author


================================================================================
1. WHAT THIS PROJECT DOES
================================================================================

The Bakery SPA is a Nuxt 4 frontend that uses NestJS as a Backend-for-Frontend
(BFF).

The frontend is responsible for:

- Rendering the application UI
- Displaying authentication state
- Redirecting the browser to NestJS for login
- Calling NestJS authenticated API endpoints
- Displaying the authenticated user
- Redirecting unauthenticated users to /login
- Logging out through NestJS
- Following the federated logout URL returned by NestJS when available


The frontend does NOT:

- Communicate directly with Keycloak
- Implement OpenID Connect
- Perform OIDC discovery
- Build Keycloak authorization requests
- Exchange Keycloak authorization codes
- Validate Keycloak ID tokens
- Validate Keycloak access tokens
- Store Keycloak access tokens
- Store Keycloak ID tokens
- Store Keycloak refresh tokens
- Store Keycloak client secrets
- Authenticate users independently of NestJS
- Determine whether a Keycloak identity is trustworthy


Authentication decisions belong to NestJS.


================================================================================
2. ARCHITECTURE
================================================================================

Local development uses:

    Nuxt:
        http://localhost:3001

    NestJS:
        http://localhost:8001

    Keycloak:
        http://localhost:9000


Application architecture:

    +-----------------------+
    |       Browser         |
    +-----------+-----------+
                |
                |
                v
    +-----------------------+
    |       Nuxt 4 SPA      |
    |   localhost:3001      |
    +-----------+-----------+
                |
                | HTTP
                | Cookies
                | /api/user
                | /api/logout
                |
                v
    +-----------------------+
    |      NestJS API       |
    |       / BFF           |
    |   localhost:8001      |
    +-----------+-----------+
                |
                | OpenID Connect
                |
                v
    +-----------------------+
    |       Keycloak        |
    |   localhost:9000      |
    +-----------------------+


The frontend communicates with NestJS.

NestJS communicates with Keycloak.

The frontend does not communicate directly with Keycloak.


There are two authentication sessions.

1. Keycloak SSO session

   Owned by Keycloak.

   This session determines whether the user is authenticated with the
   Identity Provider.

2. NestJS application session

   Owned by NestJS.

   This session determines whether the browser is authenticated to the
   Bakery application.


The Nuxt application should not inspect the Keycloak session directly.

Instead, it asks NestJS:

    GET /api/user


If NestJS recognizes the session:

    HTTP 200


If NestJS does not recognize the session:

    HTTP 401


================================================================================
3. AUTHENTICATION MODEL
================================================================================

NestJS is responsible for authentication.

The browser is simply redirected through the authentication flow.

The complete flow is:

    Browser
       |
       | GET /sso/redirect
       v
    NestJS
       |
       | OIDC Authorization Request
       v
    Keycloak
       |
       | User Login
       |
       | Authorization Code
       v
    NestJS /sso/callback
       |
       | Exchange authorization code
       | Validate identity
       | Find/create local user
       | Create application session
       v
    Browser
       |
       | Session cookie
       v
    Nuxt SPA


After successful authentication:

    Nuxt
       |
       | GET /api/user
       | Cookie: NestJS session
       v
    NestJS
       |
       | Authenticated user
       v
    Nuxt


The frontend should not receive:

    access_token
    id_token
    refresh_token
    client_secret


The frontend should only need the authenticated application session.


================================================================================
4. REQUIREMENTS
================================================================================

Required software:

- Node.js 20 or newer
- npm
- NestJS
- Prisma
- PostgreSQL or the configured application database
- Keycloak 26.x or compatible
- A modern browser


Recommended Node.js version:

    Node.js 20+


Check Node:

    node -v


Check npm:

    npm -v


Check NestJS project:

    npm run start:dev


Check Prisma:

    npx prisma --version


================================================================================
5. LOCAL DEVELOPMENT PORTS
================================================================================

The local development environment uses:

    Nuxt:
        http://localhost:3001

    NestJS:
        http://localhost:8001

    Keycloak:
        http://localhost:9000


Do not accidentally use the old Laravel ports.

The current architecture is:

    Nuxt:
        3001

    NestJS:
        8001

    Keycloak:
        9000


The authentication callback belongs to NestJS:

    http://localhost:8001/sso/callback


The login endpoint belongs to NestJS:

    http://localhost:8001/sso/redirect


The API belongs to NestJS:

    http://localhost:8001/api


================================================================================
6. KEYCLOAK CONFIGURATION
================================================================================

Keycloak Realm:

    myapp


Keycloak:

    http://localhost:9000


Realm:

    http://localhost:9000/realms/myapp


The Keycloak client is used by NestJS.

The Nuxt application is NOT the Keycloak OIDC client.


The client should have a redirect URI matching NestJS:

    http://localhost:8001/sso/callback


The client should NOT use:

    http://localhost:3001/callback


unless the architecture is intentionally changed so that Nuxt becomes the
OIDC client.


For the current BFF architecture, NestJS owns the callback.


Post-logout redirect should point back to the Nuxt application.

Example:

    http://localhost:3001


The exact URI must also be registered in Keycloak.


================================================================================
7. NUXT CONFIGURATION
================================================================================

Nuxt runtime configuration should point to NestJS.

Example:

    export default defineNuxtConfig({
      compatibilityDate: '2025-01-01',

      devtools: {
        enabled: true,
      },

      runtimeConfig: {
        public: {
          apiBase: 'http://localhost:8001',
          loginUrl: 'http://localhost:8001/sso/redirect',
        },
      },
    })


The important values are:

    apiBase:

        http://localhost:8001


    loginUrl:

        http://localhost:8001/sso/redirect


The frontend must not point these values to Keycloak.


Do NOT configure:

    apiBase:
        http://localhost:9000


Do NOT configure:

    loginUrl:
        http://localhost:9000/realms/myapp/...


Nuxt should only know the NestJS API and login endpoints.


================================================================================
8. DIRECTORY STRUCTURE
================================================================================

Nuxt 4 uses the app/ directory for application source code.

Example:

    bakery-spa/
    |
    +-- nuxt.config.ts
    +-- package.json
    |
    +-- app/
        |
        +-- app.vue
        |
        +-- composables/
        |   |
        |   +-- useAuth.ts
        |
        +-- layouts/
        |   |
        |   +-- default.vue
        |
        +-- middleware/
        |   |
        |   +-- auth.ts
        |   +-- guest.ts
        |
        +-- pages/
            |
            +-- index.vue
            +-- login.vue
            +-- dashboard.vue


A callback page is generally NOT required when NestJS owns the OIDC callback.

The browser should return from:

    NestJS /sso/callback


directly to:

    Nuxt /dashboard


Therefore the preferred architecture does not require:

    app/pages/callback.vue


================================================================================
9. AUTHENTICATION FLOW
================================================================================

9.1 User opens the application

Browser opens:

    http://localhost:3001


Nuxt checks the current authentication state.

The frontend may request:

    GET http://localhost:8001/api/user


If the NestJS session exists:

    HTTP 200


Example response:

    {
        "id": 1,
        "name": "Test User",
        "email": "test@example.com",
        "oidc_issuer": "http://localhost:9000/realms/myapp",
        "oidc_subject": "abc123"
    }


If the user is not authenticated:

    HTTP 401


Nuxt then treats the user as unauthenticated.


--------------------------------------------------------------------------------
9.2 User clicks Sign In
--------------------------------------------------------------------------------

The Nuxt login function redirects the browser to:

    http://localhost:8001/sso/redirect


NestJS creates the OIDC authorization request.


The browser is redirected to Keycloak.


Keycloak displays its login page if there is no existing SSO session.


After successful login, Keycloak redirects to:

    http://localhost:8001/sso/callback


NestJS receives the authorization code.


NestJS then:

- validates the OIDC response
- exchanges the authorization code
- validates the identity
- reads the issuer
- reads the subject
- obtains user information
- finds or creates the local user
- creates the application session
- sets the authentication cookie
- redirects the browser back to Nuxt


The browser is then redirected to something such as:

    http://localhost:3001/dashboard


Nuxt loads the dashboard.


The dashboard requests:

    GET http://localhost:8001/api/user


NestJS sees the application session cookie and returns the authenticated user.


--------------------------------------------------------------------------------
9.3 Authenticated requests
--------------------------------------------------------------------------------

Nuxt sends:

    GET /api/user


to:

    http://localhost:8001/api/user


The browser sends the NestJS authentication cookie.


NestJS authenticates the request.


The response contains the application's user representation.


Example:

    {
        "id": 1,
        "name": "Test User",
        "email": "test@example.com",
        "oidc_issuer": "http://localhost:9000/realms/myapp",
        "oidc_subject": "abc123"
    }


The frontend does not need the Keycloak access token.


--------------------------------------------------------------------------------
9.4 Logout
--------------------------------------------------------------------------------

Nuxt sends:

    POST http://localhost:8001/api/logout


NestJS:

- destroys the local application session
- clears/invalidate the authentication cookie
- optionally creates a Keycloak logout URL
- returns the logout URL to Nuxt


Example response:

    {
        "message": "Logged out successfully",
        "logout_url": "..."
    }


Nuxt follows the logout URL when provided.


Keycloak then terminates the SSO session.


The browser eventually returns to:

    http://localhost:3001


--------------------------------------------------------------------------------
9.5 Federated logout
--------------------------------------------------------------------------------

Logging out of NestJS alone is not necessarily enough.


If only the NestJS session is destroyed:

    NestJS session:
        destroyed

    Keycloak session:
        active


The next login attempt may immediately authenticate the user again.


Federated logout terminates both sessions:

    NestJS session:
        destroyed

    Keycloak session:
        destroyed


The next login attempt should then require authentication again.


================================================================================
10. AUTHENTICATION COMPOSABLE
================================================================================

The Nuxt authentication composable should communicate with NestJS only.

Example:

    interface User {
      id: number
      name: string
      email: string | null
      oidc_issuer: string
      oidc_subject: string
    }

    export type AuthStatus =
      | 'idle'
      | 'loading'
      | 'authenticated'
      | 'unauthenticated'
      | 'error'

    export const useAuth = () => {
      const config = useRuntimeConfig()

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
        if (loading.value) {
          return 'loading'
        }

        if (error.value) {
          return 'error'
        }

        if (user.value) {
          return 'authenticated'
        }

        if (initialized.value) {
          return 'unauthenticated'
        }

        return 'idle'
      })

      async function fetchUser(
        force = false
      ): Promise<User | null> {
        if (initialized.value && !force) {
          return user.value
        }

        loading.value = true
        error.value = null

        try {
          const fetcher = useRequestFetch()

          const data = await fetcher<User>(
            `${config.public.apiBase}/api/user`,
            {
              method: 'GET',

              credentials: 'include',

              headers: {
                Accept: 'application/json',
              },
            }
          )

          user.value = data
          initialized.value = true

          return data
        } catch (e: any) {
          const code =
            e?.status ??
            e?.statusCode ??
            e?.response?.status

          if (code === 401) {
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

      function login(): void {
        if (import.meta.client) {
          window.location.href =
            config.public.loginUrl
        }
      }

      async function logout(): Promise<void> {
        let logoutUrl: string | null = null

        try {
          const data =
            await $fetch<{
              message: string
              logout_url?: string | null
            }>(
              `${config.public.apiBase}/api/logout`,
              {
                method: 'POST',

                credentials: 'include',

                headers: {
                  Accept: 'application/json',
                },
              }
            )

          logoutUrl =
            data.logout_url ??
            null
        } catch {
          // Ignore logout errors.
        }

        user.value = null
        initialized.value = true
        error.value = null

        if (import.meta.client) {
          if (logoutUrl) {
            window.location.href =
              logoutUrl
          } else {
            window.location.href =
              '/'
          }
        }
      }

      return {
        user,
        loading,
        initialized,
        error,
        status,
        fetchUser,
        login,
        logout,
      }
    }


IMPORTANT:

There is intentionally NO:

    token

state.


There is intentionally NO:

    auth_token

browser cookie.


There is intentionally NO:

    exchangeCode()


function.


The authorization code is handled by NestJS.


The frontend only needs the NestJS application session.


================================================================================
11. AUTHENTICATION MIDDLEWARE
================================================================================

Create:

    app/middleware/auth.ts


Example:

    export default defineNuxtRouteMiddleware(
      async () => {
        const {
          user,
          fetchUser,
        } = useAuth()

        await fetchUser(true)

        if (!user.value) {
          return navigateTo('/login')
        }
      }
    )


This middleware protects authenticated pages.


For example:

    dashboard.vue


can use:

    definePageMeta({
      middleware: 'auth',
    })


--------------------------------------------------------------------------------
Guest middleware
--------------------------------------------------------------------------------

Create:

    app/middleware/guest.ts


Example:

    export default defineNuxtRouteMiddleware(
      async () => {
        const {
          user,
          fetchUser,
        } = useAuth()

        await fetchUser(true)

        if (user.value) {
          return navigateTo(
            '/dashboard',
            {
              replace: true,
            }
          )
        }
      }
    )


This prevents authenticated users from returning to the login page.


================================================================================
12. LOGIN PAGE
================================================================================

Example:

    <script setup lang="ts">
    definePageMeta({
      middleware: 'guest',
    })

    const {
      login,
    } = useAuth()
    </script>

    <template>
      <div class="container">

        <div class="row justify-content-center">

          <div class="col-md-6">

            <div class="card shadow-sm">

              <div
                class="card-body p-5 text-center"
              >

                <h1 class="h3 mb-3 fw-bold">
                  Welcome
                </h1>

                <p class="text-muted mb-4">
                  Sign in with your organization account
                </p>

                <button
                  @click="login"
                  class="btn btn-primary btn-lg w-100"
                >
                  Sign in with Keycloak SSO
                </button>

              </div>

            </div>

          </div>

        </div>

      </div>
    </template>


When the button is clicked:

    login()


redirects the browser to:

    http://localhost:8001/sso/redirect


It does NOT redirect directly to Keycloak.


================================================================================
13. CALLBACK PAGE
================================================================================

For the current architecture, Nuxt does not need to handle the Keycloak
authorization callback.


The callback belongs to NestJS:

    http://localhost:8001/sso/callback


Therefore the frontend should NOT do this:

    const route = useRoute()

    const code = route.query.code

    await exchangeCode(code)


The frontend should NOT implement an endpoint such as:

    POST /api/oauth/exchange


unless the architecture is intentionally changed.


The preferred flow is:

    Nuxt
       |
       v
    NestJS /sso/redirect
       |
       v
    Keycloak
       |
       v
    NestJS /sso/callback
       |
       v
    NestJS session
       |
       v
    Nuxt /dashboard


There is no Nuxt authorization-code exchange.


This also means that a Nuxt URL such as:

    http://localhost:3001/sso/callback?code=...


is incorrect for the current BFF architecture.


The browser must instead reach:

    http://localhost:8001/sso/callback?code=...


and NestJS must process it.


After NestJS completes authentication, it redirects to Nuxt.


================================================================================
14. DASHBOARD
================================================================================

Example:

    <script setup lang="ts">
    definePageMeta({
      middleware: 'auth',
    })

    const {
      user,
      status,
      error,
      fetchUser,
    } = useAuth()

    if (
      import.meta.client &&
      status.value !== 'authenticated'
    ) {
      await fetchUser()
    }
    </script>

    <template>
      <div class="container py-4">

        <div
          v-if="
            status === 'loading' ||
            status === 'idle'
          "
          class="text-center py-5"
        >

          <div
            class="spinner-border text-primary"
            role="status"
          >
            <span class="visually-hidden">
              Loading your profile...
            </span>
          </div>

          <p class="text-muted mt-2">
            Loading your profile...
          </p>

        </div>

        <div
          v-else-if="status === 'error'"
          class="text-center py-5"
        >

          <p class="text-danger fs-5 mb-2">
            {{
              error ??
              'Could not load your profile.'
            }}
          </p>

          <button
            class="btn btn-outline-primary"
            @click="fetchUser(true)"
          >
            Retry
          </button>

        </div>

        <div
          v-else-if="
            status === 'authenticated' &&
            user
          "
        >

          <div class="alert alert-success">
            <strong>
              Authenticated!
            </strong>
          </div>

          <div class="card shadow-sm">

            <div class="card-header">
              <h2 class="h4 mb-0">
                Your Session
              </h2>
            </div>

            <div class="card-body">

              <table
                class="table table-borderless mb-0"
              >

                <tbody>

                  <tr>
                    <th style="width: 200px;">
                      Local User ID
                    </th>

                    <td>
                      #{{ user.id }}
                    </td>
                  </tr>

                  <tr>
                    <th>
                      Name
                    </th>

                    <td>
                      {{ user.name }}
                    </td>
                  </tr>

                  <tr>
                    <th>
                      Email
                    </th>

                    <td>
                      {{
                        user.email ??
                        'Not provided'
                      }}
                    </td>
                  </tr>

                  <tr>
                    <th>
                      OIDC Issuer
                    </th>

                    <td>
                      <code>
                        {{ user.oidc_issuer }}
                      </code>
                    </td>
                  </tr>

                  <tr>
                    <th>
                      OIDC Subject
                    </th>

                    <td>
                      <code>
                        {{ user.oidc_subject }}
                      </code>
                    </td>
                  </tr>

                </tbody>

              </table>

            </div>

          </div>

        </div>

        <div
          v-else
          class="text-center py-5"
        >

          <p class="text-danger fs-5">
            Not authenticated.
          </p>

          <NuxtLink
            to="/login"
            class="btn btn-primary"
          >
            Go to Login
          </NuxtLink>

        </div>

      </div>
    </template>


================================================================================
15. NESTJS API ENDPOINTS
================================================================================

The Nuxt application expects NestJS to expose the following endpoints.


--------------------------------------------------------------------------------
15.1 Login redirect
--------------------------------------------------------------------------------

    GET /sso/redirect


Full local URL:

    http://localhost:8001/sso/redirect


Purpose:

    Starts the Keycloak OIDC login flow.


The browser should navigate here when the user clicks Sign In.


--------------------------------------------------------------------------------
15.2 OIDC callback
--------------------------------------------------------------------------------

    GET /sso/callback


Full local URL:

    http://localhost:8001/sso/callback


Purpose:

    Receives the authorization response from Keycloak.


NestJS is responsible for:

- validating the authorization response
- exchanging the authorization code
- validating the identity
- creating/updating the local user
- establishing the application session
- redirecting the browser to Nuxt


--------------------------------------------------------------------------------
15.3 Current user
--------------------------------------------------------------------------------

    GET /api/user


Full local URL:

    http://localhost:8001/api/user


Purpose:

    Returns the authenticated application user.


Unauthenticated response:

    HTTP 401


Authenticated response:

    HTTP 200


Example:

    {
        "id": 1,
        "name": "Test User",
        "email": "test@example.com",
        "oidc_issuer": "http://localhost:9000/realms/myapp",
        "oidc_subject": "abc123"
    }


--------------------------------------------------------------------------------
15.4 Logout
--------------------------------------------------------------------------------

    POST /api/logout


Full local URL:

    http://localhost:8001/api/logout


Purpose:

    Logs the user out of the NestJS application session.


NestJS may return:

    {
        "message": "Logged out successfully",
        "logout_url": "..."
    }


Nuxt follows logout_url when it is available.


================================================================================
16. COOKIE AND CORS CONFIGURATION
================================================================================

Because Nuxt and NestJS run on different ports, they have different origins.

Nuxt:

    http://localhost:3001


NestJS:

    http://localhost:8001


Therefore credentialed browser requests must be configured correctly.


NestJS should allow:

    http://localhost:3001


and credentials should be enabled.


Conceptually:

    app.enableCors({
      origin: 'http://localhost:3001',
      credentials: true,
    })


Do NOT use:

    origin: '*'


when authentication cookies are involved.


Nuxt API requests should include:

    credentials: 'include'


Example:

    await $fetch(
      'http://localhost:8001/api/user',
      {
        credentials: 'include',
      }
    )


For SSR requests, use:

    useRequestFetch()


so that relevant request headers/cookies can be forwarded appropriately.


--------------------------------------------------------------------------------
COOKIE
--------------------------------------------------------------------------------

The authentication cookie should be controlled by NestJS.

The frontend should not need to create an authentication token cookie.


Do not create:

    auth_token


in Nuxt if the architecture uses the NestJS session cookie.


Do not store Keycloak tokens in browser-accessible cookies.


The authentication cookie should ideally be:

    HttpOnly


and in production:

    Secure


The appropriate SameSite policy should be selected based on the actual
deployment architecture.


--------------------------------------------------------------------------------
HOST CONSISTENCY
--------------------------------------------------------------------------------

Use:

    localhost


consistently.


Do not mix:

    localhost


with:

    127.0.0.1


during the same authentication flow.


For example, avoid:

    Nuxt:
        http://localhost:3001

    NestJS:
        http://127.0.0.1:8001


Use:

    Nuxt:
        http://localhost:3001

    NestJS:
        http://localhost:8001


This makes browser cookie and CORS behavior easier to reason about.


================================================================================
17. TESTING THE AUTHENTICATION FLOW
================================================================================

17.1 Start Keycloak

Example:

    cd ~/keycloak/keycloak-26.x.x

    export JAVA_HOME=$(/usr/libexec/java_home -v 21)

    bin/kc.sh start-dev --http-port=9000


Keycloak:

    http://localhost:9000


--------------------------------------------------------------------------------
17.2 Start NestJS
--------------------------------------------------------------------------------

From the NestJS project:

    npm run start:dev


NestJS:

    http://localhost:8001


Expected routes should include:

    GET /sso/redirect

    GET /sso/callback

    GET /api/user

    POST /api/logout


--------------------------------------------------------------------------------
17.3 Start Nuxt
--------------------------------------------------------------------------------

From the Nuxt project:

    npm run dev -- --port 3001


Nuxt:

    http://localhost:3001


--------------------------------------------------------------------------------
17.4 Test login
--------------------------------------------------------------------------------

1. Open a fresh/incognito browser window.

2. Visit:

       http://localhost:3001

3. Click:

       Sign In

4. Nuxt redirects to:

       http://localhost:8001/sso/redirect

5. NestJS redirects to Keycloak.

6. Keycloak displays the login page.

7. Enter the Keycloak credentials.

8. Keycloak redirects to:

       http://localhost:8001/sso/callback

9. NestJS processes the authorization code.

10. NestJS creates the application session.

11. NestJS redirects the browser to Nuxt.

12. Nuxt loads:

       /dashboard

13. Nuxt calls:

       GET http://localhost:8001/api/user

14. NestJS returns the authenticated user.

15. Dashboard displays the user.


--------------------------------------------------------------------------------
17.5 Test authenticated refresh
--------------------------------------------------------------------------------

After successful login:

    http://localhost:3001/dashboard


Refresh the page.


Nuxt should continue to recognize the authenticated user.


The browser should send the NestJS session cookie.


Nuxt should request:

    GET http://localhost:8001/api/user


NestJS should return HTTP 200.


--------------------------------------------------------------------------------
17.6 Test logout
--------------------------------------------------------------------------------

1. Click Logout.

2. Nuxt sends:

       POST http://localhost:8001/api/logout

3. NestJS destroys the application session.

4. NestJS optionally returns a Keycloak logout URL.

5. Nuxt follows the URL.

6. Keycloak terminates the SSO session.

7. Browser returns to:

       http://localhost:3001

8. The application should display the Sign In state.


--------------------------------------------------------------------------------
17.7 Test login after federated logout
--------------------------------------------------------------------------------

After logging out:

1. Click Sign In again.

2. NestJS starts the OIDC flow.

3. Keycloak should require authentication again if the federated logout
   successfully terminated the Keycloak SSO session.


================================================================================
18. COMMON ERRORS AND FIXES
================================================================================


--------------------------------------------------------------------------------
18.1 "Page not found: /sso/callback" in Nuxt
--------------------------------------------------------------------------------

If the browser shows something like:

    Page not found:
    /sso/callback?state=...&code=...


and the error is generated by Nuxt/H3, then the browser has been sent to:

    http://localhost:3001/sso/callback


That is incorrect for this architecture.


The callback belongs to NestJS:

    http://localhost:8001/sso/callback


Check the Keycloak redirect URI.


It should be:

    http://localhost:8001/sso/callback


NOT:

    http://localhost:3001/sso/callback


Also check the NestJS OIDC configuration.


The Keycloak client must use the NestJS callback URL.


--------------------------------------------------------------------------------
18.2 Keycloak redirects to Nuxt after login
--------------------------------------------------------------------------------

If the browser goes directly from Keycloak to:

    http://localhost:3001/sso/callback


then Keycloak is configured with the wrong redirect URI for this architecture.


The callback must be:

    http://localhost:8001/sso/callback


Nuxt should only receive the final application redirect after NestJS has
completed authentication.


--------------------------------------------------------------------------------
18.3 Login sends me back to the login page
--------------------------------------------------------------------------------

Typical flow:

    Nuxt /login
       |
       v
    NestJS /sso/redirect
       |
       v
    Keycloak
       |
       v
    NestJS /sso/callback
       |
       v
    Nuxt /login


If this happens, the most likely issue is that the NestJS session cookie is
not being created or is not being sent back to NestJS.


Check:

- NestJS session middleware
- Cookie configuration
- CORS
- credentials
- frontend origin
- backend origin
- localhost vs 127.0.0.1
- SameSite configuration
- Secure configuration
- browser cookie storage
- session secret
- callback redirect


The browser developer tools should be inspected under:

    Application
       ->
    Cookies


Look for the NestJS session cookie.


--------------------------------------------------------------------------------
18.4 /api/user returns 401
--------------------------------------------------------------------------------

If:

    GET http://localhost:8001/api/user


returns:

    401 Unauthorized


then NestJS does not recognize the current application session.


Check whether the browser is sending the session cookie.


Nuxt requests should use:

    credentials: 'include'


Example:

    await $fetch(
      `${config.public.apiBase}/api/user`,
      {
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      }
    )


For SSR:

    useRequestFetch()


should be used where appropriate.


--------------------------------------------------------------------------------
18.5 CORS error
--------------------------------------------------------------------------------

NestJS must explicitly allow the Nuxt origin.


Nuxt:

    http://localhost:3001


NestJS:

    http://localhost:8001


NestJS should conceptually use:

    app.enableCors({
      origin: 'http://localhost:3001',
      credentials: true,
    })


Do NOT use:

    origin: '*'


for credentialed authentication requests.


--------------------------------------------------------------------------------
18.6 Cookie is not being sent
--------------------------------------------------------------------------------

Check:

    credentials: 'include'


on browser requests.


Also check:

    SameSite


and:

    Secure


cookie settings.


For local HTTP development, a cookie configured as:

    Secure=true


may not work correctly because the application is using HTTP rather than
HTTPS.


For local development, use a non-Secure cookie when appropriate.


For production, HTTPS and Secure cookies should be used.


--------------------------------------------------------------------------------
18.7 Nuxt is running on 3001 but configuration says 3000
--------------------------------------------------------------------------------

Make sure all configuration uses:

    http://localhost:3001


not:

    http://localhost:3000


Important values:

    apiBase:
        http://localhost:8001


    loginUrl:
        http://localhost:8001/sso/redirect


    frontend URL:
        http://localhost:3001


    Keycloak callback:
        http://localhost:8001/sso/callback


--------------------------------------------------------------------------------
18.8 NestJS is running on 8001 but Nuxt calls 8000
--------------------------------------------------------------------------------

Update:

    runtimeConfig.public.apiBase


to:

    http://localhost:8001


and:

    runtimeConfig.public.loginUrl


to:

    http://localhost:8001/sso/redirect


Delete stale Nuxt build output if necessary:

    rm -rf .nuxt


Then restart:

    npm run dev


--------------------------------------------------------------------------------
18.9 "fetch failed ECONNREFUSED ::1:9000"
--------------------------------------------------------------------------------

If NestJS displays:

    ECONNREFUSED ::1:9000

or:

    ECONNREFUSED 127.0.0.1:9000


then NestJS attempted to communicate with Keycloak, but Keycloak was not
running or was not listening on port 9000.


Start Keycloak:

    bin/kc.sh start-dev --http-port=9000


Then verify:

    http://localhost:9000


--------------------------------------------------------------------------------
18.10 Nuxt callback.vue tries to exchange the code
--------------------------------------------------------------------------------

Do not do this in the current architecture:

    const code = route.query.code

    await exchangeCode(code)


NestJS already owns:

    /sso/callback


Therefore the authorization code is already processed by NestJS.


The Nuxt application should not receive the authorization code.


Remove the frontend exchange flow unless the backend has deliberately been
designed around a split authorization-code exchange architecture.


--------------------------------------------------------------------------------
18.11 Authentication works but user is not returned
--------------------------------------------------------------------------------

Check:

    GET /api/user


and verify that NestJS returns:

    HTTP 200


with the expected user object.


Example:

    {
        "id": 1,
        "name": "Test User",
        "email": "test@example.com",
        "oidc_issuer": "http://localhost:9000/realms/myapp",
        "oidc_subject": "abc123"
    }


If NestJS returns 401, debug the NestJS session first.


The Nuxt application should not attempt to reconstruct authentication from
Keycloak tokens.


================================================================================
19. PRODUCTION MIGRATION CHECKLIST
================================================================================

Production should use HTTPS everywhere.


Example:

    Nuxt:
        https://app.company.com

    NestJS:
        https://api.company.com

    Keycloak:
        https://sso.company.com


Production runtime configuration:

    NUXT_PUBLIC_API_BASE=https://api.company.com

    NUXT_PUBLIC_LOGIN_URL=https://api.company.com/sso/redirect


Keycloak redirect URI:

    https://api.company.com/sso/callback


Post logout redirect URI:

    https://app.company.com


Production requirements:

- Use HTTPS
- Enable Secure cookies
- Keep authentication cookies HttpOnly
- Configure SameSite correctly
- Configure CORS explicitly
- Never use wildcard CORS with credentials
- Register the NestJS OIDC callback in Keycloak
- Register the production post-logout redirect URI
- Keep Keycloak client secrets exclusively on NestJS
- Never expose client secrets through Nuxt runtimeConfig.public
- Never expose OIDC tokens to Nuxt
- Never store OIDC tokens in browser storage
- Keep authentication decisions on NestJS
- Keep authorization decisions on NestJS
- Use a strong session secret
- Use a production-grade session store
- Use HTTPS between all components
- Configure secure proxy behavior when running behind a reverse proxy


Production architecture:

    Browser
       |
       v
    https://app.company.com
       |
       v
    https://api.company.com
       |
       v
    https://sso.company.com


The conceptual architecture remains unchanged.


================================================================================
20. SECURITY NOTES
================================================================================


--------------------------------------------------------------------------------
Rule 1 — The frontend is not a trust boundary
--------------------------------------------------------------------------------

Anything stored or displayed by Nuxt is client-side state.


NestJS must never trust values simply because the frontend sends them.


Do not trust:

    user_id

    role

    permission

    email

    name


NestJS should determine the authenticated user from the server-side
application session.


--------------------------------------------------------------------------------
Rule 2 — No OIDC tokens in the browser
--------------------------------------------------------------------------------

The Nuxt application should never store:

    access_token

    id_token

    refresh_token


Do not put them in:

    localStorage

    sessionStorage

    JavaScript-readable cookies

    useState()

    Pinia

    Vue reactive state

    URL query parameters

    Nuxt public runtime configuration


The BFF architecture exists specifically to keep OIDC credentials server-side.


--------------------------------------------------------------------------------
Rule 3 — Do not make Nuxt the OIDC client
--------------------------------------------------------------------------------

Do not add Keycloak OIDC libraries to Nuxt unless the architecture is
intentionally changed.


The intended architecture is:

    Nuxt
       |
       v
    NestJS
       |
       v
    Keycloak


Not:

    Nuxt
       |
       +------> Keycloak
       |
       v
    NestJS


NestJS owns authentication.


--------------------------------------------------------------------------------
Rule 4 — Decode is not validate
--------------------------------------------------------------------------------

The frontend should never authenticate a user by decoding a JWT.


Even if a JWT can be decoded, decoding does not prove:

- the token was issued by the expected issuer
- the signature is valid
- the token is not expired
- the token is intended for the application
- the audience is correct
- the token is trustworthy


Authentication belongs on NestJS.


--------------------------------------------------------------------------------
Rule 5 — 401 vs 403
--------------------------------------------------------------------------------

HTTP 401 means:

    The request is not authenticated.


Nuxt should normally interpret this as:

    User is not logged in.


HTTP 403 means:

    The user is authenticated but not authorized.


A 403 should not automatically force the user to log in again.


--------------------------------------------------------------------------------
Rule 6 — Explicit CORS
--------------------------------------------------------------------------------

Do not use:

    Access-Control-Allow-Origin: *


with credentialed requests.


Use:

    http://localhost:3001


for local development.


Production should use the exact production frontend origin.


--------------------------------------------------------------------------------
Rule 7 — Session cookie protection
--------------------------------------------------------------------------------

The application session cookie should be:

    HttpOnly


In production:

    Secure


The SameSite policy should match the deployment topology.


The frontend should not need to read the authentication cookie using
JavaScript.


--------------------------------------------------------------------------------
Rule 8 — OIDC identity uniqueness
--------------------------------------------------------------------------------

External identities should be identified using the issuer and subject.


Conceptually:

    oidc_issuer
    +
    oidc_subject


should uniquely identify the external identity.


Do not rely exclusively on email.


--------------------------------------------------------------------------------
Rule 9 — Email is not the external identity
--------------------------------------------------------------------------------

Email addresses can change.


The stable external identity should be based on:

    oidc_issuer + oidc_subject


The local database should therefore use the external identity as the identity
key rather than assuming email is immutable.


================================================================================
21. RELATED PROJECTS
================================================================================

bakery-api-nestjs

NestJS API acting as:

- Backend-for-Frontend
- OIDC client
- Authentication server for the application
- Session owner
- User identity resolver
- Authenticated API


NestJS responsibilities:

- OIDC authorization
- OIDC callback
- OIDC authorization-code exchange
- OIDC identity validation
- Local user persistence
- Application session management
- Current-user endpoint
- Logout endpoint
- Federated logout
- API authorization


Keycloak

Identity Provider.

Realm:

    myapp


Server:

    http://localhost:9000


Responsibilities:

- User authentication
- SSO session
- Identity Provider functionality
- OIDC authorization
- Federated logout


bakery-spa

Nuxt 4 frontend.

Responsibilities:

- User interface
- Authentication state
- Redirecting to NestJS login
- Calling NestJS /api/user
- Calling NestJS /api/logout
- Displaying authenticated user information
- Protecting frontend routes
- Redirecting unauthenticated users to /login


The Nuxt application should not become an independent OIDC client.


================================================================================
22. AUTHOR
================================================================================

This project was developed by:

Tochukwu Uchem


Github:

https://github.com/uchemcolin


Linkedin:

https://www.linkedin.com/in/tochukwu-uchem-802888144/


Gitlab:

https://gitlab.com/uchemcolin


================================================================================
END OF DOCUMENT
================================================================================
