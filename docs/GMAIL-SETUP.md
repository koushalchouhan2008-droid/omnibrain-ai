# Gmail connection — Google OAuth 2.0

The app uses Google's official OAuth authorization screen and requests the send-only Gmail scope. It does not ask for or store your Google password, and it does not automatically grant access to other Google apps.

## One-time configuration
1. Open https://console.cloud.google.com/ and create/select a project.
2. Enable **Gmail API** in APIs & Services. Configure the OAuth consent screen (Google Auth platform), audience and test users if applicable. Add `https://www.googleapis.com/auth/gmail.send` to requested scopes.
3. Create an OAuth client of type **Web application**. Add the exact authorized redirect URI. For local use choose `http://localhost:3000/api/v1/workspace/gmail/callback`; for HTTPS deployment use your exact domain and path. Use the matching origin to open OmniBrain (for this example `http://localhost:3000`, not `127.0.0.1`).
4. Copy `.env.example` to `.env`. Add the following values (never publish them):

```dotenv
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/workspace/gmail/callback
```

5. Restart the server, sign in to OmniBrain, then Connections → Sign in with Google. Complete consent on Google's website. The callback binds the authorization to your existing OmniBrain session with a one-time state and PKCE. If you start at a different hostname/port, the callback will not have your session cookie.
6. Open Gmail Assistant. Enter a recipient, request, and subject; draft with AI or write your own body. Confirm before sending. A Gmail message ID is displayed only after Google's API accepts the send request.
7. Disconnect from Connections to revoke the saved Google refresh token. You can also revoke access in your Google Account security settings.

Google testing-mode refresh tokens may expire; consent verification and Workspace administrator approval may be required. For public deployments, use HTTPS, secure cookies and a persistent encryption key. If a send returns an ambiguous network error, check Gmail Sent before retrying to avoid duplicates. This implementation is send-only: it cannot read inbox messages.

Official docs:
- https://developers.google.com/identity/protocols/oauth2/web-server
- https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send
