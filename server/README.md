# UmmahGuide live server

One small Linux server relays every masjid's stream to every listener.

## What you need

- A VPS: Ubuntu 24.04, 1 vCPU, 1–2 GB RAM (Hetzner CX22 ≈ €4/mo, DigitalOcean Basic ≈ $6/mo). Bandwidth: 48 kbps per listener — 100 simultaneous listeners is ~5 Mbps, well inside any plan.
- A subdomain pointed at it (A record), e.g. `live.yourdomain.com`.

## Setup (10 min)

```bash
ssh root@<server-ip>
git clone https://github.com/Tengorra/ummahguide.git && cd ummahguide/server
DOMAIN=live.yourdomain.com SOURCE_PASSWORD='long-random-string' ADMIN_PASSWORD='another-one' bash setup.sh
```

That installs Icecast (the relay) and Caddy (automatic HTTPS), opens the firewall, and prints the values to put in each masjid box's config.

## URLs

| | |
|---|---|
| Listen | `https://live.yourdomain.com/masjid/<masjid-id>.mp3` |
| Who's live (JSON) | `https://live.yourdomain.com/status-json.xsl` — the app polls this to show **Live now** |
| Admin | `https://live.yourdomain.com/admin/` |

## Adding a masjid

Nothing to do on the server: a box with the right password creates its mount the first time it goes live.

## Notes

- Boxes push on port 8000 (plain HTTP with the long source password); listeners only ever use HTTPS on 443. Keep the source password private to the boxes.
- Latency to listeners is 2–8 s.
- To see the live log: `journalctl -fu icecast2`.
