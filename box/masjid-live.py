#!/usr/bin/env python3
"""
Masjid Live box — streams the masjid's audio to the UmmahGuide live server.

Runs on a Raspberry Pi Zero 2 W with a USB audio input (Behringer UCA202 on the
amplifier's line-out, or a USB mic). Nothing is broadcast unless BOTH are true:

  1. we are inside a prayer window (adhan − WINDOW_BEFORE_MIN … adhan + WINDOW_AFTER_MIN,
     Jumu'ah on Fridays, and any EXTRA_WINDOWS such as Taraweeh), or the Go-Live button
     was pressed (FORCE_MINUTES), or ALWAYS_ARMED=1;
  2. there is actually sound above THRESHOLD_RMS.

While live it pipes audio through ffmpeg → MP3 → Icecast. It stops after SILENCE_SECONDS
of quiet. A few seconds of pre-roll are kept so the first "Allahu" isn't cut off.

LED:  off = idle · slow blink = armed (waiting for sound) · solid = LIVE · fast blink = error
Button: toggles Go-Live (forced window) for FORCE_MINUTES.

Usage:
  masjid-live              run as the service (systemd does this)
  masjid-live --meter      print the live RMS level to calibrate THRESHOLD_RMS
  masjid-live --test 20    stream for 20 seconds regardless of schedule/sound
"""
from __future__ import annotations

import array
import collections
import datetime as dt
import json
import logging
import os
import signal
import subprocess
import sys
import threading
import time
import urllib.request

CONF_PATH = os.environ.get("MASJID_LIVE_CONF", "/etc/masjid-live.conf")

DEFAULTS = {
    "MASJID_ID": "",            # e.g. node-123456 (from the masjid's page in the app)
    "MASJID_NAME": "Masjid",
    "ICECAST_HOST": "",         # e.g. live.ummah.tengorra.com
    "ICECAST_PORT": "8000",
    "ICECAST_SOURCE_PASSWORD": "",
    "MOUNT": "",                # default /masjid/<MASJID_ID>.mp3
    "BITRATE": "48k",
    "LAT": "52.1332",
    "LNG": "-106.6700",
    "METHOD": "2",              # Aladhan calculation method (2 = ISNA)
    "SCHOOL": "0",              # 0 standard Asr, 1 Hanafi
    "AUDIO_DEVICE": "auto",     # ALSA device, e.g. hw:CARD=CODEC,DEV=0
    "SAMPLE_RATE": "48000",
    "THRESHOLD_RMS": "600",     # 16-bit RMS; calibrate with --meter
    "ATTACK_SECONDS": "0.6",    # sound must persist this long before going live
    "SILENCE_SECONDS": "20",
    "PRE_ROLL_SECONDS": "3",
    "WINDOW_BEFORE_MIN": "15",
    "WINDOW_AFTER_MIN": "45",
    "JUMUAH_WINDOW": "12:00-15:00",
    "EXTRA_WINDOWS": "",        # comma list, e.g. 20:30-22:30 for Taraweeh
    "ALWAYS_ARMED": "0",
    "FORCE_MINUTES": "30",
    "BUTTON_GPIO": "17",
    "LED_GPIO": "27",
    "HEARTBEAT_URL": "",        # optional: POST JSON status every 60 s
}

log = logging.getLogger("masjid-live")


# ----------------------------------------------------------------------------- config
def load_conf() -> dict:
    conf = dict(DEFAULTS)
    if os.path.exists(CONF_PATH):
        with open(CONF_PATH, encoding="utf-8") as f:
            for raw in f:
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                conf[k.strip()] = v.strip().strip('"').strip("'")
    if not conf["MOUNT"]:
        conf["MOUNT"] = f"/masjid/{conf['MASJID_ID'] or 'test'}.mp3"
    return conf


def parse_window(spec: str) -> tuple[dt.time, dt.time] | None:
    try:
        a, b = spec.split("-")
        h1, m1 = map(int, a.strip().split(":"))
        h2, m2 = map(int, b.strip().split(":"))
        return dt.time(h1, m1), dt.time(h2, m2)
    except ValueError:
        return None


