// Enhanced debug version of the getAccessToken function
export async function getAccessToken(): Promise<string> {
  // If token is still valid, return it
  if (accessToken && tokenExpiryTime > Date.now()) {
    return accessToken;
  }

  // Get environment variables and log them (with partial redaction for security)
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN!;
  
  // Log partial info for debugging (first and last few characters only)
  const redactMiddle = (str: string): string => {
    if (!str) return "undefined";
    if (str.length <= 8) return str.slice(0, 2) + "******";
    return str.slice(0, 3) + "..." + str.slice(-3);
  };
  
  console.error("DEBUG - Auth credentials:");
  console.error(`Client ID: ${redactMiddle(clientId)} (length: ${clientId?.length || 0})`);
  console.error(`Client Secret: ${redactMiddle(clientSecret)} (length: ${clientSecret?.length || 0})`);
  console.error(`Refresh Token: ${redactMiddle(refreshToken)} (length: ${refreshToken?.length || 0})`);

  try {
    // Otherwise, get a new token
    const authString = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    console.error(`DEBUG - Base64 Auth: ${redactMiddle(authString)} (length: ${authString.length})`);
    
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${authString}`
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken
      })
    });

    console.error(`DEBUG - Token response status: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    console.error(`DEBUG - Token response body: ${responseText}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.status} ${response.statusText}\n${responseText}`);
    }

    const data = JSON.parse(responseText);
    accessToken = data.access_token;
    tokenExpiryTime = Date.now() + (data.expires_in * 1000 * 0.9); // 90% of actual expiry time as safety margin
    return accessToken;
  } catch (error) {
    console.error("DEBUG - Token fetch error:", error);
    throw error;
  }
}

// Rest of the spotify-api.ts file would go here
// You can copy the relevant parts or replace the getAccessToken function in spotify-api.ts
