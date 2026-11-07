# Interaction specifications

Every interactive feature of a generated site, documented with the same seven points. Code: `src/runtime/engine.js` (behaviour), `src/render/html.ts` and `src/render/css.ts` (markup and styles).

## Navigation links

| | |
|---|---|
| User action | Clicks a link in the header |
| Expected response | Page scrolls to the matching section (`#about`, `#gallery`, `#contact`...) |
| UI feedback | Native scroll; target section in view |
| Data dependencies | Section anchors from `anchorFor()`: first section of a type gets the type name, later ones `type-2`, `type-3` |
| Error handling | Unknown or unsafe link targets are rendered as `#` (`safeHref`) |
| Mobile | Links wrap under the brand name; no hidden menu, so nothing depends on JavaScript |
| Accessibility | `<nav aria-label="Main">`, visible `:focus-visible` outline |

## Contact and booking form

| | |
|---|---|
| User action | Fills in the form and presses "Send message" or "Send booking request" |
| Expected response | With an https endpoint: data is posted to it. Without one: nothing is sent and the form says so |
| UI feedback | Field errors under each field after it is left once, updated as the user types; on submit the first invalid field is focused; status line shows "Sending...", then a success or failure message; the button is disabled while sending |
| Data dependencies | `content.formKind` (`inquiry` or `booking`) and `content.formEndpoint` (https only, `safeEndpoint`) |
| Error handling | Network or non-2xx response: "Sending failed. Please try again, or use the contact details on this page." Bots filling the hidden honeypot field are dropped without a fake success. Booking success says it is a request, not a confirmed booking |
| Mobile | Single column, inputs at least 44 px tall, `type="email"`, `type="date"` and `inputmode="numeric"` bring up the right keyboards |
| Accessibility | Every field has a `<label>`; errors are linked with `aria-describedby` and announced via `aria-live`; invalid fields get `aria-invalid`; works without JavaScript as a plain POST when an endpoint is set; works under reduced motion |

## Parallax

| | |
|---|---|
| User action | Scrolls the page (optionally moves the mouse) |
| Expected response | Background and extra layers move at their own speed; foreground content moves against them |
| UI feedback | Depth effect only; no layout change |
| Data dependencies | Section `parallax` animation settings and layers |
| Error handling | Missing images fall back to a tokenised gradient layer; off-screen sections are skipped |
| Mobile | Scroll parallax only; mouse interaction needs a mouse |
| Accessibility | Off under `prefers-reduced-motion`; layers are decorative (`pointer-events: none`) |

## Scroll reveal

| | |
|---|---|
| User action | Scrolls an element into view |
| Expected response | Element animates from its configured start state (fade, slide, zoom, blur, rotate, scale, clip) |
| UI feedback | Optional stagger across children, cards, headings, images or buttons |
| Data dependencies | Section `reveal` animation settings |
| Error handling | Without IntersectionObserver or JavaScript, content is simply visible |
| Mobile | Same behaviour; distances are in pixels, so they stay subtle on small screens |
| Accessibility | Off under `prefers-reduced-motion`; never hides content from assistive technology |

## Horizontal scroll

| | |
|---|---|
| User action | Scrolls vertically through a gallery section |
| Expected response | Section pins and its panels move sideways; optional snapping to the nearest panel |
| UI feedback | Progress bar and panel indicators |
| Data dependencies | Section `horizontal` animation settings; panels are gallery items |
| Error handling | Recomputes sizes on resize; disabled if the track is missing |
| Mobile | 767 px and below: a vertical stack, or a native swipe carousel when `mobileLayout` is `swipe` |
| Accessibility | Off under `prefers-reduced-motion` (static grid); indicators are `aria-hidden` (keyboard support is issue "Horizontal scroll: keyboard and screen reader support") |

## Magnetic buttons

| | |
|---|---|
| User action | Moves the pointer over a button |
| Expected response | The button drifts slightly toward the pointer (at most 12 px) and returns on leave |
| UI feedback | Transform only |
| Data dependencies | `theme.interactions.magneticButtons` |
| Error handling | Not applied when the setting is off |
| Mobile | Off on touch screens (`hover: hover` and `pointer: fine` required) |
| Accessibility | Off under `prefers-reduced-motion`; never moves the click target out from under the pointer |

## Card hover

| | |
|---|---|
| User action | Hovers a card |
| Expected response | The card lifts 4 px |
| UI feedback | Transform only, CSS |
| Data dependencies | `theme.interactions.cardHover` |
| Error handling | None needed |
| Mobile | No hover state on touch |
| Accessibility | Disabled under `prefers-reduced-motion` |