# ----------------------------------------------------------------------------- audio device
def find_audio_device(pref: str) -> str:
    if pref and pref != "auto":
        return pref
    try:
        out = subprocess.run(["arecord", "-l"], capture_output=True, text=True, timeout=10).stdout
    except Exception:
        out = ""
    for line in out.splitlines():
        if line.startswith("card") and "[" in line:
            # card 1: CODEC [USB Audio CODEC], device 0: USB Audio [USB Audio]
            card = line.split(":")[0].split()[1]
            name = line.split("[")[1].split("]")[0]
            if "bcm2835" in line.lower() or "headphones" in line.lower():
                continue
            log.info("Using audio card %s (%s)", card, name)
            return f"hw:{card},0"
    log.warning("No USB audio card found; falling back to 'default'")
    return "default"


# ----------------------------------------------------------------------------- prayer windows
class Schedule:
    """Today's streaming windows, from Aladhan adhan times + config."""

    def __init__(self, conf: dict):
        self.conf = conf
        self.windows: list[tuple[dt.datetime, dt.datetime, str]] = []
        self.day: dt.date | None = None

    def refresh_if_needed(self) -> None:
        today = dt.date.today()
        if self.day == today and self.windows:
            return
        try:
            self.windows = self._build(today)
            self.day = today
            log.info("Windows for %s: %s", today, ", ".join(f"{n} {a:%H:%M}-{b:%H:%M}" for a, b, n in self.windows))
        except Exception as e:  # keep last known windows on failure
            log.warning("Could not refresh prayer times: %s", e)
            if not self.windows:
                self.day = None

    def _build(self, today: dt.date) -> list[tuple[dt.datetime, dt.datetime, str]]:
        c = self.conf
        url = (
            f"https://api.aladhan.com/v1/timings/{today:%d-%m-%Y}?latitude={c['LAT']}&longitude={c['LNG']}"
            f"&method={c['METHOD']}&school={c['SCHOOL']}"
        )
        with urllib.request.urlopen(url, timeout=20) as r:
            data = json.load(r)["data"]["timings"]
        before = int(c["WINDOW_BEFORE_MIN"])
        after = int(c["WINDOW_AFTER_MIN"])
        out = []
        for name in ("Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"):
            hh, mm = map(int, data[name].split()[0].split(":"))
            adhan = dt.datetime.combine(today, dt.time(hh, mm))
            out.append((adhan - dt.timedelta(minutes=before), adhan + dt.timedelta(minutes=after), name))
        if today.weekday() == 4:  # Friday
            w = parse_window(c["JUMUAH_WINDOW"])
            if w:
                out.append((dt.datetime.combine(today, w[0]), dt.datetime.combine(today, w[1]), "Jumu'ah"))
        for spec in [s for s in c["EXTRA_WINDOWS"].split(",") if s.strip()]:
            w = parse_window(spec)
            if w:
                out.append((dt.datetime.combine(today, w[0]), dt.datetime.combine(today, w[1]), "Extra"))
        return out

    def active(self, now: dt.datetime) -> str | None:
        for a, b, name in self.windows:
            if a <= now <= b:
                return name
        return None


# ----------------------------------------------------------------------------- LED / button
class Hardware:
    """gpiozero if available (Raspberry Pi), silent no-op otherwise."""

    def __init__(self, conf: dict, on_button):
        self.led = None
        self.button = None
        self.pattern = "off"
        try:
            from gpiozero import LED, Button  # type: ignore

            self.led = LED(int(conf["LED_GPIO"]))
            self.button = Button(int(conf["BUTTON_GPIO"]), pull_up=True, bounce_time=0.05)
            self.button.when_pressed = on_button
            threading.Thread(target=self._blink_loop, daemon=True).start()
        except Exception as e:
            log.info("GPIO unavailable (%s); LED/button disabled", e)

    def set(self, pattern: str) -> None:
        self.pattern = pattern

    def _blink_loop(self) -> None:
        while True:
            p = self.pattern
            if p == "off":
                self.led.off()
                time.sleep(0.2)
            elif p == "solid":
                self.led.on()
                time.sleep(0.2)
            elif p == "slow":
                self.led.on(); time.sleep(0.15); self.led.off(); time.sleep(1.85)
            elif p == "fast":
                self.led.on(); time.sleep(0.1); self.led.off(); time.sleep(0.1)
            else:
                time.sleep(0.2)


