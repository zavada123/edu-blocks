import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
// src/core/blocks.ts
/** ID of the VM extension with the hero blocks. Opcodes in a program read `hero_move`. */
var HERO_EXTENSION_ID = "hero";
var HERO_COLOR = "#0FBD8C";
/** Hero blocks in palette order. `boolean` blocks are the questions for «якщо» and «повторити до». */
var HERO_BLOCKS = [
	{
		name: "move",
		text: "крок уперед",
		boolean: false
	},
	{
		name: "turnLeft",
		text: "поворот ліворуч ↺",
		boolean: false
	},
	{
		name: "turnRight",
		text: "поворот праворуч ↻",
		boolean: false
	},
	{
		name: "collect",
		text: "взяти",
		boolean: false
	},
	{
		name: "attack",
		text: "вдарити ⚔",
		boolean: false
	},
	{
		name: "wallAhead",
		text: "попереду стіна?",
		boolean: true
	},
	{
		name: "onCrystal",
		text: "тут щось є?",
		boolean: true
	},
	{
		name: "atFinish",
		text: "дійшов до мети?",
		boolean: true
	},
	{
		name: "enemyAhead",
		text: "попереду ворог?",
		boolean: true
	},
	{
		name: "trapAhead",
		text: "попереду пастка?",
		boolean: true
	}
];
var HERO_NAMES = new Set(HERO_BLOCKS.map((b) => b.name));
var SCRATCH_OPCODES = {
	repeat: "control_repeat",
	forever: "control_forever",
	repeatUntil: "control_repeat_until",
	if: "control_if",
	ifElse: "control_if_else",
	not: "operator_not",
	and: "operator_and",
	or: "operator_or"
};
var START_OPCODE = "event_whenflagclicked";
/** The one variable of the game. Its id is fixed, so the editor, the project and the judge agree on it. */
var COUNTER_ID = "eb-counter";
var COUNTER_NAME = "лічильник";
var SET_OPCODE = "data_setvariableto";
var CHANGE_OPCODE = "data_changevariableby";
var VARIABLE_OPCODE = "data_variable";
var DEFINITION_OPCODE = "procedures_definition";
var PROTOTYPE_OPCODE = "procedures_prototype";
var CALL_OPCODE = "procedures_call";
var DEFAULT_PROCEDURE = "мій блок";
/** Shadow blocks that hold the number in «повторити 10», and the text in «задати лічильник 0». */
var NUMBER_SHADOWS = /* @__PURE__ */ new Set([
	"math_whole_number",
	"math_positive_number",
	"math_number",
	"text"
]);
/** Blocks a palette name brings. Most names are one block; the counter and the custom block are several. */
var opcodesOf = (name) => {
	if (name === "counter") return [
		SET_OPCODE,
		CHANGE_OPCODE,
		VARIABLE_OPCODE
	];
	if (name === "procedure") return [
		DEFINITION_OPCODE,
		PROTOTYPE_OPCODE,
		CALL_OPCODE
	];
	return [HERO_NAMES.has(name) ? `${HERO_EXTENSION_ID}_${name}` : SCRATCH_OPCODES[name]];
};
/** The block of a palette name. For the counter it is «змінити», for the custom block the call. */
var opcodeOf = (name) => {
	if (name === "counter") return CHANGE_OPCODE;
	if (name === "procedure") return CALL_OPCODE;
	return opcodesOf(name)[0] ?? "";
};
/** Opcodes a program for this palette may contain: the palette, the start hat and number shadows. */
var allowedOpcodes = (palette) => /* @__PURE__ */ new Set([
	START_OPCODE,
	...NUMBER_SHADOWS,
	...palette.flatMap(opcodesOf)
]);
var isNumberShadow = (opcode) => NUMBER_SHADOWS.has(opcode);
/** The name of the custom block on this level. */
var procedureName = (level) => level.procedure?.trim() || "мій блок";
var enemyOf = (spec, id) => {
	const boss = spec.boss === true;
	const hp = Math.max(1, Math.round(spec.hp ?? (boss ? 3 : 1)));
	return {
		id,
		kind: spec.kind,
		x: spec.x,
		y: spec.y,
		hp,
		maxHp: hp,
		sight: Math.max(0, Math.round(spec.sight ?? 2)),
		walk: spec.walk ?? "stand",
		heading: 1,
		swinging: false,
		boss
	};
};
var isAlive = (enemy) => enemy.hp > 0;
var enemiesLeft = (world) => world.enemies.filter(isAlive).length;
var cellKey = (x, y) => `${x},${y}`;
var DELTA = {
	up: {
		x: 0,
		y: -1
	},
	right: {
		x: 1,
		y: 0
	},
	down: {
		x: 0,
		y: 1
	},
	left: {
		x: -1,
		y: 0
	}
};
var CLOCKWISE = [
	"up",
	"right",
	"down",
	"left"
];
var parseMap = (rows, dir = "right") => {
	const walls = /* @__PURE__ */ new Set();
	const crystals = /* @__PURE__ */ new Set();
	const traps = /* @__PURE__ */ new Set();
	let start = null;
	let finish = null;
	const width = Math.max(0, ...rows.map((r) => r.length));
	rows.forEach((row, y) => {
		for (let x = 0; x < width; x++) {
			const ch = row[x] ?? " ";
			if (ch === "#" || ch === " ") walls.add(cellKey(x, y));
			else if (ch === "c") crystals.add(cellKey(x, y));
			else if (ch === "x") traps.add(cellKey(x, y));
			else if (ch === "S") start = {
				x,
				y
			};
			else if (ch === "F") finish = {
				x,
				y
			};
			else if (ch !== ".") throw new Error(`Невідомий знак «${ch}» на мапі, рядок ${y + 1}`);
		}
	});
	if (start === null) throw new Error("На мапі немає старту S");
	const s = start;
	return {
		width,
		height: rows.length,
		walls,
		finish,
		crystals,
		totalCrystals: crystals.size,
		hero: {
			x: s.x,
			y: s.y,
			dir
		},
		crashed: false,
		traps,
		fell: false,
		energy: null,
		enemies: [],
		hearts: 3,
		maxHearts: 3
	};
};
var isWall = (world, x, y) => x < 0 || y < 0 || x >= world.width || y >= world.height || world.walls.has(cellKey(x, y));
var cellAhead = (world) => {
	const d = DELTA[world.hero.dir];
	return {
		x: world.hero.x + d.x,
		y: world.hero.y + d.y
	};
};
var wallAhead = (world) => {
	const next = cellAhead(world);
	return isWall(world, next.x, next.y);
};
var enemyAt = (world, x, y) => world.enemies.find((e) => isAlive(e) && e.x === x && e.y === y);
var enemyAhead = (world) => {
	const next = cellAhead(world);
	return enemyAt(world, next.x, next.y) !== void 0;
};
var trapAhead = (world) => {
	const next = cellAhead(world);
	return world.traps.has(cellKey(next.x, next.y));
};
var onCrystal = (world) => world.crystals.has(cellKey(world.hero.x, world.hero.y));
var atFinish = (world) => world.finish !== null && world.hero.x === world.finish.x && world.hero.y === world.finish.y;
var at = (c) => ({
	x: c.x,
	y: c.y
});
var heroAction = (world, action) => {
	const here = at(world.hero);
	if (action === "move") {
		const next = cellAhead(world);
		if (world.energy === 0) return {
			world,
			outcome: "tired",
			events: [{ type: "heroTired" }]
		};
		if (isWall(world, next.x, next.y) || enemyAt(world, next.x, next.y) !== void 0) return {
			world: {
				...world,
				crashed: true
			},
			outcome: "crashed",
			events: [{
				type: "heroBumped",
				into: next
			}]
		};
		const energy = world.energy === null ? null : world.energy - 1;
		const moved = {
			...world,
			energy,
			hero: {
				...world.hero,
				x: next.x,
				y: next.y
			}
		};
		const step = {
			type: "heroMoved",
			from: here,
			to: next
		};
		return world.traps.has(cellKey(next.x, next.y)) ? {
			world: {
				...moved,
				fell: true
			},
			outcome: "fell",
			events: [step, {
				type: "heroFell",
				at: next
			}]
		} : {
			world: moved,
			outcome: "moved",
			events: [step]
		};
	}
	if (action === "turnLeft" || action === "turnRight") {
		const dir = CLOCKWISE[(CLOCKWISE.indexOf(world.hero.dir) + (action === "turnRight" ? 1 : 3)) % 4] ?? world.hero.dir;
		return {
			world: {
				...world,
				hero: {
					...world.hero,
					dir
				}
			},
			outcome: "turned",
			events: [{
				type: "heroTurned",
				from: world.hero.dir,
				to: dir
			}]
		};
	}
	if (action === "attack") {
		const next = cellAhead(world);
		const swing = {
			type: "heroSwung",
			at: next
		};
		const target = enemyAt(world, next.x, next.y);
		if (target === void 0) return {
			world,
			outcome: "swingMissed",
			events: [swing]
		};
		const enemies = world.enemies.map((e) => e.id === target.id ? {
			...e,
			hp: e.hp - 1,
			swinging: e.swinging && e.boss
		} : e);
		const down = target.hp <= 1;
		return {
			world: {
				...world,
				enemies
			},
			outcome: down ? "enemyDown" : "enemyHit",
			events: [swing, down ? {
				type: "enemyDown",
				id: target.id
			} : {
				type: "enemyHit",
				id: target.id,
				hp: target.hp - 1
			}]
		};
	}
	const key = cellKey(world.hero.x, world.hero.y);
	if (!world.crystals.has(key)) return {
		world,
		outcome: "nothingToCollect",
		events: [{
			type: "nothingToTake",
			at: here
		}]
	};
	const crystals = new Set(world.crystals);
	crystals.delete(key);
	return {
		world: {
			...world,
			crystals
		},
		outcome: "collected",
		events: [{
			type: "itemTaken",
			at: here
		}]
	};
};
var distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
/** Cells an enemy may step on: floor with no hero and no other enemy. */
var freeFor = (world, enemies, self, x, y) => !isWall(world, x, y) && !(world.hero.x === x && world.hero.y === y) && !enemies.some((e) => e.id !== self.id && isAlive(e) && e.x === x && e.y === y);
/** The first step of a shortest way from the enemy to a cell next to the hero, or null when there is none. */
var stepToward = (world, enemies, self) => {
	const first = /* @__PURE__ */ new Map();
	const seen = /* @__PURE__ */ new Set([cellKey(self.x, self.y)]);
	let wave = [self];
	for (let d = 0; wave.length > 0 && d <= self.sight * 2 + 2; d++) {
		const next = [];
		for (const c of wave) {
			if (distance(c, world.hero) === 1) return first.get(cellKey(c.x, c.y)) ?? null;
			for (const dir of CLOCKWISE) {
				const x = c.x + DELTA[dir].x;
				const y = c.y + DELTA[dir].y;
				const key = cellKey(x, y);
				if (seen.has(key) || !freeFor(world, enemies, self, x, y)) continue;
				seen.add(key);
				first.set(key, first.get(cellKey(c.x, c.y)) ?? {
					x,
					y
				});
				next.push({
					x,
					y
				});
			}
		}
		wave = next;
	}
	return null;
};
/** One enemy's turn: swing or hit when next to the hero, come closer when it sees the hero, walk its way otherwise. */
var enemyTurn = (world, enemies, self) => {
	const near = distance(self, world.hero);
	if (near === 1) return self.swinging ? {
		enemy: {
			...self,
			swinging: false
		},
		hit: true
	} : {
		enemy: {
			...self,
			swinging: true
		},
		hit: false
	};
	const calm = {
		...self,
		swinging: false
	};
	if (self.sight > 0 && near <= self.sight) {
		const step = stepToward(world, enemies, self);
		if (step !== null) return {
			enemy: {
				...calm,
				x: step.x,
				y: step.y
			},
			hit: false
		};
	}
	if (self.walk === "stand") return {
		enemy: calm,
		hit: false
	};
	const along = (heading) => self.walk === "across" ? {
		x: self.x + heading,
		y: self.y
	} : {
		x: self.x,
		y: self.y + heading
	};
	for (const heading of [self.heading, self.heading === 1 ? -1 : 1]) {
		const to = along(heading);
		if (freeFor(world, enemies, self, to.x, to.y)) return {
			enemy: {
				...calm,
				x: to.x,
				y: to.y,
				heading
			},
			hit: false
		};
	}
	return {
		enemy: calm,
		hit: false
	};
};
/** The events of one enemy's turn, from the enemy before and after it. */
var enemyEvents = (before, after, hit, hearts) => {
	if (hit) return [{
		type: "heroHurt",
		by: after.id,
		hearts
	}];
	if (after.swinging && !before.swinging) return [{
		type: "enemyWindUp",
		id: after.id
	}];
	if (after.x !== before.x || after.y !== before.y) return [{
		type: "enemyMoved",
		id: after.id,
		from: at(before),
		to: at(after)
	}];
	return [];
};
/** After each hero action every enemy that is still up takes its turn, in order. */
var enemiesTurn = (world) => {
	if (!world.enemies.some(isAlive)) return {
		world,
		events: []
	};
	let enemies = world.enemies;
	let hearts = world.hearts;
	const events = [];
	for (const self of world.enemies) {
		if (!isAlive(self)) continue;
		const { enemy, hit } = enemyTurn(world, enemies, self);
		enemies = enemies.map((e) => e.id === enemy.id ? enemy : e);
		if (hit) hearts = Math.max(0, hearts - 1);
		events.push(...enemyEvents(self, enemy, hit, hearts));
	}
	return {
		world: {
			...world,
			enemies,
			hearts
		},
		events
	};
};
/** Outcomes that end the run at once: the enemies do not move after them. */
var isFatal = (outcome) => outcome === "crashed" || outcome === "fell" || outcome === "tired";
/** One hero action, then the enemies' turn. A crash, a trap or the end of the steps ends the run at once. */
var applyAction = (world, action) => {
	const done = heroAction(world, action);
	if (isFatal(done.outcome)) return done;
	const turn = enemiesTurn(done.world);
	return {
		world: turn.world,
		outcome: done.outcome,
		events: [...done.events, ...turn.events]
	};
};
// src/core/level.ts
/** The world at the start of a level: the map, the enemies and the hearts. */
var startWorld = (level) => {
	const world = parseMap(level.map, level.dir);
	const hearts = Math.max(1, Math.round(level.hearts ?? world.hearts));
	const energy = level.maxSteps === void 0 ? null : Math.max(0, Math.round(level.maxSteps));
	return {
		...world,
		enemies: (level.enemies ?? []).map(enemyOf),
		hearts,
		maxHearts: hearts,
		energy
	};
};
var goalMet = (world, goal) => {
	switch (goal.type) {
		case "crystals": return world.crystals.size === 0;
		case "finish": return atFinish(world);
		case "enemies": return enemiesLeft(world) === 0;
	}
};
var allGoalsMet = (level, world) => level.goals.every((g) => goalMet(world, g));
/** Which goals of the level are met now, in the order of `level.goals`: the live goal list of the game. */
var goalStatus = (level, world) => level.goals.map((g) => goalMet(world, g));
var ITEM_GOALS = {
	crystal: (n) => `Збери всі кристали (${n})`,
	wood: (n) => n === 1 ? "Візьми дрова" : `Візьми дрова (${n})`,
	apple: (n) => `Збери яблука (${n})`,
	fish: (n) => `Злови всю рибу (${n})`,
	key: (n) => n === 1 ? "Візьми ключ" : `Візьми ключі (${n})`,
	campfire: (n) => `Розпали вогнища (${n})`
};
var FINISH_GOALS = {
	flag: "Дійди до прапорця",
	well: "Дійди до криниці",
	grandma: "Дійди до бабусі",
	home: "Повернись додому"
};
var enemiesGoal = (world) => {
	const boss = world.enemies.some((e) => e.boss);
	const n = world.enemies.length;
	if (n === 1) return boss ? "Переможи боса" : "Переможи ворога";
	return boss ? `Переможи всіх ворогів і боса (${n})` : `Переможи всіх ворогів (${n})`;
};
var describeGoal = (goal, world, scene = {}) => {
	switch (goal.type) {
		case "crystals": return ITEM_GOALS[scene.item ?? "crystal"](world.totalCrystals);
		case "finish": return FINISH_GOALS[scene.finish ?? "flag"];
		case "enemies": return enemiesGoal(world);
	}
};
var starsFor = (level, blocks) => {
	if (level.stars === void 0 || blocks <= level.stars.three) return 3;
	return blocks <= level.stars.two ? 2 : 1;
};
/** Hero actions in one run. A textbook level needs fewer than 100. */
var MAX_ACTIONS = 1e3;
/** VM frames in one run. A «завжди» loop without actions ends here. */
var MAX_FRAMES = 2e3;
/** The reason a run stops after this outcome, or null when it goes on. */
var fatalReason = (outcome) => outcome === "crashed" ? "crashed" : outcome === "fell" ? "trapped" : outcome === "tired" ? "tired" : null;
var isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
var isProgramBlock = (value) => isRecord(value) && typeof value.opcode === "string";
/** A variable reporter as the editor keeps it: `[12, name, id]`, inside an input or alone on the canvas. */
var isVariablePrimitive = (value) => Array.isArray(value) && value[0] === 12;
/** Variable reporters kept inside the inputs of a block. Each is a block the student put, so it counts. */
var variablesIn = (block) => isRecord(block.inputs) ? Object.values(block.inputs).filter((input) => Array.isArray(input) && isVariablePrimitive(input[1])).length : 0;
/** A custom block «без оновлення екрана» runs on the clock in Scratch, so a run could differ: it is refused. */
var isWarp = (block) => isRecord(block.mutation) && (block.mutation.warp === true || block.mutation.warp === "true");
var proccodeOf = (block) => isRecord(block.mutation) ? block.mutation.proccode : void 0;
/** Checks the program shape and palette before it runs. Returns the error text or the block count. */
var checkProgram = (level, program) => {
	const entries = Object.entries(program);
	if (entries.length > 300) return { error: `Програма довша за 300 блоків` };
	const allowed = allowedOpcodes(level.blocks);
	const defined = /* @__PURE__ */ new Set();
	let blocks = 0;
	let hasStart = false;
	for (const [, block] of entries) {
		if (isVariablePrimitive(block) && allowed.has("data_variable")) {
			blocks++;
			continue;
		}
		if (!isProgramBlock(block)) return { error: "Блок без опкоду або змінна: цей рівень їх не має" };
		if (!allowed.has(block.opcode)) return { error: `Блок ${block.opcode} не з цього рівня` };
		if (isWarp(block)) return { error: "Власний блок «без оновлення екрана» тут не працює: зніми цю позначку" };
		if (block.opcode === "procedures_prototype") {
			const name = proccodeOf(block);
			if (defined.has(name)) return { error: `Блок «${String(name)}» визначено двічі: залиш одне «визначити»` };
			defined.add(name);
		}
		blocks += variablesIn(block);
		if (block.opcode === "event_whenflagclicked") hasStart = true;
		else if (block.shadow !== true && !isNumberShadow(block.opcode)) blocks++;
	}
	return {
		blocks,
		hasStart
	};
};
var resultOf = (level, session, blocks, extra = {}) => {
	const passed = session.reason === null && allGoalsMet(level, session.world);
	return {
		levelId: level.id,
		passed,
		stars: passed ? starsFor(level, blocks) : 0,
		blocks,
		collected: session.world.totalCrystals - session.world.crystals.size,
		totalCrystals: session.world.totalCrystals,
		reason: passed ? null : session.reason ?? "goalsNotMet",
		frames: session.frames,
		world: session.world,
		...extra
	};
};
// src/core/hero.ts
/** The hero's actions, in palette order. */
var HERO_ACTIONS = [
	"move",
	"turnLeft",
	"turnRight",
	"collect",
	"attack"
];
/** Each question and how the world answers it. */
var HERO_SENSORS = {
	wallAhead,
	onCrystal,
	atFinish,
	enemyAhead,
	trapAhead
};
var SENSOR_NAMES = Object.keys(HERO_SENSORS);
var ACTION_BY_OPCODE = new Map(HERO_ACTIONS.map((a) => [opcodeOf(a), a]));
var SENSOR_BY_OPCODE = new Map(SENSOR_NAMES.map((s) => [opcodeOf(s), s]));
/** The action of a hero block, such as `hero_move`, or undefined for any other block. */
var actionOfOpcode = (opcode) => ACTION_BY_OPCODE.get(opcode);
/** The question of a hero block, such as `hero_wallAhead`, or undefined for any other block. */
var sensorOfOpcode = (opcode) => SENSOR_BY_OPCODE.get(opcode);
/** A new run of the level: the hero at the start, nothing done yet. */
var newSession = (level) => ({
	world: startWorld(level),
	frames: [],
	done: false,
	reason: null
});
/**
* The hero does one action, the enemies take their turn, and the frame is written down. Returns true when the run
* is over after it: the goals are met, the hero crashed, fell, ran out of steps or hearts, or did too many actions.
* The caller then stops the program.
*/
var heroAct = (level, session, action, source) => {
	if (session.done) return true;
	const { world, outcome, events } = applyAction(session.world, action);
	session.world = world;
	session.frames.push({
		action,
		outcome,
		blockId: source.blockId,
		events,
		goals: goalStatus(level, world),
		world,
		...source.line === void 0 ? {} : { line: source.line },
		...source.counter === void 0 ? {} : { counter: source.counter }
	});
	const fatal = fatalReason(outcome);
	if (fatal !== null) return end(session, fatal);
	if (allGoalsMet(level, world)) return end(session, null);
	if (world.hearts === 0) return end(session, "defeated");
	if (session.frames.length >= 1e3) return end(session, "tooLong");
	return false;
};
/** The answer to a question about the world as it is now. */
var heroSense = (session, sensor) => HERO_SENSORS[sensor](session.world);
var end = (session, reason) => {
	session.done = true;
	session.reason = reason;
	return true;
};
// src/ui/fullscreen.ts
/**
* Full screen for the game. The browser's full screen where it works; elsewhere (an iPhone) the game covers the
* page. Esc or the button leaves it.
*/
var useFullScreen = () => {
	const rootRef = useRef(null);
	const [full, setFull] = useState(false);
	useEffect(() => {
		const onChange = () => {
			if (document.fullscreenElement === null) setFull(false);
		};
		document.addEventListener("fullscreenchange", onChange);
		return () => document.removeEventListener("fullscreenchange", onChange);
	}, []);
	useEffect(() => {
		if (!full) return;
		const onKey = (e) => {
			if (e.key === "Escape") setFull(false);
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [full]);
	return {
		rootRef,
		full,
		toggleFull: useCallback(() => {
			const root = rootRef.current;
			if (full) {
				setFull(false);
				if (document.fullscreenElement !== null) document.exitFullscreen().catch(() => void 0);
				return;
			}
			setFull(true);
			if (root !== null && typeof root.requestFullscreen === "function") root.requestFullscreen().catch(() => void 0);
		}, [full])
	};
};
// src/core/xp.ts
/** XP for any pass of a level of this tier. */
var TIER_XP = {
	intro: 10,
	practice: 20,
	challenge: 35
};
/** XP of one run of a level of this tier (`level.tier ?? "intro"`). A failed run gives none. */
var xpFor = (tier, run) => run.stars <= 0 ? 0 : TIER_XP[tier] + Math.min(run.stars, 3) * 5 + (run.firstTry ? 10 : 0);
/** XP a run adds to the hero: only the part above the best earlier run of the level, so replays give nothing to farm. */
var xpGain = (xp, bestBefore) => Math.max(0, xp - bestBefore);
/** Total XP at which each hero level starts. Level 1 starts at 0. */
var HERO_LEVELS = [
	0,
	100,
	250,
	450,
	700,
	1e3,
	1350,
	1750,
	2200,
	2700
];
var heroLevelOf = (totalXp) => {
	const index = HERO_LEVELS.reduce((found, start, i) => totalXp >= start ? i : found, 0);
	return {
		level: index + 1,
		from: HERO_LEVELS[index] ?? 0,
		next: HERO_LEVELS[index + 1] ?? null
	};
};
// src/levels/chapters.ts
var chapters = [
	{
		id: "sequence",
		title: "Послідовність",
		skill: "Скласти план із кроків і поворотів та виконати його по черзі.",
		levels: [
			"g3-steps",
			"g3-turn",
			"g3-gate",
			"g3-logs",
			"g3-finish",
			"g3-zigzag"
		]
	},
	{
		id: "loops",
		title: "Цикли",
		skill: "Побачити, що повторюється, і загорнути це в «повторити».",
		levels: [
			"g4-road",
			"g4-repeat",
			"g4-corner",
			"g4-stairs",
			"g4-sled",
			"g6-nested"
		]
	},
	{
		id: "conditions",
		title: "Умови",
		skill: "Спитати «якщо…» і зробити різне в різних випадках.",
		levels: [
			"g4-if",
			"g4-fence",
			"g5-snake"
		]
	},
	{
		id: "while",
		title: "Цикл «поки»",
		skill: "Повторювати, доки не справдиться умова, навіть не знаючи, скільки разів.",
		levels: [
			"g4-until",
			"g5-bridge",
			"g5-way-home",
			"g6-spiral",
			"g6-maze"
		]
	},
	{
		id: "puzzles",
		title: "Пастки й сили",
		skill: "Обійти пастки й знайти найкоротший шлях, коли сил мало: подумати, перш ніж іти.",
		levels: [
			"p-thin-ice",
			"p-field",
			"p-cold",
			"p-fires",
			"p-stairs",
			"p-river",
			"p-fork"
		]
	},
	{
		id: "enemies",
		title: "Вороги",
		skill: "Стежити за ворогом: вдарити вчасно і не підставити спину.",
		levels: [
			"g5-spirit",
			"g5-glade",
			"g5-guards",
			"g6-bear"
		]
	},
	{
		id: "counter",
		title: "Лічильник і власні блоки",
		skill: "Рахувати змінною, що змінюється в циклі, і скласти свій блок, щоб не писати те саме знову.",
		levels: [
			"c-apples",
			"c-spiral",
			"c-stones",
			"c-rocks"
		]
	}
];
/** The chapter of a level, or undefined for a level outside the course (a teacher's task). */
var chapterOf = (levelId) => chapters.find((c) => c.levels.includes(levelId));
// src/ui/sprites/apple.png
var apple_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAASUExURQAAAAICAvmLS+9OKf+vh////8cfqm0AAAABdFJOUwBA5thmAAAAAWJLR0QF+G/pxwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB+oKHhEVLnf6iNUAAABCSURBVAjXY2BAAoKCUFpJCcxiVFJSUhYAMoRUnJSUDVEYICkUhjCQYQxiMBoDAUgXg7AxWAAoJGwoAGFAZRB2oQEAac4H6UgfYlUAAAAASUVORK5CYII=";
// src/ui/sprites/bloom-orange.png
var bloom_orange_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAQCAYAAACm53kpAAACX0lEQVR4nOVXMWvbQBh9pxM4a+duNXEoJh4KzpjFoBj0AwwOFAqZAl5CPde7gxeDp0Cg0EB+gMERaMkYQYcUU+JgLyVzMqbQ4zrIJ92dzqosuWTIW2x/+t73fe/dnSQTzjleM6yXHuClYW+yGKU003ZijJH/wc8DxYAiA1BKOWNMibmjGgBgfHxryiWGWG5+3vkjA4oMYOICIAC44TsYY0qNovwi8xPOuXmAs23199G9XgQrBehcAN5TBc7ncTZ+0f4hiDuqcQAYH98qBsp8swE5BPS9MgDg7Z8eWr++GPmPu4d4sHsAgK4zB2OMyNx1+HqNvAZGR2DgV+IBEu1DXF5dKAMsCykCWgdt4CwpQFwb+CG/75Uzn9k0iP7K/CYDT13FQNHfNgm4vALe/PimFHjcPUwV4N9txWft6B7eqavwxe45aczgjmpo7DxH17rOHM1hNeKn9QfacEc1TDrTrB6lgliWxfteWRWAcLVvrgMAwN5+fdk8hBDQdeZRTN+CaXwg3IIyivJVAy9SDIRiILEsi5sGEIUAJJpnEbAOX+zAk8YsE19s900sQOqb4IPdS5x5E+QzmIU/8CuQj906/cWj7V/9Wwdt7O3XjeLl/rZcQF+BVRAF5BWQh1sEJbyr/0ZjJ46LGIAoLuDfbQEAug5Fc1hN5U86U2BYzTRnbJ5+fOMc5U2wqIBJZ4rKxw8rB1oEJcy+fk8IkG9oi6CkfJpi+g2wiIH2pgUosWWeXlfON73Svv9U53Ke4P48DwjO1VxKKS9iYHQT1AeilPKmJECOm/JNELmb/POyDrL0/wsasPA4ximXJAAAAABJRU5ErkJggg==";
// src/ui/sprites/bloom-white.png
var bloom_white_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAQCAYAAACm53kpAAACQklEQVR4nO1XPWsbQRScFSJlQHCq7vBV6VykcmGhxgcuEjcSKg0qEnw/wuCQgH/EgVUIUhlZapIUxpfmcJMqf+GEXNkQcOkim8J+l7cf9yGvumQq8W7nvZnZ25UE/Me/DbHJZp7vyybr7m5urHNd+c+B0shFgOf78na1UmrztAcAGEbXSr0bBEYPV76rfni+L3VcXO3Ki6tdo64PsnEBgPgAUNXDle+iv01kPX0sYwxfbRefsZUUj25XK3SDQJa+issYMj8qhsh8W94v9vBy8L10V3To/Kq1Nv1CCEHhCSEEharrb5cZ0FFngF7X3y8+YRTa18yyFK2HE0N8Mg01/rl1/qV3XPCTaYh4jNJNaBpgEYCrAcKoHwFL0wA9m6eqgTJhTeEaYNtmYJYB+3enSoNL77jWQHFZbSW4X+wpfHp7htF1IZYQj3Mk07DgV80HIszTHuJxXp9OAwgeAL9tZ1mKL4vPAICDweHT8EeQAS5CP4NVfODxJudw5asBphUBQglQ0I1oXIJPjQAYw5sYWIdv24Aq/iY3oGUoY2g9nBhn3gZ+Bpvw52kP/NitM982xzZ/1I9wMDi0mufz27yBvgNloAb6OSQRk6yDd/1fSl2v2dANAiTTsJJP90UT/A3PPL4E5WvQ1UA8zrHz/nXp80nWwY+zn4YBHuQk6xgaeA3ISy/A5wSoXILcgG6WRHADNiHE19fxOofte/zNh7eSryXut49fa3/+8g3QA7TNF3oDEqQHw+t1BnRxm/zzsg6azP8DuKBIgSb2Dz0AAAAASUVORK5CYII=";
// src/ui/sprites/bridge.png
var bridge_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAgMAAABinRfyAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAAMUExURf/Ylr15WaRVQv///4V9E1EAAAABYktHRAMRDEzyAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH6goeERUud/qI1QAAABVJREFUCNdjYICDUCBgWAUEDBSIAQAg9g/xkjT6BAAAAABJRU5ErkJggg==";
// src/ui/sprites/bush-round.png
var bush_round_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAAPUExURQAAAAICAo28JUqVLf///5Gp8r4AAAABdFJOUwBA5thmAAAAAWJLR0QEj2jZUQAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB+oKHhAvBf8txdsAAABJSURBVAjXfc3BDcAwCANA2KBOJsBsAPvvVpPmXV4nW4DZ3zieC8axb+aisFik4BzEgaZV7WmImzA+5EFLJaC0ltDBUhbzAt2AvQeWCfjdDA2CAAAAAElFTkSuQmCC";
// src/ui/sprites/bush.png
var bush_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAAPUExURQAAAAICAnOtKEqVLf///x5busMAAAABdFJOUwBA5thmAAAAAWJLR0QEj2jZUQAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB+oKHhAmO++OYzkAAABUSURBVAjXbYyxEcAwDALxBiaZQGiBWNp/t2BXKYIK/kAH8BF9x4OxfSgUnA50iZoYzHLkJjp1QGVYE7wrs3viylQreaDEheGg1AvoctN72s8PfvQCxpAKjElK6DEAAAAASUVORK5CYII=";
// src/ui/sprites/clover.png
var clover_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAASUExURQAAAAICAkqVLaetKydxRP///7fMNqUAAAABdFJOUwBA5thmAAAAAWJLR0QF+G/pxwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB+oKHhENAsc5fG8AAABGSURBVAjXY2DADxgFBSEMIWNjATBXGcwQNjYRBjEYjY2NXJQUIQyglCKIoQRmMAgpCTqDGYyCjI5KSgJg8xyhBoo4YrUPADYcCIFgqDe4AAAAAElFTkSuQmCC";
// src/ui/sprites/crystal.png
var crystal_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAAVUExURQAAAAAAAP///5K3/0pv/zVj7C5V0kAoSPAAAAABdFJOUwBA5thmAAAAAWJLR0QCZgt8ZAAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB+oKHhAmO++OYzkAAABpSURBVAjXTc7RDYAwCARQukGpTQfQCRQXaEpZwDhA1bD/CIppony9XA4CwG+c7whzD0ayyKEr1TAQloroYVjzVsNk4L0tD9LJchJ7cHoJvUiHEmeAmENZBW09SrrkKStLY7WTSZvi98INz/4Q6y25oSkAAAAASUVORK5CYII=";
// src/ui/sprites/fern.png
var fern_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAASUExURQAAAAICAituTkqVLRUxKP///wo55IMAAAABdFJOUwBA5thmAAAAAWJLR0QF+G/pxwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB+oKHhAvBf8txdsAAABbSURBVAjXbY3REcAgCENxAyMTFFwA0gns/jtV7G/zEXIE7on8CTijwQx9B+Wa3Ltmlm7WpTHncvbdcC4yRO0oBEpPBgSssN+Ut+dTNzk9l4eMC54YV4E+L1qRXhhxDMMqxkZpAAAAAElFTkSuQmCC";
// src/ui/sprites/fish.png
var fish_default = "data:image/png;base64,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";
// src/ui/sprites/flower.png
var flower_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAAPUExURQAAAP/Ljf/31//rQP///xqLsJMAAAABdFJOUwBA5thmAAAAAWJLR0QEj2jZUQAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB+oKHhENAsc5fG8AAAAvSURBVAjXY2DADxgFIbSSoqCSApihJARmMAoqGysKghnCxoKCyCJwNQhdcHMIAQA6OAQv1+lxYwAAAABJRU5ErkJggg==";
// src/ui/sprites/grass.png
var grass_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAHUlEQVR4nGNcu8fqPwMFgIkSzaMGjBowasBgMgAA8PcCwpYHelYAAAAASUVORK5CYII=";
// src/ui/sprites/house.png
var house_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwBAMAAABTZWEsAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAAkUExURQAAAAICAvzbsfijPel9N30+JNFcLatDKYYrJr15WdKzff///yWl1vgAAAABdFJOUwBA5thmAAAAAWJLR0QLH9fEwAAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB+oKHhEVLnf6iNUAAAE6SURBVDjL1dRBjoIwFAZguIEmpMG1nmDGsMf5deYAcgCCqR5gImuTCeksXeIJlFNOXwtSsAUXbuYPkfD6pXlI8zzvFfGnjkwaMH+35u1pMF3AmlUN/HixTrb9VVla1U0E6yRB8hBZ2sZqA4BzefVDVdAWAWBZVgSI1QYDQG5BILKDTAEGfHBHlkD6GhC5QGYHGAHf+OyBXgv7/Gg0YQHdLp8CkRtkLoARcH8RBSwttC+ytIDdxuzyEeyBYxf0989z8yn1fD4YeaLY0HoqgRDudSEInIQzIYGvU1mWZ0G/MqGYGffwh071wQ0KaHCprvxwpokwK/hvRaH77Q4qAnpmmKBqwIVAqgEzwe3/gN0Q2MgRE3D611ugv0KhqzSkGKeZ2AI9I6O6SkOMNV++fTCOAxXrs6XSBRNvPH91TvM1yuiGmwAAAABJRU5ErkJggg==";
// src/ui/sprites/ice.png
var ice_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQMAAAAlPW0iAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAAGUExURc3p//////NuMegAAAABYktHRAH/Ai3eAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH6goeERUud/qI1QAAAAxJREFUCNdjYCANAAAAMAABx6qFjgAAAABJRU5ErkJggg==";
// src/ui/sprites/key.png
var key_default = "data:image/png;base64,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";
// src/ui/sprites/meadow.png
var meadow_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHAAAAAQCAYAAADOFPsRAAABP0lEQVR4nO1XQRKDMAiknfoAz/6kf+4P+h3PPsBDe2ImRYgBEjJaOdUoy4YlhN5e7+cHLjus3XsTuMxnl4AHt0dUoHVeYJjGbv4pDgBssHCdvkvXOT9NTKs/h4U4YQKmBCKFTDec+kq/02culiU+h12Lf1gL9VaetfKHaWQ3T7HpKWklHhffwz/8DowUkgoD8Lt5TjRcz7VYC1dLGy3hH95Coy2XrNJE0qRZitBauHv8Ty8gGiZCSohGGOnbGgOPZBL/Ji3U0m68/uu8bE6KBqfkpOJ9JLW29D33TQv+VQXM9euW/vSyp89ao34lkyQXqzS+h3+TExg9cXJTJIDvL4vVr0bBaPhXFZCryih/aWr0tvOSWLk4momTw+tyAnuat4gkzL1EYssD8BWNlv9pp9CaE6AGr1bcUpzTncB/sy9/7xO6nAeFpgAAAABJRU5ErkJggg==";
// src/ui/sprites/enemy-bear.png
var enemy_bear_default = "data:image/png;base64,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";
// src/ui/sprites/enemy-flame.png
var enemy_flame_default = "data:image/png;base64,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";
// src/ui/sprites/enemy-goblin.png
var enemy_goblin_default = "data:image/png;base64,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";
// src/ui/sprites/enemy-skull.png
var enemy_skull_default = "data:image/png;base64,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";
// src/ui/sprites/enemy-slime.png
var enemy_slime_default = "data:image/png;base64,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";
// src/ui/sprites/enemy-spirit.png
var enemy_spirit_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89+bN/rXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz/SMBAPh+PDwrIsAHvgABeNMLCADATZvAMByH/w/qQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf+bTAICd+Jl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA/g88wAAKCRFRHgg/P9eM4Ors7ONo62Dl8t6r8G/yJiYuP+5c+rcEAAAOF0ftH+LC+zGoA7BoBt/qIl7gRoXgugdfeLZrIPQLUAoOnaV/Nw+H48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl/AV/1s+X48/Pf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H/LcL//wd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s+wM+3zUAsGo+AXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93/+8//UegJQCAZkmScQAAXkQkLlTKsz/HCAAARKCBKrBBG/TBGCzABhzBBdzBC/xgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD/phCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8+Q8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8+xdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR+cQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI+ksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG+Qh8lsKnWJAcaT4U+IoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr+h0uhHdlR5Ol9BX0svpR+iX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK+YTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI+pXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q/pH5Z/YkGWcNMw09DpFGgsV/jvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY/R27iz2qqaE5QzNKM1ezUvOUZj8H45hx+Jx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4/OBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up+6Ynr5egJ5Mb6feeb3n+hx9L/1U/W36p/VHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm+eb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw+6TvZN9un2N/T0HDYfZDqsdWh1+c7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc+Lpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26/uNu5p7ofcn8w0nymeWTNz0MPIQ+BR5dE/C5+VMGvfrH5PQ0+BZ7XnIy9jL5FXrdewt6V3qvdh7xc+9j5yn+M+4zw33jLeWV/MN8C3yLfLT8Nvnl+F30N/I/9k/3r/0QCngCUBZwOJgUGBWwL7+Hp8Ib+OPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Adh5mGLw34MJ4WHhVeGP45wiFga0TGXNXfR3ENz30T6RJZE3ptnMU85ry1KNSo+qi5qPNo3ujS6P8YuZlnM1VidWElsSxw5LiquNm5svt/87fOH4p3iC+N7F5gvyF1weaHOwvSFpxapLhIsOpZATIhOOJTwQRAqqBaMJfITdyWOCnnCHcJnIi/RNtGI2ENcKh5O8kgqTXqS7JG8NXkkxTOlLOW5hCepkLxMDUzdmzqeFpp2IG0yPTq9MYOSkZBxQqohTZO2Z+pn5mZ2y6xlhbL+xW6Lty8elQfJa7OQrAVZLQq2QqboVFoo1yoHsmdlV2a/zYnKOZarnivN7cyzytuQN5zvn//tEsIS4ZK2pYZLVy0dWOa9rGo5sjxxedsK4xUFK4ZWBqw8uIq2Km3VT6vtV5eufr0mek1rgV7ByoLBtQFr6wtVCuWFfevc1+1dT1gvWd+1YfqGnRs+FYmKrhTbF5cVf9go3HjlG4dvyr+Z3JS0qavEuWTPZtJm6ebeLZ5bDpaql+aXDm4N2dq0Dd9WtO319kXbL5fNKNu7g7ZDuaO/PLi8ZafJzs07P1SkVPRU+lQ27tLdtWHX+G7R7ht7vPY07NXbW7z3/T7JvttVAVVN1WbVZftJ+7P3P66Jqun4lvttXa1ObXHtxwPSA/0HIw6217nU1R3SPVRSj9Yr60cOxx++/p3vdy0NNg1VjZzG4iNwRHnk6fcJ3/ceDTradox7rOEH0x92HWcdL2pCmvKaRptTmvtbYlu6T8w+0dbq3nr8R9sfD5w0PFl5SvNUyWna6YLTk2fyz4ydlZ19fi753GDborZ752PO32oPb++6EHTh0kX/i+c7vDvOXPK4dPKy2+UTV7hXmq86X23qdOo8/pPTT8e7nLuarrlca7nuer21e2b36RueN87d9L158Rb/1tWeOT3dvfN6b/fF9/XfFt1+cif9zsu72Xcn7q28T7xf9EDtQdlD3YfVP1v+3Njv3H9qwHeg89HcR/cGhYPP/pH1jw9DBY+Zj8uGDYbrnjg+OTniP3L96fynQ89kzyaeF/6i/suuFxYvfvjV69fO0ZjRoZfyl5O/bXyl/erA6xmv28bCxh6+yXgzMV70VvvtwXfcdx3vo98PT+R8IH8o/2j5sfVT0Kf7kxmTk/8EA5jz/GMzLdsAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAAA8JJREFUeNrsW01qGzEUfpLmAsa5QQ1uoGTXHqS064CXBh/A+0IOUJplcNYFH6TLUijGOULAq+wyvC5qKRrNexppPNJgrAcDg6WnT3/zpO+TLBARAADg/itoU6st6ve6roVJsPLA8ic0jElTSr2V9f2zCPHPiV+BY2q1xcnuAQAADvMFKKWgrmsa1DYiTSkFAAC6PDVfYKMShOXGlxT48+yWr+Cx0Ni059ktTHYPjdHlGp8TX3Y5AAAqpVBPJTMahOk0K39ng8bGFzoGKKXIzFdPj+b9MF9AXdeiMS2t3q/r2pRjN8QtT5fj+I+CX4WMhHac7B50UBHMFDTgfUZ9DHwZWxE9LYksgzc+B76ECze2A2bXn1rvIT071Ojb+DFlU3mossoM6OqAp7+/yPdcNiSmr6xWB9jLTkzaufrb+4BGJOXsMF8AAAhqHT5Lf0QERAQppX7Q90z3G5BSGj/b/5iGHQ/rPwa+OwOCjRmBs/OvLKoId/e/MdC/tRP7dj3jNigtWy9vWv5j4ZsZcKlWuYICQVffAkakIKEDkzPSwuefG58kQ3YkPcwXeCxI+Kioo8IYYKesoFHJim8i6Y8vdkTF6X6DiIjT/Qan+403glORXPvpMqSUSGGNjd+5FQ5gYUlZYWp86S4l1HLiVoLK425EKHCu/DHxJdeDQ3J6W94KHcFc+NJdi1MLEj6MMfCjVeFTR+FUVXhwfCryIiK+e/+RfG9FVMafs1B/G7OPv22++hdBpAgiRRApgkgRRDSbiuHj6z+7xg93H+ZxfJxgc2PgV50Vg8YZu+A2K+vlDQCAUKutqYh7/teirSEdkxg/eBk0+/DVFo4g7iZG/975HfaxVPiS49QWeejVIH2Q2SIuEZcccuB3zQB2a9olQkYSoMGJUTC+LRLY0ZHaWtrbSCYSe32MHyOIxOAzgkg0vqSkYu6ywkkkJPKGRy78ioq4PnDukoLvW32e3cLV7n8eMjL3wOdumMTiyxjwIUeiT+OT4Pelw24MuDg67JWoCx0udLjQ4UKHy/2A8/C/+PsBQXqA3cshfNy7RPbQA1LiVyE9Zu+ejpxb1Ms2H9cjoKdj17Y31FLiVyHAMWf8dl6LgIhTGp4Unzuz587YQ6I4dbbP3QUYG79KSUrMVfdAJjgGvuQkKO8JKxFkfIHHZmIB9wPy4juKjJfRcUzQmoJB/h5FKDu+eXl5RQyhtNx3qCsQQoVfXrFFZ2PxuQ6Ixe/N51PrAbn8o/4wkdOGxCx/mEghiKRWhIogUgSRIoiU+wE58P8NANLJll3sR2FqAAAAAElFTkSuQmCC";
// src/ui/sprites/enemy-toad.png
var enemy_toad_default = "data:image/png;base64,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";
// src/ui/sprites/npc-boy.png
var npc_boy_default = "data:image/png;base64,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";
// src/ui/sprites/npc-girl.png
var npc_girl_default = "data:image/png;base64,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";
// src/ui/sprites/npc-grandpa.png
var npc_grandpa_default = "data:image/png;base64,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";
// src/ui/sprites/npc-hunter.png
var npc_hunter_default = "data:image/png;base64,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";
// src/ui/sprites/npc-kid.png
var npc_kid_default = "data:image/png;base64,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";
// src/ui/sprites/npc-villager.png
var npc_villager_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABwCAYAAACuE3ZzAAAACXBIWXMAAAsTAAALEwEAmpwYAAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89+bN/rXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz/SMBAPh+PDwrIsAHvgABeNMLCADATZvAMByH/w/qQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf+bTAICd+Jl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA/g88wAAKCRFRHgg/P9eM4Ors7ONo62Dl8t6r8G/yJiYuP+5c+rcEAAAOF0ftH+LC+zGoA7BoBt/qIl7gRoXgugdfeLZrIPQLUAoOnaV/Nw+H48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl/AV/1s+X48/Pf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H/LcL//wd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s+wM+3zUAsGo+AXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93/+8//UegJQCAZkmScQAAXkQkLlTKsz/HCAAARKCBKrBBG/TBGCzABhzBBdzBC/xgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD/phCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8+Q8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8+xdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR+cQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI+ksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG+Qh8lsKnWJAcaT4U+IoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr+h0uhHdlR5Ol9BX0svpR+iX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK+YTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI+pXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q/pH5Z/YkGWcNMw09DpFGgsV/jvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY/R27iz2qqaE5QzNKM1ezUvOUZj8H45hx+Jx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4/OBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up+6Ynr5egJ5Mb6feeb3n+hx9L/1U/W36p/VHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm+eb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw+6TvZN9un2N/T0HDYfZDqsdWh1+c7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc+Lpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26/uNu5p7ofcn8w0nymeWTNz0MPIQ+BR5dE/C5+VMGvfrH5PQ0+BZ7XnIy9jL5FXrdewt6V3qvdh7xc+9j5yn+M+4zw33jLeWV/MN8C3yLfLT8Nvnl+F30N/I/9k/3r/0QCngCUBZwOJgUGBWwL7+Hp8Ib+OPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Adh5mGLw34MJ4WHhVeGP45wiFga0TGXNXfR3ENz30T6RJZE3ptnMU85ry1KNSo+qi5qPNo3ujS6P8YuZlnM1VidWElsSxw5LiquNm5svt/87fOH4p3iC+N7F5gvyF1weaHOwvSFpxapLhIsOpZATIhOOJTwQRAqqBaMJfITdyWOCnnCHcJnIi/RNtGI2ENcKh5O8kgqTXqS7JG8NXkkxTOlLOW5hCepkLxMDUzdmzqeFpp2IG0yPTq9MYOSkZBxQqohTZO2Z+pn5mZ2y6xlhbL+xW6Lty8elQfJa7OQrAVZLQq2QqboVFoo1yoHsmdlV2a/zYnKOZarnivN7cyzytuQN5zvn//tEsIS4ZK2pYZLVy0dWOa9rGo5sjxxedsK4xUFK4ZWBqw8uIq2Km3VT6vtV5eufr0mek1rgV7ByoLBtQFr6wtVCuWFfevc1+1dT1gvWd+1YfqGnRs+FYmKrhTbF5cVf9go3HjlG4dvyr+Z3JS0qavEuWTPZtJm6ebeLZ5bDpaql+aXDm4N2dq0Dd9WtO319kXbL5fNKNu7g7ZDuaO/PLi8ZafJzs07P1SkVPRU+lQ27tLdtWHX+G7R7ht7vPY07NXbW7z3/T7JvttVAVVN1WbVZftJ+7P3P66Jqun4lvttXa1ObXHtxwPSA/0HIw6217nU1R3SPVRSj9Yr60cOxx++/p3vdy0NNg1VjZzG4iNwRHnk6fcJ3/ceDTradox7rOEH0x92HWcdL2pCmvKaRptTmvtbYlu6T8w+0dbq3nr8R9sfD5w0PFl5SvNUyWna6YLTk2fyz4ydlZ19fi753GDborZ752PO32oPb++6EHTh0kX/i+c7vDvOXPK4dPKy2+UTV7hXmq86X23qdOo8/pPTT8e7nLuarrlca7nuer21e2b36RueN87d9L158Rb/1tWeOT3dvfN6b/fF9/XfFt1+cif9zsu72Xcn7q28T7xf9EDtQdlD3YfVP1v+3Njv3H9qwHeg89HcR/cGhYPP/pH1jw9DBY+Zj8uGDYbrnjg+OTniP3L96fynQ89kzyaeF/6i/suuFxYvfvjV69fO0ZjRoZfyl5O/bXyl/erA6xmv28bCxh6+yXgzMV70VvvtwXfcdx3vo98PT+R8IH8o/2j5sfVT0Kf7kxmTk/8EA5jz/GMzLdsAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAACoZJREFUeNrsXF9oHEUY/3b37MNBpcZUbDkbTfBNSCzEYH2IlAhHG5CAD0n6UJDDgCBEKFcsCHlRofSh+CCoQfDBRkQIQpSAIZiHFmKhJk+CksPToy3aJsVIHrTn+HD3Tb75dmZ39k96t/EGQpLd/Wbm+2Z2Zn6/+c06Qgj4P6ccv+B5XmBE6vW6E3Q/a/Y5bnyyvx/CCjBVIov2bhRjAICT/f3aKGfV3hFCWBvTtLy+DgDg1Ov1zNrX63XH5Td++eN35bfpmimlac/tgvIJejbIzg3LxKZwbm/jYNzgRbG3aQTfLHDBPRDowLv//k1H1MiOsBFZ6ZKzhR5jWYYR3aq7c59KjdfH3wMuuAegMJCDUq0KhYGc8oPXwgIUMzkA4Cvrg+P5xBl/cDzv84mW6bbJekQsjvYZHUjivC41yxJyFsBpZLbQQyMEtbX7gC1Dr5VqVTkC02mo9+gRq4pVbt5S7LFsXhZPr9/Ykfa9R484P/9WAwCAp58oQOXmLVl+UNDQp1Kt6psFnFKtKh+gXVLnvK4bNx2zcp7bYhcNe5fReX6v9+gRp3LzVugriq8D1kHpAYXLQwAAMHPpttZ45tzjjUBMr2p7ANofuPir1v7v8jGtved5MFvogVKtqixw+KCIreZ5njII0v9pb6J2LF+nmdfuQggrv7PSKx/MD1eM12rTq3JdTe358zShLbfXBRHz4HXYnJ/zBZ8EQXSNTWjtdPUGAHBc15URwxYOcwB7CEaW2ptsaR7UXhdE6izmXapVAe/rehAACHqf2vGg0CDk6MBz9ewSLH7zNcArZgeKp07Dj0sDzWZU7109uwSLh78ODEDx1Gn49tIz2nu8/KlGa8v09uE3oXjqNPRMHwy0n4Jx5fp7r7yslK/YCyFS/XFdVwT9BNiB67raa58ce0r+fez95+HY+88rz/Lr3CaonFyak3lSOGuTqm9ck4OeMr01ujV40160FRhnhOISElEQGSKxfUOIRIWjBJP7ptLMEiJJ4XCrCBE3YQumAoeTlp/EPnVCJAoZoYOzmSZEkqbMESJppjiEiG3ac0KkXq87yyRTS0KTzuf7ghCxhsOzhR5sbYHr+JYSIjgiJiVEusYmID9cCYXDDEw5ANAyQkQGoInHfUHgxgRbK4wOIq4wJEiXrowYEZpW0paPhAgNQDMwwlT/4sKGr8cqfABe7RqbgIvXr/kyKA+ekE5wTO15nuzCkw89FxoECmc5mYH5lEa6tdAc+QAdIUL5AB702aU7MhBIqtTrdTkLoDMiP1yBMpzwVfzKP983KgbdslBbWppDVgpHTXmYeIWusQnYnJ9TlrMYPF0v3M3njnYNgj1Ayai6td3A5c00dWZcdkkeQUpIAAB8+NnngQGYOjPua0ETmNHlVTx1GnoeOaglRHi9WZlaMKQEQIGdW9tQeDivdLHF0T7lXdJ0QVgc7YPqxDsAAPDWl19pSQmskIHWAl0AaF74KtDyeevrytP2urQJjTD7j+e+8JEULI9Y5dvWn5edmj7Adpd26sx4ECGy53B4eX1d0Nmnow/Isj6AMsodfUBHH/A/1Ae0DRxOA0nuBzicJHX0AR19QEcf0NEHdPQBHX1AC/QBTtrnBZLu7j7o1Fb6gLg0W8Q6KmWkdmAiKhxtlT6AT8GJCREcgOLszmqcyS4hkhQOd/QBWdUHRN3j39eESNLU0QdkkRBBIBJVH8BG8kwTIgL3+xPA4UzqAxCa+sBUEBzeWenFbS1ld7nV+gAZERt9AGoJCDa3gsM00SCEqUQkkGnuSwbpA0gLh+Wj6AOkE1h5jUbAKQ+eEJsEoXEHqL0p4TY77jLbEiIYeALDfXCY3ue2JkIkZ6rg5KBPIyDywxXYnAcTJQZXzy7BsyuvRX5XkcnhfEBZ6X7VSHmWSf27iLgDAKA0vSqX07IHcIVGcWFD2Z7GffkgSgoAhKU+QEupmfb3ua1On4D1BwjWKFA/UucD6GCmY47bMaUeAIvu3r7fD0gjZe37AW1zYKJV9m1BiMSFs2nYJyJEdOKqTOoDWk2ItBUc/uWP3+HJw4/J36ZrbBFj7Uhbw+GohEiKc3zL4HC7ECKBcBhRYJpwuLiwIQDAUVRik3fvQWEgB8WFDR+iwmu1tftw5dFDciqhy9Ao+gA6gmuw+p7BYa4aj70Qmi30+KbEZsUiESLocG3tPsycexxKvJylO0rvpHJ5mpr6AP/WeFN1jqkw0g0zl27LVyFHiY3JpjGtFL6btGWW19dhkhREkdy9lV44tPqdkRDpWnkRNufnhAlR8qTI7wcbqJAzT/T/MkOxeaiEYwF0ALeVwwgRfJYGz4YL0BEiuuk07PAFZ5SwEWzsfAFwXVdhcwDk/rtvWkLKC5/hhEh1axueffW1SIRI0GGHEEd8hEhUexkAisO98+dlD+CcAOJpAFA0+0n4ALaGCDwrEFC+qG5tN15fA5/AJPPpg6Gs2nc+p8eNw9bR+1oub7vv9+Thx1KRq0MbyOVTXwpHBVNhSJHa0d9h5QY9S+uQ486HLYUvrAFciQF1eUVt0WAacNgaDaaVYnw/QIsG00qRN0fpUhiXw2HbTXuBBtOCwwb/9AqRMLF0Gmny7j0JpoIaIGkQqK2pAXO7u0F/Qe2unaM4gtPFRRQ4bMIZGHSErFhpdITD4aefKMDPv9UkEjTBYZof90150fimoi6VNHt0CEQq83NWcHgGscf07kn0Uq0q8GQqP0CNsDgKHKa2i2wgx91hxALyfTCdvOYo7+L1a3R73KfQDpPLI5gqXB5yyJehBO+u1AmuFjdwkr66UE6BkSGOsjvcQIQVxVkdvM0PVwCu6xHe5EoDu+8MGWDxiloxOgjS4BebsLVLcxTf9vQ4rXtxYdUHs5GTkCvB6tY2vPDpiNZxVFszJCZ7gO23AygcLVwecuT3vzxPBB2UDuETrKEwP1AtFSL4HtscPyeO0+1pYUNkAAD88MlHuuPvymwQtr2NjUADEAaHTX7IANT+3IGeRw6KMAjJ1daEFLXmA7rGJhx+/J3aTZ0Zt9my9gmtwgw+/Oxzh/WA9M8LZC2lvj2e+QMTSRx4EB9UTLsBEjFCXJuDnEIQHKaEhC4QD7oBlFkgqsCA6/tst7BwqUqlcrZ1MH2NMpFAIskXIdMiVOIcuaE9EG1tCBmaR6JBEKc/XLLOrN22IlTkEre5NE2rAWz1AUZGKCmllRaZEqV8PmZE7YF7cmAiLqESR59AvkwXS+6/p/qAOLRWlPJ1B6UTrQMwgoEV1JCiu+DpNtTW7gdurqrPr0JcUhYV68hPnHz0kNIDOaliZIQoqsMtb27M/+eMEKby4Am4eP1aIKNU9ouwkyanWSexDACLA33aQJiC4Nset9Ha47MmOKr7HB93XrPDG/ULFgqxoVtAIQVGd7WRjDnZ3+98e+MG4QSX7kDp8hCUCIPCK1Aa6YbCSHfj/mifcS1QZvL0MN0ANkBpelU5kc4bQ6NPcKjUnpaj0wLs1mX31XNc1xW8q9uO8uzQg/YjDDqKLejjC1S+UlzYUDhKXUvuslla6szHJvHep5wZWhztc+gAxClyEiT5/Etf/WS1Px9AaMTSJ1BmKuycAbenhMx/AwANfCmM8C6/QQAAAABJRU5ErkJggg==";
// src/ui/sprites/path-summer.png
var path_summer_default = "data:image/png;base64,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";
// src/ui/sprites/path-winter.png
var path_winter_default = "data:image/png;base64,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";
// src/ui/sprites/path.png
var path_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQMAAAAlPW0iAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAAGUExURfiuOf///x4sknUAAAABYktHRAH/Ai3eAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH6goeECkPSaKLQwAAAAxJREFUCNdjYCANAAAAMAABx6qFjgAAAABJRU5ErkJggg==";
// src/ui/sprites/petals.png
var petals_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAgMAAABinRfyAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAAMUExURQAAAP/31//Ljf///4LgIbcAAAABdFJOUwBA5thmAAAAAWJLR0QDEQxM8gAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB+oKHhAvBf8txdsAAAAnSURBVAjXY2BAA6xwAgS4GBgdgESgA5AdABGAEhoMYAIERcAERAMARxoCbTsKMqkAAAAASUVORK5CYII=";
// src/ui/sprites/rock.png
var rock_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAASUExURQAAAAICAtKzfb15WX0+JP///4b8Y5oAAAABdFJOUwBA5thmAAAAAWJLR0QF+G/pxwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB+oKHhAvBf8txdsAAABHSURBVAjXY2DAAgSBAEwrAQGQxWgEYigLMAgrgYEhXgZEsSGDkDGIYQwUcTYGAhMgwwUMDBlEnE1ADEcGRoiIANAuEC3IAABbRxCJgEJP9AAAAABJRU5ErkJggg==";
// src/ui/sprites/snow-ball.png
var snow_ball_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAAYUExURf///wICAvr9/+f0/4nEyyU6SipZY////4IDVVMAAAABdFJOUwBA5thmAAAAAWJLR0QAiAUdSAAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB+oKHhEVLnf6iNUAAABfSURBVAjXY2BAAEZBQQEwLaSkpAhiCRspAVlAAWMlEBCACICERCAMQyhD2ZFBBKzG2JFB1BnIUgYxQoyBwCSQQTTMxcXZODWQgTE0LSwtNBRotGgoEASC7AIxBBBuAAACZRGsaVs5ggAAAABJRU5ErkJggg==";
// src/ui/sprites/snow-pine-small.png
var snow_pine_small_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAAeUExURf///wICAiU6Sj5ybSpZYwICAj5ybSpZYyU6Sv///6D/zTAAAAAFdFJOUwAAAAAAwmsGsQAAAAFiS0dEAIgFHUgAAAAJcEhZcwAACxMAAAsTAQCanBgAAAAHdElNRQfqCh4RFS53+ojVAAAAU0lEQVQI12NgQAahoQJAksnYND0tGMwISytLBQmZpqWlgxhMYWUQhmhaOhAGIDHC4YwyGKMcyCgHMsqBoALEcAczgNpdgIz2EhDDxb2jREUB7gIA6NEfiAbIsIAAAAAASUVORK5CYII=";
// src/ui/sprites/snow-rock.png
var snow_rock_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAAkUExURf///wICAiU6Sj5ybSpZYwICAvr9/4nEyypZYz5ybSU6Sv///26xKY4AAAAFdFJOUwAAAAAAwmsGsQAAAAFiS0dEAIgFHUgAAAAJcEhZcwAACxMAAAsTAQCanBgAAAAHdElNRQfqCh4RFS53+ojVAAAAZklEQVQI12NgAILQUAEgyWRsmp4WDGaEpZWlgoRMy9LSQQymsHIIQzQtvSw9LQDIKEsvLwcxIqaXp1WUgxid09MqZoIYHTPKZ3QAGR1A0AVieIAZQO0uQMaKFhDDxWNVi4oCAwYAALeqIrGV3o3dAAAAAElFTkSuQmCC";
// src/ui/sprites/snow-shrub.png
var snow_shrub_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAAPUExURf///wICAonEy+f0/////3PXVH8AAAABdFJOUwBA5thmAAAAAWJLR0QAiAUdSAAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB+oKHhEVLnf6iNUAAABTSURBVAjXZY3BDYAwDAOvYoEGFoBkARrvvxtNhfhgWbp7OAo0g1lo3s2tY+aXXJ1DHoolqYwctBJ9osEeE5JzLGbO8UrOzSsUQidsqqt6VnLzzwOfOw/W05MiowAAAABJRU5ErkJggg==";
// src/ui/sprites/snow-tree.png
var snow_tree_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgBAMAAACBVGfHAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAAeUExURf///+f0/wICAvr9/4nEy+f0/0cfInMrHpVGJf///3YLTH4AAAACdFJOUwAAdpPNOAAAAAFiS0dEAIgFHUgAAAAJcEhZcwAACxMAAAsTAQCanBgAAAAHdElNRQfqCh4RFS53+ojVAAAA6ElEQVQoz2WRQW6DMBBFDTcwm3RZbBZZ2+UCdMgFEi5QVbBOFWW4AT52/9gB4uRLY+Y/f/GRUCrJGJWp9P4zA9Z79xLYIoWGrAAnm46g8lH1BmwCbgWPQIoIsCtwCWyBGFFFZXfgaq3KJy9EZV6+9w2UOahVkb9DWrIAgPne/ZfRytB5By0Z1fQA7TqXLoJhGHw8BJREPfZzi+NChNqGhk3USW2Dqz5NJ7W6IQi30ElA9YtFnDx/BNyIRjEj5g/guPDIMCM0zWg5hhkoamIBBw5z4PsdgHmWlo8lhMDM08T8+FEAi4Ar9n+hz2VdkB3UgAAAAABJRU5ErkJggg==";
// src/ui/sprites/snow.png
var snow_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQMAAAAlPW0iAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAAGUExURfr9/////39xN78AAAABYktHRAH/Ai3eAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH6goeERUud/qI1QAAAAxJREFUCNdjYCANAAAAMAABx6qFjgAAAABJRU5ErkJggg==";
// src/ui/sprites/snow-meadow.png
var snow_meadow_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHAAAAAQCAYAAADOFPsRAAABK0lEQVR4nO1YwQ6DMAjFZVc/wJv//1Xe/ABvSxZ3WJowRKVAMXZ9p1nH47VQaO1e73WFhtvicbWABhtaAG+OZ5SjaV5gHPrL7DEPAGy40jh9h8c5uxyfWnuOK/GEBRALiAwknjC23fuNnzlfGv8ct5f+sBJqzTxt5o9Dz06ectNdUip4nH+L/vAeGBlIGhiA38lzQUvjRyVWo1VTRiX6w0toNI4WS7qQdNE0SahN3DP9XbsHfnHWEym4hfU48OSiSAnVlBur/TQvm52SwyPZqakf7ZU2/J77Twn9rgE8qtcl7Wmzp8+5oHaSkyTnS+rfor/IDow+cXKnSADblUVr55EwOfqr64H4DpfgcXk+4/Dyl6u/ugAm7H1xsfBJuLz8SnmqDeC/oH3Mvjk+f0wttGMHjMYAAAAASUVORK5CYII=";
// src/ui/sprites/snowfall.png
var snowfall_default = "data:image/png;base64,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";
// src/ui/sprites/sprout.png
var sprout_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAAPUExURQAAAAICAkqVLStuTv///00GTnsAAAABdFJOUwBA5thmAAAAAWJLR0QEj2jZUQAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB+oKHhENAsc5fG8AAAA6SURBVAjXY2AgGTAKCkAYQkoCIB4Do5IiSNhYgFEJLCNsKARhMBqDGYICjMZGIIaQIswIJQE0BgwAAL1wA4Y1EAaEAAAAAElFTkSuQmCC";
// src/ui/sprites/stump.png
var stump_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAAbUExURQAAAAICAvijPeWANfzRntFcLaxEKoYrJv///xun1SsAAAABdFJOUwBA5thmAAAAAWJLR0QIht6VegAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB+oKHhAvBf8txdsAAABhSURBVAjXTcoxDoAwCIVhHHSWRN19phewN+gNNNK5E129/yRUB1n+DwLRb5i/Ak0dYsRomADsq2OLHwJwNkAEjjnZ0+G4EoJjEZFsYLVWZdIXStSLaLWSZKXhtkMuthV6AMXzEujLDViVAAAAAElFTkSuQmCC";
// src/ui/sprites/sunflower.png
var sunflower_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAAbUExURQAAAAICAv/FKd9iJZ4pGUqVLRczHytuTv///07u/NkAAAABdFJOUwBA5thmAAAAAWJLR0QIht6VegAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB+oKHhAvBf8txdsAAABkSURBVAjXRY3BDYAwCEVp4gClsfZccAGNG8gCHhjAIQzr29IY/+W/8AgAtCDCqFSdEhNTdJDTAVeRrbmAhwjVBvSpxDtv0BUS90HW5e4Xg5rZoxFCVst6+Y4hRn9WRk1SZoE/L5R7DTMEW/XvAAAAAElFTkSuQmCC";
// src/ui/sprites/tree.png
var tree_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgBAMAAACBVGfHAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAAbUExURQAAAAICAituTkqVLRUxKFAWDikMCJ4pGf///we/+iUAAAABdFJOUwBA5thmAAAAAWJLR0QIht6VegAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB+oKHhAvBf8txdsAAADsSURBVCjPdZJBboQwDEXxqluSInWNwwWa9AKTiWbdSmM4QbnBiOvPtxNmaNV+hOA/PraR6bp/5Nwvz/yDEKfE/QH4BI2HQDI9IvRawXsj5FPTqIScDzuIo+s7eliAFHvrGHavvYmZlQQ9og7jQUKExQPWWWg4Jw4p4qyNqTyrfgA4z7tFZHRa4gBQRGvq69oTaoCtZgWYY0JEzZRZ5xhK5qZSTtY2W8iAzqGJKR8SQ4G0gl5PtgDc5ApsGSSrXBEpl3Vd7VtkEbnm6fI9iyh4u21QKYvMs3wp2EwLgBh4aWAT6NP2UMkN/q/f4A6wDEusVqxKIgAAAABJRU5ErkJggg==";
// src/ui/sprites/tuft.png
var tuft_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAAPUExURQAAAAICAo28JUqVLf///5Gp8r4AAAABdFJOUwBA5thmAAAAAWJLR0QEj2jZUQAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB+oKHhENAsc5fG8AAAA0SURBVAjXY2CgJhCEEoyKIIaQIKOQIqMAkCEsLGQoJMDAqGQsZGQkZMjAqGxsBASGmCYAAHp4A6lUqR8YAAAAAElFTkSuQmCC";
// src/ui/sprites/twig.png
var twig_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAASUExURf///wICApVGJQICApVGJf///9jbgwwAAAADdFJOUwAAAPp2xN4AAAABYktHRACIBR1IAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH6goeERYF8GsiVgAAAEpJREFUCNdjYMAKmI0FwLSxiYsBmOviKCgIFDIB0koghqCgkBJYhaCSEkyTIUyzswCMARUycXE2NoSoVnEBywK1KSlClDHBGCAAAA29B89UZv0RAAAAAElFTkSuQmCC";
// src/ui/sprites/twigs.png
var twigs_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAASUExURf///wICApVGJQICApVGJf///9jbgwwAAAADdFJOUwAAAPp2xN4AAAABYktHRACIBR1IAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH6goeERYF8GsiVgAAAE1JREFUCNdtzdEJwDAIBNCIHaA6QWMmCLiA6P4zBc581p97oIdj/A+/Hds38GRNgCoFEM97UxMgjwaXLrQ4zAMrWYUWqYv1B7evoTeBA8qLBw9e1r93AAAAAElFTkSuQmCC";
// src/ui/sprites/water.png
var water_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAgMAAABinRfyAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAAMUExURTZ8mEOx3nLE5v///0fT558AAAABYktHRAMRDEzyAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH6goeERUud/qI1QAAABdJREFUCNdjYICDUCBAIVZNZVgFBCQRAPVRIHbyr2sVAAAAAElFTkSuQmCC";
// src/ui/sprites/wood.png
var wood_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAAPUExURf///wICAsFJK0opI////2VmfIUAAAABdFJOUwBA5thmAAAAAWJLR0QAiAUdSAAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB+oKHhEWBfBrIlYAAABUSURBVAjXTYzREYAwCENTJyh0AUkXkLL/blL0POHn3SME+I3IC8r+QcomXSnD0GiDg2cCGYtAiwTafpQUa2c4cwuUEZ4ZL1F9zupWXkcpncBzq7kBen0J1QJn/iUAAAAASUVORK5CYII=";
// src/ui/sprites/woodshed.png
var woodshed_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAgBAMAAACm+uYvAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAASUExURQAAAAICAsFTJp4pGel9N////+riNOoAAAABdFJOUwBA5thmAAAAAWJLR0QF+G/pxwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB+oKHhEVLnf6iNUAAAEtSURBVCjPfZLRkcMwCERtXwOSkgYCKuAMFUSj/mu6XbCTOB+HPSPEEwvIXpa0WmpZy1JrWS62tmp72+vN6hcQM2uuKo9LuDYVE1GY1I+cdQ4VmMrE+3yDhmAfU/jA6rtynyOByJzy6uw+OrYyB156p9gaUYpFooCVQ4kSfcpATngnkDwtYVweCe6pLD0TUSMz1sGE7IcrcVRfO6VHZ1csxBNxL22OHI+HZ66jRAkqjwkZamW1AAhAYkYddscT5ZibfTot5ziAxFzqL4L2S3RL4L5XmLvFpT1j7hlCjNcbAYo88kKgkAlIMSUjUIu6J3CqOW6rqakhI+P4TWInCeQKNAG5fQAhsv8AgvBewLkVgBC9Aj4YfTtAfLUT/MLfPEF+/wR2/nKb+uH9uKTzB8LuXkgB9lv9AAAAAElFTkSuQmCC";
// src/ui/sprites/bush-autumn.png
var bush_autumn_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA10lEQVR4nMWSsQqDMBCG/xwu4lKylYKPID6cdJWs4sNJH0EQN8kibmeHkvQSk7H0QMjl7v/vyyHwqyCik4jOXO7vc8KtvyXzOIpYHDfGuaRgZkWpAgBoYwOxNtYbyvsiJZ73ElNXAjiyZsysALED1zDvJQCgrg5/zr0/MJCNdXVkBc7UUZM7aGN9MSVyHwBM3d3XihD/i15XR/AMSSUpLv9BKqRYG4t2XD2Fck5bf/OT5ZTcdABox/WzRGZWrhDvISduhkUxs1Ix7uv5OCWF3EMzLJf+/8cb85l5nVoc9W8AAAAASUVORK5CYII=";
// src/ui/sprites/bush-round-autumn.png
var bush_round_autumn_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAvklEQVR4nNWSPQ7DIAyFjenGliFSDsCew2XiAJ1yuOwcIBIDW0dMJyg/hkrd+iYw9mc/ZIC/l+CCiBjLOxGxeQAAj9HD67nmszIuEpHgwBU5JVzHBnoJOW69hP28W2gNQMRYJlgvK0irBECu+JuUcZ+pR0mj7tZLuI6tBhCRUMaB9RKsl9PuegkZjohR/GIhSRk3tsCJm64DzGzoJXRv2UIKcDvQfmjaizwBEYnZurZd9/PONV1RuY1tUanU8A1+5mar3YS3bQAAAABJRU5ErkJggg==";
// src/ui/sprites/fern-autumn.png
var fern_autumn_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA6klEQVR4nMVSIQ6DQBCc2xAktkH1CzW1fQI/qOwPsPygP6hE4uAHWAxfQDUoElRTcVTQu87BEWRXHbMzy+xmgH+X2mqIyMTfWmsv1wFZ9LgeHeIt77zDAha3aWxJWTEiuUQAgLIeYXqn+xMiMpkhyoiXfzwf3mj6cPVmR1prFbDAVNOHaPoQZT3OwNcJc8i5a32LuMTaNIaITNbB0iIAewNf3wxUfHl20vShJfEbmA9pV/CJ94q54hNnxWslWmJGEzD423M9gPu8TsANTluCiLWougFVPgBwU6q2Ms/hMqExuNeer0Rk2hN8AMOKbUpmiyzpAAAAAElFTkSuQmCC";
// src/ui/sprites/grass-autumn.png
var grass_autumn_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAHUlEQVR4nGOcv8zjPwMFgIkSzaMGjBowasBgMgAAl6cCrIo7DrgAAAAASUVORK5CYII=";
// src/ui/sprites/grass-spring.png
var grass_spring_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAHUlEQVR4nGNceML+PwMFgIkSzaMGjBowasBgMgAABTsCxwWHx9YAAAAASUVORK5CYII=";
// src/ui/sprites/leaffall.png
var leaffall_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUAAAADwCAYAAABxLb1rAAAEm0lEQVR4nO3dO04jQRQFUGZENjGJV+DYkZcxiXfiZXgnJLMMR45ZgRPiyScAeqxWCRqort87R0KiI7dk6bpefV7d3QEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAp/2o8aHX0+757f/N8fJQ4x0Afpb+wNvwSz0DlFI8AAFaUTwA5yWvEhgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIDBVLkWE+B82E43Qu4fn6rcDeRWOKC42/BLPZciAIGwBCBQ3LzkrVUCAwAAAAAAAAAAAAB0RzOEAK6n3XTOcnO82HEPrxyFG9xt+KWeITIBCIQlAAc3L3mVwACARRDq+Hv+Pc1F/tr/MSqlCiUwxd2GX+oZShGAQFgCkOLmJa8SGAAAAAAAAAAAAAAAFtIMgWo0RKA2R+GoQkMEWiAAgbAEIFVoiAAAAJRnFbgg9/NCW8wBFuJ+XmiPAATCEoCFuJ8XAACgNqvA0BlnqPMxBwgdcYY6LwEIhKUEZkjnw3YaGe0fn4YqE5XA+QhAhnMbfm9GC0HyUAIDYRkBMqSRS+C1RSqxBSAwSa0qjxyCSmAgLAEITHTqBgAAAAAAGIB9gEB3cm10tw0G6Mr8rHfq7PdSAhAISwACXZmXvN8pgc0BwqtITQB4YQQId1rNRyUAgbAEINxpAgAAAAAAAAAAAHTLUTjCcFcwczZCE0LOFkqMQwACYQlAQsjZQgkAAOiVVeCOrNGw08ookZkD7MQaDTutjBKdAATCUgJ3RAk8vtLfR/R7UAQgNCI1BbFmCKamUaKF4H3tF2hV9F9GiMAIMMEv41h6+jFTApclABME4Dh8l7zHKnCCG8IgBiNAhhe9zAMAAAAAAAAAAAAYkY3QK7iedtPG283xYuMtXYi4YdxRuMxuwy/1DC1ao+N4DwQgEJYAzGxe8iqB6YEGIAAAAAAAAAAAAEBvnAXukLPGkIeTIJ1x1hjyEYBAWAKwM84aAwAAAADAMvYBQmHnw3baurR/fLKIVZFVYCjoNvxSz5QlAIGwlMBQWMslcLSrMQUgdGatkEpdhTl6CN7XfgFgudT9vUtCSgONNHOADOl82D6//dV+l9qWNtCIeDWmEpjhpEKvtbm27/hsCZwKPKPAF0pg6MxnR2ab4+VBCZxmBMiQWl5pBYDqjACB5q1VwlsFBpq25jUQAhAISwACTXMNBAAAAAAAAAAAvMtROKC4VppV2AgNFNXSzXgCEAhLCQyZRbtZ7StaKYEFIGQU8Wa1nimBgbAEIGQU8WY1ADpkDjCjViZ2gWWUwJm0tLcJWEYAAmEJwEzmJa8SGNpnDpBFzG8yIiNAPmR+k1EJQCAsAciHzG8CwGAsghCGLi3MKYEJYd6lJdW1hXgEIBCWACQEXVoAAACrwDTMqi1rMwdIk6zaUoIABMISgDTJqi0ArMgiCMO7nnbT/OHmeDGSZKIEZmi34Zd6JjYBCIQlABnavORVAgMAAAAAADC8rBuhbTgFepJtG4wNp0Bv7mu/wKj0soP2ZRsB2nD6n1520IesI8DIoQf0x1G4FehlBwAAAAAAAAAAAAAAAAAAAF/3D5HDwKOHvbxRAAAAAElFTkSuQmCC";
// src/ui/sprites/leaves.png
var leaves_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAd0lEQVR4nGNgoDX4sM/t/4d9bv9xyTMRowimBqcB+BQJOO1iRKZJtoEscK9D5/+9Dh2iDGTCJ4nNEHTDsRqgVHGFEZkm1nCiAU7Nqxw0/q9y0CDJZKxeINUQgpqPBKn9PxKkhtVQ/IkDyQAY22bdLaL04DVkcAEAAqo+lW1v0IcAAAAASUVORK5CYII=";
// src/ui/sprites/meadow-autumn.png
var meadow_autumn_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHAAAAAQCAYAAADOFPsRAAABP0lEQVR4nO1XQRKDMAiknXrwFX6nv+yt//IVHjy0J2ZShBggIaOVU42ybFhC6O31fn7gssPavTeBy3x2CXhwe0QFGtcZlmHq5p/iAMAGC9fpu3Sd89PEtPpzWIgTJmBKIFLIdMOpr/Q7feZiWeJz2LX4h7VQb+VZK38ZJnbzFJueklbicfE9/MPvwEghqTAAv5vnRMP1XIu1cLW00RL+4S002nLJKk0kTZqlCK2Fu8f/9AKiYSKkhGiEkb6tMfBIJvFv0kIt7cbrP67z5qRocEpOKt5HUmtL33PftOBfVcBcv27pTy97+qw16lcySXKxSuN7+Dc5gdETJzdFAvj+slj9ahSMhn9VAbmqjPKXpkZvOy+JlYujmTg5vC4nsKd5i0jC3EsktjwAX9Fo+Z92Cq05AWrwasUtxTndCfw3+wLaWSFaon949AAAAABJRU5ErkJggg==";
// src/ui/sprites/meadow-spring.png
var meadow_spring_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHAAAAAQCAYAAADOFPsRAAABO0lEQVR4nO1Zyw2DMAw1VSU2YAXG6KzdpiuwAhtwak+WUmOHxE4cAXknCNh+8S9GDO/P6wsdp8WjNYEOG3oAT46nl6FxWWGbp2byoR4A2OnCdfosXOfkcmxq5TldqMctgCEBz0CGGw5lpevwnrOlsc/pLsXfrYVaM0+b+ds8sZunummV1AoeZ9/C3/0M9AwkDQzA/+a5oOF6rMVquGraaAp/9xbqjZizUh1JnaZJQm3iHvG/fAAR6AjJITmBkd4tMfBIkPhXaaGadmOVH5d1Vyk5elIqFc8jqbWFz7l3avAvGsBYv64pTw97ep8LKpcySXK2Uu1b+FepQO+Jk5siAWyfLFq5EgmTw79oALms9JKXpkZrO0+xFbOTM3Fy+ppUYEtYk0jSeeRIbHkAtqTJ5T/0vxHnxuUq8G74AcyiINbtLXlfAAAAAElFTkSuQmCC";
// src/ui/sprites/rain.png
var rain_default = "data:image/png;base64,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";
// src/ui/sprites/tree-autumn.png
var tree_autumn_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAACKElEQVR4nMWVv0oDQRDGv1s0BCOCKIRUKcXOxtY3MKksLX0DWytb30CxsbTR5A1sbWxjd5X4j0AwQSLsWYQ5Z/dm9v4k6gdX3O7efr/ZnZkD/llR1Q+NMQl/t9ZW2qv0R2R8fth2xo+u4kogpRYbYxIy3m1Onbn751oKUgai8EIy94193T/XSkEUWmSMSR6OW0WWpto5eyoEEVxA913WnEMA4bwQJ3ii5R15nuhKNJCIG5K0RJsHAvipFJK1NkoBFhFtCIDvzRPVSKR5Y2WMAWTMuRwAWsAf+lgD8cf5+25z6rxLexhgdhf+/fhAIdNQEFIAvE84WUnJuN9eBwCcHtTVyEJAWi5JZZkBkMwXpZPrT/TjoQvAS5D/YBZR/9IevC8AwJJv/Bciv6OreAYgSUo07VRC0eYpU4YhSdVAY1X7hdMJffXuRujsrWXG/frW1LsbAYC4B5Vimo28AkjSh2VFEFy8EtIrsNZG/XhYedOi8sswTULpBDTjeU5mv72OfjxMCEKtAm7IFTKvcjJODvCJ0GloECEA/3rVf0FncxUAMJjM6npr5Sfbk8ayCsHNH1/HKshgMg3/CwgAADobDfTes5sRCEGQORkT9GAydQIAgN7bhwxgjEkutpqzRe9jdDYaahQAcPvpdr5o/JUBJgAfhEOInTDPHAC69Rq69Rqi8Re69XBT8k+By+kDua4BSdCasZoDXJfbrUSb0yTlC+nmZTRXgL+mb4wfQ+9o24MEAAAAAElFTkSuQmCC";
// src/ui/sprites/tree-blossom.png
var tree_blossom_default = "data:image/png;base64,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";
// src/ui/look.ts
var SUMMER = {
	grass: grass_default,
	meadow: meadow_default,
	path: path_summer_default,
	weather: null,
	icy: false,
	tree: tree_default,
	obstacles: {
		bush: bush_default,
		bushRound: bush_round_default,
		fern: fern_default,
		rock: rock_default,
		stump: stump_default,
		sunflower: sunflower_default
	},
	swaying: {
		sunflower: {
			href: bloom_white_default,
			frames: 4
		},
		fern: {
			href: bloom_orange_default,
			frames: 4
		}
	},
	decor: {
		petals: petals_default,
		flower: flower_default,
		tuft: tuft_default,
		clover: clover_default,
		sprout: sprout_default
	}
};
var WINTER = {
	grass: snow_default,
	meadow: snow_meadow_default,
	path: path_winter_default,
	weather: {
		href: snowfall_default,
		drift: .25,
		seconds: 9
	},
	icy: true,
	tree: snow_tree_default,
	obstacles: {
		bush: snow_shrub_default,
		bushRound: snow_ball_default,
		fern: snow_pine_small_default,
		rock: snow_rock_default,
		stump: stump_default,
		sunflower: snow_pine_small_default
	},
	swaying: {},
	decor: {
		petals: null,
		flower: twig_default,
		tuft: twigs_default,
		clover: null,
		sprout: twig_default
	}
};
var SEASONS = {
	spring: {
		...SUMMER,
		grass: grass_spring_default,
		meadow: meadow_spring_default,
		weather: {
			href: rain_default,
			drift: .1,
			seconds: 1.6
		},
		tree: tree_blossom_default,
		swaying: {
			sunflower: {
				href: bloom_white_default,
				frames: 4
			},
			fern: {
				href: bloom_white_default,
				frames: 4
			},
			bushRound: {
				href: bloom_orange_default,
				frames: 4
			}
		}
	},
	summer: SUMMER,
	autumn: {
		...SUMMER,
		grass: grass_autumn_default,
		meadow: meadow_autumn_default,
		weather: {
			href: leaffall_default,
			drift: .5,
			seconds: 12
		},
		tree: tree_autumn_default,
		obstacles: {
			...SUMMER.obstacles,
			bush: bush_autumn_default,
			bushRound: bush_round_autumn_default,
			fern: fern_autumn_default,
			sunflower: bush_autumn_default
		},
		swaying: {},
		decor: {
			petals: leaves_default,
			flower: leaves_default,
			tuft: tuft_default,
			clover: twig_default,
			sprout: leaves_default
		}
	},
	winter: WINTER
};
var seasonOf = (scene) => SEASONS[scene.theme ?? "summer"];
var FLOORS = {
	path: path_default,
	ice: ice_default,
	bridge: bridge_default
};
/** Items as 16×16 tiles; a campfire draws its flame on top once lit. */
var ITEM_TILES = {
	crystal: crystal_default,
	wood: wood_default,
	apple: apple_default,
	fish: fish_default,
	key: key_default,
	campfire: wood_default
};
var PROPS = {
	house: {
		href: house_default,
		width: 4,
		height: 3
	},
	woodshed: {
		href: woodshed_default,
		width: 3,
		height: 2
	}
};
/** Character sheets of the villagers: 64×112, a column per direction, as the hero sheets. */
var NPCS = {
	grandpa: npc_grandpa_default,
	boy: npc_boy_default,
	girl: npc_girl_default,
	villager: npc_villager_default,
	hunter: npc_hunter_default,
	kid: npc_kid_default
};
/** Monster sheets: 64×64, a column per direction and a row per frame. */
var ENEMIES = {
	slime: enemy_slime_default,
	spirit: enemy_spirit_default,
	goblin: enemy_goblin_default,
	skull: enemy_skull_default,
	flame: enemy_flame_default,
	bear: enemy_bear_default,
	toad: enemy_toad_default
};
/** The cells a prop covers, so the scenery leaves them free. */
var propCells = (props) => {
	const cells = /* @__PURE__ */ new Set();
	for (const p of props) {
		const { width, height } = PROPS[p.kind];
		for (let y = Math.floor(p.y); y < Math.ceil(p.y + height); y++) for (let x = Math.floor(p.x); x < Math.ceil(p.x + width); x++) cells.add(cellKey(x, y));
	}
	return cells;
};
// src/ui/scenery.ts
var OBSTACLES = [
	"bush",
	"bush",
	"bush",
	"bushRound",
	"bushRound",
	"fern",
	"rock",
	"stump",
	"sunflower"
];
var MEADOW = [
	"flower",
	"tuft",
	"tuft",
	"clover",
	"sprout",
	"petals"
];
/** Meadow cells around the longest side of the level, at least. */
var MIN_MARGIN = 2;
var TREE_CHANCE = 3;
var MEADOW_TREE_CHANCE = 5;
var PATH_DECOR_CHANCE = 4;
/** Out of 10 meadow cells: 2 get a bush or a stone, 3 a flower or grass, the rest stay plain. */
var MEADOW_OBSTACLES = 2;
var MEADOW_DECOR = 5;
/** A small integer hash of a cell: the same cell always gets the same number. */
var cellHash = (x, y, salt = 0) => {
	let h = Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663) ^ Math.imul(salt + 1, 83492791);
	h = Math.imul(h ^ h >>> 13, 1274126177);
	return (h ^ h >>> 16) >>> 0;
};
var pick = (list, hash) => list[hash % list.length];
var buildScenery = (world, { reserved = /* @__PURE__ */ new Set(), bareWalls = false } = {}) => {
	const longest = Math.max(world.width, world.height);
	const side = longest + 2 * Math.max(MIN_MARGIN, Math.ceil(longest / 6));
	const view = {
		x: -Math.floor((side - world.width) / 2),
		y: -Math.floor((side - world.height) / 2),
		width: side,
		height: side
	};
	const inside = (x, y) => x >= 0 && y >= 0 && x < world.width && y < world.height;
	const blocked = (x, y) => !inside(x, y) || !bareWalls && world.walls.has(cellKey(x, y));
	const taken = new Set(reserved);
	const trees = [];
	for (let y = view.y; y < view.y + view.height - 1; y++) for (let x = view.x; x < view.x + view.width - 1; x++) {
		const block = [
			{
				x,
				y
			},
			{
				x: x + 1,
				y
			},
			{
				x,
				y: y + 1
			},
			{
				x: x + 1,
				y: y + 1
			}
		];
		if (!block.every((c) => blocked(c.x, c.y) && !taken.has(cellKey(c.x, c.y)))) continue;
		const chance = block.some((c) => inside(c.x, c.y)) ? TREE_CHANCE : MEADOW_TREE_CHANCE;
		if (cellHash(x, y, 1) % chance !== 0) continue;
		trees.push({
			x,
			y
		});
		for (const c of block) taken.add(cellKey(c.x, c.y));
	}
	const obstacles = [];
	const decor = [];
	for (let y = view.y; y < view.y + view.height; y++) for (let x = view.x; x < view.x + view.width; x++) {
		if (taken.has(cellKey(x, y))) continue;
		if (!inside(x, y)) {
			const roll = cellHash(x, y, 5) % 10;
			if (roll < MEADOW_OBSTACLES) obstacles.push({
				x,
				y,
				kind: pick(OBSTACLES, cellHash(x, y, 2))
			});
			else if (roll < MEADOW_DECOR) decor.push({
				x,
				y,
				kind: pick(MEADOW, cellHash(x, y, 4))
			});
		} else if (world.walls.has(cellKey(x, y))) {
			if (!bareWalls) obstacles.push({
				x,
				y,
				kind: pick(OBSTACLES, cellHash(x, y, 2))
			});
		} else if (!(world.finish !== null && world.finish.x === x && world.finish.y === y) && cellHash(x, y, 3) % PATH_DECOR_CHANCE === 0) decor.push({
			x,
			y,
			kind: "petals"
		});
	}
	return {
		view,
		trees,
		obstacles,
		decor
	};
};
// src/ui/sprites/bee.png
var bee_default = "data:image/png;base64,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";
// src/ui/sprites/fire.png
var fire_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAAAMCAYAAACdrrgZAAAAAXNSR0IArs4c6QAAAXhJREFUWIXtV9FxwjAMVTJGwgBZAWbgM1v0mIbLFv3MDGQFBgDWcD9aBVmWZBHT0Ovx7nIoepJt9CLHASAIQx/gjVVRoxGGPsB++xZhZdT5ED8uh91i8bTcy2EX8LJyczF/FRXA/emfMU5QfXxWPDgMfZD8AHEBN8dTEmPxyEl5nrFL538l3B1QskV5is9tz1iPxNB5Jf5VHeQSIOoQQ4S2a6DtmqSo6Md7LU/i8d4bI8FTXBSoZCtcgqe8A7DICC4C9Wsc8jie5Oc2jUW/xtP5tf8g2QhvBz0qUFaA5P0AEHUBLz7HzO23gOOIBRU4Ld+cQ+GtNUpdJsVYfE4gjSvuAK1A0UJpYX7saBsj21uSK+RbApq8IXLbNSovdThHTiCMob8AXgHGyb4XCrwqcnN61sceAopch5WgBoDvIycWlR1BZ3uc7hfxR7kYt5Tnwhr5z+ITv7YGYe0Um+Opup5vcD3f1GMu+ikfBVrnfLplaN8I/5n/LXwBCLlHbEKE6ycAAAAASUVORK5CYII=";
// src/ui/sprites/flag.png
var flag_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAQBAMAAABUyWQaAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAYUExURf///wAAAAICAu9OKf14Q68+IGMqRP///3KifBsAAAACdFJOUwAAdpPNOAAAAAFiS0dEAIgFHUgAAAAHdElNRQfqCh4QJxK0J8oUAAAAnklEQVQoz72R2wnDMAxFjTeIJoivOoHUDZIVvIL3H6F6UUpI6V/1czA+0kV2a1Xbl8rbjnuBUALLrUAsKXQtwTq8MFJgdaEDDxcIwzuMOATBM4XJZwgT3mH085uWf2gIye1Km7BY1bagVZ2Ln0UVZIQNaJ+jtShjiwjB3iLCJsVocET4fUTs8ZK0AN/SGOvSGvmSfZYwc/sL/yL8+O4XIOk1mXsr8QcAAAAASUVORK5CYII=";
// src/ui/sprites/grandma.png
var grandma_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAgBAMAAABQs2O3AAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAAqUExURf///9OizgICApFXiwICAubn7v/ds42PnM96X/G0jCM1XS1ZezZ8mP///7Ifc70AAAAEdFJOUwAAAACzk2aaAAAAAWJLR0QN9rRh9QAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB+oKHhItEdRFp0oAAAFwSURBVDjL3ZI/bsIwFIct6gtY8tLbkGIUjDpiwQVygyCHPVLN2MoSeEeqZDgB7sgEOVTfcxxIUdV2rof8/OfzsxV/hPzeqBBiCAkhunE/+VgpNWOMQygBOe4nAJhKZez7HBKqigI6JV/CtyhmXKeM8/OyBRbzHrDsARoAXDAvZdyJlXSlrhUXCMCOhdvCQmwlmziNO7HSfLV9AqAya+dugHQbzDh2LgLCWXkFuBMOMmO51isrLQLO9SpwGGwSAF0E9FrIWvA8HSEmzrRHVOst/GIAKmMmNTfdJWvTAaY2cIdc78MBgVhCAHAO7xor7o8nBLz/aJqT5TYE7/2OyeemOfodj/MSXnEaGgBemb2EEI4ZewTgAhnnJTwW+7H9CeAgRgZ9FAbneD//mzA0AYMkDL0XpgNoK8zo4V6YGxCFicAXYWgShiRh6L0wtE53SMLQThiS60PTANAKg0AUhnbCDKZRmDdiz+CLH5EkDE3CfALSG1vLT8tqZQAAAABJRU5ErkJggg==";
// src/ui/sprites/heart.png
var heart_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAAAQCAYAAACBSfjBAAAACXBIWXMAAAsTAAALEwEAmpwYAAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89+bN/rXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz/SMBAPh+PDwrIsAHvgABeNMLCADATZvAMByH/w/qQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf+bTAICd+Jl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA/g88wAAKCRFRHgg/P9eM4Ors7ONo62Dl8t6r8G/yJiYuP+5c+rcEAAAOF0ftH+LC+zGoA7BoBt/qIl7gRoXgugdfeLZrIPQLUAoOnaV/Nw+H48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl/AV/1s+X48/Pf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H/LcL//wd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s+wM+3zUAsGo+AXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93/+8//UegJQCAZkmScQAAXkQkLlTKsz/HCAAARKCBKrBBG/TBGCzABhzBBdzBC/xgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD/phCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8+Q8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8+xdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR+cQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI+ksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG+Qh8lsKnWJAcaT4U+IoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr+h0uhHdlR5Ol9BX0svpR+iX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK+YTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI+pXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q/pH5Z/YkGWcNMw09DpFGgsV/jvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY/R27iz2qqaE5QzNKM1ezUvOUZj8H45hx+Jx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4/OBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up+6Ynr5egJ5Mb6feeb3n+hx9L/1U/W36p/VHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm+eb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw+6TvZN9un2N/T0HDYfZDqsdWh1+c7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc+Lpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26/uNu5p7ofcn8w0nymeWTNz0MPIQ+BR5dE/C5+VMGvfrH5PQ0+BZ7XnIy9jL5FXrdewt6V3qvdh7xc+9j5yn+M+4zw33jLeWV/MN8C3yLfLT8Nvnl+F30N/I/9k/3r/0QCngCUBZwOJgUGBWwL7+Hp8Ib+OPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Adh5mGLw34MJ4WHhVeGP45wiFga0TGXNXfR3ENz30T6RJZE3ptnMU85ry1KNSo+qi5qPNo3ujS6P8YuZlnM1VidWElsSxw5LiquNm5svt/87fOH4p3iC+N7F5gvyF1weaHOwvSFpxapLhIsOpZATIhOOJTwQRAqqBaMJfITdyWOCnnCHcJnIi/RNtGI2ENcKh5O8kgqTXqS7JG8NXkkxTOlLOW5hCepkLxMDUzdmzqeFpp2IG0yPTq9MYOSkZBxQqohTZO2Z+pn5mZ2y6xlhbL+xW6Lty8elQfJa7OQrAVZLQq2QqboVFoo1yoHsmdlV2a/zYnKOZarnivN7cyzytuQN5zvn//tEsIS4ZK2pYZLVy0dWOa9rGo5sjxxedsK4xUFK4ZWBqw8uIq2Km3VT6vtV5eufr0mek1rgV7ByoLBtQFr6wtVCuWFfevc1+1dT1gvWd+1YfqGnRs+FYmKrhTbF5cVf9go3HjlG4dvyr+Z3JS0qavEuWTPZtJm6ebeLZ5bDpaql+aXDm4N2dq0Dd9WtO319kXbL5fNKNu7g7ZDuaO/PLi8ZafJzs07P1SkVPRU+lQ27tLdtWHX+G7R7ht7vPY07NXbW7z3/T7JvttVAVVN1WbVZftJ+7P3P66Jqun4lvttXa1ObXHtxwPSA/0HIw6217nU1R3SPVRSj9Yr60cOxx++/p3vdy0NNg1VjZzG4iNwRHnk6fcJ3/ceDTradox7rOEH0x92HWcdL2pCmvKaRptTmvtbYlu6T8w+0dbq3nr8R9sfD5w0PFl5SvNUyWna6YLTk2fyz4ydlZ19fi753GDborZ752PO32oPb++6EHTh0kX/i+c7vDvOXPK4dPKy2+UTV7hXmq86X23qdOo8/pPTT8e7nLuarrlca7nuer21e2b36RueN87d9L158Rb/1tWeOT3dvfN6b/fF9/XfFt1+cif9zsu72Xcn7q28T7xf9EDtQdlD3YfVP1v+3Njv3H9qwHeg89HcR/cGhYPP/pH1jw9DBY+Zj8uGDYbrnjg+OTniP3L96fynQ89kzyaeF/6i/suuFxYvfvjV69fO0ZjRoZfyl5O/bXyl/erA6xmv28bCxh6+yXgzMV70VvvtwXfcdx3vo98PT+R8IH8o/2j5sfVT0Kf7kxmTk/8EA5jz/GMzLdsAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAAAa9JREFUeNrsmLtqwzAUhn9LHvIADenQqcS4uSzdS7yHpHPB0BcpyRDom8QvUEH3QvcuwYkJdA70BbKI06GRcRxZjmMSXJIfBPaxPl2OJB9JFhHhosPFLi4oJ1s9cM4LTUUppZV8P1ueiMAYo1GvSWmNes1MO2OMiOjseZtzTi8Pt5h8LBG0u1tenoRLANDbPScetTyec54evUry2nw5vMUYIyklgnYXvlsDDYcAAEsIBNEaAOC7tRiObeEsLtjEP0dz9J36zhIQi1WleM75Tr735Q8AGHljEPHd2pbziqoMWwW+79S1ztMGESVLiFKV/ne+1DZGLc8sJZfv2HMyv+dJLFaV5PdVkmcAMPYc+OHM2Ii0/fXzOw7lJl4+3kO0bvDEruJUhM+Sjn+O5uBvX1tpX14FjH2leFtKaXHOCZ6DSfgXyYJorQ0cutl3Ct40e5K8lBLDu+tCsy/Ji8WqMG+bOrHzU950Pjl6p+RV4028yQlH4dVmUrehnLY6NG11Mjeg6XQMfpP/IH7gNmjgNo7KawtJF6RAU+XnyltZtzHps2H67Jinc+Gty3VWOf0OAC2QNkgOaXWBAAAAAElFTkSuQmCC";
// src/ui/sprites/ninja.png
var ninja_default = "data:image/png;base64,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";
// src/ui/sprites/robot.png
var robot_default = "data:image/png;base64,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";
// src/ui/sprites/rover.png
var rover_default = "data:image/png;base64,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";
// src/ui/sprites/slash.png
var slash_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAAAgCAYAAADaInAlAAABmElEQVR4nO2aSw6DMAxEWfUO3LZ37KLHoRISKkJ8YsczE4iRZtXEdngjp00zTON3SPUreQGpNECKrfc4zWrKAMujyPF5TbMY69zLtQLClh48ywQMg7WsA5PpC2OAssREdANLTFQ3WOJu4uuBo01QGmuBhDTAWewDQGjpYZ9BqzFCRIwOJC8AArB3+IZuoi/WAvIKpnX8lTzbQuRWYt0WtuML5ushW4EeQbWMtUIsgeqZEwjSKz3kCBNEwu9M8gKqTZDw9zvGowxwBpoF/6it17b7WsiV24UebLQJGOBLhQIf+H1ADzXSBOrabih5AWkAhwI7gX4xUfBZJkC3fA/8ChPooUbCR5uAte/XmOGRBlhe7h7o7aMAcWPJCzAZYG2C9edb+E8zAPDfQf3iLPCtR7FR+ZnzyKbRA7bAR83pWPICimEy5rUo8OUQ/QKvICpjRORXvkP3UXDkzylPrOg9XA3CA450LQwL3xNTfSlTnR+h4gshyIOU0tioF3W3LkASBz4zR8phACaYNEFT+kNhJk4DNCN5ASmtflWu/i/AfQDTAAAAAElFTkSuQmCC";
// src/ui/sprites/smoke.png
var smoke_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAAAgCAYAAABEmHeFAAADk0lEQVR4nO2c7U3kMBCGaeOqogV+0gU9UAtF0MHpqslpkSINo/n2O/EuzEqvdEri2GGfxxmHHE/Hn79Pk8lvzfYBTCY7s30AkwkyL8/Phxbp+O0DnvysvL2+HlIQ5/aAtuDX2mz/gU0w+Xh/P7Sg+vCg1uBHSHACTM9Hgeb7+HGaBNu/uEk8/z4/j1s42Ld/n/tokCKcMNHzUaj5PnrMqgQS/JHzRSTY/qVOYrHgluBHSiDBL0lI/42UQIK/Mv4R4IGjgW3BjxQgU155dwKtH2mWlmb/6jWMACD4btG2n/vQobBHZ39JAE8Caaa1BNCAzAqggc63r/wMqQTntu1w3Xs8wOgHKYG1qO0SQCp1qgKc10CvpSLAuW8E4B9p27kdCL8GON/H91fLDQ71VQJQ8KRjJQk4kPzcUQFoaWIds7qWeFwBkh9UGVIVoFpvR5/mcLAy8HsCeG28c0nbowJYYGuPNzPwP6YAhU+HAF4JJEF3lQBSuwz8ngAa/F4JJAkg7b9aALp9P+BgAZB1uDWzRrd3CBAtj+5BgMhx3QJYx+8HfEEAb4buECBTf2fHIZ3Xq/kR8HcKEElFAOv9nkxwcF4oAZ1tzQ+oTw+0yEI0K0G0rxXoVwWgwK6UftFHnZGX264RoAu6YF8cCPRYrMVvtwCWBOc+b71REYEL4B2nwV+5K6Ce9VfaY+FHS6B8ogJUy6CsAJ4ElVkxKwgduzbWDoAQAlAJVuHPLo7x8C+AF+nPexqDEsCCWarTuwSIlDzWuFckiApB7xxam4gY/BUItADrT4GC8HcJIMGuCbAyDnNBawhp1ejIcUjn9I7NjCNaDmkAcvCrEmQTacsluGsBMjO9BB+y368v0rlmxGI0ImF09vfuGFn4K9fD1y+RRW5WskxaBUDA54HgwYcW4NuXXhQAJWG3ANarENU6P9qOLoQ9+FdehWgTADX7RqCQ+uteaFp3n+psWxFAO79Vfu0SQGqzW4DlVyGsmakTfq9vtABa35rw6DFUBIjEA0QrgTyQaZmj5UcI4IHYCaHV965+OZio/qIzOm+zsg6RBKDtLPg8GT1w+RuhWQE8IbTfIEOB6IZQ6/uqfj0oO/rLAr1ahll3Aa+dB370t7zasdZ5IneO+R9hzVBe1V/3NXp3gki7SskSkcBqq/U7fxUCnB1QPlJW6nVJgopA83eBJr82Ufhv2T7YyWRntg9gMtmZ7QOYTHbmPxb7TdJkrHNDAAAAAElFTkSuQmCC";
// src/ui/sprites/well.png
var well_default = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAASUExURQAAAAICAtKzfb15WX0+JP///4b8Y5oAAAABdFJOUwBA5thmAAAAAWJLR0QF+G/pxwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB+oKHhEVLnf6iNUAAABZSURBVAjXZY3LDcAwCEPJBvmwQEkXALJARPafqeYWqT492ZZN9FdpUAV0MbEHhnl4zEp9Hj4Mq7/ZuWGsBNcrkt0aC6KcEVNiS5ibRmDPl1JZBwqcjbxQ+gA7Lg8AGGvyUgAAAABJRU5ErkJggg==";
/** Neighbour bits in the order of the table: top-left, top, top-right, left, right, bottom-left, bottom, bottom-right. */
var NEIGHBOURS = [
	[-1, -1],
	[0, -1],
	[1, -1],
	[-1, 0],
	[1, 0],
	[-1, 1],
	[0, 1],
	[1, 1]
];
/** Mask of the path around a cell → the pieces (indexes in the sheet) that fit. Some masks have a few looks. */
var PIECES = {
	0: [36],
	2: [25],
	8: [35],
	10: [40],
	11: [24],
	16: [33],
	18: [37],
	22: [22],
	24: [34],
	26: [41],
	27: [38],
	30: [39],
	31: [23],
	64: [3],
	66: [14],
	72: [7],
	74: [51],
	75: [18],
	80: [4],
	82: [48],
	86: [15],
	88: [8],
	90: [52],
	91: [43],
	94: [42],
	95: [19],
	104: [2],
	106: [29],
	107: [13],
	120: [5],
	122: [32],
	123: [49],
	126: [20],
	127: [16],
	208: [0],
	210: [26],
	214: [11],
	216: [6],
	218: [31],
	219: [9],
	222: [50],
	223: [17],
	248: [1],
	250: [30],
	251: [27],
	254: [28],
	255: [
		12,
		12,
		12,
		44,
		45
	]
};
/** A corner counts only when both sides next to it are path too: otherwise the grass already rounds it off. */
var pathMask = (isPath, x, y) => {
	let mask = 0;
	NEIGHBOURS.forEach(([dx, dy], bit) => {
		if (isPath(x + dx, y + dy)) mask |= 1 << bit;
	});
	if ((mask & 10) !== 10) mask &= -2;
	if ((mask & 18) !== 18) mask &= -5;
	if ((mask & 72) !== 72) mask &= -33;
	if ((mask & 80) !== 80) mask &= -129;
	return mask;
};
/** The sheet piece for a path cell: its column and row in the path sheet. */
var pathPiece = (isPath, x, y) => {
	const looks = PIECES[pathMask(isPath, x, y)] ?? [12];
	const index = looks[cellHash(x, y, 7) % looks.length] ?? 12;
	return {
		col: index % 11,
		row: Math.floor(index / 11)
	};
};
/** Meadow tiles in sprites/meadow.png: plain grass most of the time, now and then a few blades or a tuft. */
var MEADOW_LOOKS = [
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	1,
	1,
	2,
	2,
	3,
	4,
	5,
	6
];
var meadowTile = (x, y) => MEADOW_LOOKS[cellHash(x, y, 8) % MEADOW_LOOKS.length] ?? 0;
// src/ui/stage/images.ts
/**
* Loaded pictures for the canvas. Each picture loads once per page; `whenLoaded` tells the field to draw again
* when a picture it asked for arrives.
*/
var cache = /* @__PURE__ */ new Map();
var waiting = /* @__PURE__ */ new Set();
/** The picture, ready to draw, or null while it loads. */
var image = (href) => {
	let img = cache.get(href);
	if (img === void 0) {
		img = new Image();
		img.decoding = "async";
		img.onload = () => {
			for (const callback of [...waiting]) callback();
		};
		img.src = href;
		cache.set(href, img);
	}
	return img.complete && img.naturalWidth > 0 ? img : null;
};
/** Calls back each time a picture arrives, until the returned function is called. */
var whenLoaded = (callback) => {
	waiting.add(callback);
	return () => {
		waiting.delete(callback);
	};
};
/** A sheet has a column per direction and a row per frame: rows 0–3 walk, 4 attack, 6 special poses. */
var SHEETS = {
	ninja: {
		href: ninja_default,
		rows: 7
	},
	robot: {
		href: robot_default,
		rows: 7
	},
	rover: {
		href: rover_default,
		rows: 7
	},
	bee: {
		href: bee_default,
		rows: 4
	}
};
/** The sheet of a hero look: its first frame is the hero facing down, for a portrait. */
var heroSheetOf = (skin) => SHEETS[skin].href;
var COLUMN = {
	down: 0,
	up: 1,
	left: 2,
	right: 3
};
var ATTACK_ROW = 4;
var POSE_ROW = 6;
/** Row 6, column 1: the hero holds a thing over the head. */
var HOLD_COLUMN = 1;
var PATH_SHEET_ROWS = 6;
/** A weather picture (320×240) drawn at half size, so the drops match the 16-pixel tiles. */
var WEATHER_W = 160;
var WEATHER_H = 120;
var BOSS_SCALE = 1.5;
var FX = 32;
var HEART = 9;
var HEART_FULL = 0;
var HEART_EMPTY = 4;
var HUD_BACK = "rgba(30, 20, 30, 0.45)";
var DANGER = "#ff3355";
/** Part of a sheet, `w`×`h` from (`sx`, `sy`), drawn at `x`, `y`. Skipped until the picture has loaded. */
var blit = (ctx, href, sx, sy, w, h, x, y, dw = w, dh = h) => {
	const img = image(href);
	if (img !== null) ctx.drawImage(img, sx, sy, w, h, x, y, dw, dh);
};
/** A whole picture at `x`, `y`, at its own size or the given one. */
var picture = (ctx, href, x, y, w, h) => {
	const img = image(href);
	if (img !== null) ctx.drawImage(img, x, y, w ?? img.naturalWidth, h ?? img.naturalHeight);
};
/** A 16×16 piece of a sheet with its top-left corner at x, y. */
var piece = (ctx, href, col, row, x, y) => blit(ctx, href, col * 16, row * 16, 16, 16, x, y);
/** The frame of a looping strip at time `now` (ms), each place starting at its own frame. */
var loopFrame = (now, seconds, frames, offset = 0) => Math.floor((now / 1e3 + offset) / seconds % 1 * frames) % frames;
var ellipse = (ctx, cx, cy, rx, ry, fill) => {
	ctx.beginPath();
	ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
	ctx.fillStyle = fill;
	ctx.fill();
};
var roundRect = (ctx, x, y, w, h, r, fill) => {
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, r);
	ctx.fillStyle = fill;
	ctx.fill();
};
var shadow = (ctx, cx, cy, scale = 1) => ellipse(ctx, cx, cy + 7, 5 * scale, 1.5 * scale, "rgba(0, 0, 0, 0.25)");
/** Grass, meadow, the path or the ice, flowers, bushes that do not sway, trees and props. */
var drawGround = (ctx, { world, scene, season, scenery }) => {
	const { view } = scenery;
	const ground = scene.ground ?? "path";
	const grass = image(season.grass);
	if (grass !== null) for (let y = view.y; y < view.y + view.height; y++) for (let x = view.x; x < view.x + view.width; x++) ctx.drawImage(grass, x * 16, y * 16, 16, 16);
	if (season.meadow !== null) for (let y = view.y; y < view.y + view.height; y++) for (let x = view.x; x < view.x + view.width; x++) {
		const look = meadowTile(x, y);
		if (look !== 0) blit(ctx, season.meadow, look * 16, 0, 16, 16, x * 16, y * 16);
	}
	const { width, height, walls } = world;
	const isPath = (x, y) => x >= 0 && y >= 0 && x < width && y < height && !walls.has(cellKey(x, y));
	for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
		const wall = walls.has(cellKey(x, y));
		if (wall && ground !== "bridge") continue;
		if (ground === "path") {
			const { col, row } = pathPiece(isPath, x, y);
			if (col < 11 && row < PATH_SHEET_ROWS) piece(ctx, season.path, col, row, x * 16, y * 16);
		} else picture(ctx, wall ? water_default : FLOORS[ground], x * 16, y * 16, 16, 16);
	}
	for (const { x, y, kind } of scenery.decor) {
		const href = x < 0 || y < 0 || x >= width || y >= height ? season.decor[kind] : null;
		if (href !== null) picture(ctx, href, x * 16, y * 16, 16, 16);
	}
	for (const { x, y, kind } of scenery.obstacles) if (season.swaying[kind] === void 0) picture(ctx, season.obstacles[kind], x * 16, y * 16, 16, 16);
	for (const { x, y } of scenery.trees) picture(ctx, season.tree, x * 16, y * 16, 32, 32);
	for (const p of scene.props ?? []) {
		const look = PROPS[p.kind];
		picture(ctx, look.href, p.x * 16, p.y * 16, look.width * 16, look.height * 16);
	}
};
var swayingBushes = (ctx, { season, scenery, now, still }) => {
	for (const { x, y, kind } of scenery.obstacles) {
		const look = season.swaying[kind];
		if (look === void 0) continue;
		const frame = still ? 0 : loopFrame(now, .8, look.frames, cellHash(x, y, 9) % 8 * .1);
		blit(ctx, look.href, frame * 16, 0, 16, 16, x * 16, y * 16);
	}
};
/** Villagers look down and shift from foot to foot, each at their own pace. */
var NPC_STEPS = [
	0,
	0,
	0,
	1,
	0,
	0,
	2,
	0
];
var villager = (ctx, npc, now, still) => {
	const cx = npc.x * 16 + 8;
	const cy = npc.y * 16 + 8;
	shadow(ctx, cx, cy);
	const row = still ? 0 : NPC_STEPS[loopFrame(now, 2.4, 8, cellHash(npc.x, npc.y, 11) % 8 * .3)] ?? 0;
	piece(ctx, NPCS[npc.who], 0, row, cx - 8, cy - 8);
};
/** A trap: thin ice with cracks in winter, a pit in the ground otherwise. Once the hero fell in, the ice is broken. */
var trap = (ctx, cx, cy, icy, broken) => {
	if (!icy) {
		ellipse(ctx, cx, cy + 1, 6.5, 5, "#7a4a26");
		ellipse(ctx, cx, cy + 1.5, 5, 3.6, "#2b1a10");
		return;
	}
	ctx.beginPath();
	ctx.roundRect(cx - 7, cy - 6, 14, 12, 5);
	ctx.fillStyle = "#cfe8ff";
	ctx.fill();
	ctx.lineWidth = .6;
	ctx.strokeStyle = "#8fc3ef";
	ctx.stroke();
	if (broken) {
		ellipse(ctx, cx, cy + .5, 5.5, 4, "#1d4f7c");
		return;
	}
	ctx.beginPath();
	ctx.moveTo(cx - 5, cy - 3);
	ctx.lineTo(cx - 1, cy);
	ctx.lineTo(cx - 3, cy + 4);
	ctx.moveTo(cx - 1, cy);
	ctx.lineTo(cx + 3, cy - 1);
	ctx.lineTo(cx + 5, cy + 3);
	ctx.moveTo(cx + 3, cy - 1);
	ctx.lineTo(cx + 4, cy - 4);
	ctx.lineWidth = .7;
	ctx.lineCap = "round";
	ctx.lineJoin = "round";
	ctx.strokeStyle = "#3d74a8";
	ctx.stroke();
};
var flame = (ctx, cx, cy, now, still) => {
	blit(ctx, fire_default, (1 + (still ? 0 : loopFrame(now, .6, 6))) * 8, 0, 8, 12, cx - 4, cy - 10);
};
var finishLook = (ctx, kind, cx, cy, now, still) => {
	const x = cx - 8;
	const y = cy - 8;
	if (kind === "flag") blit(ctx, flag_default, (still ? 0 : loopFrame(now, .6, 4)) * 16, 0, 16, 16, x, y);
	else if (kind === "well") picture(ctx, well_default, x, y, 16, 16);
	else if (kind === "grandma") piece(ctx, grandma_default, 0, 0, x, y);
	else {
		roundRect(ctx, cx - 6, cy - 4, 12, 8, 2, "#9b5b34");
		ctx.lineWidth = 1;
		ctx.strokeStyle = "#5e3216";
		ctx.stroke();
	}
};
var itemLook = (ctx, kind, cx, cy, lit, now, still) => {
	if (kind === "fish") ellipse(ctx, cx, cy + 1, 7, 5, "#1d4f6e");
	const bob = kind === "crystal" && !still ? -1.5 * (.5 - .5 * Math.cos(Math.PI * (now / 1200 % 2))) : 0;
	if (kind === "key") picture(ctx, ITEM_TILES.key, cx - 6, cy - 4, 12, 8);
	else picture(ctx, ITEM_TILES[kind], cx - 8, cy - 8 + bob, 16, 16);
	if (lit) flame(ctx, cx, cy, now, still);
};
/** Hit points over a boss or a strong enemy. */
var hpBar = (ctx, cx, top, hp, maxHp) => {
	const w = Math.min(14, maxHp * 3 + 1);
	roundRect(ctx, cx - w / 2, top, w, 3, 1, "rgba(30, 20, 30, 0.75)");
	roundRect(ctx, cx - w / 2 + .5, top + .5, (w - 1) * hp / maxHp, 2, .5, "#e8434f");
};
/** Draws with a glow or a flash where the browser can filter a canvas; elsewhere just the picture. */
var withFilter = (ctx, filter, draw) => {
	ctx.save();
	if ("filter" in ctx) ctx.filter = filter;
	draw();
	ctx.restore();
};
var enemyFigure = (ctx, pose, hero, now, still) => {
	if (pose.opacity <= 0) return;
	const { enemy } = pose;
	const scale = enemy.boss ? BOSS_SCALE : 1;
	const lx = (hero.x - pose.x) * .3 * pose.lunge;
	const ly = (hero.y - pose.y) * .3 * pose.lunge;
	const cx = (pose.x + lx) * 16 + 8;
	const cy = (pose.y + ly) * 16 + 8;
	ctx.save();
	ctx.globalAlpha = pose.opacity;
	shadow(ctx, cx, cy, scale);
	const row = still ? 0 : loopFrame(now, enemy.boss ? .9 : .6, 4, enemy.id % 4 * .15);
	const swing = enemy.swinging && !still ? -1.5 * Math.abs(Math.sin(now / 350 * Math.PI)) : 0;
	const size = 16 * scale;
	const x = cx - size / 2;
	const y = cy + (1 - scale) * 6 - size / 2 + swing;
	const draw = () => blit(ctx, ENEMIES[enemy.kind], COLUMN[pose.face] * 16, row * 16, 16, 16, x, y, size, size);
	if (pose.flash > 0) withFilter(ctx, `brightness(${1 + 1.5 * pose.flash})`, draw);
	else if (enemy.swinging) withFilter(ctx, `drop-shadow(0 0 1.2px ${DANGER})`, draw);
	else draw();
	if (enemy.boss || enemy.maxHp > 1) hpBar(ctx, cx, cy - 8 - 4 - (scale - 1) * 12, Math.max(0, enemy.hp), enemy.maxHp);
	ctx.restore();
};
var heroFigure = (ctx, hero, skin, now) => {
	const sheet = SHEETS[skin];
	const cx = hero.x * 16 + 8;
	const cy = hero.y * 16 + 8;
	let col = COLUMN[hero.dir];
	let row = 0;
	if (hero.act === "walk" || hero.act === "bump") row = Math.floor(hero.progress * 4) % 4;
	if (hero.act === "attack" && sheet.rows > ATTACK_ROW) row = ATTACK_ROW;
	if (hero.act === "take" && sheet.rows > POSE_ROW) {
		row = POSE_ROW;
		col = HOLD_COLUMN;
	}
	const scale = 1 - .4 * hero.fallen;
	ctx.save();
	ctx.globalAlpha = 1 - .65 * hero.fallen;
	shadow(ctx, cx, cy, scale);
	const shake = hero.crashed ? Math.sin(now / 40) * 1.2 : 0;
	const lean = hero.act === "attack" ? Math.sin(Math.PI * hero.progress) * 2 : 0;
	const d = {
		down: [0, 1],
		up: [0, -1],
		left: [-1, 0],
		right: [1, 0]
	}[hero.dir];
	const size = 16 * scale;
	const x = cx - size / 2 + shake + (d[0] ?? 0) * lean;
	const y = cy - size / 2 + 3 * hero.fallen + (d[1] ?? 0) * lean;
	const draw = () => blit(ctx, sheet.href, col * 16, row * 16, 16, 16, x, y, size, size);
	if (hero.act === "hurt") withFilter(ctx, `brightness(${1 + 1.2 * Math.sin(Math.PI * hero.progress)}) drop-shadow(0 0 1.5px ${DANGER})`, draw);
	else if (hero.crashed) withFilter(ctx, `drop-shadow(0 0 1.5px ${DANGER})`, draw);
	else draw();
	ctx.restore();
};
var bubble = (ctx, text, cx, cy, progress) => {
	ctx.save();
	ctx.globalAlpha = Math.min(1, 4 * (1 - progress));
	const y = cy - 8 - 3 - 4 * progress;
	roundRect(ctx, cx - 4.5, y - 7, 9, 8, 3, "rgba(255, 255, 255, 0.92)");
	ctx.fillStyle = "#3a2a3a";
	ctx.font = "700 6.5px system-ui, sans-serif";
	ctx.textAlign = "center";
	ctx.fillText(text, cx, y - .8);
	ctx.restore();
};
var effect = (ctx, fx, item) => {
	const cx = fx.x * 16 + 8;
	const cy = fx.y * 16 + 8;
	if (fx.kind === "slash" || fx.kind === "smoke") {
		const frames = fx.kind === "slash" ? 4 : 6;
		const frame = Math.min(frames - 1, Math.floor(fx.progress * frames));
		blit(ctx, fx.kind === "slash" ? slash_default : smoke_default, frame * FX, 0, FX, FX, cx - FX / 2, cy - FX / 2);
		return;
	}
	if (fx.kind === "lift") {
		if (item === "campfire") return;
		ctx.save();
		ctx.globalAlpha = 1 - Math.max(0, fx.progress - .6) / .4;
		picture(ctx, ITEM_TILES[item], cx - 6, cy - 8 - 9 * Math.min(1, fx.progress * 2), 12, item === "key" ? 8 : 12);
		ctx.restore();
		return;
	}
	bubble(ctx, fx.kind === "question" ? "?" : "z", cx, cy, fx.progress);
};
var weather = (ctx, { season, scenery, now }) => {
	const w = season.weather;
	const img = w === null ? null : image(w.href);
	if (w === null || img === null) return;
	const { view } = scenery;
	const phase = now / 1e3 / w.seconds % 1;
	const ox = WEATHER_W * w.drift * phase % WEATHER_W;
	const oy = WEATHER_H * phase % WEATHER_H;
	const left = view.x * 16;
	const top = view.y * 16;
	for (let y = top - WEATHER_H + oy; y < top + view.height * 16; y += WEATHER_H) for (let x = left - WEATHER_W + ox; x < left + view.width * 16; x += WEATHER_W) ctx.drawImage(img, x, y, WEATHER_W, WEATHER_H);
};
/** A dark plate with a line of white text, for the steps and the counter. */
var plate = (ctx, text, x, y) => {
	ctx.font = "700 6.5px system-ui, sans-serif";
	const w = Math.ceil(ctx.measureText(text).width) + 4;
	roundRect(ctx, x - 1.5, y - 1.5, w, 12, 3, HUD_BACK);
	ctx.fillStyle = "#fff";
	ctx.textAlign = "left";
	ctx.fillText(text, x + 1, y + HEART - 1.5);
};
var hud = (ctx, { pose, scenery, counter }) => {
	const { world } = pose;
	const x = scenery.view.x * 16 + 3;
	let y = scenery.view.y * 16 + 3;
	if (world.enemies.length > 0) {
		roundRect(ctx, x - 1.5, y - 1.5, world.maxHearts * 10 + 2, 12, 3, HUD_BACK);
		for (let i = 0; i < world.maxHearts; i++) blit(ctx, heart_default, (i < world.hearts ? HEART_FULL : HEART_EMPTY) * 16, 0, 16, 16, x + i * 10, y, HEART, HEART);
		y += 13;
	}
	if (world.energy !== null) {
		plate(ctx, `кроків: ${world.energy}`, x, y);
		y += 13;
	}
	if (counter !== void 0) plate(ctx, `лічильник: ${counter}`, x, y);
};
/** Everything that moves or changes, over the ground. */
var drawActors = (ctx, input) => {
	const { pose, scene, season, now, still, skin } = input;
	const { world } = pose;
	const item = scene.item ?? "crystal";
	swayingBushes(ctx, input);
	for (const npc of scene.npcs ?? []) villager(ctx, npc, now, still);
	for (const key of world.traps) {
		const [tx = 0, ty = 0] = key.split(",").map(Number);
		trap(ctx, tx * 16 + 8, ty * 16 + 8, season.icy, world.fell && Math.round(pose.hero.x) === tx && Math.round(pose.hero.y) === ty);
	}
	if (world.finish !== null) finishLook(ctx, scene.finish ?? "flag", world.finish.x * 16 + 8, world.finish.y * 16 + 8, now, still);
	for (const { x, y } of input.items) {
		const taken = !world.crystals.has(cellKey(x, y));
		if (taken && item !== "campfire") continue;
		itemLook(ctx, item, x * 16 + 8, y * 16 + 8, taken, now, still);
	}
	const figures = [...pose.enemies.map((e) => ({
		y: e.y,
		draw: () => enemyFigure(ctx, e, pose.hero, now, still)
	})), {
		y: pose.hero.y + .01,
		draw: () => heroFigure(ctx, pose.hero, skin, now)
	}];
	for (const f of figures.sort((a, b) => a.y - b.y)) f.draw();
	for (const fx of pose.effects) effect(ctx, fx, item);
	weather(ctx, still ? {
		...input,
		now: 0
	} : input);
	hud(ctx, input);
};
// src/ui/Hud.tsx
/** The levels of the chapter as squares: passed, this one, still ahead. */
var ChapterLevels = ({ ids, current, progress }) => {
	const place = ids.indexOf(current) + 1;
	return /* @__PURE__ */ jsx("ol", {
		className: "eb-hud-levels",
		"aria-label": `Рівень ${place} з ${ids.length}`,
		children: ids.map((id, i) => {
			const done = (progress[id] ?? 0) > 0;
			return /* @__PURE__ */ jsx("li", {
				className: id === current ? "eb-hud-dot eb-hud-dot-now" : done ? "eb-hud-dot eb-hud-dot-done" : "eb-hud-dot",
				"aria-hidden": "true",
				children: i + 1
			}, id);
		})
	});
};
/** The hero's portrait, level and XP to the next level. */
var HeroBadge = ({ skin, total }) => {
	const hero = heroLevelOf(total);
	const share = hero.next === null ? 1 : (total - hero.from) / (hero.next - hero.from);
	return /* @__PURE__ */ jsxs("div", {
		className: "eb-hud-hero",
		children: [/* @__PURE__ */ jsx("span", {
			className: "eb-avatar",
			"aria-hidden": "true",
			children: /* @__PURE__ */ jsx("span", { style: { backgroundImage: `url(${heroSheetOf(skin)})` } })
		}), /* @__PURE__ */ jsxs("div", {
			className: "eb-hud-xp",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "eb-hud-xp-line",
				children: [/* @__PURE__ */ jsxs("span", { children: ["Рівень ", hero.level] }), /* @__PURE__ */ jsxs("b", { children: [
					total,
					hero.next === null ? "" : ` / ${hero.next}`,
					" XP"
				] })]
			}), /* @__PURE__ */ jsx("div", {
				className: "eb-bar",
				role: "img",
				"aria-label": `Рівень героя ${hero.level}, ${total} XP${hero.next === null ? "" : ` з ${hero.next}`}`,
				children: /* @__PURE__ */ jsx("span", { style: { width: `${Math.round(share * 100)}%` } })
			})]
		})]
	});
};
/**
* The bar over the game: the way back to the map, the chapter with its levels, and the hero with the XP. A level
* outside the course (a teacher's task) shows its title instead of the chapter.
*/
var Hud = ({ level, skin, xpTotal, progress, onMap }) => {
	const chapter = chapterOf(level.id);
	const number = chapter === void 0 ? 0 : chapters.indexOf(chapter) + 1;
	return /* @__PURE__ */ jsxs("header", {
		className: "eb-hud",
		children: [
			onMap !== void 0 && /* @__PURE__ */ jsx("button", {
				type: "button",
				className: "eb-btn eb-btn-wood eb-btn-small",
				onClick: onMap,
				children: "← Мапа"
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "eb-hud-chapter",
				children: [/* @__PURE__ */ jsx("p", {
					className: "eb-hud-title",
					children: chapter === void 0 ? "Завдання" : `Глава ${number} · ${chapter.title}`
				}), chapter !== void 0 && /* @__PURE__ */ jsx(ChapterLevels, {
					ids: chapter.levels,
					current: level.id,
					progress
				})]
			}),
			xpTotal !== void 0 && /* @__PURE__ */ jsx(HeroBadge, {
				skin,
				total: xpTotal
			})
		]
	});
};
// src/ui/Quest.tsx
/** The task of the level on parchment: what to do, the goals that tick as the hero meets them, and the star sizes. */
var Quest = ({ level, start, world }) => /* @__PURE__ */ jsxs("section", {
	className: "eb-quest eb-frame eb-parchment",
	"aria-label": "Завдання",
	children: [
		level.title !== "" && /* @__PURE__ */ jsx("h2", { children: level.title }),
		level.task.map((line) => /* @__PURE__ */ jsx("p", { children: line }, line)),
		/* @__PURE__ */ jsx("ul", {
			className: "eb-goals",
			children: level.goals.map((g) => {
				const met = goalMet(world, g);
				return /* @__PURE__ */ jsxs("li", {
					className: met ? "eb-goal eb-goal-ok" : "eb-goal",
					children: [
						/* @__PURE__ */ jsx("span", {
							className: "eb-goal-tick",
							"aria-hidden": "true",
							children: met ? "✓" : ""
						}),
						describeGoal(g, start, level.scene),
						met && /* @__PURE__ */ jsx("span", {
							className: "eb-visually-hidden",
							children: " (виконано)"
						})
					]
				}, g.type);
			})
		}),
		level.stars !== void 0 && /* @__PURE__ */ jsxs("p", {
			className: "eb-quest-stars",
			children: [
				"Зірки за розмір програми: ★★★ до ",
				level.stars.three,
				" · ★★ до ",
				level.stars.two,
				" · ★ будь-яка"
			]
		})
	]
});
// src/ui/stage/playback.ts
/**
* What the field shows at a moment of a run. Pure: the same run and the same moment always give the same picture,
* so the timeline can jump anywhere, play backwards or stop between two actions.
*
* Time `t` counts actions: at a whole `t = k` the world is as after `k` actions (0 is the start); between `k` and
* `k + 1` frame `k` plays. In a frame the hero acts first (`HERO_PART`), then the enemies (`ENEMY_PART`); the two
* overlap a little so the run flows.
*/
var HERO_PART = [0, .6];
var ENEMY_PART = [.45, 1];
var clamp01 = (n) => Math.min(1, Math.max(0, n));
/** Progress inside a part of the frame. */
var within = (p, [from, to]) => clamp01((p - from) / (to - from));
var ease = (p) => p * p * (3 - 2 * p);
var lerp = (a, b, p) => a + (b - a) * p;
/** Where an enemy looks: at the hero when it comes for them, along its way when it walks. */
var faceOf = (enemy, hero) => {
	const dx = hero.x - enemy.x;
	const dy = hero.y - enemy.y;
	if (Math.abs(dx) + Math.abs(dy) <= Math.max(1, enemy.sight)) return Math.abs(dx) >= Math.abs(dy) ? dx > 0 ? "right" : "left" : dy > 0 ? "down" : "up";
	if (enemy.walk === "across") return enemy.heading === 1 ? "right" : "left";
	if (enemy.walk === "updown") return enemy.heading === 1 ? "down" : "up";
	return "down";
};
var restingHero = (world) => ({
	x: world.hero.x,
	y: world.hero.y,
	dir: world.hero.dir,
	act: "idle",
	progress: 0,
	crashed: world.crashed,
	fallen: world.fell ? 1 : 0
});
var restingEnemies = (world) => world.enemies.map((e) => ({
	id: e.id,
	enemy: e,
	x: e.x,
	y: e.y,
	face: faceOf(e, world.hero),
	opacity: isAlive(e) ? 1 : 0,
	flash: 0,
	lunge: 0
}));
/** The world before frame `i`: the start, or the world after the frame before. */
var worldBefore = (start, frames, i) => i === 0 ? start : frames[i - 1]?.world ?? start;
var has = (events, type) => events.some((e) => e.type === type);
/** The hero's own action, then a flash when an enemy hits them in the enemies' part of the frame. */
var heroPose = (before, after, events, p) => {
	const pose = heroActionPose(before, after, events, p);
	const ep = within(p, ENEMY_PART);
	return has(events, "heroHurt") && ep > .35 && ep < 1 ? {
		...pose,
		act: "hurt",
		progress: ep
	} : pose;
};
var heroActionPose = (before, after, events, p) => {
	const hp = within(p, HERO_PART);
	const base = {
		...restingHero(before),
		crashed: false,
		fallen: 0
	};
	const moved = events.find((e) => e.type === "heroMoved");
	const fell = has(events, "heroFell");
	if (moved?.type === "heroMoved") {
		const walk = fell ? clamp01(hp * 2) : hp;
		const pos = ease(walk);
		const fallen = fell ? clamp01(hp * 2 - 1) : 0;
		return {
			...base,
			x: lerp(moved.from.x, moved.to.x, pos),
			y: lerp(moved.from.y, moved.to.y, pos),
			act: fallen > 0 ? "fall" : walk < 1 ? "walk" : "idle",
			progress: fallen > 0 ? fallen : walk,
			fallen
		};
	}
	const turned = events.find((e) => e.type === "heroTurned");
	if (turned?.type === "heroTurned") return {
		...base,
		dir: hp < .5 ? turned.from : turned.to
	};
	const bumped = events.find((e) => e.type === "heroBumped");
	if (bumped?.type === "heroBumped") {
		const push = .3 * Math.sin(Math.PI * Math.min(1, hp * 1.4));
		return {
			...base,
			x: base.x + (bumped.into.x - base.x) * push,
			y: base.y + (bumped.into.y - base.y) * push,
			act: "bump",
			progress: hp,
			crashed: hp > .35
		};
	}
	if (has(events, "heroSwung")) return {
		...base,
		act: hp > 0 && hp < 1 ? "attack" : "idle",
		progress: hp
	};
	if (has(events, "itemTaken")) return {
		...base,
		act: hp > .15 && hp < .95 ? "take" : "idle",
		progress: hp
	};
	return {
		...base,
		crashed: after.crashed && hp > .35
	};
};
var enemyPoses = (before, after, events, p, hero) => {
	const hp = within(p, HERO_PART);
	const ep = within(p, ENEMY_PART);
	return after.enemies.map((e) => {
		const old = before.enemies.find((b) => b.id === e.id) ?? e;
		const moved = events.find((ev) => ev.type === "enemyMoved" && ev.id === e.id);
		const down = events.some((ev) => ev.type === "enemyDown" && ev.id === e.id);
		const hit = events.some((ev) => ev.type === "enemyHit" && ev.id === e.id);
		const hits = events.some((ev) => ev.type === "heroHurt" && ev.by === e.id);
		const pos = moved?.type === "enemyMoved" ? ease(ep) : 1;
		const x = moved?.type === "enemyMoved" ? lerp(moved.from.x, moved.to.x, pos) : e.x;
		const y = moved?.type === "enemyMoved" ? lerp(moved.from.y, moved.to.y, pos) : e.y;
		const struckNow = (down || hit) && hp > .4;
		const shownHp = struckNow ? e.hp : old.hp;
		const swinging = ep > 0 || struckNow ? e.swinging : old.swinging;
		const opacity = down ? 1 - clamp01((hp - .4) / .4) : isAlive(old) ? 1 : 0;
		const struck = down || hit ? clamp01((hp - .35) / .3) : 0;
		return {
			id: e.id,
			enemy: {
				...e,
				x,
				y,
				hp: shownHp,
				swinging
			},
			x,
			y,
			face: faceOf({
				...e,
				x: Math.round(x),
				y: Math.round(y)
			}, {
				x: Math.round(hero.x),
				y: Math.round(hero.y)
			}),
			opacity,
			flash: struck > 0 && struck < 1 ? 1 - struck : 0,
			lunge: hits ? Math.sin(Math.PI * clamp01((ep - .2) / .6)) : 0
		};
	});
};
var effectsOf = (before, events, p) => {
	const hp = within(p, HERO_PART);
	const out = [];
	const after = (start, length) => clamp01((hp - start) / length);
	for (const ev of events) {
		if (ev.type === "enemyHit" || ev.type === "enemyDown") {
			const enemy = before.enemies.find((e) => e.id === ev.id);
			if (enemy === void 0) continue;
			const slash = after(.3, .5);
			if (slash > 0 && slash < 1) out.push({
				kind: "slash",
				x: enemy.x,
				y: enemy.y,
				progress: slash
			});
			const smoke = after(.55, .45);
			if (ev.type === "enemyDown" && smoke > 0 && smoke < 1) out.push({
				kind: "smoke",
				x: enemy.x,
				y: enemy.y,
				progress: smoke
			});
		}
		if (ev.type === "itemTaken") {
			const lift = after(.1, .9);
			if (lift > 0 && lift < 1) out.push({
				kind: "lift",
				x: ev.at.x,
				y: ev.at.y,
				progress: lift
			});
		}
		if (ev.type === "nothingToTake") {
			const q = after(.1, .9);
			if (q > 0 && q < 1) out.push({
				kind: "question",
				x: ev.at.x,
				y: ev.at.y,
				progress: q
			});
		}
		if (ev.type === "heroTired") {
			const z = after(.1, .9);
			if (z > 0 && z < 1) out.push({
				kind: "tired",
				x: before.hero.x,
				y: before.hero.y,
				progress: z
			});
		}
	}
	return out;
};
/** The picture of a run at time `t` (see the top of the file). */
var poseAt = (start, frames, t) => {
	const end = frames.length;
	const time = Math.min(end, Math.max(0, Number.isFinite(t) ? t : 0));
	const i = Math.floor(time);
	const p = time - i;
	if (p === 0) {
		const world = worldBefore(start, frames, i);
		return {
			world,
			hero: restingHero(world),
			enemies: restingEnemies(world),
			effects: [],
			frame: frames[i - 1] ?? null
		};
	}
	const frame = frames[i];
	const before = worldBefore(start, frames, i);
	const after = frame.world;
	const hero = heroPose(before, after, frame.events, p);
	const enemies = enemyPoses(before, after, frame.events, p, hero);
	const hpart = within(p, HERO_PART);
	const epart = within(p, ENEMY_PART);
	return {
		world: {
			...before,
			crystals: hpart > .5 ? after.crystals : before.crystals,
			energy: hpart > .3 ? after.energy : before.energy,
			hearts: epart > .5 ? after.hearts : before.hearts,
			fell: hero.fallen > .5 ? after.fell : before.fell
		},
		hero,
		enemies,
		effects: effectsOf(before, frame.events, p),
		frame
	};
};
/** The frame whose block lights up at time `t`: the one playing, or the last one played. */
var frameIndexAt = (frames, t) => {
	if (frames.length === 0 || t <= 0) return -1;
	return Math.min(frames.length - 1, Math.ceil(t) - 1);
};
// src/ui/stage/Stage.tsx
/** The largest number of screen pixels per picture pixel: more only costs memory. */
var MAX_SCALE = 6;
/** Whether the viewer asked for less motion: then nothing moves between two cells and nothing loops. */
var useReducedMotion = () => {
	const [reduced, setReduced] = useState(false);
	useEffect(() => {
		if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
		const query = window.matchMedia("(prefers-reduced-motion: reduce)");
		setReduced(query.matches);
		const onChange = () => setReduced(query.matches);
		query.addEventListener("change", onChange);
		return () => query.removeEventListener("change", onChange);
	}, []);
	return reduced;
};
var DIRECTION_NAMES = {
	up: "вгору",
	right: "праворуч",
	down: "вниз",
	left: "ліворуч"
};
/** What a screen reader says about the field. */
var describe = (world) => {
	const parts = [`Герой на клітинці ${world.hero.x}, ${world.hero.y}, дивиться ${DIRECTION_NAMES[world.hero.dir]}.`];
	if (world.totalCrystals > 0) parts.push(`Залишилось узяти: ${world.crystals.size}.`);
	if (world.enemies.length > 0) parts.push(`Сердечок: ${world.hearts} з ${world.maxHearts}.`);
	if (world.energy !== null) parts.push(`Кроків залишилось: ${world.energy}.`);
	return `Поле гри. ${parts.join(" ")}`;
};
var NO_FRAMES = [];
/** The value of the program's counter after a frame, on levels with the «лічильник» block. */
var counterOf = (frame) => {
	const value = frame === null ? void 0 : frame.counter;
	return typeof value === "string" ? value : void 0;
};
/**
* The game field on a canvas. The ground is drawn once; the hero, the enemies and the effects are drawn on every
* animation frame from `poseAt(start, frames, time)`, so the timeline can stop or jump anywhere.
*/
var Stage = ({ start, frames = NO_FRAMES, time = 0, skin, scene = {} }) => {
	const canvasRef = useRef(null);
	const still = useReducedMotion();
	const season = seasonOf(scene);
	const { width, height, walls, finish } = start;
	const props = scene.props;
	const npcs = scene.npcs;
	const ground = scene.ground ?? "path";
	const scenery = useMemo(() => {
		const reserved = new Set(propCells(props ?? []));
		for (const n of npcs ?? []) reserved.add(cellKey(n.x, n.y));
		return buildScenery({
			width,
			height,
			walls,
			finish
		}, {
			reserved,
			bareWalls: ground === "bridge"
		});
	}, [
		width,
		height,
		walls,
		finish,
		props,
		npcs,
		ground
	]);
	const items = useMemo(() => [...start.crystals].map((key) => {
		const [x = 0, y = 0] = key.split(",").map(Number);
		return {
			x,
			y
		};
	}), [start.crystals]);
	const live = useRef({
		start,
		frames,
		time,
		skin,
		scene,
		season,
		scenery,
		items,
		still
	});
	live.current = {
		start,
		frames,
		time,
		skin,
		scene,
		season,
		scenery,
		items,
		still
	};
	const settledTime = Math.ceil(time);
	const label = useMemo(() => describe(poseAt(start, frames, settledTime).world), [
		start,
		frames,
		settledTime
	]);
	useEffect(() => {
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext("2d") ?? null;
		if (canvas === null || ctx === null) return;
		const { view } = scenery;
		const viewW = view.width * 16;
		const viewH = view.height * 16;
		const groundCanvas = document.createElement("canvas");
		let scale = 0;
		let groundReady = false;
		const fit = () => {
			const box = canvas.getBoundingClientRect();
			const dpr = window.devicePixelRatio || 1;
			const next = Math.min(MAX_SCALE, Math.max(1, Math.ceil(box.width * dpr / viewW)));
			if (next === scale) return;
			scale = next;
			canvas.width = viewW * scale;
			canvas.height = viewH * scale;
			groundCanvas.width = canvas.width;
			groundCanvas.height = canvas.height;
			groundReady = false;
		};
		const paintGround = () => {
			const g = groundCanvas.getContext("2d");
			if (g === null) return;
			g.setTransform(1, 0, 0, 1, 0, 0);
			g.clearRect(0, 0, groundCanvas.width, groundCanvas.height);
			g.imageSmoothingEnabled = false;
			g.setTransform(scale, 0, 0, scale, -view.x * 16 * scale, -view.y * 16 * scale);
			const s = live.current;
			drawGround(g, {
				world: s.start,
				scene: s.scene,
				season: s.season,
				scenery: s.scenery
			});
			groundReady = true;
		};
		let frame = 0;
		const paint = (now) => {
			fit();
			if (!groundReady) paintGround();
			const s = live.current;
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.imageSmoothingEnabled = false;
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.drawImage(groundCanvas, 0, 0);
			ctx.setTransform(scale, 0, 0, scale, -view.x * 16 * scale, -view.y * 16 * scale);
			const t = s.still && s.time % 1 !== 0 ? Math.ceil(s.time) : s.time;
			const pose = poseAt(s.start, s.frames, t);
			drawActors(ctx, {
				pose,
				scene: s.scene,
				season: s.season,
				scenery: s.scenery,
				skin: s.skin,
				items: s.items,
				now,
				still: s.still,
				counter: counterOf(pose.frame)
			});
			frame = requestAnimationFrame(paint);
		};
		frame = requestAnimationFrame(paint);
		const stop = whenLoaded(() => {
			groundReady = false;
		});
		return () => {
			cancelAnimationFrame(frame);
			stop();
		};
	}, [scenery]);
	return /* @__PURE__ */ jsx("canvas", {
		ref: canvasRef,
		className: "eb-field",
		role: "img",
		"aria-label": label
	});
};
// src/ui/Timeline.tsx
/** Speeds of the playback, as a share of the normal pace. */
var RATES = [
	.5,
	1,
	2,
	4
];
/**
* Plays a run: moves the time on each animation frame while playing. `onEnd` runs the first time a run reaches
* its last action; a later jump to the end does not run it again.
*/
var usePlayer = (msPerAction, onEnd) => {
	const [time, setTime] = useState(0);
	const [playing, setPlaying] = useState(false);
	const [rate, setRate] = useState(1);
	const length = useRef(0);
	const ended = useRef(true);
	const timeRef = useRef(0);
	const onEndRef = useRef(onEnd);
	onEndRef.current = onEnd;
	const moveTo = useCallback((t) => {
		const next = Math.min(length.current, Math.max(0, t));
		timeRef.current = next;
		setTime(next);
		if (next >= length.current && !ended.current) {
			ended.current = true;
			setPlaying(false);
			onEndRef.current();
		}
	}, []);
	useEffect(() => {
		if (!playing) return;
		let last = performance.now();
		let frame = 0;
		const tick = (now) => {
			const dt = Math.min(100, now - last);
			last = now;
			moveTo(timeRef.current + dt * rate / msPerAction);
			if (timeRef.current < length.current) frame = requestAnimationFrame(tick);
			else setPlaying(false);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [
		playing,
		rate,
		msPerAction,
		moveTo
	]);
	return {
		time,
		playing,
		rate,
		play: useCallback(() => {
			if (timeRef.current >= length.current) moveTo(0);
			setPlaying(true);
		}, [moveTo]),
		pause: useCallback(() => setPlaying(false), []),
		seek: useCallback((t) => {
			setPlaying(false);
			moveTo(t);
		}, [moveTo]),
		step: useCallback((by) => {
			setPlaying(false);
			const t = timeRef.current;
			moveTo(by === 1 ? Math.floor(t) + 1 : Math.ceil(t) - 1);
		}, [moveTo]),
		setRate,
		restart: useCallback((n) => {
			length.current = n;
			ended.current = false;
			moveTo(0);
			setPlaying(n > 0);
		}, [moveTo])
	};
};
/** The controls under the field: play or pause, a step back and forward, the time slider and the speed. */
var Timeline = ({ player, length }) => {
	const { time, playing } = player;
	const done = Math.min(length, Math.floor(time + 1e-6));
	return /* @__PURE__ */ jsxs("div", {
		className: "eb-timeline",
		children: [
			/* @__PURE__ */ jsx("button", {
				type: "button",
				className: "eb-btn",
				onClick: () => player.step(-1),
				disabled: time <= 0,
				"aria-label": "Крок назад",
				title: "Крок назад",
				children: /* @__PURE__ */ jsx("span", {
					"aria-hidden": "true",
					children: "⏮"
				})
			}),
			/* @__PURE__ */ jsx("button", {
				type: "button",
				className: "eb-btn eb-btn-gold",
				onClick: playing ? player.pause : player.play,
				"aria-label": playing ? "Пауза" : "Грати",
				title: playing ? "Пауза" : "Грати",
				children: /* @__PURE__ */ jsx("span", {
					"aria-hidden": "true",
					children: playing ? "⏸" : "▶"
				})
			}),
			/* @__PURE__ */ jsx("button", {
				type: "button",
				className: "eb-btn",
				onClick: () => player.step(1),
				disabled: time >= length,
				"aria-label": "Крок уперед",
				title: "Крок уперед",
				children: /* @__PURE__ */ jsx("span", {
					"aria-hidden": "true",
					children: "⏭"
				})
			}),
			/* @__PURE__ */ jsx("input", {
				type: "range",
				className: "eb-timeline-slider",
				min: 0,
				max: Math.max(1, length),
				step: .01,
				value: time,
				onChange: (e) => player.seek(Number(e.target.value)),
				"aria-label": "Час програми",
				"aria-valuetext": `Дія ${done} з ${length}`
			}),
			/* @__PURE__ */ jsxs("span", {
				className: "eb-timeline-count",
				"aria-hidden": "true",
				children: [
					done,
					"/",
					length
				]
			}),
			/* @__PURE__ */ jsx("select", {
				className: "eb-timeline-rate",
				value: player.rate,
				onChange: (e) => player.setRate(Number(e.target.value)),
				"aria-label": "Швидкість",
				children: RATES.map((r) => /* @__PURE__ */ jsxs("option", {
					value: r,
					children: ["×", r]
				}, r))
			})
		]
	});
};
// src/ui/GameScreen.tsx
/**
* The game screen, the same for blocks and for Python: the bar of the chapter and the hero, the field with its time
* line and buttons, the task, and the editor that the caller gives. The result of a run shows over the field.
*/
var GameScreen = ({ rootRef, className, level, start, result, player, skin, running, editing, full, xpTotal, navigation, editorTitle, onRun, onReset, onFull, verdict, children }) => {
	const world = result === null ? start : result.frames[Math.floor(player.time) - 1]?.world ?? start;
	return /* @__PURE__ */ jsxs("div", {
		ref: rootRef,
		className,
		children: [
			/* @__PURE__ */ jsx(Hud, {
				level,
				skin,
				xpTotal,
				progress: navigation.progress ?? {},
				onMap: navigation.onMap
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "eb-stage",
				"aria-label": "Поле",
				children: [
					/* @__PURE__ */ jsx("div", {
						className: "eb-field-frame eb-frame eb-wood",
						children: /* @__PURE__ */ jsx(Stage, {
							start,
							frames: result?.frames,
							time: player.time,
							skin,
							scene: level.scene
						})
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "eb-stage-bottom",
						children: [result !== null && /* @__PURE__ */ jsx(Timeline, {
							player,
							length: result.frames.length
						}), /* @__PURE__ */ jsxs("div", {
							className: "eb-controls",
							children: [
								/* @__PURE__ */ jsxs("button", {
									type: "button",
									className: "eb-btn eb-btn-go eb-run",
									onClick: onRun,
									disabled: running && player.playing,
									children: [/* @__PURE__ */ jsx("span", {
										"aria-hidden": "true",
										children: "▶"
									}), " Запустити"]
								}),
								/* @__PURE__ */ jsxs("button", {
									type: "button",
									className: "eb-btn",
									onClick: onReset,
									disabled: editing,
									children: [/* @__PURE__ */ jsx("span", {
										"aria-hidden": "true",
										children: "↺"
									}), " Спочатку"]
								}),
								/* @__PURE__ */ jsx("button", {
									type: "button",
									className: "eb-btn eb-btn-icon",
									onClick: onFull,
									"aria-pressed": full,
									"aria-label": full ? "Вийти з повного екрана" : "На весь екран",
									title: full ? "Вийти з повного екрана (Esc)" : "На весь екран",
									children: /* @__PURE__ */ jsx("span", {
										"aria-hidden": "true",
										children: full ? "⤡" : "⛶"
									})
								})
							]
						})]
					}),
					verdict
				]
			}),
			/* @__PURE__ */ jsx(Quest, {
				level,
				start,
				world
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "eb-editor-pane eb-frame eb-slate",
				"aria-label": editorTitle,
				children: [/* @__PURE__ */ jsx("h2", {
					className: "eb-editor-head",
					children: editorTitle
				}), children]
			})
		]
	});
};
// src/ui/Verdict.tsx
var FAIL_TEXT = {
	crashed: "Герой урізався в перешкоду.",
	trapped: "Герой ступив на пастку.",
	tired: "Герой утомився: кроки закінчились.",
	defeated: "Вороги забрали всі сердечка.",
	goalsNotMet: "Програма закінчилась, а завдання ще не виконане.",
	tooLong: "Програма працює задовго. Можливо, цикл ніколи не закінчується.",
	noStart: "Поклади нагору програми блок «коли натиснуто прапорець».",
	badProgram: "Програму не вдалося запустити."
};
var PYTHON_FAIL_TEXT = { noStart: "Програма порожня: напиши, що робити героєві, наприклад hero.move()." };
/** The text of a failed run. A mistake in Python code names its line. */
var failText = (result, language) => {
	const reason = result.reason ?? "goalsNotMet";
	if (reason === "badProgram" && result.detail !== void 0) return result.line === void 0 ? result.detail : `Рядок ${result.line}: ${result.detail}`;
	return (language === "python" ? PYTHON_FAIL_TEXT[reason] : void 0) ?? FAIL_TEXT[reason];
};
/** The XP of a run and what the hero gets of it. */
var rewardOf = (level, result, firstTry, xp) => {
	const runXp = xpFor(level.tier ?? "intro", {
		stars: result.stars,
		firstTry
	});
	const gain = xpGain(runXp, xp?.best ?? 0);
	return {
		runXp,
		reward: {
			gain,
			firstTry,
			total: xp === void 0 ? null : xp.total + gain
		}
	};
};
var Stars = ({ count }) => /* @__PURE__ */ jsx("span", {
	className: "eb-stars",
	"aria-label": `Зірок: ${count} з 3`,
	children: [
		1,
		2,
		3
	].map((i) => /* @__PURE__ */ jsx("span", {
		className: i <= count ? "eb-star eb-star-on" : "eb-star",
		children: "★"
	}, i))
});
/** The XP of a passed run and, when the app told the hero's XP, the bar to the next hero level. */
var XpLine = ({ reward }) => {
	const note = reward.gain === 0 ? "Це не краще за твій рекорд, XP не додано." : reward.firstTry ? "З першої спроби!" : "";
	if (reward.total === null) return /* @__PURE__ */ jsxs("p", {
		className: "eb-xp",
		children: [
			/* @__PURE__ */ jsxs("strong", { children: [
				"+",
				reward.gain,
				" XP"
			] }),
			" ",
			note
		]
	});
	const hero = heroLevelOf(reward.total);
	const up = reward.gain > 0 && heroLevelOf(reward.total - reward.gain).level < hero.level;
	const share = hero.next === null ? 1 : (reward.total - hero.from) / (hero.next - hero.from);
	return /* @__PURE__ */ jsxs("div", {
		className: "eb-xp",
		children: [
			/* @__PURE__ */ jsxs("p", { children: [
				/* @__PURE__ */ jsxs("strong", { children: [
					"+",
					reward.gain,
					" XP"
				] }),
				" ",
				up ? `Новий рівень героя: ${hero.level}!` : note
			] }),
			/* @__PURE__ */ jsx("div", {
				className: "eb-bar",
				role: "img",
				"aria-label": `Рівень героя ${hero.level}: ${reward.total} XP${hero.next === null ? "" : ` з ${hero.next}`}`,
				children: /* @__PURE__ */ jsx("span", { style: { width: `${Math.round(share * 100)}%` } })
			}),
			/* @__PURE__ */ jsxs("p", {
				className: "eb-xp-level",
				children: [
					"Рівень ",
					hero.level,
					" · ",
					reward.total,
					hero.next === null ? "" : ` / ${hero.next}`,
					" XP"
				]
			})
		]
	});
};
/** What to change in this very program, from `adviseRun`. */
var Advice = ({ tips }) => tips.length === 0 ? null : /* @__PURE__ */ jsx("ul", {
	className: "eb-advice",
	children: tips.map((tip) => /* @__PURE__ */ jsx("li", { children: tip }, tip))
});
var HINTED = /* @__PURE__ */ new Set([
	"crashed",
	"trapped",
	"tired",
	"defeated",
	"goalsNotMet"
]);
/** The result over the field: stars and XP for a pass, what went wrong and a hint for a fail. */
var Verdict = ({ level, result, reward, advice, language, onClose, onNext }) => {
	if (result.passed) {
		const size = language === "python" ? `Розмір програми: ${result.blocks}.` : `Блоків: ${result.blocks}.`;
		return /* @__PURE__ */ jsx("div", {
			className: "eb-verdict-layer",
			children: /* @__PURE__ */ jsxs("div", {
				className: "eb-verdict eb-verdict-ok eb-frame eb-parchment",
				role: "dialog",
				"aria-modal": "false",
				"aria-labelledby": "eb-verdict-title",
				children: [
					/* @__PURE__ */ jsx(Stars, { count: result.stars }),
					/* @__PURE__ */ jsx("h3", {
						id: "eb-verdict-title",
						children: "Рівень пройдено!"
					}),
					advice.length === 0 ? /* @__PURE__ */ jsx("p", { children: size }) : /* @__PURE__ */ jsx(Advice, { tips: advice }),
					/* @__PURE__ */ jsx(XpLine, { reward }),
					/* @__PURE__ */ jsxs("div", {
						className: "eb-verdict-actions",
						children: [/* @__PURE__ */ jsx("button", {
							type: "button",
							className: "eb-btn",
							onClick: onClose,
							autoFocus: onNext === void 0,
							children: "Ще раз"
						}), onNext !== void 0 && /* @__PURE__ */ jsx("button", {
							type: "button",
							className: "eb-btn eb-btn-go",
							onClick: onNext,
							autoFocus: true,
							children: "Далі →"
						})]
					})
				]
			})
		});
	}
	const reason = result.reason ?? "goalsNotMet";
	return /* @__PURE__ */ jsx("div", {
		className: "eb-verdict-layer",
		children: /* @__PURE__ */ jsxs("div", {
			className: "eb-verdict eb-verdict-fail eb-frame eb-parchment",
			role: "dialog",
			"aria-modal": "false",
			"aria-labelledby": "eb-verdict-title",
			children: [
				/* @__PURE__ */ jsx("h3", {
					id: "eb-verdict-title",
					children: "Ще не вийшло"
				}),
				/* @__PURE__ */ jsx("p", { children: failText(result, language) }),
				/* @__PURE__ */ jsx(Advice, { tips: advice }),
				level.hint !== void 0 && HINTED.has(reason) && /* @__PURE__ */ jsxs("p", {
					className: "eb-hint",
					children: ["Підказка: ", level.hint]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "eb-verdict-actions",
					children: /* @__PURE__ */ jsx("button", {
						type: "button",
						className: "eb-btn eb-btn-gold",
						onClick: onClose,
						autoFocus: true,
						children: "Спробувати ще"
					})
				})
			]
		})
	});
};
export { DEFINITION_OPCODE as A, enemyAt as C, COUNTER_ID as D, CHANGE_OPCODE as E, SET_OPCODE as F, START_OPCODE as I, VARIABLE_OPCODE as L, HERO_COLOR as M, HERO_EXTENSION_ID as N, COUNTER_NAME as O, PROTOTYPE_OPCODE as P, opcodeOf as R, enemiesLeft as S, CALL_OPCODE as T, resultOf as _, frameIndexAt as a, cellAhead as b, HERO_SENSORS as c, heroSense as d, newSession as f, checkProgram as g, MAX_FRAMES as h, usePlayer as i, HERO_BLOCKS as j, DEFAULT_PROCEDURE as k, actionOfOpcode as l, MAX_ACTIONS as m, rewardOf as n, useFullScreen as o, sensorOfOpcode as p, GameScreen as r, HERO_ACTIONS as s, Verdict as t, heroAct as u, startWorld as v, wallAhead as w, cellKey as x, applyAction as y, procedureName as z };
