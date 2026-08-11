# FlexOver BD — Artwork Brief

**Banners to generate: 0 of 9 still needed.**
Product & category photos: 70 of 70 in place (demo stand-ins).

## How to add an image

1. Generate or shoot it at the stated pixel size.
2. Save it at the exact path shown, creating folders as needed under `public/`.
3. Refresh — it appears automatically. No code change needed.

The file extension is flexible: `.jpg`, `.png` and `.webp` all work as long
as the file name before the dot matches. Re-run `pnpm images:manifest` to
see updated progress.

---

# Part 1 — Banners (generate these)

No artwork exists for these yet. Feed the prompt to your image model.

**Please keep two constraints.** Headlines and prices are never baked into
the artwork — they are live HTML rendered on top of it, which keeps copy
sharp on every screen, editable without regenerating an image, and readable
by search engines. That is why each banner prompt asks for clean empty space
on one side, and why every prompt ends with *no text, no logos, no
watermark*. Artwork with text baked in will collide with the real headline.

## Hero banners (6/6)

### `/images/banners/hero-fashion-mobile.png` — ✅ in place

- **Size:** 1080 × 1080 px
- **Alt text:** Young Bangladeshi couple in modern casual fashion

```text
Lifestyle fashion photograph of a young South Asian couple in their twenties wearing modern smart-casual clothing — she in a pastel cotton kurti, he in a plain olive shirt — walking and laughing on a sunlit city street. Warm golden-hour light, shallow depth of field, subjects positioned in the upper two thirds with clean uncluttered space across the bottom third for a text overlay. Square 1:1 crop, editorial retail campaign look, absolutely no text, no typography, no logos, no watermark.
```

### `/images/banners/hero-fashion-desktop.png` — ✅ in place

- **Size:** 2400 × 1030 px
- **Alt text:** Young Bangladeshi couple in modern casual fashion

```text
Wide lifestyle fashion photograph of a young South Asian couple in their twenties in modern smart-casual clothing — she in a pastel cotton kurti, he in a plain olive shirt — walking on a sunlit city street. Warm golden-hour light, shallow depth of field. Subjects composed on the RIGHT third of the frame; the entire left half is soft clean background with room for a headline. Ultra-wide 21:9 crop, editorial retail campaign look, absolutely no text, no typography, no logos, no watermark.
```

### `/images/banners/hero-gadgets-mobile.png` — ✅ in place

- **Size:** 1080 × 1080 px
- **Alt text:** Wireless earbuds, smartwatch and power bank arranged on a dark surface

```text
Dramatic tech hero photograph — wireless earbuds in an open case, a smartwatch with a glowing display and a slim power bank floating in a loose diagonal arrangement above a dark charcoal surface. Cool blue rim lighting with a single warm orange accent light, subtle reflections. Products occupy the upper two thirds, clean dark negative space across the bottom third for a text overlay. Square 1:1 crop, absolutely no text, no typography, no logos, no watermark.
```

### `/images/banners/hero-gadgets-desktop.png` — ✅ in place

- **Size:** 2400 × 1030 px
- **Alt text:** Wireless earbuds, smartwatch and power bank arranged on a dark surface

```text
Ultra-wide dramatic tech hero photograph — wireless earbuds in an open case, a smartwatch with a glowing display and a slim power bank arranged in a loose diagonal on the RIGHT half of the frame above a dark charcoal surface. Cool blue rim lighting with a warm orange accent. The entire left half is clean dark negative space for a headline. 21:9 crop, absolutely no text, no typography, no logos, no watermark.
```

### `/images/banners/hero-home-mobile.jpg` — ✅ in place

- **Size:** 1080 × 1080 px
- **Alt text:** Bright modern kitchen counter with cookware and storage jars

```text
Bright interior lifestyle photograph of a modern kitchen counter — a matte black non-stick pan, glass storage jars with bamboo lids, stacked ceramic bowls and a folded linen towel — with soft morning sunlight falling across a warm wood surface and a plant blurred in the background. Composition sits in the upper two thirds with clean uncluttered counter space across the bottom third for a text overlay. Square 1:1 crop, absolutely no text, no typography, no logos, no watermark.
```

### `/images/banners/hero-home-desktop.png` — ✅ in place

- **Size:** 2400 × 1030 px
- **Alt text:** Bright modern kitchen counter with cookware and storage jars

```text
Ultra-wide bright interior photograph of a modern kitchen counter — matte black non-stick pan, glass storage jars with bamboo lids, stacked ceramic bowls and a folded linen towel — arranged on the RIGHT half over a warm wood surface in soft morning sunlight. The left half is a softly blurred bright wall with room for a headline. 21:9 crop, absolutely no text, no typography, no logos, no watermark.
```

