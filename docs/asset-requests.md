# Google AI Ultra asset checklist for Whisk stills and Flow cinema loops

The Web Profile on `feat/atelier-folio-monarch` ships with repo-baked `.avif`, `.webp`, and `.jpg` plates under `public/media/` alongside the real-time Three.js depth-relief and golden dust-mote WebGL scene in `MonarchReliefCanvas.tsx`, so the site runs offline with zero missing assets.

Use this checklist with your Google AI Ultra account through `/browser` in Antigravity or in Chrome to place 2K to 4K Whisk plates and 8-second Flow `Veo 3.1 Quality` cinema files into `public/media/`. At build time, `vite.config.ts` checks `hero-monarch-intro.{webm,mp4}`, `hero-monarch-loop.{webm,mp4}`, and `portfolio-porch-loop.{webm,mp4}` and sets `__HAS_HERO_INTRO_VIDEO__`, `__HAS_HERO_VIDEO__`, and `__HAS_PORTFOLIO_VIDEO__`.

---

## 1. Whisk and Gemini Nano Banana Pro 2K to 4K still plates

Open `https://labs.google/fx/tools/whisk` or select `Nano Banana Pro` in the Gemini app at the largest `2K` or `4K` export setting. Keep all paper surfaces and studio objects free of lettering, numbers, watermarks, logos, or printed text.

### Plate A: Act 00 and Act 01 Monarch hero plate at `assets-raw/hero-monarch.jpg`

**Reference anchor.** Upload `assets-raw/hero-monarch.jpg` as the Subject and Scene reference in Whisk so composition and focal clearance stay aligned with `JORGE` at the top left and `BUCIO` at the middle right.

**Aspect ratio.** Export at `16:9`, either `3840x2160` 4K or `2752x1536` 2K.

**Prompt.**
```text
Overhead three-quarter medium-format editorial still life photographed on Hasselblad 500C/M Kodak Portra 400 in a sunlit Southern California architectural studio. Honed warm sand travertine stone table, an unbleached raw linen runner on the lower left, a thick stack of completely blank deckled-edge handmade cotton-rag paper near center-left, a single lifelike California Monarch butterfly (Danaus plexippus) resting calmly with open burnt-orange and velvet-black veined wings on the blank cotton-rag paper casting a soft natural shadow, a solid aged brass drafting compass divider resting to the right, and the rim of a matte stoneware cup at upper right. Crisp raking morning sunlight from olive branches outside a tall casement window casts soft diagonal botanical shadows across the travertine and blank paper. Tactile stone pores, cotton paper fibres, fine natural film grain, completely blank unprinted paper, zero text, zero letters, zero logos, zero watermarks.
```

### Plate B: Act 04 live portfolio portal plate at `assets-raw/portfolio-porch.jpg`

**Reference anchor.** Upload `assets-raw/portfolio-porch.jpg` as the scene reference.

**Aspect ratio.** Export at `16:9`, either `3840x2160` 4K or `2752x1536` 2K.

**Prompt.**
```text
Quiet architectural photograph of a sunlit Southern California limestone courtyard and open studio doorway at late morning, shot on 35mm Leica Summilux lens, Kodak Portra 400. Hand-troweled warm limewash plaster wall, honed travertine threshold step, terracotta planter with a mature California olive tree casting delicate dappled leaf shadows across the stone floor, warm golden air, serene museum stillness. Fine natural film grain, true-to-life architectural photography, zero people, zero text, zero signage, zero logos.
```

### Refreshing `public/media/` after replacing `assets-raw/*.jpg`

```bash
sips -Z 2400 assets-raw/hero-monarch.jpg --out public/media/hero-monarch.jpg
cwebp -q 86 public/media/hero-monarch.jpg -o public/media/hero-monarch.webp
avifenc --min 18 --max 28 public/media/hero-monarch.jpg public/media/hero-monarch.avif

sips -Z 2000 assets-raw/portfolio-porch.jpg --out public/media/portfolio-porch.jpg
cwebp -q 85 public/media/portfolio-porch.jpg -o public/media/portfolio-porch.webp
avifenc --min 18 --max 28 public/media/portfolio-porch.jpg public/media/portfolio-porch.avif
```

---

## 2. Google Labs Flow `Veo 3.1 Quality` cinema plates

**Generator settings.** Open `https://labs.google/fx/tools/flow`, choose `Frames to Video`, select `Veo 3.1 Quality` or `Omni 1.2 Flash` when attaching a portrait ingredient, set duration to `8s` at `16:9`, and turn audio off.

**Frame boundary rules.** For the one-shot page-load landing clip `raw-hero-monarch-intro.mp4`, upload the top-left mid-flight plate as the First Frame and `public/media/hero-monarch.jpg` as the End Frame so the butterfly lands on the exact resting mark. For the two repeating loops `raw-hero-monarch.mp4` and `raw-portfolio-porch.mp4`, upload the same resting still as both the First Frame and End Frame so the final frame closes back into frame `0` without a jump cut.

