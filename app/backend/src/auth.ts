// auth.ts
// `import * as` would give an esModuleInterop namespace wrapper, which drops
// the prototype methods of passport's singleton instance.
import passport = require("passport");
import { NextFunction, Request, Response } from "express";
import {
  Client,
  IdTokenClaims,
  Issuer,
  Strategy,
  StrategyVerifyCallback,
  TokenSet,
} from "openid-client";
import { ProdekoUser } from "./tokens";
import {
  KEYCLOAK_CALLBACK_URL,
  KEYCLOAK_CLIENT_ID,
  KEYCLOAK_CLIENT_SECRET,
  KEYCLOAK_ISSUER,
  KEYCLOAK_REQUIRED_ROLE,
} from "./configuration";

// Define a custom session interface that extends SessionData
declare module "express-session" {
  interface SessionData {
    passport?: {
      user?: ProdekoUser; // Adjust the type based on your actual structure
    };
  }
}

export const STRATEGY_NAME = "keycloak";

// Passport configuration
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user: ProdekoUser, done) => {
  done(null, user);
});

const text = (claims: IdTokenClaims, key: string): string => {
  // A misconfigured protocol mapper can put any JSON type in a claim, so
  // anything that is not a string counts as absent rather than throwing.
  const value = claims[key];
  return typeof value === "string" ? value.trim() : "";
};

const realmRoles = (claims: IdTokenClaims): string[] => {
  const realmAccess = claims.realm_access;
  if (typeof realmAccess !== "object" || realmAccess === null) {
    return [];
  }
  const roles = (realmAccess as { roles?: unknown }).roles;
  if (typeof roles === "string") {
    // A User Realm Role mapper left non-multivalued emits a bare string.
    return [roles];
  }
  if (!Array.isArray(roles)) {
    return [];
  }
  return roles.filter((role): role is string => typeof role === "string");
};

const verify: StrategyVerifyCallback<ProdekoUser | false> = (
  tokenset: TokenSet,
  done
) => {
  // Roles are read from the ID token rather than UserInfo: the realm role
  // mapper the client is registered with writes them there. See README.md.
  const claims = tokenset.claims();

  const roles = realmRoles(claims);
  if (roles.length === 0) {
    console.warn(
      `Login for ${claims.sub} carried no realm_access.roles claim. ` +
        "Check that the 'realm roles' mapper on the kiltiskamera client is " +
        "multivalued and added to the ID token."
    );
  }

  if (!roles.includes(KEYCLOAK_REQUIRED_ROLE)) {
    console.log(
      `Refusing login for ${claims.sub}: no '${KEYCLOAK_REQUIRED_ROLE}' role.`
    );
    return done(null, false);
  }

  const firstName = text(claims, "given_name");
  const lastName = text(claims, "family_name");

  return done(null, {
    id: claims.sub,
    displayName: `${firstName} ${lastName}`.trim() || claims.sub,
    email: text(claims, "email"),
  });
};

// Registers the Keycloak strategy. Endpoints and signing keys come from the
// issuer's discovery document, so this reaches the network and must resolve
// before the server accepts requests.
export const initAuth = async (): Promise<void> => {
  const issuer = await Issuer.discover(KEYCLOAK_ISSUER);
  const client = new issuer.Client({
    client_id: KEYCLOAK_CLIENT_ID,
    client_secret: KEYCLOAK_CLIENT_SECRET,
    redirect_uris: [KEYCLOAK_CALLBACK_URL],
    response_types: ["code"],
  });

  passport.use(
    STRATEGY_NAME,
    new Strategy<ProdekoUser | false, Client>(
      {
        client,
        params: { scope: "openid email profile" },
      },
      verify
    )
  );

  console.log(`Keycloak authentication configured against ${issuer.issuer}`);
};

// Middleware to check if the user is authenticated
export const ensureAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.isAuthenticated()) {
    return next();
  }
  // If not authenticated, redirect to Keycloak authentication
  return res.redirect(`/auth/${STRATEGY_NAME}`);
};
