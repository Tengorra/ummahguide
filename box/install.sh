#!/usr/bin/env bash
# Masjid Live box installer — Raspberry Pi OS (Bookworm or newer), run as root:
#   curl -fsSL https://raw.githubusercontent.com/Tengorra/ummahguide/main/box/install.sh | sudo bash
set -euo pipefail

REPO_RAW="https://raw.githubusercontent.com/Tengorra/ummahguide/main/box"
DEST=/opt/masjid-live
CONF=/etc/masjid-live.conf

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo." >&2
  exit 1
fi

echo "▶ Installing packages (ffmpeg, alsa, gpiozero)…"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ffmpeg alsa-utils python3 python3-gpiozero python3-lgpio curl >/dev/null

echo "▶ Fetching masjid-live…"
mkdir -p "$DEST"
curl -fsSL "$REPO_RAW/masjid-live.py" -o "$DEST/masjid-live.py"
curl -fsSL "$REPO_RAW/masjid-live.service" -o /etc/systemd/system/masjid-live.service
curl -fsSL "$REPO_RAW/masjid-live.conf.example" -o "$DEST/masjid-live.conf.example"
chmod 755 "$DEST/masjid-live.py"
ln -sf "$DEST/masjid-live.py" /usr/local/bin/masjid-live

if [ ! -f "$CONF" ]; then
  cp "$DEST/masjid-live.conf.example" "$CONF"
  chmod 600 "$CONF"
  echo "▶ Created $CONF — edit it before starting (masjid id, server host, source password, lat/lng)."
fi

# Make sure the USB audio device is the preferred capture device.
cat >/etc/asound.conf <<'EOF'
pcm.!default { type plug; slave.pcm "hw:CODEC,0" }
ctl.!default { type hw; card CODEC }
EOF

systemctl daemon-reload
systemctl enable masjid-live >/dev/null

cat <<EOF

✔ Installed.

Next:
  1. sudo nano $CONF            # fill in MASJID_ID, ICECAST_HOST, ICECAST_SOURCE_PASSWORD, LAT, LNG
  2. sudo masjid-live --meter      # watch the level; set THRESHOLD_RMS between room noise and azan (Ctrl+C to exit)
  3. sudo masjid-live --test 20    # streams 20 s now — open https://<ICECAST_HOST>/masjid/<MASJID_ID>.mp3 to hear it
  4. sudo systemctl start masjid-live && journalctl -fu masjid-live

The box then streams only inside prayer windows (or after the Go-Live button), and only when there is sound.
EOF
