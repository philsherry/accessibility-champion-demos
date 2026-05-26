# Nip & Claw: purrveyors of the finest artisanal catnip

> Demo project for *Accessibility Champion* by Phil Sherry.

A fictional online catnip dispensary, modelled on the aesthetic of a premium cannabis retailer, staffed entirely by cats who have borrowed their human's phone while they sleep.

The primary customer is **Lucy Fur** — she is on the cover of the book. She has an account. She has a delivery address. She has opinions about strain potency and strongly disputes the "estimated delivery 3–5 working days" claim on the confirmation email.

---

## What this is

A set of static HTML/CSS/vanilla JS demo pages used to illustrate accessibility patterns in *Accessibility Champion*. Each page is a screen from the Nip & Claw storefront, implemented correctly — the accessible version is the primary version.

Screenshots taken from these pages appear in the book pipeline (epub, PDF, print). The repo is also published as a standalone resource for readers who want to inspect the code.

---

## Catalogue

| Page | File | Demonstrates |
|---|---|---|
| Product listing | `index.html` | Landmark regions, heading hierarchy, DOM order |
| Strain detail | `product.html` | Focus management, accessible SVG (usage chart) |
| Subscription plans | `plans.html` | `<th scope>`, accessible tables, responsive table patterns |
| Checkout | `checkout.html` | Label association, form validation, error announcements |
| Order history | `orders.html` | Touch targets, target spacing, accessible table patterns |

Standalone diagrams that don't fit the store context live in `snippets/`.

---

## Strain catalogue

All strains are artisanal, small-batch, and responsibly sourced by cats who have no idea what "responsibly sourced" means.

| Name | Type | Notes |
|---|---|---|
| Purple Whisker | Naptime | Flagship. Classic. |
| OG Floof | Existential | Heritage strain, very chill |
| Trainwreck (My Owner's Furniture) | Zoomies | Strong. Unpredictable. |
| Grand Daddy Pawple | Naptime | For the senior cat |
| Girl Scout Mousies | Existential | Limited seasonal batch |
| Gorilla Glue (The Good Rug Variety) | Naptime | Sticky. You'll know why. |
| White Widow… It's a Spider, I Will Destroy It | Zoomies | High anxiety |
| Sour Diesel Paws | Zoomies | Fast onset, very zoomy |
| Bruce Banner (Smash the Curtains) | Zoomies | Very potent |
| Wedding Cake (I Knocked It Off the Counter) | Existential | Celebratory. Messy. |

**Types** (our proprietary classification system):
- **Naptime** — calming. Enhanced loaf formation. Prolonged staring at nothing.
- **Zoomies** — energetic. Sudden sprinting. Aggressive kneading. Curtain incidents.
- **Existential** — hybrid. Makes them stare at walls and reconsider all decisions.

---

## Subscription plans

| Plan | Price | Strains/month | Notes |
|---|---|---|---|
| **The Catnap** | £9/month | 1, curated | For the cat who has *a* Tuesday |
| **The Zoomies** | £19/month | 3, mixed potency | For the cat who has *every* Tuesday |
| **The Full Send** | £29/month | Unlimited + exclusives | For the cat who has already made their decision |

---

## Setup

No build step. Open any `.html` file directly in a browser, or serve the directory:

```bash
cd demos
npx serve .
# or
python3 -m http.server 8080
```

---

## Screenshots

Screenshots are taken at **1440 × 900** viewport for full-page captures, and **390 × 844** (iPhone 14 equivalent) for mobile views — because Lucy Fur is ordering on a phone.

---

## Lucy Fur — account details

For consistency across all demo pages:

| Field | Value |
|---|---|
| Name | Lucy Fur |
| Email | lucy@nipandclaw.com |
| Delivery address | Under the Third Cushion, The Sofa, Living Room |
| Delivery notes | Leave quietly. Do NOT knock. Human is asleep. |
| Member since | The moment she discovered the phone wasn't locked |
| Preferred type | Existential |
| Lifetime spend | More than Phil thinks |
