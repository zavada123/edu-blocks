import { describeGoal, goalMet, type Level } from "../core/level.ts"
import type { World } from "../core/world.ts"

/** The task of the level on parchment: what to do, the goals that tick as the hero meets them, and the star sizes. */
export const Quest = ({ level, start, world }: { readonly level: Level; readonly start: World; readonly world: World }) => (
  <section className="eb-quest eb-frame eb-parchment" aria-label="Завдання">
    {level.title !== "" && <h2>{level.title}</h2>}
    {level.task.map((line) => (
      <p key={line}>{line}</p>
    ))}
    <ul className="eb-goals">
      {level.goals.map((g) => {
        const met = goalMet(world, g)
        return (
          <li key={g.type} className={met ? "eb-goal eb-goal-ok" : "eb-goal"}>
            <span className="eb-goal-tick" aria-hidden="true">
              {met ? "✓" : ""}
            </span>
            {describeGoal(g, start, level.scene)}
            {met && <span className="eb-visually-hidden"> (виконано)</span>}
          </li>
        )
      })}
    </ul>
    {level.stars !== undefined && (
      <p className="eb-quest-stars">
        Зірки за розмір програми: ★★★ до {level.stars.three} · ★★ до {level.stars.two} · ★ будь-яка
      </p>
    )}
  </section>
)