## Promo banners (3/3)

### `/images/banners/promo-beauty.png` — ✅ in place

- **Size:** 1200 × 800 px
- **Alt text:** Skincare bottles arranged on a soft pink surface

```text
Soft beauty campaign photograph — an amber serum dropper bottle, a white cream jar and a frosted toner bottle grouped on the RIGHT side of a blush-pink surface with a single fresh petal and gentle window shadows. Left third left clean and empty for a text overlay. 3:2 crop, luminous diffused lighting, absolutely no text, no typography, no logos, no watermark.
```

### `/images/banners/promo-delivery.png` — ✅ in place

- **Size:** 1200 × 800 px
- **Alt text:** Delivery rider with a parcel box on a Dhaka street

```text
Warm documentary-style photograph of a friendly South Asian delivery rider in a plain orange jacket and helmet handing over a plain brown cardboard parcel, photographed on a bright Dhaka residential street with a softly blurred background. Subject on the RIGHT side, clean blurred space on the left third for a text overlay. 3:2 crop, natural daylight, absolutely no text, no typography, no logos, no watermark.
```

### `/images/banners/promo-gadget-strip.png` — ✅ in place

- **Size:** 2000 × 700 px
- **Alt text:** Smartwatch and earbuds on a dark textured surface

```text
Ultra-wide moody product photograph — a smartwatch with a glowing display and wireless earbuds in an open case arranged on the RIGHT third of a dark textured slate surface, lit with cool blue rim light and one warm orange accent. The left two thirds are deep clean shadow for a headline overlay. Cinematic 20:7 crop, absolutely no text, no typography, no logos, no watermark.
```

---

# Part 2 — Product & category photos (replace when ready)

These already have a photograph, so the site looks complete today. They are
**demo stand-ins from a public prototyping dataset** — they are not FlexOver
products and the licensing only covers prototyping, so every one of them
must be replaced with your own product photography before launch.

The prompt under each is a shoot brief: it describes the framing, lighting
and background that will keep the grid looking consistent. Overwrite the
file at the same path and the new photo goes live.

## Category tiles (8/8)

### `/images/categories/fashion.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Men's check cotton shirt
- **Current file:** demo stand-in (`dummyjson:83`)

```text
Flat lay of neatly folded everyday clothing — a check cotton shirt, a plain white tee and a folded pair of jeans — on a warm beige surface, soft daylight, square crop, no text or logos.
```

### `/images/categories/gadgets.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** True wireless earbuds in an open charging case
- **Current file:** demo stand-in (`dummyjson:100`)

```text
Flat lay of modern consumer tech — wireless earbuds in an open charging case, a compact charger and a braided cable — on a light grey surface, cool clean lighting, square crop, no text or logos.
```

### `/images/categories/home-essentials.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Carbon steel wok
- **Current file:** demo stand-in (`dummyjson:52`)

```text
Warm kitchen counter scene with a carbon steel wok, a stainless pot and a wooden chopping board, soft morning window light, square crop, no text or logos.
```

### `/images/categories/beauty.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Eyeshadow palette with mirror
- **Current file:** demo stand-in (`dummyjson:2`)

```text
Minimal beauty flat lay — an eyeshadow palette, a lipstick and a cream jar on a blush-pink surface with a single fresh petal, soft diffused light, square crop, no text or logos.
```

### `/images/categories/fragrances.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Dark glass eau de parfum bottle
- **Current file:** demo stand-in (`dummyjson:7`)

```text
Premium fragrance still life — a dark glass perfume bottle with a gold cap on a polished stone surface, moody warm side lighting with a soft reflection, square crop, no text or logos.
```

### `/images/categories/lifestyle.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Black framed sunglasses
- **Current file:** demo stand-in (`dummyjson:154`)

```text
Lifestyle flat lay — a pair of black sunglasses, small gold earrings and a folded linen scarf on a warm oak surface, natural daylight, square crop, no text or logos.
```

### `/images/categories/sports.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Cricket bat
- **Current file:** demo stand-in (`dummyjson:143`)

```text
Sports gear flat lay — a cricket bat, a red leather cricket ball and a pair of batting gloves on a light grey floor, crisp directional light, square crop, no text or logos.
```

### `/images/categories/watches-bags.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Brown leather strap wristwatch
- **Current file:** demo stand-in (`dummyjson:93`)

```text
Premium accessories flat lay — a leather-strap wristwatch and a tan leather bag corner on a dark walnut surface, moody warm light, square crop, no text or logos.
```

