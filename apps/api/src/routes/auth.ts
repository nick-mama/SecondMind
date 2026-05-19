import { Router, Request, Response } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import jwt from "jsonwebtoken";
import { prisma } from "@secondmind/db";

const router = Router();

// This runs ONCE when the server starts.
// It tells passport: "when a user comes back from Google,
// here's what to do with their profile data"
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
        "https://www.googleapis.com/auth/documents.readonly",
      ],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0].value;
        if (!email) return done(new Error("No email from Google"));

        // upsert = update if exists, create if not
        // This means logging in twice doesn't create two users
        const user = await prisma.user.upsert({
          where: { email },
          update: {
            name: profile.displayName,
            avatar: profile.photos?.[0].value,
          },
          create: {
            email,
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

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    },
  ),
);

// Step 1 of OAuth: redirect user to Google
router.get("/google", passport.authenticate("google"));

// Step 2 of OAuth: Google redirects back here after user approves
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/auth/failed",
  }),
  async (req: Request, res: Response) => {
    try {
      const user = req.user as { id: string; email: string };

      // Create a session in the database
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      const session = await prisma.session.create({
        data: {
          userId: user.id,
          token: jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
            expiresIn: "7d",
          }),
          expiresAt,
        },
      });

      // Set the token as an HTTP-only cookie
      res.cookie("session_token", session.token, {
        httpOnly: true, // JS cannot access this cookie (XSS protection)
        secure: false, // set to true in production (requires HTTPS)
        sameSite: "lax", // CSRF protection
        expires: expiresAt,
      });

      // Redirect to frontend dashboard
      res.redirect("http://localhost:3000/dashboard");
    } catch (err) {
      console.error("Auth callback error:", err);
      res.status(500).json({ error: "Authentication failed" });
    }
  },
);

// Returns the current logged-in user
router.get("/me", async (req: Request, res: Response) => {
  const token = req.cookies?.session_token;
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
    };
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, avatar: true },
    });
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    res.json({ user });
  } catch {
    res.status(401).json({ error: "Invalid session" });
  }
});

// Logout
router.post("/logout", async (req: Request, res: Response) => {
  const token = req.cookies?.session_token;
  if (token) {
    // Delete session from database
    await prisma.session.deleteMany({ where: { token } });
  }
  res.clearCookie("session_token");
  res.json({ success: true });
});

router.get("/failed", (_req: Request, res: Response) => {
  res.status(401).json({ error: "Google authentication failed" });
});

export default router;
