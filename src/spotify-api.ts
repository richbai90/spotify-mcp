// Token management
let accessToken: string = "";
let tokenExpiryTime: number = 0;

// We'll access environment variables directly when needed rather than storing as constants
// This ensures we always get the current value, in case they're updated

// Helper functions
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

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

export async function searchTracks(query: string, limit: number = 10): Promise<string> {
  const token = await getAccessToken();
  const url = new URL("https://api.spotify.com/v1/search");
  url.searchParams.set("q", query);
  url.searchParams.set("type", "track");
  url.searchParams.set("limit", Math.min(limit, 50).toString());

  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`Spotify API error: ${response.status} ${response.statusText}\n${await response.text()}`);
  }

  const data = await response.json();
  
  if (!data.tracks || !data.tracks.items || data.tracks.items.length === 0) {
    return "No tracks found matching your query.";
  }

  const tracks = data.tracks.items.map((track: any, index: number) => {
    return `${index + 1}. "${track.name}" by ${track.artists.map((a: any) => a.name).join(", ")}
   Album: ${track.album.name}
   Duration: ${formatDuration(track.duration_ms)}
   Spotify URI: ${track.uri}
   Track ID: ${track.id}
   Popularity: ${track.popularity}/100
  `;
  }).join("\n\n");

  return `Found ${data.tracks.items.length} tracks matching "${query}":\n\n${tracks}`;
}

export async function getRecommendations(params: {
  seed_tracks?: string[],
  seed_artists?: string[],
  seed_genres?: string[],
  limit?: number,
  target_energy?: number,
  target_danceability?: number,
  target_tempo?: number
}): Promise<string> {
  const { 
    seed_tracks = [], 
    seed_artists = [], 
    seed_genres = [], 
    limit = 20,
    target_energy,
    target_danceability,
    target_tempo
  } = params;

  // Check if we have at least one seed
  if (seed_tracks.length + seed_artists.length + seed_genres.length === 0) {
    throw new Error("At least one seed track, artist, or genre is required");
  }

  // Check if we have at most 5 seeds
  if (seed_tracks.length + seed_artists.length + seed_genres.length > 5) {
    throw new Error("You can only use a total of 5 seeds (tracks, artists, and genres combined)");
  }

  const token = await getAccessToken();
  const url = new URL("https://api.spotify.com/v1/recommendations");
  
  if (seed_tracks.length > 0) {
    url.searchParams.set("seed_tracks", seed_tracks.join(","));
  }
  
  if (seed_artists.length > 0) {
    url.searchParams.set("seed_artists", seed_artists.join(","));
  }
  
  if (seed_genres.length > 0) {
    url.searchParams.set("seed_genres", seed_genres.join(","));
  }

  url.searchParams.set("limit", Math.min(limit, 100).toString());

  // Add audio feature targets if provided
  if (target_energy !== undefined) {
    url.searchParams.set("target_energy", target_energy.toString());
  }
  
  if (target_danceability !== undefined) {
    url.searchParams.set("target_danceability", target_danceability.toString());
  }
  
  if (target_tempo !== undefined) {
    url.searchParams.set("target_tempo", target_tempo.toString());
  }

  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`Spotify API error: ${response.status} ${response.statusText}\n${await response.text()}`);
  }

  const data = await response.json();
  
  if (!data.tracks || data.tracks.length === 0) {
    return "No recommendations found with your criteria.";
  }

  const tracks = data.tracks.map((track: any, index: number) => {
    return `${index + 1}. "${track.name}" by ${track.artists.map((a: any) => a.name).join(", ")}
   Album: ${track.album.name}
   Duration: ${formatDuration(track.duration_ms)}
   Spotify URI: ${track.uri}
   Track ID: ${track.id}
   Popularity: ${track.popularity}/100
  `;
  }).join("\n\n");

  let seedInfo = "";
  if (seed_tracks.length > 0) seedInfo += `Track Seeds: ${seed_tracks.join(", ")}\n`;
  if (seed_artists.length > 0) seedInfo += `Artist Seeds: ${seed_artists.join(", ")}\n`;
  if (seed_genres.length > 0) seedInfo += `Genre Seeds: ${seed_genres.join(", ")}\n`;

  return `Recommendations based on:\n${seedInfo}\n\n${tracks}`;
}