## Products (62/62)

### `/images/products/blue-black-check-casual-shirt.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Blue and black check cotton casual shirt
- **Current file:** demo stand-in (`dummyjson:83`)

```text
Studio product photograph of a blue and black check cotton casual shirt shown flat with the collar and buttons visible, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/classic-plaid-cotton-shirt.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Plaid cotton shirt on a plain background
- **Current file:** demo stand-in (`dummyjson:85`)

```text
Studio product photograph of a red and navy plaid cotton shirt laid flat with sleeves neatly folded, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/short-sleeve-summer-shirt.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Light short sleeve summer shirt
- **Current file:** demo stand-in (`dummyjson:86`)

```text
Studio product photograph of a light-coloured short-sleeve summer shirt shown flat, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/mens-check-formal-shirt.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Men's check formal shirt
- **Current file:** demo stand-in (`dummyjson:87`)

```text
Studio product photograph of a smart check formal shirt on a hanger with a crisp collar, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/essential-graphic-cotton-tshirt.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Black graphic print cotton t-shirt
- **Current file:** demo stand-in (`dummyjson:84`)

```text
Studio product photograph of a black cotton crew-neck t-shirt with a subtle chest print, shown flat, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/summer-floral-dress.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Light floral summer dress
- **Current file:** demo stand-in (`dummyjson:163`)

```text
Studio product photograph of a light floral-print summer dress on an invisible mannequin, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/classic-grey-shift-dress.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Grey shift dress
- **Current file:** demo stand-in (`dummyjson:164`)

```text
Studio product photograph of a tailored grey shift dress presented on an invisible mannequin, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/tartan-check-dress.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Tartan check dress
- **Current file:** demo stand-in (`dummyjson:166`)

```text
Studio product photograph of a tartan check dress with a pleated skirt on an invisible mannequin, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/retro-running-trainers.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Retro style running trainers
- **Current file:** demo stand-in (`dummyjson:90`)

```text
Studio product photograph of a pair of retro-style running trainers photographed at a three-quarter angle, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/sports-sneakers-off-white.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Off white and red sports sneakers
- **Current file:** demo stand-in (`dummyjson:91`)

```text
Studio product photograph of a pair of off-white and red sports sneakers at a three-quarter angle, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/womens-heel-shoes.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Women's heeled shoes
- **Current file:** demo stand-in (`dummyjson:186`)

```text
Studio product photograph of a pair of elegant women's heeled shoes photographed at a three-quarter angle, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/everyday-house-slippers.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Black and brown house slippers
- **Current file:** demo stand-in (`dummyjson:185`)

```text
Studio product photograph of a pair of soft black and brown house slippers side by side, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/true-wireless-earbuds.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** True wireless earbuds resting in an open charging case
- **Current file:** demo stand-in (`dummyjson:100`)

```text
Studio product photograph of a pair of white true-wireless earbuds resting in an open charging case at a three-quarter angle, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/over-ear-wireless-headphones.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Silver over-ear wireless headphones
- **Current file:** demo stand-in (`dummyjson:101`)

```text
Studio product photograph of a pair of premium silver over-ear wireless headphones photographed at a three-quarter angle, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/neckband-wireless-earphones.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Neckband style wireless earphones
- **Current file:** demo stand-in (`dummyjson:107`)

```text
Studio product photograph of a pair of neckband-style wireless earphones coiled neatly, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/smart-speaker-voice-assistant.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Cylindrical fabric covered smart speaker
- **Current file:** demo stand-in (`dummyjson:99`)

```text
Studio product photograph of a cylindrical fabric-covered smart speaker with a subtle light ring on top, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/fast-wireless-charging-pad.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Flat white wireless charging pad
- **Current file:** demo stand-in (`dummyjson:102`)

```text
Studio product photograph of a slim white wireless charging pad shown flat with a soft highlight, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/magnetic-battery-pack.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Compact magnetic battery pack
- **Current file:** demo stand-in (`dummyjson:105`)

```text
Studio product photograph of a compact white magnetic battery pack standing upright, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/fast-charging-adapter-cable.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Wall charging adapter with cable
- **Current file:** demo stand-in (`dummyjson:104`)

```text
Studio product photograph of a compact white wall charging adapter with a neatly coiled cable beside it, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/selfie-stick-tripod.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Extendable selfie stick tripod
- **Current file:** demo stand-in (`dummyjson:111`)

```text
Studio product photograph of an extendable black selfie stick tripod partially unfolded, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/carbon-steel-wok.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Carbon steel wok with a long handle
- **Current file:** demo stand-in (`dummyjson:52`)

