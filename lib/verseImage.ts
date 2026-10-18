/** Render a verse as a shareable 1080×1350 PNG (Instagram-portrait) on a canvas, then share or download it. */

type Opts = { arabic: string; translation: string; reference: string; surahName: string };

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.rect(x - r / 2, y - r / 2, r, r);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  ctx.rect(-r / 2, -r / 2, r, r);
  ctx.restore();
  ctx.stroke();
}

export async function renderVerseImage(o: Opts): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  // Make sure the web fonts are usable on the canvas.
  try {
    await Promise.all([document.fonts.load('400 60px "Amiri"'), document.fonts.load('500 40px "Fraunces"'), document.fonts.load('600 30px "Plus Jakarta Sans"')]);
  } catch {
    /* fall back to system fonts */
  }

  // Background
  ctx.fillStyle = "#0B3D33";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(201,164,76,0.14)";
  ctx.lineWidth = 1.5;
  for (let y = 60; y < H; y += 120) for (let x = 60; x < W; x += 120) star(ctx, x, y, 60);

  // Card
  const pad = 70;
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.strokeStyle = "rgba(201,164,76,0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(pad, 150, W - pad * 2, H - 300, 40);
  ctx.fill();
  ctx.stroke();

  // Header
  ctx.fillStyle = "#C9A44C";
  ctx.font = '700 26px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = "center";
  ctx.letterSpacing = "4px";
  ctx.fillText("QURAN", W / 2, 240);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#F4F1EA";
  ctx.font = '500 44px "Fraunces", Georgia, serif';
  ctx.fillText(`${o.surahName} · ${o.reference}`, W / 2, 300);

  // Arabic
  const maxW = W - pad * 2 - 100;
  let arabicSize = 62;
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  let arabicLines: string[] = [];
  for (;;) {
    ctx.font = `400 ${arabicSize}px "Amiri", serif`;
    arabicLines = wrap(ctx, o.arabic, maxW);
    if (arabicLines.length * arabicSize * 1.9 <= 520 || arabicSize <= 34) break;
    arabicSize -= 4;
  }
  let y = 420;
  ctx.fillStyle = "#F4F1EA";
  for (const line of arabicLines) {
    ctx.fillText(line, W / 2, y);
    y += arabicSize * 1.9;
  }

  // Divider
  y += 10;
  ctx.strokeStyle = "rgba(201,164,76,0.6)";
  ctx.beginPath();
  ctx.moveTo(W / 2 - 60, y);
  ctx.lineTo(W / 2 + 60, y);
  ctx.stroke();
  y += 60;

  // Translation
  ctx.direction = "ltr";
  let tSize = 34;
  let tLines: string[] = [];
  for (;;) {
    ctx.font = `400 ${tSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
    tLines = wrap(ctx, o.translation, maxW);
    if (y + tLines.length * tSize * 1.5 <= H - 260 || tSize <= 22) break;
    tSize -= 2;
  }
  ctx.fillStyle = "rgba(244,241,234,0.9)";
  for (const line of tLines) {
    ctx.fillText(line, W / 2, y);
    y += tSize * 1.5;
  }

  // Footer
  ctx.fillStyle = "rgba(244,241,234,0.55)";
  ctx.font = '600 24px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText("ummah.tengorra.com", W / 2, H - 110);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not render"))), "image/png"));
}

/** Share the image where the OS allows it, otherwise download it. Returns what happened. */
export async function shareVerseImage(o: Opts): Promise<"shared" | "downloaded"> {
  const blob = await renderVerseImage(o);
  const file = new File([blob], `quran-${o.reference.replace(":", "-")}.png`, { type: "image/png" });
  const nav = typeof navigator !== "undefined" ? navigator : null;
  if (nav?.canShare?.({ files: [file] })) {
    await nav.share({ files: [file], title: `Quran ${o.reference}` });
    return "shared";
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return "downloaded";
}
