```mermaid

sequenceDiagram
    actor User
    User->>Frontend: enter site
    Frontend->>Backend: 
    Backend->>Keycloak: request auth
    Keycloak->>Backend: Return user details
    Backend->>Frontend: Return stream link with token
    Frontend-->>Backend: Open chat websocket
    Frontend->>Camera nginx: Request stream link with token
    loop every period of nginx setting proxy_cache_valid (30 s)
        Camera nginx->>Backend: Verify token validity
    end
    Camera nginx<<->>Frontend: Stream the camera feed
    loop every period of VIEWER_TOKEN_VALIDITY_TTL (5 min)
        Backend->>Backend: Invalidate token
    end
    destroy User
    Frontend->>User: Navigate away
    Frontend-->>Backend: Close chat websocket
    Backend->>Backend: Invalidate token after VIEWER_TOKEN_DESTROY_DELAY (30s)
```


## Camera nginx paths

The camera's nginx (`camera/nginx/nginx.conf`) serves the same HLS files on two paths:

- `/live/hls/<token>/<file>`: kiltiskamera viewers. The token is checked against
  this backend's `/authenticate`.
- `/feed/hls/<token>/<file>`: viewers of the Prodeko portal (same-origin at
  `kiltis.prodeko.org`). The token is checked with
  `GET https://kiltis.prodeko.org/api/kamera/authenticate?token=<token>`
  (`200` allows, `401`/`403` deny). Answers are cached per token for 30 s
  unless the portal sends its own `Cache-Control`.
