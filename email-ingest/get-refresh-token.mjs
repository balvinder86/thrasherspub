// One-time script — run locally, not deployed. Spins up a temporary
// local server to catch Google's OAuth redirect, exchanges the
// resulting code for a refresh token, and prints it once. Run with:
//   GMAIL_CLIENT_ID=... GMAIL_CLIENT_SECRET=... node get-refresh-token.mjs
import { createServer } from "node:http";

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET first.");
  process.exit(1);
}

const PORT = 53682;
const REDIRECT_URI = `http://localhost:${PORT}`;

const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set(
  "scope",
  [
    "https://www.googleapis.com/auth/gmail.readonly",
    // Needed to auto-create the "any PDF attachment -> Invoices label"
    // filter during onboarding, so new vendors are never missed because
    // someone forgot to label their emails by hand.
    "https://www.googleapis.com/auth/gmail.settings.basic",
    // Needed to send real purchase-order emails to vendors from this
    // same connected account, since Resend's domain verification is
    // blocked by a Wix DNS limitation (see project memory).
    "https://www.googleapis.com/auth/gmail.send",
  ].join(" "),
);
authUrl.searchParams.set("access_type", "offline");
authUrl.searchParams.set("prompt", "consent");

console.log("\nOpen this URL, log in with the Gmail account that should receive vendor invoices, and approve access:\n");
console.log(authUrl.toString());
console.log("\nWaiting for the redirect back to localhost...\n");

const server = createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);

  // Browsers auto-request this on the redirected page; it's not the
  // real OAuth callback, so don't let it print a confusing "no code"
  // message or otherwise get treated as the real thing.
  if (url.pathname === "/favicon.ico") {
    res.writeHead(204);
    res.end();
    return;
  }

  const code = url.searchParams.get("code");
  if (!code) {
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");
    console.log("\nReceived redirect with no code. Full URL:", url.toString());
    if (error) console.log("Google error:", error, errorDescription ?? "");
    res.end("No code received — check the terminal for errors.");
    return;
  }
  res.end("Done — you can close this tab and go back to the terminal.");
  server.close();

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: REDIRECT_URI,
    }),
  });
  const tokenBody = await tokenRes.json();
  if (!tokenRes.ok || !tokenBody.refresh_token) {
    console.error("Token exchange failed:", tokenBody);
    process.exit(1);
  }
  console.log("\nRefresh token (save this — it's the only time Google shows it):\n");
  console.log(tokenBody.refresh_token);
  console.log();
  process.exit(0);
});

server.listen(PORT);
