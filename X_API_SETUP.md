# X API Setup Guide

## App Configuration Form

Fill in the X API app configuration form with these values:

### App Permissions
**Select: "Read"**
- We only need to read tweets/search, not post or send DMs
- This is sufficient for fetching deals and stock market news

### Type of App
**Select: "Web App, Automated App or Bot"**
- This is for server-side API calls (which is what we're doing)
- Confidential client type

### Required URLs

**Callback URI / Redirect URL:**
```
http://localhost:3000/api/auth/callback
```
(Or use your production URL if deployed)

**Website URL:**
```
http://localhost:3000
```
(Or your production URL)

**Organization name:**
```
Your Organization Name
```
(Optional, but fill if required)

**Organization URL:**
```
http://localhost:3000
```
(Optional)

**Terms of Service:**
```
http://localhost:3000/terms
```
(You can create a simple terms page later, or use a placeholder)

**Privacy Policy:**
```
http://localhost:3000/privacy
```
(You can create a simple privacy page later, or use a placeholder)

## Getting Your Bearer Token

After creating/updating your app:

1. Go to your app in the X Developer Portal
2. Navigate to "Keys and tokens" tab
3. Under "Bearer Token" section, click "Generate" or copy existing token
4. Copy the Bearer Token
5. Add it to your `.env` file:

```bash
X_API_BEARER_TOKEN=your-bearer-token-here
```

**Important:** 
- Bearer Tokens are used for App-Only authentication (OAuth 2.0)
- They work for read-only operations like searching tweets
- Make sure your app has "Read" permissions enabled

## Testing Your Setup

After configuring:

1. Restart your dev server: `npm run dev`
2. Open the dashboard and expand the News & Deals widget
3. Check the browser console and server logs for:
   - API response status codes
   - Any error messages
   - Response structure details

## Troubleshooting

### If you get 0 results:
- Check server console logs for detailed API responses
- Verify Bearer Token is correct (no extra quotes/spaces)
- Ensure app has "Read" permissions
- Check if you've hit rate limits (free tier has limits)

### If you get authentication errors:
- Verify Bearer Token is valid
- Check token hasn't expired
- Ensure app is in "Active" status in developer portal

### Rate Limits:
- Free tier: 1,500 requests/month
- Basic tier: 3,000 requests/month
- Check your usage in the developer portal

