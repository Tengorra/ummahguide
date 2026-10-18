# Masjid Live box

A Raspberry Pi Zero 2 W that streams the masjid's azan, Jamat and khutbah to the UmmahGuide live server — only inside prayer windows, only when there is sound, or when someone presses the Go-Live button.

```
amplifier line-out ──RCA──▶ Behringer UCA202 ──USB──▶ Pi Zero 2 W ──Wi-Fi──▶ live server ──https──▶ phones / home speaker
                                                         │
                                            Go-Live button + status LED
```

## Parts

| Part | Notes |
|---|---|
| Raspberry Pi Zero 2 W | with headers if you want the button/LED |
| Behringer UCA202 | USB audio interface — takes the amplifier's **line out** (RCA) |
| RCA cable (3 ft) | amplifier → UCA202 input |
| micro-USB OTG adapter | Pi's **USB** port (not PWR) → UCA202 |
| 32 GB microSD | |
| 5 V 2.5 A micro-USB power supply | |
| 12 mm momentary button + 5 mm LED + 330 Ω resistor | optional but recommended |
| *(no line-out available?)* Fifine K053 USB mic | plug it in instead of the UCA202 |

## 1 · Flash the card (5 min)

1. Install **Raspberry Pi Imager** on any computer.
2. Choose *Raspberry Pi Zero 2 W* → *Raspberry Pi OS Lite (64-bit)* → your microSD.
3. In **Edit settings**: hostname `masjid-box`, username `pi` + a password, the masjid's **Wi-Fi name and password**, time zone, and enable **SSH** (password).
4. Write, put the card in the Pi, plug in the UCA202 (via OTG adapter) and power.

## 2 · Wire the button and LED (optional, 2 min)

BCM pin numbers; physical pins in brackets.

```
Button:  GPIO17 (pin 11) ──┤ ├── GND (pin 9)
LED:     GPIO27 (pin 13) ──▶|── 330 Ω ── GND (pin 14)      (long LED leg to GPIO27)
```

## 3 · Install (3 min)

From any computer on the same Wi-Fi:

```bash
ssh pi@masjid-box.local
curl -fsSL https://raw.githubusercontent.com/Tengorra/ummahguide/main/box/install.sh | sudo bash
sudo nano /etc/masjid-live.conf
```

Fill in:

- `MASJID_ID` — the last part of the masjid's page address in UmmahGuide (e.g. `node-123456`)
- `MASJID_NAME`
- `ICECAST_HOST` and `ICECAST_SOURCE_PASSWORD` — from the server setup
- `LAT`, `LNG` — the masjid's coordinates (the app shows them, or copy from Google Maps)

## 4 · Calibrate and test (5 min)

```bash
sudo masjid-live --meter
```

Watch the level. Quiet room ≈ 50–200. Azan through the amplifier ≈ 1500+. Set `THRESHOLD_RMS` to about **3× the quiet-room number** (e.g. 600) and save.

```bash
sudo masjid-live --test 20
```

Open `https://<ICECAST_HOST>/masjid/<MASJID_ID>.mp3` on your phone — you should hear the room for 20 seconds.

```bash
sudo systemctl start masjid-live
journalctl -fu masjid-live       # Ctrl+C to leave; the service keeps running
```

## How it decides to stream

| Condition | Result |
|---|---|
| Inside a window (15 min before adhan → 45 min after, Jumu'ah 12:00–15:00 on Fridays, any `EXTRA_WINDOWS`) **and** sound above threshold | **Live** |
| Inside a window, quiet | Armed (LED slow blink), waiting |
| Outside windows | Idle — nothing is captured or sent |
| Go-Live button pressed | Armed for `FORCE_MINUTES` regardless of the clock; press again to cancel |
| 20 s of silence while live | Stream stops |

Ramadan: add `EXTRA_WINDOWS=20:30-23:00` for Taraweeh. Times come from Aladhan for the masjid's own coordinates, refreshed daily.

## LED

off = idle · slow blink = armed · solid = live · fast blink = error (no audio device or no network — check `journalctl -u masjid-live`)

## Privacy rules built in

- No audio leaves the box outside prayer windows unless the button is pressed.
- Nothing is recorded; the stream is relayed live and not stored.
- The committee can unplug it at any time; it recovers on its own when power returns.