```text
Studio product photograph of a carbon steel wok with a long handle photographed at a slight angle, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/stainless-steel-pot-glass-lid.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Stainless steel pot with a clear glass lid
- **Current file:** demo stand-in (`dummyjson:71`)

```text
Studio product photograph of a stainless steel cooking pot with a clear tempered glass lid, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/non-stick-frying-pan.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Non-stick frying pan
- **Current file:** demo stand-in (`dummyjson:68`)

```text
Studio product photograph of a black non-stick frying pan shown from above at a slight angle, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/countertop-blender.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Countertop blender with a glass jug
- **Current file:** demo stand-in (`dummyjson:51`)

```text
Studio product photograph of a countertop blender with a glass jug and a moulded base, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/hand-blender-stick.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Handheld immersion blender
- **Current file:** demo stand-in (`dummyjson:61`)

```text
Studio product photograph of a handheld immersion blender standing upright, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/microwave-oven-20l.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Compact countertop microwave oven
- **Current file:** demo stand-in (`dummyjson:66`)

```text
Studio product photograph of a compact countertop microwave oven photographed straight on, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/bamboo-chopping-board.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Bamboo chopping board
- **Current file:** demo stand-in (`dummyjson:53`)

```text
Studio product photograph of a rectangular bamboo chopping board with a hanging hole, shown at an angle, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/wooden-spice-rack.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Wooden spice rack holding glass jars
- **Current file:** demo stand-in (`dummyjson:73`)

```text
Studio product photograph of a wooden spice rack holding a row of small glass spice jars, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/volumizing-lash-mascara.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Black mascara tube with wand
- **Current file:** demo stand-in (`dummyjson:1`)

```text
Studio product photograph of a slim black mascara tube standing upright with its wand resting beside it, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/eyeshadow-palette-with-mirror.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Open eyeshadow palette showing shades and mirror
- **Current file:** demo stand-in (`dummyjson:2`)

```text
Studio product photograph of an open eyeshadow palette showing a grid of neutral shades and a built-in mirror, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/matte-red-lipstick.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Red lipstick with the cap removed
- **Current file:** demo stand-in (`dummyjson:4`)

```text
Studio product photograph of a red lipstick bullet twisted up with the cap standing beside it, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/loose-setting-powder.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Loose setting powder canister
- **Current file:** demo stand-in (`dummyjson:3`)

```text
Studio product photograph of a cylindrical loose setting powder canister with the lid beside it, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/glossy-red-nail-polish.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Bottle of glossy red nail polish
- **Current file:** demo stand-in (`dummyjson:5`)

```text
Studio product photograph of a small glass bottle of glossy red nail polish with a black cap, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/shea-butter-body-wash.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Shea butter body wash bottle
- **Current file:** demo stand-in (`dummyjson:119`)

```text
Studio product photograph of a tall body wash bottle with a flip cap standing upright, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/mens-body-face-lotion.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Men's body and face lotion bottle
- **Current file:** demo stand-in (`dummyjson:120`)

```text
Studio product photograph of a men's body and face lotion bottle with a pump dispenser, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/botanical-hand-soap.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Botanical hand soap bottle with pump
- **Current file:** demo stand-in (`dummyjson:118`)

```text
Studio product photograph of a botanical hand soap bottle with a pump dispenser on a clean surface, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/noir-eau-de-parfum.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Dark glass eau de parfum bottle
- **Current file:** demo stand-in (`dummyjson:7`)

```text
Studio product photograph of a dark glass eau de parfum bottle with a heavy cap, moody warm lighting, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/golden-bloom-eau-de-parfum.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Gold toned perfume bottle
- **Current file:** demo stand-in (`dummyjson:8`)

```text
Studio product photograph of a gold-toned glass perfume bottle with a faceted stopper, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/unisex-signature-eau-de-toilette.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Clear glass unisex eau de toilette bottle
- **Current file:** demo stand-in (`dummyjson:6`)

```text
Studio product photograph of a clear glass unisex eau de toilette bottle with a simple silver cap, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/shine-eau-de-parfum.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Bright glass perfume bottle
- **Current file:** demo stand-in (`dummyjson:9`)

```text
Studio product photograph of a bright glass perfume bottle with a decorative cap catching the light, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/floral-bloom-eau-de-parfum.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Frosted floral perfume bottle
- **Current file:** demo stand-in (`dummyjson:10`)