**Quality gate.** Reject any take where the Monarch doubles or warps wing anatomy, a second butterfly enters, the brass divider shifts, text appears on the blank paper, or the camera pans or zooms.

| Target drop-in file | First frame | End frame | Aspect | Flow prompt |
| :--- | :--- | :--- | :--- | :--- |
| `raw-hero-monarch-intro.mp4` | Top-left mid-flight Monarch plate over clean `hero-monarch.jpg` desk | `public/media/hero-monarch.jpg` | `16:9` | `Static locked-off overhead three-quarter camera on a heavy tripod in a sunlit Southern California architectural studio. Starting in mid-flight in the top-left corner of the frame, the single lifelike California Monarch butterfly flaps and glides gracefully around in a gentle sweeping arc through the golden morning sunbeam above the honed travertine table and blank handmade cotton-rag paper stack, casting a soft moving shadow across the linen and paper as it makes its way smoothly toward the center-right of the blank cotton-rag paper, landing gently in the exact spot and open-wing resting pose of the end frame. The travertine stone table, linen cloth, blank cotton-rag paper stack, brass drafting divider, and ceramic cup stay completely stationary. Natural fluid butterfly flight and gentle landing, fine Kodak Portra 400 film grain, zero text, zero extra butterflies.` |
| `raw-hero-monarch.mp4` | `public/media/hero-monarch.jpg` | `public/media/hero-monarch.jpg` | `16:9` | `The California Monarch butterfly stays perched in the exact same spot on the blank cotton-rag paper stack and gives one slow, unhurried, gentle basking breath of its wings before settling back to its exact starting rest pose. Dappled olive-leaf window shadows sway barely perceptibly across the honed travertine table and blank paper in a light morning breeze, and a few tiny golden dust motes drift through the sunbeam. The paper stack, brass divider, and ceramic cup stay completely stationary. Static locked-off camera on a heavy tripod, no zoom, no pan. Slow, calm, natural motion. Photographic and true to life, fine film grain. No text, no new objects.` |
| `raw-portfolio-porch.mp4` | `public/media/portfolio-porch.jpg` + LinkedIn portrait ingredient | `public/media/portfolio-porch.jpg` | `16:9` | `The sunlit Southern California limestone and terracotta courtyard stays framed on a static locked-off tripod camera. The wooden front door opens, and the subject from the reference portrait wearing relaxed casual clothing steps out of the house onto the porch, gently closing the wooden door behind him. He walks calmly down the terracotta steps straight toward the camera with his eyes looking out into the distance. At the bottom of the steps, he turns and walks casually off toward the right; as he walks off to the right, he looks naturally toward the camera, gives a small friendly wave, and finishes walking completely off-screen, leaving the quiet sunlit porch and closed door matching the starting frame. Static locked-off camera, no zoom, no pan. Natural motion, photographic and true to life, fine film grain. No text, no watermarks.` |

### WebM and MP4 muted compression within the `2.5 MB` budget

After downloading from Flow, strip audio tracks with `-an` and transcode into `public/media/` so `npm run build` enables `__HAS_HERO_INTRO_VIDEO__`, `__HAS_HERO_VIDEO__`, and `__HAS_PORTFOLIO_VIDEO__`:

```bash
# Page-load Hero Monarch top-left flight & paper landing intro
ffmpeg -y -i raw-hero-monarch-intro.mp4 -an -c:v libvpx-vp9 -b:v 1950k -maxrate 2150k -bufsize 4300k -crf 32 -pix_fmt yuv420p -row-mt 1 -deadline good -cpu-used 2 public/media/hero-monarch-intro.webm
ffmpeg -y -i raw-hero-monarch-intro.mp4 -an -c:v libx264 -preset slow -crf 24 -maxrate 2150k -bufsize 4300k -pix_fmt yuv420p -movflags +faststart public/media/hero-monarch-intro.mp4

# Hero-to-Journey transition Monarch wing-flutter loop
ffmpeg -y -i raw-hero-monarch.mp4 -an -c:v libvpx-vp9 -crf 33 -b:v 0 -vf "scale=1920:-2" public/media/hero-monarch-loop.webm
ffmpeg -y -i raw-hero-monarch.mp4 -an -c:v libx264 -crf 25 -preset slow -pix_fmt yuv420p -movflags +faststart -vf "scale=1920:-2" public/media/hero-monarch-loop.mp4

# Act 04 Portfolio Porch ambient loop
ffmpeg -y -i raw-portfolio-porch.mp4 -an -c:v libvpx-vp9 -crf 34 -b:v 0 -vf "scale=1600:-2" public/media/portfolio-porch-loop.webm
ffmpeg -y -i raw-portfolio-porch.mp4 -an -c:v libx264 -crf 27 -maxrate 1850k -bufsize 3700k -preset slow -pix_fmt yuv420p -movflags +faststart -vf "scale=1600:-2" public/media/portfolio-porch-loop.mp4
```
