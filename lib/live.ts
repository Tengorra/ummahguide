/** Live audio from masjids — the stream host for UmmahGuide. Each masjid's box pushes to /masjid/<id>.mp3. */
export const LIVE_HOST = "https://live.ummah.tengorra.com";

export function liveStreamUrl(masjidId: string): string {
  return `${LIVE_HOST}/masjid/${encodeURIComponent(masjidId)}.mp3`;
}

export const LIVE_STATUS_URL = `${LIVE_HOST}/status-json.xsl`;
