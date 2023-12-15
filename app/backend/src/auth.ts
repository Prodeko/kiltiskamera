// auth.ts
import passport from "passport";
import OAuth2Strategy from "passport-oauth2";
import session from "express-session";
import cookieParser from "cookie-parser";
import request from "request";
import { NextFunction, Request, Response } from "express";
import { ProdekoUser } from "./tokens";

// Define a custom session interface that extends SessionData
declare module "express-session" {
  interface SessionData {
    passport?: {
      user?: ProdekoUser; // Adjust the type based on your actual structure
    };
  }
}

// Passport configuration
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user: ProdekoUser, done) => {
  console.log(user);
  done(null, user);
});

passport.use(
  new OAuth2Strategy(
    {
      authorizationURL: "http://localhost:8000/oauth2/auth",
      tokenURL: "http://localhost:8000/oauth2/token",
      clientID: "g3e8ssUHI0QKZeyJF0dkIDeKfUWcoNEBtzU10C1Q",
      clientSecret:
        "Q5pMhYXRfcqfFJwmfkpOY4qBvojSBir3wUrPb5829PNwaJ1jP72oFyGYNu2CPEkz0ATU50vxWTTuUHQfs2fHAFAVnGjqWshBrTpPSqVPfz7tBkXSNu2nXR5cZ8gftN9N",
      callbackURL: "http://localhost:8087/auth/prodeko/callback",
      // eslint-disable-next-line @typescript-eslint/ban-types
    },
    (
      accessToken: string,
      refreshToken: string,
      profile: string,
      done: Function
    ) => {
      // handle the user profile
      const headers = {
        Authorization: `Bearer ${accessToken}`,
      };

      // Get user details
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const userResponse = request(
        "http://localhost:8000/oauth2/user_details/",
        {
          method: "GET",
          headers,
          json: true,
          // https: {
          //  rejectUnauthorized: !isDevOrTest,
          // },
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (error: any, response: any, body: any) => {
          const {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            pk,
            email,
            first_name,
            last_name, // has_accepted_policies,
          } = response.body;

          // if (!has_accepted_policies) {
          //  const e = new Error(
          //    `You have not accepted Prodeko's privacy policy.
          // Please accept our privacy policy in order to use the site while logged in.
          // You may accept the policy by logging in via https://prodeko.org/login,
          // and clicking 'I agree' on the displayed prompt.`.replace(/\n/g, " ")
          // )
          // e["code"] = "PRPOL"
          // throw e
          // }
          done(null, {
            id: pk,
            displayName: `${first_name} ${last_name}`,
            email,
          });
        }
      );
    }
  )
);

// Middleware to check if the user is authenticated
export const ensureAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.isAuthenticated()) {
    return next();
  }
  // If not authenticated, redirect to Prdeko authentication
  return res.redirect("/auth/prodeko");
};
