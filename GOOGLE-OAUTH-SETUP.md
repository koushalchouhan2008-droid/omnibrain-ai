# Google OAuth setup (Gmail, Drive, Calendar)
1. Google Cloud Console (https://console.cloud.google.com/) mein project create karo. Gmail API, Google Drive API and Google Calendar API enable karo.
2. Google Auth Platform / OAuth consent screen mein app information, audience and developer contacts configure karo. Testing mein apna Gmail as test user add karo. Production public app ke liye applicable verification and policies follow karo.
3. OAuth client type **Web application** create karo. Authorized redirect URI exact add karo: local `http://localhost:3000/api/v1/workspace/gmail/callback` (use localhost everywhere); deployed `https://YOUR-SITE.netlify.app/api/v1/workspace/gmail/callback` (your real site). Use separate production/testing client where appropriate.
4. Backend env mein `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` set karo; restart. Never expose secret in Netlify frontend or repository.
5. App account login > Connections > Gmail, Drive or Calendar Connect. Official Google consent screen opens. Approve desired permissions. Separate scopes: Gmail send, Drive metadata read-only, Calendar read-only. This is connection authorization, not Google sign-in to the app.
6. Test: Gmail Assistant draft, review subject/body/recipient, confirm send. Gmail API message ID confirms API acceptance, not inbox delivery/read receipt. Drive lists file metadata; Calendar reads events. No automatic inbox read or scheduled email sending.
7. Disconnect Gmail revokes token; Drive/Calendar local removal does not revoke Google-side grant, so remove app access in Google account security if desired. Testing-mode external app refresh tokens usually expire after seven days for these scopes. Reconnect if needed.

Official refs (verified 25 Nov 2026): https://developers.google.com/identity/protocols/oauth2/web-server ; https://developers.google.com/identity/protocols/oauth2/policies ; https://developers.google.com/identity/protocols/oauth2