export async function createPlaylist(name: string, description: string = "", isPublic: boolean = false): Promise<string> {
  const token = await getAccessToken();
  
  // First, get the user ID
  const userResponse = await fetch("https://api.spotify.com/v1/me", {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (!userResponse.ok) {
    throw new Error(`Spotify API error: ${userResponse.status} ${userResponse.statusText}\n${await userResponse.text()}`);
  }

  const userData = await userResponse.json();
  const userId = userData.id;

  // Create the playlist
  const response = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name,
      description,
      public: isPublic
    })
  });

  if (!response.ok) {
    throw new Error(`Spotify API error: ${response.status} ${response.statusText}\n${await response.text()}`);
  }

  const data = await response.json();
  
  return `Successfully created playlist "${name}"!
  Playlist ID: ${data.id}
  Playlist URL: ${data.external_urls.spotify}
  Now you can add tracks to this playlist using the spotify_add_tracks_to_playlist tool.`;
}

export async function addTracksToPlaylist(playlistId: string, trackUris: string[], position?: number): Promise<string> {
  const token = await getAccessToken();
  
  const url = new URL(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`);
  
  const body: any = {
    uris: trackUris,
  };
  
  if (position !== undefined) {
    body.position = position;
  }

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Spotify API error: ${response.status} ${response.statusText}\n${await response.text()}`);
  }

  const data = await response.json();
  
  return `Successfully added ${trackUris.length} track(s) to the playlist!
  Snapshot ID: ${data.snapshot_id}`;
}

export async function getUserPlaylists(limit: number = 20, offset: number = 0): Promise<string> {
  const token = await getAccessToken();
  
  const url = new URL("https://api.spotify.com/v1/me/playlists");
  url.searchParams.set("limit", Math.min(limit, 50).toString());
  url.searchParams.set("offset", offset.toString());

  const response = await fetch(url.toString(), {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`Spotify API error: ${response.status} ${response.statusText}\n${await response.text()}`);
  }

  const data = await response.json();
  
  if (!data.items || data.items.length === 0) {
    return "You don't have any playlists yet.";
  }

  const playlists = data.items.map((playlist: any, index: number) => {
    return `${index + 1}. "${playlist.name}"
   Description: ${playlist.description || "No description"}
   Tracks: ${playlist.tracks.total}
   Public: ${playlist.public ? "Yes" : "No"}
   Playlist ID: ${playlist.id}
   URL: ${playlist.external_urls.spotify}
  `;
  }).join("\n\n");

  return `Found ${data.items.length} playlists (showing ${offset + 1}-${offset + data.items.length} of ${data.total}):\n\n${playlists}`;
}

export async function getPlaylistTracks(playlistId: string, limit: number = 50, offset: number = 0): Promise<string> {
  const token = await getAccessToken();
  
  // First, get the playlist details
  const playlistResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (!playlistResponse.ok) {
    throw new Error(`Spotify API error: ${playlistResponse.status} ${playlistResponse.statusText}\n${await playlistResponse.text()}`);
  }

  const playlistData = await playlistResponse.json();
  
  // Now get the tracks
  const url = new URL(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`);
  url.searchParams.set("limit", Math.min(limit, 100).toString());
  url.searchParams.set("offset", offset.toString());

  const response = await fetch(url.toString(), {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`Spotify API error: ${response.status} ${response.statusText}\n${await response.text()}`);
  }

  const data = await response.json();
  
  if (!data.items || data.items.length === 0) {
    return `Playlist "${playlistData.name}" is empty.`;
  }

  const tracks = data.items.map((item: any, index: number) => {
    const track = item.track;
    return `${index + offset + 1}. "${track.name}" by ${track.artists.map((a: any) => a.name).join(", ")}
   Album: ${track.album.name}
   Duration: ${formatDuration(track.duration_ms)}
   Added at: ${new Date(item.added_at).toLocaleString()}
   Spotify URI: ${track.uri}
   Track ID: ${track.id}
  `;
  }).join("\n\n");

  return `Tracks in "${playlistData.name}" (showing ${offset + 1}-${offset + data.items.length} of ${playlistData.total}):\n\n${tracks}`;
}
