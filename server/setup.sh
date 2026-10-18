#!/usr/bin/env bash
# UmmahGuide live server — Icecast behind Caddy (automatic HTTPS). Ubuntu 22.04/24.04, run as root.
#
#   DOMAIN=live.ummah.tengorra.com SOURCE_PASSWORD='long-random' ADMIN_PASSWORD='another' bash setup.sh
#
# Point the DNS A record for DOMAIN at this server BEFORE running (Caddy needs it for the certificate).
set -euo pipefail

: "${DOMAIN:?Set DOMAIN, e.g. DOMAIN=live.ummah.tengorra.com}"
: "${SOURCE_PASSWORD:?Set SOURCE_PASSWORD (the password the masjid boxes use)}"
: "${ADMIN_PASSWORD:?Set ADMIN_PASSWORD (for the Icecast admin page)}"

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq icecast2 debian-keyring debian-archive-keyring apt-transport-https curl >/dev/null

# --- Caddy (official repo)
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq && apt-get install -y -qq caddy >/dev/null
fi

# --- Icecast config
cat >/etc/icecast2/icecast.xml <<EOF
<icecast>
  <location>UmmahGuide</location>
  <admin>admin@${DOMAIN}</admin>
  <hostname>${DOMAIN}</hostname>

  <limits>
    <clients>500</clients>
    <sources>50</sources>
    <queue-size>524288</queue-size>
    <client-timeout>30</client-timeout>
    <header-timeout>15</header-timeout>
    <source-timeout>10</source-timeout>
    <burst-size>65535</burst-size>
  </limits>

  <authentication>
    <source-password>${SOURCE_PASSWORD}</source-password>
    <relay-password>${SOURCE_PASSWORD}</relay-password>
    <admin-user>admin</admin-user>
    <admin-password>${ADMIN_PASSWORD}</admin-password>
  </authentication>

  <!-- Port 8000 is where the masjid boxes push audio (plain HTTP, long random source password).
       Listeners never touch it: they use HTTPS on 443 through Caddy. -->
  <listen-socket>
    <port>8000</port>
  </listen-socket>

  <http-headers>
    <header name="Access-Control-Allow-Origin" value="*" />
  </http-headers>

  <fileserve>1</fileserve>
  <paths>
    <basedir>/usr/share/icecast2</basedir>
    <logdir>/var/log/icecast2</logdir>
    <webroot>/usr/share/icecast2/web</webroot>
    <adminroot>/usr/share/icecast2/admin</adminroot>
    <alias source="/" destination="/status.xsl"/>
  </paths>

  <logging>
    <accesslog>access.log</accesslog>
    <errorlog>error.log</errorlog>
    <loglevel>3</loglevel>
    <logsize>10000</logsize>
  </logging>

  <security>
    <chroot>0</chroot>
    <changeowner>
      <user>icecast2</user>
      <group>icecast</group>
    </changeowner>
  </security>
</icecast>
EOF
sed -i 's/^ENABLE=.*/ENABLE=true/' /etc/default/icecast2 2>/dev/null || true
systemctl enable icecast2 >/dev/null
systemctl restart icecast2

# --- Caddy: HTTPS in front of Icecast
cat >/etc/caddy/Caddyfile <<EOF
${DOMAIN} {
  encode zstd gzip
  reverse_proxy 127.0.0.1:8000 {
    flush_interval -1
    header_up X-Forwarded-Proto https
  }
}
EOF
systemctl enable caddy >/dev/null
systemctl restart caddy

# --- Firewall: 80/443 for listeners (Caddy), 8000 for the masjid boxes, 22 for you.
if command -v ufw >/dev/null; then
  ufw allow 22/tcp >/dev/null
  ufw allow 80/tcp >/dev/null
  ufw allow 443/tcp >/dev/null
  ufw allow 8000/tcp >/dev/null
  ufw --force enable >/dev/null
fi

cat <<EOF

✔ Live server ready.

  Stream URLs:   https://${DOMAIN}/masjid/<masjid-id>.mp3
  Status (JSON): https://${DOMAIN}/status-json.xsl      ← the app reads this to show "Live now"
  Admin:         https://${DOMAIN}/admin/   (user: admin)

Give each masjid box:
  ICECAST_HOST=${DOMAIN}
  ICECAST_PORT=8000
  ICECAST_SOURCE_PASSWORD=${SOURCE_PASSWORD}
EOF
