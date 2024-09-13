```mermaid

sequenceDiagram
    actor User
    User->>Frontend: enter site
    Frontend->>Backend: 
    Backend->>Prodeko Oauth: request auth
    Prodeko Oauth->>Backend: Return user details
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

