import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { prisma } from "@cortexos/db";
import jwt from "jsonwebtoken";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: "/auth/google/callback",
      scope: [
        "profile",
        "email",
        "https://www.googleapis.com/auth/gmail.readonly",
      ],
      //                          ↑ you'll need this later for Gmail integration
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Upsert = create if not exists, update if exists
        const user = await prisma.user.upsert({
          where: { email: profile.emails![0].value },
          update: { name: profile.displayName },
          create: {
            email: profile.emails![0].value,
            name: profile.displayName,
            avatar: profile.photos?.[0].value,
            accounts: {
              create: {
                provider: "google",
                providerAccountId: profile.id,
                accessToken,
                refreshToken,
              },
            },
          },
        });
        done(null, user);
      } catch (err) {
        done(err);
      }
    },
  ),
);
