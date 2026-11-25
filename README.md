# Sendbird UIKit for React with Next.js

A Next.js App Router app with [Sendbird UIKit for React](https://sendbird.com/docs/chat/uikit/v3/react/overview) chat. A Route Handler issues a Sendbird session token for the signed-in user, and the browser connects with that token.

The chat has one-to-one and group chats with read receipts, typing indicators, voice messages, and reactions.

## How it works

1. The user signs in to the app. This sample uses a demo sign-in that keeps the user ID in a signed cookie.
2. The chat page calls `POST /api/sendbird/token`. The Route Handler checks who is signed in, creates the Sendbird user if it doesn't exist yet, and [issues a session token](https://sendbird.com/docs/chat/platform-api/v3/user/managing-session-tokens/issue-a-session-token) with the Platform API.
3. The browser passes the token to `SendbirdProvider` as `accessToken`. When the token expires, `configureSession` calls the same route for a new one. If connecting or a renewal fails, or the session ends, the page sends the user back to sign in or shows an error.
4. Signing out disconnects the page from Sendbird and deletes the session cookie. After the response is sent, the server [revokes all of the user's session tokens](https://sendbird.com/docs/chat/platform-api/v3/user/managing-session-tokens/revoke-all-session-tokens) with the Platform API, so a token copied before sign-out stops working and the user's other chat tabs in the same browser go back to the sign-in page.

The API token stays on the server. The browser only gets the application ID and the user's session token.

## Run it

1. In the [Sendbird Dashboard](https://dashboard.sendbird.com), create or select a test application and open **Settings > Application > General**. Copy the **Application ID**, and an API token from **API tokens**. A secondary API token is safer than the master token because you can revoke it. See [Prepare to use API](https://sendbird.com/docs/chat/platform-api/v3/prepare-to-use-api) for details. Use a test application: with the demo sign-in, anyone who can open the app can sign in as any user ID.
2. Create `.env.local` from the example and fill in the two values:

   ```bash
   cp .env.example .env.local
   ```

   ```bash
   NEXT_PUBLIC_SENDBIRD_APP_ID=your-application-id
   SENDBIRD_API_TOKEN=your-api-token
   ```

   `.env.local` is not committed. Restart `npm run dev` after you change it.

3. Install and start the app:

   ```bash
   npm install
   npm run dev
   ```

4. Open http://localhost:3000 and sign in with any user ID.

To chat with someone, sign in as a second user in another browser or a private window first. A user can only be invited after signing in once. Then create a channel with the new channel button at the top of the channel list. Choose Group, then pick one user for a one-to-one chat or several for a group chat.

Voice messages need microphone access, which browsers allow only on `localhost` or HTTPS.

## Chat features

`app/chat/uikit-config.ts` holds the UIKit options. `chat.tsx` passes them to `SendbirdProvider`.

| Setting | What it does |
| --- | --- |
| `uikitOptions.groupChannel` | Turns on voice messages, reactions, and the typing indicator, shown as a bubble in the chat. Reactions also need to be on for your application. Mark as unread is off by default. `enableMarkAsUnread: false` keeps it and its new message separator off even if your dashboard turns it on, so UIKit marks new messages as read while the user is at the end of the chat, and the sender's check marks change color. |
| `uikitOptions.groupChannelList` | Shows who is typing, and the check marks of your last message, in the channel list. |

`uikitOptions` takes precedence over the UIKit settings in your dashboard. `chat.tsx` adds the sign-out button to the channel list header with `renderHeader`, next to UIKit's new channel button. `app/chat/chat.css` makes room for the sign-out button in the header on mobile.

## Files

| File | What it does |
| --- | --- |
| `app/api/sendbird/token/route.ts` | Issues a session token for the signed-in user |
| `lib/sendbird.ts` | Calls the Platform API. Server only |
| `lib/auth.ts` | Demo sign-in. `getCurrentUser()` is where your own authentication goes |
| `app/chat/page.tsx` | Loads the chat in the browser only, with `next/dynamic` and `ssr: false` |
| `app/chat/chat.tsx` | Gets the token and renders `SendbirdProvider`, `GroupChannelList`, `GroupChannel`, and `ChannelSettings`. Follows the system light or dark theme |
| `app/chat/uikit-config.ts` | UIKit options |
| `app/chat/chat.css` | Room for the sign-out button in the channel list header |
| `app/login/` | Demo sign-in page and the sign-in and sign-out actions |

`chat.tsx` sets `replyType="QUOTE_REPLY"` and `showSearchIcon={false}` because this sample doesn't render `Thread` or `MessageSearch`, and `disableUserProfile` on `GroupChannelList` to turn off profile cards in the create-channel window. These props take precedence over your dashboard settings. When you add `Thread`, set `replyType="THREAD"` and open it from `onReplyInThreadClick`. When you add `MessageSearch`, set `showSearchIcon` and open it from `onSearchClick`.

## Before you ship

- Replace the demo sign-in. Anyone who can open the app can sign in as any user ID, including users who already exist in your application, and read their chats. Make `getCurrentUser()` in `lib/auth.ts` return the signed-in user from your own authentication, such as Auth.js, Clerk, or Supabase Auth.
- Deploy the demo sign-in only with a test application, and set `SESSION_SECRET` there to a random string of at least 32 characters. `npm run dev` falls back to a development key, but a production build refuses to sign in without it.
- Keep `SENDBIRD_API_TOKEN` on the server. Never give it a `NEXT_PUBLIC_` prefix.
- Set the same variables in your hosting provider's environment settings.
- Session tokens here expire after one hour. Change `SESSION_TOKEN_TTL_MS` in `lib/sendbird.ts` to fit your app.
- Once every user connects with a token, you can stop users without a token from connecting in your application's security settings in the dashboard.

## Troubleshooting

UIKit renders in the browser. Load it from a Client Component with `next/dynamic` and `ssr: false`, as `app/chat/page.tsx` does.

| Error | Fix |
| --- | --- |
| `` `ssr: false` is not allowed with `next/dynamic` in Server Components `` | Move the `dynamic()` call into a file that starts with `"use client"`. |
| `createContext is not a function` | UIKit was imported in a Server Component. Import it from a `"use client"` file. |
| `Missing getServerSnapshot, which is required for server-rendered content` | UIKit was rendered on the server. Load it with `ssr: false`. |
| `MediaRecorder is not defined` | Same cause. Load UIKit with `ssr: false`. |
| `401` from `/api/sendbird/token` | Nobody is signed in. Sign in again. |
| `502` from `/api/sendbird/token` | Check `NEXT_PUBLIC_SENDBIRD_APP_ID` and `SENDBIRD_API_TOKEN`. The server log shows which Platform API call failed. |
| "You cannot record the voice since voice recording is not permitted in your device system setting", or the recorder doesn't start | Allow microphone access for the site in the browser and in the system settings. Browsers allow the microphone only on `localhost` or HTTPS. |
| `Chat couldn't connect: Chat session ended.` | The user's session tokens were revoked while the chat was open, for example because the user signed out in another browser, or the user was deactivated. Reload the page to connect with a new token. A deactivated user can't connect until you activate the user again in the dashboard. |
| `500` from `/api/sendbird/token`, or "A server error occurred" after you sign in | Check the server log. `SESSION_SECRET must be at least 32 characters.` or `Set SESSION_SECRET before running in production.` means `SESSION_SECRET` is missing or too short. Set it to at least 32 random characters, for example from `openssl rand -base64 32`, restart the app, and sign in again. |

## Versions

Tested with Next.js 16.4, React 19.3, and `@sendbird/uikit-react` 3.20.
