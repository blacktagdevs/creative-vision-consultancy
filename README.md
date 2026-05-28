# Creative Vision Consultancy — Website Refresh

Three draft design directions for the [Creative Vision Consultancy](https://www.creativevisionconsultancy.com/) site refresh. Each draft covers a Home page and a Services page using the same client-provided copy, so the comparison is purely about design language — palette, typography, mood, layout — not content.

**Live preview:** https://blacktagdevs.github.io/creative-vision-consultancy/

## Directions

| | Direction | Mood | Palette | Type |
|---|---|---|---|---|
| **A** | [Editorial Luxe](direction-a-editorial/) | Restrained, photo-led, Vogue/AD | Ivory · Charcoal · Dusty Rose | Cormorant Garamond + Inter |
| **B** | [Warm Romantic](direction-b-romantic/) | Wedding-coded, emotional, peach/gold | Cream · Coral · Gold · Plum | Playfair Display + Lora + Pinyon Script |
| **C** | [Modern Boutique](direction-c-boutique/) | Editorial, architectural, design-forward | Bone · Sage · Brass · Charcoal | Fraunces + Manrope |

The [root index page](index.html) is a side-by-side picker for the client.

## Status

- **Imagery:** Unsplash placeholders. All `<img>` tags are flagged with `<!-- IMAGE: swap with real CVC photo -->` comments. Swap is mechanical once real photography is provided.
- **Copy:** Identical across all three drafts, pulled directly from the client refresh brief.
- **Pages covered:** Home + Services. About, Gallery, Inquiry get built out in the chosen direction.
- **Responsive:** Desktop-first. Tablet/mobile polish happens after a direction is locked.

## Next step

Client picks a direction (or describes a hybrid — e.g. "B's palette with A's layout"). The chosen direction is then rebuilt properly in Next.js with real photography, the inquiry form wired up, and full responsive treatment.