# ----------------------------------------------------------------------------- streamer
class Streamer:
    """Reads PCM from arecord, decides live/idle, pipes to ffmpeg → Icecast while live."""

    def __init__(self, conf: dict):
        self.conf = conf
        self.rate = int(conf["SAMPLE_RATE"])
        self.channels = 2
        self.chunk_frames = self.rate // 10  # 100 ms
        self.chunk_bytes = self.chunk_frames * self.channels * 2
        pre_chunks = max(1, int(float(conf["PRE_ROLL_SECONDS"]) * 10))
        self.preroll: collections.deque[bytes] = collections.deque(maxlen=pre_chunks)
        self.ffmpeg: subprocess.Popen | None = None
        self.rms = 0
        self.state = "idle"       # idle | armed | live | error
        self.reason = ""
        self.force_until: dt.datetime | None = None
        self.loud_since: float | None = None
        self.quiet_since: float | None = None
        self.started_at = time.time()
        self.live_since: float | None = None
        self.schedule = Schedule(conf)
        self.hw = Hardware(conf, self.on_button)
        self.stop_flag = False

    # --- button
    def on_button(self) -> None:
        now = dt.datetime.now()
        if self.force_until and self.force_until > now:
            self.force_until = None
            log.info("Button: Go-Live cancelled")
        else:
            self.force_until = now + dt.timedelta(minutes=int(self.conf["FORCE_MINUTES"]))
            log.info("Button: Go-Live until %s", self.force_until.strftime("%H:%M"))

    # --- ffmpeg
    def icecast_url(self) -> str:
        c = self.conf
        return f"icecast://source:{c['ICECAST_SOURCE_PASSWORD']}@{c['ICECAST_HOST']}:{c['ICECAST_PORT']}{c['MOUNT']}"

    def start_stream(self) -> None:
        if self.ffmpeg:
            return
        cmd = [
            "ffmpeg", "-hide_banner", "-loglevel", "warning", "-nostdin",
            "-f", "s16le", "-ar", str(self.rate), "-ac", str(self.channels), "-i", "pipe:0",
            "-ac", "1", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", self.conf["BITRATE"],
            "-content_type", "audio/mpeg",
            "-ice_name", self.conf["MASJID_NAME"], "-ice_description", "Live from the masjid",
            "-f", "mp3", self.icecast_url(),
        ]
        self.ffmpeg = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        self.live_since = time.time()
        for chunk in self.preroll:
            self._write(chunk)
        log.info("LIVE → %s", self.conf["MOUNT"])

    def stop_stream(self) -> None:
        if not self.ffmpeg:
            return
        try:
            if self.ffmpeg.stdin:
                self.ffmpeg.stdin.close()
            self.ffmpeg.wait(timeout=5)
        except Exception:
            self.ffmpeg.kill()
        self.ffmpeg = None
        self.live_since = None
        log.info("Stream stopped")

    def _write(self, chunk: bytes) -> None:
        if not self.ffmpeg or not self.ffmpeg.stdin:
            return
        try:
            self.ffmpeg.stdin.write(chunk)
        except (BrokenPipeError, ValueError):
            err = self.ffmpeg.stderr.read().decode(errors="ignore")[-400:] if self.ffmpeg.stderr else ""
            log.error("ffmpeg died: %s", err.strip())
            self.ffmpeg = None
            self.state = "error"

    # --- level
    @staticmethod
    def rms_of(chunk: bytes) -> int:
        a = array.array("h")
        a.frombytes(chunk[: len(chunk) - (len(chunk) % 2)])
        if not a:
            return 0
        step = 4  # every 4th sample is plenty for a level meter
        total = 0
        n = 0
        for i in range(0, len(a), step):
            v = a[i]
            total += v * v
            n += 1
        return int((total / n) ** 0.5) if n else 0

    # --- main loop
    def run(self, test_seconds: int = 0, meter: bool = False) -> None:
        device = find_audio_device(self.conf["AUDIO_DEVICE"])
        cmd = ["arecord", "-q", "-D", device, "-f", "S16_LE", "-r", str(self.rate), "-c", str(self.channels), "-t", "raw", "-"]
        rec = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        threshold = int(self.conf["THRESHOLD_RMS"])
        attack = float(self.conf["ATTACK_SECONDS"])
        silence = float(self.conf["SILENCE_SECONDS"])
        always = self.conf["ALWAYS_ARMED"] == "1"
        last_hb = 0.0
        test_end = time.time() + test_seconds if test_seconds else None
        log.info("Capturing from %s; threshold %d; mount %s", device, threshold, self.conf["MOUNT"])

        while not self.stop_flag:
            chunk = rec.stdout.read(self.chunk_bytes) if rec.stdout else b""
            if not chunk:
                err = rec.stderr.read().decode(errors="ignore")[-300:] if rec.stderr else ""
                log.error("arecord ended: %s", err.strip())
                self.state = "error"
                self.hw.set("fast")
                time.sleep(3)
                rec = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                continue

            self.rms = self.rms_of(chunk)
            self.preroll.append(chunk)
            now_t = time.time()
            now = dt.datetime.now()

            if meter:
                bar = "#" * min(60, self.rms // 50)
                sys.stdout.write(f"\rRMS {self.rms:5d} {'LOUD' if self.rms >= threshold else '    '} {bar:<60}")
                sys.stdout.flush()
                continue

            if test_end:
                if now_t < test_end:
                    if not self.ffmpeg:
                        self.start_stream()
                    self._write(chunk)
                    continue
                self.stop_stream()
                log.info("Test finished")
                return

            self.schedule.refresh_if_needed()
            forced = bool(self.force_until and self.force_until > now)
            window = self.schedule.active(now)
            armed = always or forced or window is not None
            self.reason = "button" if forced else (window or ("always" if always else ""))

            loud = self.rms >= threshold
            if loud:
                self.loud_since = self.loud_since or now_t
                self.quiet_since = None
            else:
                self.quiet_since = self.quiet_since or now_t
                self.loud_since = None

            if self.ffmpeg:
                self._write(chunk)
                self.state = "live"
                self.hw.set("solid")
                quiet_for = (now_t - self.quiet_since) if self.quiet_since else 0
                if (quiet_for >= silence) or not armed:
                    self.stop_stream()
            elif armed:
                self.state = "armed"
                self.hw.set("slow")
                loud_for = (now_t - self.loud_since) if self.loud_since else 0
                if loud_for >= attack:
                    self.start_stream()
            else:
                self.state = "idle"
                self.hw.set("off")

            if now_t - last_hb >= 60:
                last_hb = now_t
                self.heartbeat()

        self.stop_stream()
        rec.terminate()

    def heartbeat(self) -> None:
        url = self.conf["HEARTBEAT_URL"]
        if not url:
            return
        body = json.dumps({
            "masjidId": self.conf["MASJID_ID"],
            "name": self.conf["MASJID_NAME"],
            "state": self.state,
            "reason": self.reason,
            "rms": self.rms,
            "mount": self.conf["MOUNT"],
            "uptimeSec": int(time.time() - self.started_at),
            "liveSec": int(time.time() - self.live_since) if self.live_since else 0,
        }).encode()
        try:
            req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"}, method="POST")
            urllib.request.urlopen(req, timeout=10).read()
        except Exception as e:
            log.debug("heartbeat failed: %s", e)


# ----------------------------------------------------------------------------- entry
def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    conf = load_conf()
    args = sys.argv[1:]
    meter = "--meter" in args
    test_seconds = 0
    if "--test" in args:
        i = args.index("--test")
        test_seconds = int(args[i + 1]) if i + 1 < len(args) and args[i + 1].isdigit() else 20

    if not meter and (not conf["ICECAST_HOST"] or not conf["ICECAST_SOURCE_PASSWORD"]):
        log.error("ICECAST_HOST and ICECAST_SOURCE_PASSWORD must be set in %s", CONF_PATH)
        sys.exit(2)

    s = Streamer(conf)

    def stop(*_):
        s.stop_flag = True

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    try:
        s.run(test_seconds=test_seconds, meter=meter)
    finally:
        s.stop_stream()
        if meter:
            print()


if __name__ == "__main__":
    main()
