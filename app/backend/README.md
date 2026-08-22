# Backend

Express server that authenticates viewers, hands out short-lived stream
tokens, and relays the chat websocket.

## Authentication

Login runs over OpenID Connect against Keycloak (`id.prodeko.org`, realm
`membership-registry`). The authorization code flow with PKCE is handled by
`openid-client`'s passport strategy; every endpoint and signing key is read
from the issuer's discovery document at startup, so the process exits if
Keycloak is unreachable.

Only members may watch. The strategy reads `realm_access.roles` from the ID
token and refuses anyone without the `membership` realm role, which is what
`KEYCLOAK_REQUIRED_ROLE` in `src/configuration.ts` names. Refused logins land
on `/login`.

The session user is derived from the ID token claims: `sub` becomes the viewer
id that stream tokens are keyed on, and `given_name` / `family_name` / `email`
supply the display name shown in chat and in the access logs.

### Registering the client in Keycloak

Production clients are created in the admin console, not by the membership
registry's `setup.py`. Follow `docs/keycloak-clients.md` in the
membership-registry repo, with these values:

| Field                 | Value                                                     |
| --------------------- | --------------------------------------------------------- |
| Client ID             | `kiltiskamera`                                            |
| Client authentication | on (confidential)                                         |
| Authentication flow   | Standard flow only                                        |
| PKCE method           | `S256`                                                    |
| Root / Home URL       | `https://kiltiskamera.prodeko.org`                        |
| Valid redirect URI    | `https://kiltiskamera.prodeko.org/auth/keycloak/callback` |
| Web origins           | `https://kiltiskamera.prodeko.org`                        |

The role gate depends on a protocol mapper that the default `roles` scope does
not provide. On the client's dedicated scope, add a `User Realm Role` mapper
named `realm roles` with token claim name `realm_access.roles`, multivalued on,
and **Add to ID token** on. Without it every login is refused and the server
logs a warning saying so.

Copy the secret from the `Credentials` tab into `KEYCLOAK_CLIENT_SECRET`.
Verify the claims before deploying via `Client scopes` → `Evaluate`.

## Configuration

Environment variables — `.env` locally, application settings in Azure:

| Variable                 | Meaning                                       |
| ------------------------ | --------------------------------------------- |
| `KEYCLOAK_ISSUER`        | Realm URL, no trailing slash                  |
| `KEYCLOAK_CLIENT_ID`     | `kiltiskamera`                                |
| `KEYCLOAK_CLIENT_SECRET` | From the client's `Credentials` tab           |
| `KEYCLOAK_CALLBACK_URL`  | Must match a registered redirect URI exactly  |
| `SESSION_SECRET`         | Signs the session cookie                      |
| `ON_AIR_PASSWORD`        | Guards the unauthenticated `/on_air` endpoint |

## Local development

Run Keycloak from the membership-registry repo (`docker compose up -d keycloak`,
port 8180) and register a local-only `kiltiskamera` client whose redirect URI is
`http://localhost:8087/auth/keycloak/callback`. Then:

```bash
cp .env.template .env
npm install
npm run dev
```

`npm run build` compiles with `tsconfig.json` and emits next to the sources,
which is where `npm start` expects them.
