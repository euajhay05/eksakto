# Eksakto

Ang tracker para sa Pinoy creatives. Ito ang brand system ng Eksakto: logo, kulay, fonts, spacing at boses, kinuha mula sa live na site sa **eksakto.app**. Gamitin ito sa website, app, social posts at kahit anong bagong design para pare pareho ang itsura.

## Brand sa isang tingin

- **Para kanino:** Pinoy videographers at photographers, solo man o maliit na team.
- **Pangako:** Malalaman mo eksakto kung magkano ang kinita mo. Isang bayad, sayo na forever.
- **Pakiramdam:** kalmado, malinis, parang kaibigang marunong sa pera. Hindi corporate, hindi rin maingay.

## Logo

Wordmark ang logo: **eksakto** na may tuldok. Ang tuldok ang pinaka signature ng brand. Ibig sabihin nito: sakto na, tapos na ang bilang.

| File | Kailan gamitin |
| --- | --- |
| Eksakto Logo.svg | Sa light na background. Ink ang letra, `brand` green ang tuldok. |
| Eksakto Logo Reverse.svg | Sa `night` na background. Light ang letra, `gold` ang tuldok. |
| Eksakto Icon.svg | App icon at favicon: "e." sa night na rounded square. |
| Eksakto Profile 1024.png | Profile picture sa IG, TikTok at FB. |

Laging maliit na letra ang "eksakto" sa logo. Sa ordinaryong pangungusap, "Eksakto" (capital E).

## Kulay

Berde ang kulay ng pera at ng "go". Mahinahon na green ang pinili para hindi mukhang bangko o casino.

| Token | Hex (light) | Gamit |
| --- | --- | --- |
| `ground` | #F3F5F0 | Background ng lahat ng page |
| `surface` | #FFFFFF | Cards, inputs, option rows |
| `ink` | #13221A | Main text at headings |
| `muted` | #4F6357 | Secondary text at hints |
| `line` | #DCE3D7 | Borders at dividers |
| `tint` | #E3EBDF | Badges, selected options, highlight panels |
| `brand` | #1F6F47 | Primary buttons, links, tuldok ng logo |
| `brandDeep` | #14502F | Hover ng brand buttons |
| `night` | #13221A | Dark sections at pricing card |
| `gold` | #E8A33D | Founding badge at tuldok sa dark |

Rules:
- Isang `brand` button lang kada screen. Yan ang pinaka importanteng action.
- Ang `gold` ay pang badge at tuldok lang. Hindi ito pang text sa light na background kasi kulang ang contrast.
- Sa `night` na section, `nightText` at `nightMuted` ang text, hindi `ink`.
- Status: `brand` para sa Booked o bayad na, `warn` para sa Editing o may kulang, `muted` para sa Tentative.

## Fonts

Dalawang font lang, parehong libre sa Google Fonts.

- **Bricolage Grotesque** (700 at 800): headings, logo, malalaking numero gaya ng ₱48,500. Ito ang personality ng brand: bilugan at medyo makapal, parang sulat kamay ng confident na tao.
- **Manrope** (400 hanggang 700): lahat ng body text, buttons, labels at forms. Malinaw basahin kahit maliit sa phone.

Type scale: hero 60px, h2 40px, h3 24px, lead 19px, body 16px, small 14px, label 13px. Sa phone, bumababa ang hero sa 40px at h2 sa 30px. Masikip ang letter spacing ng headings (negative), maluwag ang line height ng body.

Link para sa web:
`https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Manrope:wght@400;500;600;700&display=swap`

## Spacing at hugis

- Spacing steps: 4, 8, 12, 16, 20, 24, 40, 56, 96. Gamitin ang `space16` bilang side gutter sa phone, `space24` sa desktop, at `space96` sa pagitan ng sections.
- Rounded ang lahat pero hindi bilog: `radiusMd` (14px) sa buttons at inputs, `radiusLg` (18px) sa cards, `radiusXl` (28px) sa malalaking panels, `radiusPill` sa badges.
- Walang heavy shadow. Isang malambot na shadow lang sa hero mockup card. Border na `line` ang naghihiwalay sa cards.
- Minimum na 44px ang taas ng kahit anong pipindutin, 52 hanggang 56px sa main buttons.

## Boses at pagsulat

Taglish, parang kausap mo ang kapwa creative sa chat. Diretso, magaan, minsan may biro, pero hindi nagmamakaawa at hindi corporate.

Gawin:
- "Magkano ba talaga kinita mo this month?"
- "Sino pa ba hindi nagbabayad?"
- "Isang bayad, sayo na forever."
- "2 minutes lang, promise."

Iwasan:
- Malalalim na Tagalog ("katuwang", "pakinabang") at stiff na English ("Leverage your financial insights").
- Pagmamakaawa ("Please po, pakisagot").
- Hyphen at dash sa copy. Isulat na lang ulit ang pangungusap.

Mga salitang gamit ng brand: raket, shoots, singilan, kita at gastos, bawi, Founding price, waitlist.

## Iconography

Simple na line icons: 24px grid, 1.8 stroke, rounded na dulo at kanto, kulay `brand`. Isang icon kada feature card, nasa taas ng title. Walang emoji sa site, maliban sa maliliit na sandali sa survey at sa thank you screen.
