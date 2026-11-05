// Renders each walkie-pubmat-*.html at 2× and downsamples to an exact 1080×1080 PNG in out/ (needs a static server on :8766 at the repo root).
const { chromium } = require("playwright"); const { execFileSync } = require("child_process"); const fs = require("fs");
const only = process.argv[2];
(async () => {
  const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 2 });
  p.on("pageerror", (e) => console.log("err", e.message));
  for (const f of fs.readdirSync(__dirname).filter((x) => /^walkie-pubmat-\d.*\.html$/.test(x) && (!only || x.includes(only)))) {
    await p.goto(`http://127.0.0.1:8766/marketing/pubmats/${f}`); await p.waitForFunction(() => window.__ready, null, { timeout: 60000 }); await p.waitForTimeout(300);
    const hi = `${__dirname}/out/${f.replace(".html", "@2x.png")}`, out = `${__dirname}/out/${f.replace(".html", ".png")}`;
    await p.screenshot({ path: hi, clip: { x: 0, y: 0, width: 1080, height: 1080 } });
    execFileSync("python3", ["-c", `from PIL import Image;im=Image.open("${hi}").convert("RGB");im.resize((1080,1080),Image.LANCZOS).save("${out}",optimize=True)`]);
    fs.unlinkSync(hi); console.log("✓", out.split("/").pop());
  }
  await b.close();
})();
