# X API Authentication Troubleshooting

## 🔒 Authentication Failed (401 Error)

If you're getting "Authentication failed - Check your Bearer Token", follow these steps:

### Step 1: Verify Your Bearer Token

1. **Go to X Developer Portal**: https://developer.twitter.com/en/portal/dashboard
2. **Select your App** (or create a new one if needed)
3. **Navigate to "Keys and tokens" tab**
4. **Under "Bearer Token" section**:
   - If you see a token, click "Regenerate" to get a fresh one
   - If you don't see one, click "Generate" to create it
   - **Copy the token immediately** - it's only shown once!

### Step 2: Check Your .env File

Make sure your `.env` file has the token in the correct format:

```bash
# ✅ CORRECT - No quotes, no spaces
X_API_BEARER_TOKEN=your-actual-bearer-token-here

# ❌ WRONG - Don't use quotes
X_API_BEARER_TOKEN="your-token-here"

# ❌ WRONG - Don't add spaces around =
X_API_BEARER_TOKEN = your-token-here
```

### Step 3: Verify Token Format

A valid Bearer Token should:
- Be a long string (usually 100+ characters)
- Not contain spaces
- Not be wrapped in quotes
- Start with letters/numbers (not special characters)

### Step 4: Restart Your Dev Server

After updating `.env`:
```bash
# Stop your current server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 5: Check Server Logs

After restarting, check your server console. You should see:
```
🔑 Using Bearer Token (length: XXX, starts with: ...)
```

If you see detailed error logs, they will show:
- Token length
- First/last characters (for verification)
- Whether there are spaces or quotes

## Common Issues

### Issue: "Cannot save changes" in Developer Portal

**Solution:**
- You don't need to "save" the Bearer Token - just copy it
- Bearer Tokens are read-only - you can only regenerate them
- Copy the token and paste it directly into your `.env` file

### Issue: Token seems correct but still getting 401

**Solutions:**
1. **Regenerate the token** - Old tokens may have been revoked
2. **Check app permissions** - Ensure your app has "Read" permissions
3. **Verify app is active** - Check that your app status is "Active" in the portal
4. **Check for typos** - Make sure there are no extra spaces or characters

### Issue: Token works but returns 0 results

This is different from authentication - it means:
- ✅ Authentication is working
- ❌ No tweets match your search queries
- Try simpler queries or check if there are recent tweets matching your search

## Testing Your Token

You can test your Bearer Token manually with curl:

```bash
curl "https://api.twitter.com/2/tweets/search/recent?query=test&max_results=10" \
  -H "Authorization: Bearer YOUR_BEARER_TOKEN_HERE"
```

If you get a 401, the token is invalid.
If you get a 200 with data, the token works!

## Still Having Issues?

1. Check the detailed error logs in your server console
2. Verify the token format matches the examples above
3. Try regenerating the Bearer Token
4. Ensure your app has the correct permissions (Read access)
5. Check X API status: https://status.twitterstat.us/

