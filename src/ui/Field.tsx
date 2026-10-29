import { useRef } from "react"
import { cellKey, type Direction, type World } from "../core/world.ts"

/** Hero looks. The app sells and picks them; the package only draws them. */
export type Skin = "robot" | "rover" | "bee"

const SKIN_COLORS: Readonly<Record<Skin, { readonly body: string; readonly dark: string }>> = {
  robot: { body: "#4C97FF", dark: "#3373CC" },
  rover: { body: "#FF8C1A", dark: "#DB6E00" },
  bee: { body: "#FFBF00", dark: "#CC9900" }
}

const ANGLE: Readonly<Record<Direction, number>> = { up: -90, right: 0, down: 90, left: 180 }

const CELL = 40

const Hero = ({ skin, crashed }: { readonly skin: Skin; readonly crashed: boolean }) => {
  const c = SKIN_COLORS[skin]
  return (
    <g>
      {skin === "bee" ? (
        <>
          <ellipse cx={-4} cy={-13} rx={7} ry={5} fill="#fff" opacity={0.85} />
          <ellipse cx={-4} cy={13} rx={7} ry={5} fill="#fff" opacity={0.85} />
        </>
      ) : (
        <rect x={-12} y={-15} width={8} height={30} rx={3} fill={c.dark} />
      )}
      <circle r={13} fill={crashed ? "#FF6680" : c.body} stroke={c.dark} strokeWidth={2} />
      {skin === "bee" && <path d="M-4 -12 v24 M3 -12 v24" stroke="#575E75" strokeWidth={3} />}
      {skin === "rover" && <rect x={-9} y={-5} width={8} height={10} rx={2} fill={c.dark} />}
      {/* Eyes look where the hero goes. */}
      <circle cx={6} cy={-5} r={4} fill="#fff" />
      <circle cx={6} cy={5} r={4} fill="#fff" />
      <circle cx={7.5} cy={-5} r={2} fill="#2b2b3a" />
      <circle cx={7.5} cy={5} r={2} fill="#2b2b3a" />
    </g>
  )
}

const Crystal = () => (
  <g>
    <path d="M0 -12 L9 -3 L0 12 L-9 -3 Z" fill="#5CB1D6" stroke="#2E8EB8" strokeWidth={1.5} />
    <path d="M0 -12 L3 -3 L0 12 L-3 -3 Z" fill="#9AD4EC" />
  </g>
)

const Flag = () => (
  <g>
    <path d="M-8 14 V-13" stroke="#575E75" strokeWidth={2.5} strokeLinecap="round" />
    <path d="M-7 -13 H10 L5 -7 L10 -1 H-7 Z" fill="#FF6680" />
  </g>
)

/** Turns the shortest way: from «left» to «up» is a quarter turn, not three quarters. */
const useHeroAngle = (dir: Direction): number => {
  const angle = useRef(ANGLE[dir])
  const diff = ((((ANGLE[dir] - angle.current) % 360) + 540) % 360) - 180
  angle.current += diff
  return angle.current
}

export const Field = ({ world, skin }: { readonly world: World; readonly skin: Skin }) => {
  const angle = useHeroAngle(world.hero.dir)
  const cells: Array<React.ReactElement> = []
  for (let y = 0; y < world.height; y++) {
    for (let x = 0; x < world.width; x++) {
      const wall = world.walls.has(cellKey(x, y))
      cells.push(
        <rect
          key={cellKey(x, y)}
          className={wall ? "eb-wall" : "eb-floor"}
          x={x * CELL + 1}
          y={y * CELL + 1}
          width={CELL - 2}
          height={CELL - 2}
          rx={wall ? 4 : 6}
        />
      )
    }
  }
  const center = (x: number, y: number) => `translate(${x * CELL + CELL / 2} ${y * CELL + CELL / 2})`
  return (
    <svg className="eb-field" viewBox={`0 0 ${world.width * CELL} ${world.height * CELL}`} role="img" aria-label="Поле гри">
      {cells}
      {world.finish !== null && (
        <g transform={center(world.finish.x, world.finish.y)}>
          <Flag />
        </g>
      )}
      {[...world.crystals].map((key) => {
        const [x, y] = key.split(",").map(Number)
        return (
          <g key={key} transform={center(x ?? 0, y ?? 0)}>
            <Crystal />
          </g>
        )
      })}
      <g className="eb-hero" style={{ transform: `translate(${world.hero.x * CELL + CELL / 2}px, ${world.hero.y * CELL + CELL / 2}px)` }}>
        <g className="eb-hero-turn" style={{ transform: `rotate(${angle}deg)` }}>
          <Hero skin={skin} crashed={world.crashed} />
        </g>
      </g>
    </svg>
  )
}
