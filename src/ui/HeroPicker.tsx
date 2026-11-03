import { useEffect, useRef } from "react"
import { canBuyHero, type Hero, HEROES, heroOpen, type HeroId } from "../core/heroes.ts"
import { Coin } from "./Coin.tsx"
import { ArtIcon } from "./ArtIcon.tsx"
import { HERO_ART } from "./art.ts"
import type { Skin } from "./stage/draw.ts"
import { coinWord } from "./Verdict.tsx"

/** A hero that can be played breathes in place; a locked one stands as a still shadow. */
export const HeroSprite = ({ skin, walking }: { readonly skin: Skin; readonly walking: boolean }) => (
  <ArtIcon id={HERO_ART[skin]} animate={walking && !reducedMotion()} className="eb-hero-sprite" size={64} />
)

/** Whether the viewer asked for less motion. */
const reducedMotion = (): boolean =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

/** The shop part of the choice: the coins the student has and how to buy. */
export interface HeroShop {
  readonly coins: number
  readonly onBuy: (hero: HeroId) => void
}

/** What a hero card can do for this student now. */
type CardState =
  | { readonly kind: "chosen" }
  | { readonly kind: "open" }
  | { readonly kind: "buy"; readonly price: number }
  | { readonly kind: "short"; readonly price: number; readonly missing: number }
  | { readonly kind: "locked"; readonly heroLevel: number }

const stateOf = (hero: Hero, skin: Skin, heroLevel: number, owned: ReadonlyArray<HeroId>, shop: HeroShop | null): CardState => {
  if (hero.id === skin) return { kind: "chosen" }
  if (heroOpen(hero, heroLevel, owned)) return { kind: "open" }
  if (hero.price === undefined || heroLevel < hero.heroLevel) return { kind: "locked", heroLevel: hero.heroLevel }
  if (shop !== null && canBuyHero(hero, heroLevel, owned, shop.coins)) return { kind: "buy", price: hero.price }
  return { kind: "short", price: hero.price, missing: hero.price - (shop?.coins ?? 0) }
}

const labelOf = (state: CardState): string => {
  switch (state.kind) {
    case "chosen":
      return "Обрано"
    case "open":
      return "Обрати"
    case "buy":
      return `Купити за ${state.price}`
    case "short":
      return `Бракує ${state.missing} ${coinWord(state.missing)}`
    case "locked":
      return `Відкриється на рівні ${state.heroLevel}`
  }
}

const CARD_CLASS: Readonly<Record<CardState["kind"], string>> = {
  chosen: "eb-hero-card eb-hero-card-on",
  open: "eb-hero-card",
  buy: "eb-hero-card eb-hero-card-sale",
  short: "eb-hero-card eb-hero-card-short",
  locked: "eb-hero-card eb-hero-card-locked"
}

/**
 * The choice of the hero, over the game: every hero with its look, name and a line about it. A hero that the hero
 * level has not opened yet shows as a shadow with the level it opens at. With a shop, heroes with a price show it:
 * the student buys one with the coins and plays it at once. Without a shop those heroes are not offered.
 */
export const HeroPicker = ({
  skin,
  heroLevel,
  owned,
  shop,
  onPick,
  onClose
}: {
  readonly skin: Skin
  readonly heroLevel: number
  readonly owned: ReadonlyArray<HeroId>
  readonly shop: HeroShop | null
  readonly onPick: (skin: Skin) => void
  readonly onClose: () => void
}) => {
  const chosenRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    chosenRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const offered = HEROES.filter((h) => h.price === undefined || shop !== null || owned.includes(h.id))
  return (
    <div className="eb-picker-layer" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="eb-picker eb-frame eb-parchment" role="dialog" aria-modal="true" aria-labelledby="eb-picker-title">
        <div className="eb-picker-head">
          <h3 id="eb-picker-title">{shop === null ? "Обери героя" : "Герої та крамниця"}</h3>
          {shop !== null && (
            <p className="eb-picker-coins" aria-label={`У тебе ${shop.coins} ${coinWord(shop.coins)}`}>
              <Coin /> {shop.coins}
            </p>
          )}
          <button type="button" className="eb-btn eb-btn-small" onClick={onClose} aria-label="Закрити">
            ✕
          </button>
        </div>
        <ul className="eb-picker-list">
          {offered.map((hero) => {
            const state = stateOf(hero, skin, heroLevel, owned, shop)
            const usable = state.kind === "chosen" || state.kind === "open" || state.kind === "buy"
            return (
              <li key={hero.id}>
                <button
                  ref={state.kind === "chosen" ? chosenRef : undefined}
                  type="button"
                  className={CARD_CLASS[state.kind]}
                  disabled={!usable}
                  aria-pressed={state.kind === "chosen"}
                  onClick={() => {
                    if (state.kind === "buy") shop?.onBuy(hero.id)
                    onPick(hero.id)
                    onClose()
                  }}
                >
                  <span className="eb-hero-stage">
                    <HeroSprite skin={hero.id} walking={usable} />
                  </span>
                  <span className="eb-hero-name">{hero.name}</span>
                  <span className="eb-hero-about">{hero.about}</span>
                  {hero.price !== undefined && !owned.includes(hero.id) && (
                    <span className="eb-hero-price">
                      <Coin /> {hero.price}
                    </span>
                  )}
                  <span className="eb-hero-state">{labelOf(state)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