```text
Studio product photograph of a frosted glass perfume bottle with a soft pink tint and a rounded cap, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/classic-black-sunglasses.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Black framed sunglasses
- **Current file:** demo stand-in (`dummyjson:154`)

```text
Studio product photograph of a pair of black-framed sunglasses photographed at a three-quarter angle, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/classic-aviator-sunglasses.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Classic style sunglasses
- **Current file:** demo stand-in (`dummyjson:155`)

```text
Studio product photograph of a pair of classic aviator-style sunglasses with thin metal frames, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/green-crystal-earrings.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Green crystal drop earrings
- **Current file:** demo stand-in (`dummyjson:182`)

```text
Studio product photograph of a pair of green crystal drop earrings on a clean surface, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/tropical-statement-earrings.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Tropical style statement earrings
- **Current file:** demo stand-in (`dummyjson:184`)

```text
Studio product photograph of a pair of colourful tropical-style statement earrings, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/bedside-table-lamp.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Table lamp with a fabric shade
- **Current file:** demo stand-in (`dummyjson:47`)

```text
Studio product photograph of a bedside table lamp with a fabric shade, warm light glowing softly, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/decorative-house-plant.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Decorative house plant in a pot
- **Current file:** demo stand-in (`dummyjson:45`)

```text
Studio product photograph of a small decorative house plant in a ceramic pot, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/family-tree-photo-frame.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Family tree style multi photo frame
- **Current file:** demo stand-in (`dummyjson:44`)

```text
Studio product photograph of a family-tree style multi-photo wall frame shown straight on, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/english-willow-cricket-bat.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Cricket bat with a grip handle
- **Current file:** demo stand-in (`dummyjson:143`)

```text
Studio product photograph of an English willow cricket bat standing upright showing the face and grip, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/leather-cricket-ball.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Red leather cricket ball
- **Current file:** demo stand-in (`dummyjson:142`)

```text
Studio product photograph of a red leather cricket ball showing the stitched seam, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/cricket-batting-helmet.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Cricket batting helmet with steel grille
- **Current file:** demo stand-in (`dummyjson:144`)

```text
Studio product photograph of a cricket batting helmet with a steel grille, three-quarter angle, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/match-football-size-5.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Size 5 match football
- **Current file:** demo stand-in (`dummyjson:147`)

```text
Studio product photograph of a size 5 match football photographed on a plain background, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/feather-shuttlecock-pack.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Feather badminton shuttlecock
- **Current file:** demo stand-in (`dummyjson:146`)

```text
Studio product photograph of a feather badminton shuttlecock standing upright, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/graphite-tennis-racket.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Graphite tennis racket
- **Current file:** demo stand-in (`dummyjson:152`)

```text
Studio product photograph of a graphite tennis racket shown flat with the strings facing the camera, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/brown-leather-strap-watch.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Wristwatch with a brown leather strap
- **Current file:** demo stand-in (`dummyjson:93`)

```text
Studio product photograph of a wristwatch with a brown leather strap curled to show the case profile, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/classic-steel-automatic-watch.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Classic steel automatic wristwatch
- **Current file:** demo stand-in (`dummyjson:94`)

```text
Studio product photograph of a classic stainless steel automatic wristwatch with a white dial, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/black-dial-dress-watch.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Dress watch with a black dial
- **Current file:** demo stand-in (`dummyjson:95`)

```text
Studio product photograph of a slim dress watch with a black dial and polished steel case, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/gold-tone-womens-watch.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Gold tone women's wristwatch
- **Current file:** demo stand-in (`dummyjson:193`)

```text
Studio product photograph of a gold-tone women's wristwatch with a slim bracelet strap, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/womens-minimal-wrist-watch.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Minimal women's wrist watch
- **Current file:** demo stand-in (`dummyjson:194`)

```text
Studio product photograph of a minimal women's wrist watch with a clean dial and slim strap, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/blue-womens-handbag.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Blue women's handbag
- **Current file:** demo stand-in (`dummyjson:172`)

```text
Studio product photograph of a structured blue women's handbag with a top handle, three-quarter angle, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/leather-shoulder-bag.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** Leather shoulder bag
- **Current file:** demo stand-in (`dummyjson:173`)

```text
Studio product photograph of a soft leather shoulder bag with a long strap, three-quarter angle, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```

### `/images/products/faux-leather-backpack.jpg` — ✅ in place

- **Size:** 800 × 800 px
- **Alt text:** White faux leather backpack
- **Current file:** demo stand-in (`dummyjson:175`)

```text
Studio product photograph of a white faux leather backpack standing upright showing the straps and zip, centred on a seamless off-white studio background with a soft contact shadow, even softbox lighting, crisp edge-to-edge focus, premium e-commerce catalogue photography, square 1:1 crop, no text, no logos, no watermark.
```
