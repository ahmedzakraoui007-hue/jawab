# Meta Webhook Setup Guide

## Prerequisites
- Meta App created with Messenger and Instagram products enabled
- ngrok installed (for receiving webhooks in development)
- Jawab dev server running

---

## Step 1: Install ngrok

```bash
# Option A: Using snap (Ubuntu/Linux)
sudo snap install ngrok

# Option B: Using npm
npm install -g ngrok

# Option C: Download from https://ngrok.com/download
```

**Create free account at [ngrok.com](https://ngrok.com) and get your auth token.**

```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
```

---

## Step 2: Start ngrok Tunnel

```bash
# In a new terminal, run:
ngrok http 3000
```

You'll see output like:
```
Forwarding    https://abc123.ngrok.io -> http://localhost:3000
```

**Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

> ⚠️ This URL changes every time you restart ngrok (unless you have a paid plan)

---

## Step 3: Configure Meta Webhooks

### 3.1 Go to Meta Developer Console
1. Open [developers.facebook.com](https://developers.facebook.com)
2. Select your app "Jawab AI"
3. In left sidebar: **Webhooks** (or **Produits** → **Webhooks**)

### 3.2 Add Webhook for Messenger
1. Select **Page** from dropdown
2. Click **S'abonner à cet objet** (Subscribe to this object)
3. Enter:
   - **URL de rappel**: `https://YOUR-NGROK-URL/api/webhooks/meta`
   - **Jeton de vérification**: `jawab_webhook_2024`
4. Click **Vérifier et enregistrer**

### 3.3 Subscribe to Events
After verification, subscribe to these events:
- ✅ `messages` - Receive incoming messages
- ✅ `messaging_postbacks` - Button clicks
- ✅ `feed` - Page comments (for Facebook comments)

### 3.4 Add Webhook for Instagram
1. Select **Instagram** from dropdown
2. Same URL and token as above
3. Subscribe to:
   - ✅ `messages` - Instagram DMs
   - ✅ `comments` - Instagram comments

---

## Step 4: Connect Your Facebook Page

1. In Meta Console, go to **Messenger** → **Paramètres**
2. Find **Jetons d'accès** (Access Tokens)
3. Click **Ajouter ou supprimer des Pages**
4. Select your business Page
5. Grant all permissions

---

## Step 5: Test the Integration

### Test Webhook Verification
```bash
curl "https://YOUR-NGROK-URL/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=jawab_webhook_2024&hub.challenge=test123"
# Should return: test123
```

### Test OAuth Flow
1. Go to: http://localhost:3000/dashboard/settings/integrations
2. Click "Connect" on Facebook & Instagram
3. Log in with your Facebook account
4. Authorize the app
5. Should redirect back with success message

### Test Incoming Message
1. Send a DM to your Facebook Page
2. Check terminal for webhook logs
3. AI should respond automatically!

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Webhook verification fails | Check `META_VERIFY_TOKEN` matches exactly |
| No messages received | Make sure Page is connected in Messenger settings |
| OAuth redirect error | Check app is in Development mode |
| ngrok URL expired | Restart ngrok and update webhook URL in Meta Console |

---

## Production Deployment

When deploying to production:
1. Use your real domain instead of ngrok
2. Add production URL to OAuth Redirect URIs
3. Submit app for Meta App Review
4. Request these permissions:
   - `pages_messaging`
   - `instagram_manage_messages`
   - `instagram_manage_comments`
   - `pages_read_engagement`
