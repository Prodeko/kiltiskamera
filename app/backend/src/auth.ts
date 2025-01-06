// auth.ts
import * as passport from "passport";
import * as OAuth2Strategy from "passport-oauth2";
import * as request from "request";
import { NextFunction, Request, Response } from "express";
import { ProdekoUser } from "./tokens";
import {
  OAUTH2_AUTH_URL,
  OAUTH2_CALLBACK_URL,
  OAUTH2_CLIENT_ID,
  OAUTH2_CLIENT_SECRET,
  OAUTH2_TOKEN_URL,
  OAUTH2_PROFILE_URL,
} from "./configuration";
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
  done(null, user);
});

passport.use(
  new OAuth2Strategy(
    {
      authorizationURL: OAUTH2_AUTH_URL,
      tokenURL: OAUTH2_TOKEN_URL,
      clientID: OAUTH2_CLIENT_ID,
      clientSecret: OAUTH2_CLIENT_SECRET,
      callbackURL: OAUTH2_CALLBACK_URL,
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
        OAUTH2_PROFILE_URL,
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
