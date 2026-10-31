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
/** Shadow blocks that hold the number in «повторити 10». */
var NUMBER_SHADOWS = /* @__PURE__ */ new Set([
	"math_whole_number",
	"math_positive_number",
	"math_number"
]);
var opcodeOf = (name) => HERO_NAMES.has(name) ? `${HERO_EXTENSION_ID}_${name}` : SCRATCH_OPCODES[name];
/** Opcodes a program for this palette may contain: the palette, the start hat and number shadows. */
var allowedOpcodes = (palette) => /* @__PURE__ */ new Set([
	START_OPCODE,
	...NUMBER_SHADOWS,
	...palette.map(opcodeOf)
]);
var isNumberShadow = (opcode) => NUMBER_SHADOWS.has(opcode);
// src/core/build.ts
var buildProgram = (steps) => {
	const blocks = {};
	let counter = 0;
	const add = (opcode, parent, extra = {}) => {
		const id = `b${++counter}`;
		blocks[id] = {
			opcode,
			next: null,
			parent,
			inputs: {},
			fields: {},
			shadow: false,
			topLevel: false,
			...extra
		};
		return id;
	};
	const question = (q, parent) => {
		if (typeof q === "string") return add(opcodeOf(q), parent);
		if ("not" in q) {
			const id = add("operator_not", parent);
			blocks[id].inputs.OPERAND = [2, question(q.not, id)];
			return id;
		}
		const [a, b] = "and" in q ? q.and : q.or;
		const id = add("and" in q ? "operator_and" : "operator_or", parent);
		blocks[id].inputs.OPERAND1 = [2, question(a, id)];
		blocks[id].inputs.OPERAND2 = [2, question(b, id)];
		return id;
	};
	const stack = (list, parent) => {
		let first = null;
		let prev = null;
		for (const s of list) {
			const id = step(s, prev ?? parent);
			if (prev === null) first = id;
			else blocks[prev].next = id;
			prev = id;
		}
		return first;
	};
	const substack = (id, name, list) => {
		const first = stack(list, id);
		if (first !== null) blocks[id].inputs[name] = [2, first];
	};
	const step = (s, parent) => {
		if (typeof s === "string") return add(opcodeOf(s), parent);
		if ("repeat" in s) {
			const id = add("control_repeat", parent);
			const times = add("math_whole_number", id, {
				shadow: true,
				fields: { NUM: [String(s.repeat), null] }
			});
			blocks[id].inputs.TIMES = [1, times];
			substack(id, "SUBSTACK", s.body);
			return id;
		}
		if ("forever" in s) {
			const id = add("control_forever", parent);
			substack(id, "SUBSTACK", s.forever);
			return id;
		}
		if ("until" in s) {
			const id = add("control_repeat_until", parent);
			blocks[id].inputs.CONDITION = [2, question(s.until, id)];
			substack(id, "SUBSTACK", s.body);
			return id;
		}
		const id = add(s.else === void 0 ? "control_if" : "control_if_else", parent);
		blocks[id].inputs.CONDITION = [2, question(s.if, id)];
		substack(id, "SUBSTACK", s.then);
		if (s.else !== void 0) substack(id, "SUBSTACK2", s.else);
		return id;
	};
	const start = add(START_OPCODE, null, {
		topLevel: true,
		x: 40,
		y: 40
	});
	const first = stack(steps, start);
	blocks[start].next = first;
	return blocks;
};
// src/core/world.ts
var DEFAULT_HEARTS = 3;
var DEFAULT_SIGHT = 2;
var BOSS_HP = 3;
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
var heroAction = (world, action) => {
	if (action === "move") {
		const next = cellAhead(world);
		if (world.energy === 0) return {
			world,
			outcome: "tired"
		};
		if (isWall(world, next.x, next.y) || enemyAt(world, next.x, next.y) !== void 0) return {
			world: {
				...world,
				crashed: true
			},
			outcome: "crashed"
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
		return world.traps.has(cellKey(next.x, next.y)) ? {
			world: {
				...moved,
				fell: true
			},
			outcome: "fell"
		} : {
			world: moved,
			outcome: "moved"
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
			outcome: "turned"
		};
	}
	if (action === "attack") {
		const next = cellAhead(world);
		const target = enemyAt(world, next.x, next.y);
		if (target === void 0) return {
			world,
			outcome: "swingMissed"
		};
		const enemies = world.enemies.map((e) => e.id === target.id ? {
			...e,
			hp: e.hp - 1,
			swinging: e.swinging && e.boss
		} : e);
		return {
			world: {
				...world,
				enemies
			},
			outcome: target.hp > 1 ? "enemyHit" : "enemyDown"
		};
	}
	const key = cellKey(world.hero.x, world.hero.y);
	if (!world.crystals.has(key)) return {
		world,
		outcome: "nothingToCollect"
	};
	const crystals = new Set(world.crystals);
	crystals.delete(key);
	return {
		world: {
			...world,
			crystals
		},
		outcome: "collected"
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
/** After each hero action every enemy that is still up takes its turn, in order. */
var enemiesTurn = (world) => {
	if (!world.enemies.some(isAlive)) return world;
	let enemies = world.enemies;
	let hearts = world.hearts;
	for (const self of world.enemies) {
		if (!isAlive(self)) continue;
		const { enemy, hit } = enemyTurn(world, enemies, self);
		enemies = enemies.map((e) => e.id === enemy.id ? enemy : e);
		if (hit) hearts = Math.max(0, hearts - 1);
	}
	return {
		...world,
		enemies,
		hearts
	};
};
/** Outcomes that end the run at once: the enemies do not move after them. */
var isFatal = (outcome) => outcome === "crashed" || outcome === "fell" || outcome === "tired";
/** One hero action, then the enemies' turn. A crash, a trap or the end of the steps ends the run at once. */
var applyAction = (world, action) => {
	const done = heroAction(world, action);
	return isFatal(done.outcome) ? done : {
		world: enemiesTurn(done.world),
		outcome: done.outcome
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
// src/core/program.ts
var MAX_PROGRAM_BLOCKS = 300;
/** Hero actions in one run. A textbook level needs fewer than 100. */
var MAX_ACTIONS = 1e3;
/** VM frames in one run. A «завжди» loop without actions ends here. */
var MAX_FRAMES = 2e3;
/** The reason a run stops after this outcome, or null when it goes on. */
var fatalReason = (outcome) => outcome === "crashed" ? "crashed" : outcome === "fell" ? "trapped" : outcome === "tired" ? "tired" : null;
var isProgramBlock = (value) => typeof value === "object" && value !== null && !Array.isArray(value) && typeof value.opcode === "string";
/** Checks the program shape and palette before it runs. Returns the error text or the block count. */
var checkProgram = (level, program) => {
	const entries = Object.entries(program);
	if (entries.length > 300) return { error: `Програма довша за 300 блоків` };
	const allowed = allowedOpcodes(level.blocks);
	let blocks = 0;
	let hasStart = false;
	for (const [, block] of entries) {
		if (!isProgramBlock(block)) return { error: "Блок без опкоду або змінна: цей рівень їх не має" };
		if (!allowed.has(block.opcode)) return { error: `Блок ${block.opcode} не з цього рівня` };
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
// src/core/judge.ts
/**
* Runs a program without the VM: a small interpreter for the blocks a level can have. Synchronous and pure,
* so the browser and the server get the same result, and a server does not need scratch-vm.
*
* It follows the Scratch 3 sequencer. Each «коли прапорець натиснуто» script is a thread. A pass steps every
* thread in turn; a thread runs until the end of a loop iteration, then gives the turn to the next thread.
* The tests compare it with the VM (`run.ts`) on many programs.
*/
/** Passes before a run stops as too long: the VM limit (MAX_FRAMES frames of PASSES_PER_FRAME passes). */
var MAX_PASSES = MAX_FRAMES * 20;
/** Blocks executed in one run. A program can go over it only with a damaged `next` that makes a circle. */
var MAX_STEPS = 2e5;
var HERO_ACTIONS = {
	[`${HERO_EXTENSION_ID}_move`]: "move",
	[`${HERO_EXTENSION_ID}_turnLeft`]: "turnLeft",
	[`${HERO_EXTENSION_ID}_turnRight`]: "turnRight",
	[`${HERO_EXTENSION_ID}_collect`]: "collect",
	[`${HERO_EXTENSION_ID}_attack`]: "attack"
};
/** The run stops: the hero is done, a limit is reached, or the program is damaged. */
var Stop = class {
	reason;
	constructor(reason) {
		this.reason = reason;
	}
};
var isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
/** Scratch `Cast.toNumber`: a text that is not a number is 0. */
var toNumber = (value) => {
	if (typeof value === "number") return Number.isNaN(value) ? 0 : value;
	if (typeof value === "boolean") return value ? 1 : 0;
	const n = Number(value);
	return Number.isNaN(n) ? 0 : n;
};
var judgeProgram = (level, program) => {
	const session = {
		world: startWorld(level),
		frames: [],
		done: false,
		reason: null
	};
	const checked = checkProgram(level, program);
	if ("error" in checked) return resultOf(level, {
		...session,
		reason: "badProgram"
	}, 0, { detail: checked.error });
	if (!checked.hasStart) return resultOf(level, {
		...session,
		reason: "noStart"
	}, checked.blocks);
	const blockAt = (id) => {
		if (typeof id !== "string" || !Object.hasOwn(program, id)) return null;
		const block = program[id];
		if (!isRecord(block) || typeof block.opcode !== "string") return null;
		return {
			opcode: block.opcode,
			next: block.next,
			inputs: block.inputs,
			fields: block.fields,
			topLevel: block.topLevel
		};
	};
	/** What an input holds: a block id, a primitive `[type, value]`, or nothing. */
	const inputOf = (block, name) => {
		if (!isRecord(block.inputs)) return null;
		const input = block.inputs[name];
		return Array.isArray(input) ? input[1] : null;
	};
	let steps = 0;
	const step = () => {
		if (++steps > 2e5) throw new Stop("tooLong");
	};
	const act = (action, blockId) => {
		if (session.done) return;
		const { world, outcome } = applyAction(session.world, action);
		session.world = world;
		session.frames.push({
			action,
			outcome,
			blockId,
			world
		});
		const fatal = fatalReason(outcome);
		if (fatal !== null) finish(fatal);
		else if (allGoalsMet(level, world)) finish(null);
		else if (world.hearts === 0) finish("defeated");
		else if (session.frames.length >= 1e3) finish("tooLong");
	};
	const finish = (reason) => {
		session.done = true;
		session.reason = reason;
		throw new Stop(reason);
	};
	/** A Boolean input: an empty slot is false, as in Scratch. */
	const question = (ref, depth) => {
		if (depth > 300) throw new Stop("badProgram");
		const block = blockAt(ref);
		if (block === null) return false;
		step();
		switch (block.opcode) {
			case `${HERO_EXTENSION_ID}_wallAhead`: return wallAhead(session.world);
			case `${HERO_EXTENSION_ID}_onCrystal`: return onCrystal(session.world);
			case `${HERO_EXTENSION_ID}_atFinish`: return atFinish(session.world);
			case `${HERO_EXTENSION_ID}_enemyAhead`: return enemyAhead(session.world);
			case `${HERO_EXTENSION_ID}_trapAhead`: return trapAhead(session.world);
			case "operator_not": return !question(inputOf(block, "OPERAND"), depth + 1);
			case "operator_and": return question(inputOf(block, "OPERAND1"), depth + 1) && question(inputOf(block, "OPERAND2"), depth + 1);
			case "operator_or": return question(inputOf(block, "OPERAND1"), depth + 1) || question(inputOf(block, "OPERAND2"), depth + 1);
			default: return false;
		}
	};
	/** The count of «повторити»: a number field, a primitive `[4, "10"]`, or a reporter that covers the field. */
	const count = (block) => {
		const ref = inputOf(block, "TIMES");
		if (Array.isArray(ref)) return Math.round(toNumber(ref[1]));
		const inner = blockAt(ref);
		if (inner === null) return 0;
		if (isRecord(inner.fields) && Array.isArray(inner.fields.NUM)) return Math.round(toNumber(inner.fields.NUM[0]));
		return question(ref, 0) ? 1 : 0;
	};
	/** Runs a stack of blocks. A generator yields at the end of each loop iteration, where the VM yields. */
	function* stack(first, depth) {
		if (depth > 300) throw new Stop("badProgram");
		let id = first;
		let block = blockAt(id);
		while (block !== null && typeof id === "string") {
			step();
			const action = HERO_ACTIONS[block.opcode];
			if (action !== void 0) act(action, id);
			else yield* control(block, depth);
			id = block.next;
			block = blockAt(id);
		}
	}
	function* control(block, depth) {
		switch (block.opcode) {
			case "control_repeat":
				for (let left = count(block); left > 0; left--) {
					yield* stack(inputOf(block, "SUBSTACK"), depth + 1);
					yield;
					step();
				}
				return;
			case "control_forever": for (;;) {
				yield* stack(inputOf(block, "SUBSTACK"), depth + 1);
				yield;
				step();
			}
			case "control_repeat_until":
				while (!question(inputOf(block, "CONDITION"), 0)) {
					yield* stack(inputOf(block, "SUBSTACK"), depth + 1);
					yield;
					step();
				}
				return;
			case "control_if":
				if (question(inputOf(block, "CONDITION"), 0)) yield* stack(inputOf(block, "SUBSTACK"), depth + 1);
				return;
			case "control_if_else":
				yield* stack(inputOf(block, question(inputOf(block, "CONDITION"), 0) ? "SUBSTACK" : "SUBSTACK2"), depth + 1);
				return;
			default: return;
		}
	}
	const threads = Object.entries(program).filter(([id]) => {
		const block = blockAt(id);
		return block !== null && block.opcode === "event_whenflagclicked" && block.topLevel === true;
	}).map(([id]) => stack(id, 0));
	try {
		let alive = threads;
		for (let pass = 0; alive.length > 0; pass++) {
			if (pass >= MAX_PASSES) throw new Stop("tooLong");
			alive = alive.filter((thread) => thread.next().done !== true);
		}
	} catch (error) {
		if (!(error instanceof Stop)) throw error;
		if (!session.done) {
			session.reason = error.reason;
			if (error.reason === "badProgram") return resultOf(level, session, checked.blocks, { detail: "Програму пошкоджено: блоки замкнулися в коло" });
		}
	}
	return resultOf(level, session, checked.blocks);
};
// src/levels/index.ts
/**
* The course in the order a student plays it, chapter by chapter (see `chapters.ts`): steps and turns, loops,
* branches, the loop with a condition, traps and few steps, and enemies. In each chapter a new idea comes first,
* then practice, then a challenge. The ids keep their old grade prefix: saved progress refers to them.
* Together they tell one story, «Рік у селі», from autumn through winter and spring to summer: each level gives the
* hero a reason to go somewhere.
* The reference solution of each level is in `solutions.ts`.
*/
/** The hero's house: its door opens onto the start cell (1, 1) of a level. */
var HOME = {
	kind: "house",
	x: -.5,
	y: -2
};
var levels = [
	{
		id: "g3-steps",
		tier: "intro",
		title: "Холодна хата",
		task: ["Надворі осінній холод, а в хаті згасла піч.", "Вийди з хати, дійди до дровітні й візьми дрова."],
		map: [
			"#######",
			"#S...c#",
			"#######"
		],
		blocks: ["move", "collect"],
		goals: [{ type: "crystals" }],
		stars: {
			three: 5,
			two: 7
		},
		hint: "Порахуй клітинки до дров: стільки разів потрібен блок «крок уперед».",
		scene: {
			theme: "autumn",
			item: "wood",
			props: [HOME, {
				kind: "woodshed",
				x: 4,
				y: -1
			}],
			npcs: [{
				who: "kid",
				x: 3,
				y: 2
			}]
		}
	},
	{
		id: "g3-turn",
		tier: "practice",
		title: "Дровітня за рогом",
		task: ["Дров замало, піч ледь жевріє.", "Решта дров лежить за рогом. Поверни в потрібний бік і принеси їх."],
		map: [
			"#####",
			"#S..#",
			"###.#",
			"###c#",
			"#####"
		],
		blocks: [
			"move",
			"turnLeft",
			"turnRight",
			"collect"
		],
		goals: [{ type: "crystals" }],
		stars: {
			three: 6,
			two: 8
		},
		hint: "Ніндзя повертається на місці. Після повороту він іде туди, куди дивиться.",
		scene: {
			theme: "autumn",
			item: "wood",
			props: [HOME, {
				kind: "woodshed",
				x: 4,
				y: 2
			}]
		}
	},
	{
		id: "g3-gate",
		tier: "practice",
		title: "Хвіртка",
		task: ["Надворі вже темніє, пора додому.", "Хата за рогом: дійди до повороту, поверни ліворуч і йди до дверей."],
		map: [
			"#####",
			"###F#",
			"###.#",
			"#S..#",
			"#####"
		],
		blocks: [
			"move",
			"turnLeft",
			"turnRight"
		],
		goals: [{ type: "finish" }],
		stars: {
			three: 5,
			two: 7
		},
		hint: "Спершу два кроки, потім поворот ліворуч і ще два кроки.",
		scene: {
			theme: "autumn",
			finish: "home"
		}
	},
	{
		id: "g3-logs",
		tier: "practice",
		title: "Два поліна",
		task: ["Вітер розкидав дрова біля дровітні.", "Одне поліно лежить на стежці, друге за рогом. Збери обидва."],
		map: [
			"########",
			"#S.c...#",
			"######.#",
			"######c#",
			"########"
		],
		blocks: [
			"move",
			"turnLeft",
			"turnRight",
			"collect"
		],
		goals: [{ type: "crystals" }],
		stars: {
			three: 10,
			two: 13
		},
		hint: "Візьми перше поліно, дійди до кінця стежки, поверни праворуч і йди до другого.",
		scene: {
			theme: "autumn",
			item: "wood",
			props: [HOME, {
				kind: "woodshed",
				x: 6,
				y: -1
			}]
		}
	},
	{
		id: "g3-finish",
		tier: "practice",
		title: "До криниці",
		task: ["Піч розгорілась, у хаті тепло.", "Тепер треба води на чай. Дійди до криниці."],
		map: [
			"#######",
			"#S.####",
			"##.####",
			"##...F#",
			"#######"
		],
		blocks: [
			"move",
			"turnLeft",
			"turnRight"
		],
		goals: [{ type: "finish" }],
		stars: {
			three: 8,
			two: 10
		},
		hint: "Перед кожним поворотом подумай, куди дивиться ніндзя: праворуч для нього — це його права рука.",
		scene: {
			theme: "autumn",
			finish: "well",
			props: [HOME]
		}
	},
	{
		id: "g3-zigzag",
		tier: "challenge",
		title: "Між калюжами",
		task: ["Друзі кличуть стрибати в купі листя.", "Стежка петляє між калюжами: то вниз, то вправо. Не ступи в калюжу."],
		map: [
			"#######",
			"#S.####",
			"##..###",
			"###..##",
			"####.F#",
			"#######"
		],
		blocks: [
			"move",
			"turnLeft",
			"turnRight"
		],
		goals: [{ type: "finish" }],
		stars: {
			three: 13,
			two: 16
		},
		hint: "Крок, праворуч, крок, ліворуч — і так знову. Помічаєш, що дії повторюються?",
		scene: {
			theme: "autumn",
			npcs: [{
				who: "girl",
				x: 6,
				y: 3
			}]
		}
	},
	{
		id: "g4-road",
		tier: "intro",
		title: "Дорога до лісу",
		task: ["Дідусь чекає в лісі з возом дров.", "Дорога пряма, але довга. Скільки кроків? Поклади «крок уперед» у «повторити»."],
		map: [
			"##############",
			"#S..........F#",
			"##############"
		],
		blocks: ["move", "repeat"],
		goals: [{ type: "finish" }],
		stars: {
			three: 2,
			two: 4
		},
		hint: "Порахуй клітинки до прапорця і впиши це число в «повторити».",
		scene: {
			theme: "autumn",
			npcs: [{
				who: "grandpa",
				x: 12,
				y: 2
			}]
		}
	},
	{
		id: "g4-repeat",
		tier: "intro",
		title: "Яблука для пирога",
		task: ["Бабуся пече пиріг. З воза на дорогу висипались п'ять яблук — збери їх.", "Спробуй блок «повторити»: так програма буде коротшою."],
		map: [
			"#############",
			"#S.c.c.c.c.c#",
			"#############"
		],
		blocks: [
			"move",
			"collect",
			"repeat"
		],
		goals: [{ type: "crystals" }],
		stars: {
			three: 4,
			two: 10
		},
		hint: "Знайди дії, які повторюються: «крок, крок, взяти». Поклади їх у «повторити».",
		scene: {
			theme: "autumn",
			item: "apple",
			props: [HOME]
		}
	},
	{
		id: "g4-corner",
		tier: "practice",
		title: "Хата лісника",
		task: ["Лісник залишив дрова біля своєї хати.", "Іди вздовж лісу, поверни праворуч і спустись до дров. Тут знадобиться два «повторити»."],
		map: [
			"#########",
			"#S......#",
			"#######.#",
			"#######.#",
			"#######.#",
			"#######c#",
			"#########"
		],
		blocks: [
			"move",
			"turnLeft",
			"turnRight",
			"collect",
			"repeat"
		],
		goals: [{ type: "crystals" }],
		stars: {
			three: 6,
			two: 9
		},
		hint: "Один «повторити» для кроків праворуч, поворот, і другий «повторити» для кроків униз.",
		scene: {
			theme: "autumn",
			item: "wood",
			npcs: [{
				who: "hunter",
				x: 6,
				y: 3
			}]
		}
	},
	{
		id: "g4-stairs",
		tier: "practice",
		title: "Пиріг для бабусі",
		task: ["Пиріг готовий! Віднеси його бабусі.", "Її хата на пагорбі, і стежка до неї йде сходинками."],
		map: [
			"#######",
			"#####F#",
			"####..#",
			"###..##",
			"##..###",
			"#S.####",
			"#######"
		],
		blocks: [
			"move",
			"turnLeft",
			"turnRight",
			"repeat"
		],
		goals: [{ type: "finish" }],
		stars: {
			three: 5,
			two: 9
		},
		hint: "Одна сходинка — це «крок, ліворуч, крок, праворуч». Скільки сходинок?",
		scene: {
			theme: "autumn",
			finish: "grandma",
			props: [{
				kind: "house",
				x: 3.5,
				y: -2
			}]
		}
	},
	{
		id: "g4-sled",
		tier: "practice",
		title: "Гірка для санчат",
		task: ["До великої гірки веде довга стежка між кучугурами.", "Знайди, що повторюється, і зроби програму короткою."],
		map: [
			"#########",
			"#S.######",
			"##..#####",
			"###..####",
			"####..###",
			"#####..##",
			"######.F#",
			"#########"
		],
		blocks: [
			"move",
			"turnLeft",
			"turnRight",
			"repeat"
		],
		goals: [{ type: "finish" }],
		stars: {
			three: 6,
			two: 9
		},
		hint: "Одна сходинка — «крок, праворуч, крок, ліворуч». Скільки їх до гірки?",
		scene: {
			theme: "winter",
			npcs: [{
				who: "boy",
				x: 8,
				y: 5
			}]
		}
	},
	{
		id: "g6-nested",
		tier: "practice",
		title: "Вогнища на ніч",
		task: ["Сутеніє, у лісі виють вовки.", "Розпали вогнища в кутах двору. Використай цикл у циклі."],
		map: [
			"######",
			"#S..c#",
			"#.##.#",
			"#.##.#",
			"#c..c#",
			"######"
		],
		blocks: [
			"move",
			"turnLeft",
			"turnRight",
			"collect",
			"repeat"
		],
		goals: [{ type: "crystals" }],
		stars: {
			three: 5,
			two: 9
		},
		hint: "Одна сторона двору — це три кроки, «взяти» і поворот. Повтори сторону кілька разів.",
		scene: {
			theme: "winter",
			item: "campfire",
			props: [HOME]
		}
	},
	{
		id: "g4-if",
		tier: "intro",
		title: "Риба в ополонках",
		task: ["Бабуся просить рибу на юшку. На ставку є ополонки, та риба клює не в кожній.", "Пройди ставком і лови лише там, де є риба."],
		map: [
			"###########",
			"#S.cc.c..c#",
			"###########"
		],
		blocks: [
			"move",
			"collect",
			"repeat",
			"if",
			"onCrystal"
		],
		goals: [{ type: "crystals" }],
		stars: {
			three: 5,
			two: 9
		},
		hint: "У «повторити» зроби крок, а потім перевір: «якщо тут щось є? то взяти».",
		scene: {
			theme: "winter",
			ground: "ice",
			item: "fish"
		}
	},
	{
		id: "g4-fence",
		tier: "practice",
		title: "Дрова вздовж паркану",
		task: ["Дрова попадали з воза вздовж паркану, але не всюди.", "Іди вздовж паркану й бери поліно лише там, де воно є."],
		map: [
			"#########",
			"#S.cc..c#",
			"#######.#",
			"#######c#",
			"#######.#",
			"#######c#",
			"#########"
		],
		blocks: [
			"move",
			"turnLeft",
			"turnRight",
			"collect",
			"repeat",
			"if",
			"onCrystal"
		],
		goals: [{ type: "crystals" }],
		stars: {
			three: 11,
			two: 15
		},
		hint: "У кожному «повторити»: крок, а потім «якщо тут щось є? то взяти».",
		scene: {
			theme: "winter",
			item: "wood",
			props: [{
				kind: "woodshed",
				x: 3,
				y: -1
			}]
		}
	},
	{
		id: "g5-snake",
		tier: "intro",
		title: "Навколо ставка",
		task: ["Лід на ставку тонкий, тож додому треба йти бережком.", "Повторюй: якщо попереду стіна — поверни праворуч, інакше зроби крок."],
		map: [
			"########",
			"#S.....#",
			"######.#",
			"#F.....#",
			"########"
		],
		blocks: [
			"move",
			"turnLeft",
			"turnRight",
			"repeat",
			"ifElse",
			"wallAhead"
		],
		goals: [{ type: "finish" }],
		stars: {
			three: 5,
			two: 8
		},
		hint: "Блок «якщо… то… інакше» сам вирішує, що робити: повернути чи йти. Залишилось порахувати, скільки разів повторити.",
		scene: {
			theme: "winter",
			finish: "home"
		}
	},
	{
		id: "g4-until",
		tier: "practice",
		title: "Довгий міст",
		task: ["Комора зачинена, а ключ — у скрині на тому боці довгого мосту.", "Іди мостом, доки попереду не скінчиться міст, і візьми ключ."],
		map: [
			"############",
			"#S........c#",
			"############"
		],
		blocks: [
			"move",
			"collect",
			"repeatUntil",
			"wallAhead"
		],
		goals: [{ type: "crystals" }],
		stars: {
			three: 4,
			two: 6
		},
		hint: "Блок «повторити до попереду стіна?» сам зупиниться в кінці мосту.",
		scene: {
			theme: "winter",
			ground: "bridge",
			item: "key"
		}
	},
	{
		id: "g5-bridge",
		tier: "practice",
		title: "Міст із поворотом",
		task: ["Другий ключ від комори лежить за мостом, що повертає.", "Іди, доки попереду не стіна, поверни — і знову іди до кінця."],
		map: [
			"##########",
			"#S.......#",
			"########.#",
			"########.#",
			"########c#",
			"##########"
		],
		blocks: [
			"move",
			"turnLeft",
			"turnRight",
			"collect",
			"repeatUntil",
			"wallAhead"
		],
		goals: [{ type: "crystals" }],
		stars: {
			three: 8,
			two: 11
		},
		hint: "Два блоки «повторити до попереду стіна?», а між ними поворот праворуч.",
		scene: {
			theme: "winter",
			ground: "bridge",
			item: "key"
		}
	},
	{
		id: "g5-way-home",
		tier: "practice",
		title: "Дрова на дорозі додому",
		task: ["Віз розгубив дрова по дорозі додому.", "Іди, доки не дійдеш до хати, і підбирай дрова там, де вони лежать."],
		map: [
			"#############",
			"#S.c..c.c..F#",
			"#############"
		],
		blocks: [
			"move",
			"collect",
			"repeatUntil",
			"atFinish",
			"if",
			"onCrystal"
		],
		goals: [{ type: "crystals" }, { type: "finish" }],
		stars: {
			three: 6,
			two: 9
		},
		hint: "«Повторити до на меті?», а всередині: крок і «якщо тут щось є? то взяти».",
		scene: {
			theme: "winter",
			item: "wood",
			finish: "home"
		}
	},
	{
		id: "g6-spiral",
		tier: "practice",
		title: "Сніжний равлик",
		task: ["Діти протоптали в снігу стежку-равлика, а в її серці сховали прапорець.", "Стежка закручується праворуч. Склади правило, яке приведе до центру."],
		map: [
			"#########",
			"#S......#",
			"#######.#",
			"#.....#.#",
			"#.###.#.#",
			"#.#F..#.#",
			"#.#####.#",
			"#.......#",
			"#########"
		],
		blocks: [
			"move",
			"turnLeft",
			"turnRight",
			"repeatUntil",
			"atFinish",
			"ifElse",
			"wallAhead",
			"not"
		],
		goals: [{ type: "finish" }],
		stars: {
			three: 6,
			two: 9
		},
		hint: "Повторюй, доки не на меті: якщо попереду стіна — праворуч, інакше крок.",
		scene: { theme: "winter" }
	},
	{
		id: "g6-maze",
		tier: "challenge",
		title: "Заметіль",
		task: ["Почалася заметіль, нічого не видно.", "Програма має сама вирішувати, коли повертати, і привести ніндзю додому."],
		map: [
			"#######",
			"#F...##",
			"####.##",
			"#S...##",
			"#######"
		],
		blocks: [
			"move",
			"turnLeft",
			"turnRight",
			"repeatUntil",
			"atFinish",
			"ifElse",
			"wallAhead",
			"not"
		],
		goals: [{ type: "finish" }],
		stars: {
			three: 6,
			two: 9
		},
		hint: "Повторюй, доки не дійдеш до мети: якщо попереду стіна, то поверни, інакше зроби крок.",
		scene: {
			theme: "winter",
			finish: "home",
			props: [HOME]
		}
	},
	{
		id: "p-thin-ice",
		tier: "intro",
		title: "Тонкий лід",
		task: ["Дорога додому йде через замерзлий ставок.", "Посередині лід тонкий: там пастка. Обійди її знизу й дійди до хати."],
		map: [
			"#######",
			"#S.x.F#",
			"##...##",
			"#######"
		],
		blocks: [
			"move",
			"turnLeft",
			"turnRight"
		],
		goals: [{ type: "finish" }],
		stars: {
			three: 10,
			two: 12
		},
		hint: "Пастку не можна переступити: зійди на нижній ряд, пройди повз неї й повернись на стежку.",
		scene: {
			theme: "winter",
			ground: "ice",
			finish: "home"
		}
	},
	{
		id: "p-field",
		tier: "practice",
		title: "Ополонки",
		task: ["Рибалки надовбали на ставку ополонок, а мороз такий, що сил вистачить лише на 7 кроків.", "Знайди шлях до криниці без пасток і без зайвих кроків."],
		map: [
			"########",
			"#S.....#",
			"#.x.xx.#",
			"#.x.x..#",
			"#.x.x.x#",
			"#.x.F..#",
			"########"
		],
		blocks: [
			"move",
			"turnLeft",
			"turnRight",
			"repeat"
		],
		goals: [{ type: "finish" }],
		maxSteps: 7,
		stars: {
			three: 7,
			two: 9
		},
		hint: "Порахуй кроки кожним шляхом. Обхід уздовж краю забере всі сили, а лівий шлях закінчується пасткою.",
		scene: {
			theme: "winter",
			ground: "ice",
			finish: "well"
		}
	},
	{
		id: "p-cold",
		tier: "practice",
		title: "Три поліна",
		task: ["Мороз міцнішає: на холоді вистачить сил лише на 11 кроків.", "Збери три поліна. Подумай, з якого почати."],
		map: [
			"############",
			"##c..S.c..c#",
			"############"
		],
		blocks: [
			"move",
			"turnLeft",
			"turnRight",
			"collect",
			"repeat"
		],
		goals: [{ type: "crystals" }],
		maxSteps: 11,
		stars: {
			three: 13,
			two: 16
		},
		hint: "Якщо спершу взяти ближні поліна, по самотнє доведеться довго вертатися. Почни з того, що лежить окремо.",
		scene: {
			theme: "winter",
			item: "wood"
		}
	},
	{
		id: "p-fires",
		tier: "challenge",
		title: "Три вогнища",
		task: ["Вечоріє: у кутах галявини треба розпалити три вогнища.", "Сил вистачить на 15 кроків, а між деревами є ополонки. Вибери, з якого вогнища почати."],
		map: [
			"#########",
			"#c.....c#",
			"#.x.x.x.#",
			"#...S...#",
			"#.x.x.x.#",
			"#......c#",
			"#########"
		],
		dir: "up",
		blocks: [
			"move",
			"turnLeft",
			"turnRight",
			"collect",
			"repeat"
		],
		goals: [{ type: "crystals" }],
		maxSteps: 15,
		stars: {
			three: 18,
			two: 22
		},
		hint: "Почни з вогнища, від якого до двох інших можна пройти без повернень назад.",
		scene: {
			theme: "winter",
			item: "campfire"
		}
	},
	{
		id: "p-stairs",
		tier: "intro",
		title: "Сходинки на кризі",
		task: ["Річка замерзла сходинками, і в кінці кожної сходинки лід тонкий.", "Іди вперед, а побачиш пастку — піднімись на сходинку вище. Бабуся чекає нагорі."],
		map: [
			"###########",
			"######...F#",
			"###....x###",
			"#S..x######",
			"###########"
		],
		blocks: [
			"move",
			"turnLeft",
			"turnRight",
			"repeatUntil",
			"ifElse",
			"trapAhead",
			"atFinish"
		],
		goals: [{ type: "finish" }],
		stars: {
			three: 8,
			two: 11
		},
		hint: "Повторюй, доки не дійдеш до мети: якщо попереду пастка, то поверни ліворуч, крок і праворуч, інакше крок.",
		scene: {
			theme: "winter",
			finish: "grandma"
		}
	},
	{
		id: "p-river",
		tier: "practice",
		title: "Обхід ополонок",
		task: ["Рибалки зробили на річці дві ополонки.", "Обхід біля кожної однаковий: напиши його один раз у «якщо попереду пастка»."],
		map: [
			"#############",
			"###...##...##",
			"#S..x....x.F#",
			"#############"
		],
		blocks: [
			"move",
			"turnLeft",
			"turnRight",
			"repeatUntil",
			"ifElse",
			"trapAhead",
			"atFinish"
		],
		goals: [{ type: "finish" }],
		stars: {
			three: 13,
			two: 17
		},
		hint: "Якщо попереду пастка: ліворуч, крок, праворуч, два кроки, праворуч, крок, ліворуч. Інакше просто крок.",
		scene: {
			theme: "winter",
			ground: "ice",
			finish: "home"
		}
	},
	{
		id: "p-fork",
		tier: "challenge",
		title: "Розвилка",
		task: ["Стежка розходиться: одна гілка веде в глухий кут, друга — до криниці.", "Сил вистачить лише на 9 кроків. Склади правило: у який бік повертати біля стіни?"],
		map: [
			"#########",
			"#####...#",
			"#####.#.#",
			"#S....#.#",
			"#####.#.#",
			"##F...#.#",
			"#########"
		],
		blocks: [
			"move",
			"turnLeft",
			"turnRight",
			"repeatUntil",
			"ifElse",
			"wallAhead",
			"atFinish"
		],
		goals: [{ type: "finish" }],
		maxSteps: 9,
		stars: {
			three: 6,
			two: 8
		},
		hint: "Повторюй, доки не дійдеш до мети: якщо попереду стіна, то поверни, інакше крок. Спробуй обидва повороти й порахуй кроки.",
		scene: {
			theme: "winter",
			finish: "well"
		}
	},
	{
		id: "g5-spirit",
		tier: "intro",
		title: "Сніговий дух",
		task: ["Сніг тане, та сніговий дух ще стереже дорогу до криниці. Він стоїть, а коли ніндзя підходить на дві клітинки, біжить назустріч.", "Вдар духа і дійди до криниці."],
		map: [
			"#########",
			"#S.....F#",
			"#########"
		],
		blocks: [
			"move",
			"attack",
			"repeat"
		],
		goals: [{ type: "finish" }],
		enemies: [{
			kind: "spirit",
			x: 4,
			y: 1
		}],
		stars: {
			three: 4,
			two: 7
		},
		hint: "Зроби крок — дух підбіжить упритул. Тоді «вдарити», а далі йди до криниці.",
		scene: {
			theme: "spring",
			finish: "well"
		}
	},
	{
		id: "g5-glade",
		tier: "practice",
		title: "Дрова на галявині",
		task: ["Після весняного дощу на галявині лежать дрова, а по ній туди-сюди повзає слиз.", "Галявина велика: обери свій шлях. Збери всі дрова, а слиз обійди або вдар."],
		map: [
			"#########",
			"#S......#",
			"#..#..c.#",
			"#.c.....#",
			"#....#..#",
			"#.....c.#",
			"#########"
		],
		blocks: [
			"move",
			"turnLeft",
			"turnRight",
			"collect",
			"attack",
			"repeat"
		],
		goals: [{ type: "crystals" }],
		enemies: [{
			kind: "slime",
			x: 4,
			y: 3,
			walk: "across",
			sight: 1
		}],
		stars: {
			three: 20,
			two: 28
		},
		hint: "Слиз помічає ніндзю лише впритул. Якщо він на шляху — «вдарити», інакше обійди його.",
		scene: {
			theme: "spring",
			item: "wood",
			npcs: [{
				who: "hunter",
				x: 3,
				y: 2
			}]
		}
	},
	{
		id: "g5-guards",
		tier: "challenge",
		title: "Варта біля комори",
		task: ["Біля комори вештаються гобліни. Прожени всіх.", "Питай «попереду ворог?»: якщо так — бий, а ні — іди далі."],
		map: [
			"##########",
			"#S.......#",
			"##########"
		],
		blocks: [
			"move",
			"attack",
			"repeat",
			"repeatUntil",
			"if",
			"ifElse",
			"enemyAhead",
			"wallAhead"
		],
		goals: [{ type: "enemies" }],
		enemies: [{
			kind: "goblin",
			x: 4,
			y: 1,
			walk: "across",
			sight: 2
		}, {
			kind: "goblin",
			x: 7,
			y: 1,
			walk: "across",
			sight: 2
		}],
		hearts: 3,
		stars: {
			three: 5,
			two: 8
		},
		hint: "Повторюй: якщо попереду ворог, то вдарити, інакше крок.",
		scene: {
			theme: "summer",
			props: [{
				kind: "woodshed",
				x: 7,
				y: -1
			}]
		}
	},
	{
		id: "g6-bear",
		tier: "challenge",
		title: "Ведмідь по мед",
		task: ["Ведмідь вийшов з лісу по мед і не пускає ніндзю до бабусі.", "Він витримує три удари і б'є у відповідь. Підійди, коли він поруч, і бий, доки не впаде."],
		map: [
			"#########",
			"#S......#",
			"#######.#",
			"#F......#",
			"#########"
		],
		blocks: [
			"move",
			"turnLeft",
			"turnRight",
			"attack",
			"repeat",
			"repeatUntil",
			"enemyAhead",
			"wallAhead",
			"atFinish",
			"if",
			"ifElse"
		],
		goals: [{ type: "enemies" }, { type: "finish" }],
		enemies: [{
			kind: "bear",
			x: 6,
			y: 1,
			boss: true,
			sight: 2
		}],
		hearts: 3,
		stars: {
			three: 11,
			two: 16
		},
		hint: "Іди, доки попереду не з'явиться ведмідь, тоді вдар тричі. Далі шлях до бабусі вільний.",
		scene: {
			theme: "summer",
			finish: "grandma"
		}
	}
];
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
	}
];
/** The chapter of a level, or undefined for a level outside the course (a teacher's task). */
var chapterOf = (levelId) => chapters.find((c) => c.levels.includes(levelId));
/** The levels of a chapter, in order. */
var chapterLevels = (chapter) => chapter.levels.flatMap((id) => levels.find((l) => l.id === id) ?? []);
/** The first chapter has bigger blocks and a bigger field for the youngest. */
var isFirstChapter = (levelId) => chapters[0]?.levels.includes(levelId) === true;
// src/levels/solutions.ts
/** The shortest known solution of each level, for tests and for checking new levels. Keys are level ids. */
var solutions = {
	"g3-steps": [
		"move",
		"move",
		"move",
		"move",
		"collect"
	],
	"g3-turn": [
		"move",
		"move",
		"turnRight",
		"move",
		"move",
		"collect"
	],
	"g3-finish": [
		"move",
		"turnRight",
		"move",
		"move",
		"turnLeft",
		"move",
		"move",
		"move"
	],
	"g4-repeat": [{
		repeat: 5,
		body: [
			"move",
			"move",
			"collect"
		]
	}],
	"g4-stairs": [{
		repeat: 4,
		body: [
			"move",
			"turnLeft",
			"move",
			"turnRight"
		]
	}],
	"g4-if": [{
		repeat: 8,
		body: ["move", {
			if: "onCrystal",
			then: ["collect"]
		}]
	}],
	"g4-until": [{
		until: "wallAhead",
		body: ["move"]
	}, "collect"],
	"g5-spirit": [
		"move",
		"attack",
		{
			repeat: 5,
			body: ["move"]
		}
	],
	"g5-glade": [
		"move",
		"turnRight",
		"move",
		"move",
		"collect",
		"turnLeft",
		"move",
		"attack",
		"move",
		"move",
		"move",
		"turnLeft",
		"move",
		"collect",
		"turnRight",
		"turnRight",
		"move",
		"move",
		"move",
		"collect"
	],
	"g5-guards": [{
		repeat: 9,
		body: [{
			if: "enemyAhead",
			then: ["attack"],
			else: ["move"]
		}]
	}],
	"g6-nested": [{
		repeat: 4,
		body: [
			{
				repeat: 3,
				body: ["move"]
			},
			"collect",
			"turnRight"
		]
	}],
	"g6-maze": [{
		until: "atFinish",
		body: [{
			if: "wallAhead",
			then: ["turnLeft"],
			else: ["move"]
		}]
	}],
	"g3-gate": [
		"move",
		"move",
		"turnLeft",
		"move",
		"move"
	],
	"g3-logs": [
		"move",
		"move",
		"collect",
		"move",
		"move",
		"move",
		"turnRight",
		"move",
		"move",
		"collect"
	],
	"g3-zigzag": [
		"move",
		"turnRight",
		"move",
		"turnLeft",
		"move",
		"turnRight",
		"move",
		"turnLeft",
		"move",
		"turnRight",
		"move",
		"turnLeft",
		"move"
	],
	"g4-road": [{
		repeat: 11,
		body: ["move"]
	}],
	"g4-corner": [
		{
			repeat: 6,
			body: ["move"]
		},
		"turnRight",
		{
			repeat: 4,
			body: ["move"]
		},
		"collect"
	],
	"g4-sled": [{
		repeat: 5,
		body: [
			"move",
			"turnRight",
			"move",
			"turnLeft"
		]
	}, "move"],
	"g4-fence": [
		{
			repeat: 6,
			body: ["move", {
				if: "onCrystal",
				then: ["collect"]
			}]
		},
		"turnRight",
		{
			repeat: 4,
			body: ["move", {
				if: "onCrystal",
				then: ["collect"]
			}]
		}
	],
	"g5-snake": [{
		repeat: 14,
		body: [{
			if: "wallAhead",
			then: ["turnRight"],
			else: ["move"]
		}]
	}],
	"g5-bridge": [
		{
			until: "wallAhead",
			body: ["move"]
		},
		"turnRight",
		{
			until: "wallAhead",
			body: ["move"]
		},
		"collect"
	],
	"g5-way-home": [{
		until: "atFinish",
		body: ["move", {
			if: "onCrystal",
			then: ["collect"]
		}]
	}],
	"g6-spiral": [{
		until: "atFinish",
		body: [{
			if: "wallAhead",
			then: ["turnRight"],
			else: ["move"]
		}]
	}],
	"g6-bear": [
		{
			until: "enemyAhead",
			body: ["move"]
		},
		{
			repeat: 3,
			body: ["attack"]
		},
		{
			until: "atFinish",
			body: [{
				if: "wallAhead",
				then: ["turnRight"],
				else: ["move"]
			}]
		}
	],
	"p-thin-ice": [
		"move",
		"turnRight",
		"move",
		"turnLeft",
		"move",
		"move",
		"turnLeft",
		"move",
		"turnRight",
		"move"
	],
	"p-field": [
		"move",
		"move",
		"turnRight",
		{
			repeat: 4,
			body: ["move"]
		},
		"turnLeft",
		"move"
	],
	"p-cold": [
		"turnLeft",
		"turnLeft",
		{
			repeat: 3,
			body: ["move"]
		},
		"collect",
		"turnLeft",
		"turnLeft",
		{
			repeat: 5,
			body: ["move"]
		},
		"collect",
		{
			repeat: 3,
			body: ["move"]
		},
		"collect"
	],
	"p-fires": [
		"turnLeft",
		"move",
		"turnRight",
		"move",
		"move",
		"turnLeft",
		"move",
		"move",
		"collect",
		"turnLeft",
		"turnLeft",
		{
			repeat: 6,
			body: ["move"]
		},
		"collect",
		"turnRight",
		{
			repeat: 4,
			body: ["move"]
		},
		"collect"
	],
	"p-stairs": [{
		until: "atFinish",
		body: [{
			if: "trapAhead",
			then: [
				"turnLeft",
				"move",
				"turnRight"
			],
			else: ["move"]
		}]
	}],
	"p-river": [{
		until: "atFinish",
		body: [{
			if: "trapAhead",
			then: [
				"turnLeft",
				"move",
				"turnRight",
				"move",
				"move",
				"turnRight",
				"move",
				"turnLeft"
			],
			else: ["move"]
		}]
	}],
	"p-fork": [{
		until: "atFinish",
		body: [{
			if: "wallAhead",
			then: ["turnRight"],
			else: ["move"]
		}]
	}]
};
// src/core/xp.ts
/** XP for any pass of a level of this tier. */
var TIER_XP = {
	intro: 10,
	practice: 20,
	challenge: 35
};
/** XP for each star: fewer blocks give more stars. */
var STAR_XP = 5;
/** XP when the level passes and no run of it failed before. */
var FIRST_TRY_XP = 10;
/** The most XP a level gives: three stars at the first try. */
var maxXp = (tier) => TIER_XP[tier] + 15 + 10;
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
// src/core/advice.ts
/**
* Advice after a run, made from what the hero did with this very program: what is missing («взяти», a turn,
* more repeats) and what is extra (a «взяти» on an empty cell, turns that cancel out). The level `hint` stays
* the general idea; the advice points at this program.
*
* Pure, so the browser and a server give the same advice.
*/
/** At most this many tips: more would be a lecture. */
var MAX_ADVICE = 3;
/** The item after «дійшов до …» and the word for it after «не взяв …», for one item and for several. */
var NOUNS = {
	crystal: {
		to: ["кристала", "кристалів"],
		it: ["його", "їх"]
	},
	wood: {
		to: ["дров", "дров"],
		it: ["їх", "їх"]
	},
	apple: {
		to: ["яблука", "яблук"],
		it: ["його", "їх"]
	},
	fish: {
		to: ["риби", "риби"],
		it: ["її", "її"]
	},
	key: {
		to: ["ключа", "ключів"],
		it: ["його", "їх"]
	},
	campfire: {
		to: ["вогнища", "вогнищ"],
		it: ["його", "їх"]
	}
};
var usedBlocks = (program) => {
	const used = /* @__PURE__ */ new Set();
	for (const block of Object.values(program)) if (typeof block === "object" && block !== null && "opcode" in block && typeof block.opcode === "string") used.add(block.opcode);
	return used;
};
var few = (n) => n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14);
var times = (n) => n % 10 === 1 && n % 100 !== 11 ? "раз" : few(n) ? "рази" : "разів";
var steps = (n) => n % 10 === 1 && n % 100 !== 11 ? "крок" : few(n) ? "кроки" : "кроків";
/** Fewest moves from a cell to the finish, or null when walls cut it off. */
var distanceToFinish = (world, from) => {
	const finish = world.finish;
	if (finish === null) return null;
	const seen = /* @__PURE__ */ new Set([cellKey(from.x, from.y)]);
	let wave = [from];
	for (let d = 0; wave.length > 0; d++) {
		if (wave.some((c) => c.x === finish.x && c.y === finish.y)) return d;
		const next = [];
		for (const c of wave) for (const [dx, dy] of [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1]
		]) {
			const x = c.x + dx;
			const y = c.y + dy;
			const key = cellKey(x, y);
			if (x < 0 || y < 0 || x >= world.width || y >= world.height || world.walls.has(key) || seen.has(key)) continue;
			seen.add(key);
			next.push({
				x,
				y
			});
		}
		wave = next;
	}
	return null;
};
/** Turns that undo each other (left then right) and three turns one way, which is one turn the other way. */
var wastedTurns = (frames) => {
	let cancel = false;
	let triple = false;
	frames.forEach((frame, i) => {
		const prev = frames[i - 1]?.action;
		if (frame.action === "turnLeft" && prev === "turnRight" || frame.action === "turnRight" && prev === "turnLeft") cancel = true;
		if ((frame.action === "turnLeft" || frame.action === "turnRight") && prev === frame.action && frames[i - 2]?.action === frame.action) triple = true;
	});
	return {
		cancel,
		triple
	};
};
/** The hero walked into an enemy: it has to be struck first. */
var bumpAdvice = (level, n) => {
	const canAsk = level.blocks.includes("enemyAhead") && (level.blocks.includes("if") || level.blocks.includes("ifElse"));
	return [`На ${n}-й дії герой наткнувся на ворога. Спершу «вдарити», а тоді вже крок.`, ...canAsk ? ["Щоб не рахувати, спитай: «якщо попереду ворог? то вдарити, інакше крок»."] : []];
};
var crashAdvice = (level, result, has) => {
	const n = result.frames.length;
	const before = result.frames[n - 2]?.world ?? startWorld(level);
	const ahead = cellAhead(result.world);
	if (enemyAt(result.world, ahead.x, ahead.y) !== void 0) return bumpAdvice(level, n);
	const leftFree = !wallAhead(applyAction(before, "turnLeft").world);
	const rightFree = !wallAhead(applyAction(before, "turnRight").world);
	const tips = [`${`На ${n}-й дії герой урізався в перешкоду.`} ${leftFree && !rightFree ? "Перед цим кроком треба повернути ліворуч ↺." : rightFree && !leftFree ? "Перед цим кроком треба повернути праворуч ↻." : leftFree && rightFree ? "Перед цим кроком треба повернути: подивись, куди веде стежка." : "Тут глухий кут: схоже, герой раніше пішов не туди."}`];
	if (has("repeat")) tips.push("Якщо цей крок у «повторити», перевір число повторень: можливо, воно завелике.");
	return tips;
};
var itemAdvice = (level, result, has) => {
	const left = result.world.crystals;
	if (!level.goals.some((g) => g.type === "crystals") || left.size === 0) return [];
	const item = level.scene?.item ?? "crystal";
	const noun = NOUNS[item];
	const verb = item === "campfire" ? "запалив" : "взяв";
	const start = startWorld(level);
	const visited = /* @__PURE__ */ new Set([cellKey(start.hero.x, start.hero.y), ...result.frames.map((f) => cellKey(f.world.hero.x, f.world.hero.y))]);
	const missed = [...left].filter((key) => visited.has(key)).length;
	const unreached = left.size - missed;
	const tips = [];
	const passed = `Герой дійшов до ${noun.to[missed === 1 ? 0 : 1]}, але не ${verb} ${noun.it[missed === 1 ? 0 : 1]}.`;
	if (missed > 0 && !has("collect")) tips.push(`У програмі немає блока «взяти». ${passed}`);
	else if (missed > 0) tips.push(`${passed} Постав «взяти» одразу після кроку, яким він туди стає.`);
	if (unreached > 0) tips.push(`Ще ${unreached} — там, куди герой не дійшов: потрібно більше кроків або повторень.`);
	return tips;
};
var finishAdvice = (level, result) => {
	if (!level.goals.some((g) => g.type === "finish") || result.world.finish === null) return [];
	const { x, y } = result.world.hero;
	if (result.world.finish.x === x && result.world.finish.y === y) return [];
	const d = distanceToFinish(result.world, {
		x,
		y
	});
	if (d === null) return [];
	return [`Програма закінчилась, коли до мети лишалось ${d} ${steps(d)}. Додай дій або збільш число повторень.`];
};
var times3 = (n) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? "удар" : few(n) ? "удари" : "ударів"}`;
/** The enemies took the hearts: say who hits and when, and how many blows a boss needs. */
var defeatAdvice = (level, result) => {
	const tips = ["Ворог, що стоїть поруч, замахується, а наступним ходом б'є. Вдар його одразу, як він підійде, і не стій до нього спиною."];
	const boss = result.world.enemies.find((e) => e.boss && e.hp > 0);
	if (boss !== void 0) tips.push(`Бос витримує ${times3(boss.maxHp)} і б'є у відповідь. Лишилось ${times3(boss.hp)}: повтори «вдарити» стільки разів.`);
	const turns = result.frames.filter((f) => f.action === "turnLeft" || f.action === "turnRight").length;
	if (level.blocks.includes("enemyAhead") && turns > 0) tips.push("Кожен поворот — теж хід: поки герой крутиться, ворог встигає вдарити.");
	return tips;
};
var enemyGoalAdvice = (level, result) => {
	if (!level.goals.some((g) => g.type === "enemies")) return [];
	const left = enemiesLeft(result.world);
	if (left === 0) return [];
	const hurt = result.world.enemies.find((e) => e.hp > 0 && e.hp < e.maxHp);
	return [`Лишилось ворогів: ${left}.${hurt === void 0 ? " Підійди до них: вороги помічають героя лише зблизька." : ` Одному ще треба ${times3(hurt.hp)}.`}`];
};
/** What is extra in a program: a «взяти» on an empty cell, turns that cancel out. */
var trapAdvice = (level, result) => {
	const tips = [`На ${result.frames.length}-й дії герой ступив на пастку. Обійди її: пастка — як стіна, тільки її не видно, поки не придивишся.`];
	if (level.blocks.includes("trapAhead")) tips.push("Спитай «попереду пастка?» перед кроком і обійди її, якщо так.");
	return tips;
};
var tiredAdvice = (level, result) => {
	const moved = result.frames.filter((f) => f.action === "move" && f.outcome !== "tired").length;
	return [`Герой зробив ${moved} ${steps(moved)} з ${level.maxSteps ?? moved} і втомився. Пошукай коротший шлях: зайві кроки туди й назад забирають сили.`];
};
var extraAdvice = (level, frames) => {
	const tips = [];
	const empty = frames.filter((f) => f.outcome === "nothingToCollect").length;
	const canAsk = level.blocks.includes("if") && level.blocks.includes("onCrystal");
	if (empty > 0) tips.push(`«Взяти» ${empty} ${times(empty)} спрацював на порожній клітинці. ${canAsk ? "Прибери зайвий «взяти» або сховай його в «якщо тут щось є?»." : "Прибери зайвий «взяти»."}`);
	const missed = frames.filter((f) => f.outcome === "swingMissed").length;
	if (missed > 0) tips.push(`«Вдарити» ${missed} ${times(missed)} влучив у порожнечу: попереду не було ворога.`);
	const turns = wastedTurns(frames);
	if (turns.cancel) tips.push("Поворот ліворуч і одразу праворуч гасять один одного: прибери обидва.");
	if (turns.triple) tips.push("Три повороти в один бік — це один поворот в інший бік.");
	return tips;
};
var adviseRun = (level, program, result) => {
	const used = usedBlocks(program);
	const has = (b) => used.has(opcodeOf(b));
	const loops = has("repeat") || has("repeatUntil") || has("forever");
	if (result.passed) {
		if (level.stars === void 0 || result.stars === 3) return [];
		const tips = [`Блоків ${result.blocks}, а для трьох зірок досить ${level.stars.three}.`];
		if (!loops && level.blocks.includes("repeat")) tips.push("Знайди дії, що повторюються, і поклади їх у «повторити».");
		return [...tips, ...extraAdvice(level, result.frames)].slice(0, 3);
	}
	switch (result.reason) {
		case "crashed": return [...crashAdvice(level, result, has), ...extraAdvice(level, result.frames)].slice(0, 3);
		case "trapped": return [...trapAdvice(level, result), ...extraAdvice(level, result.frames)].slice(0, 3);
		case "tired": return [...tiredAdvice(level, result), ...extraAdvice(level, result.frames)].slice(0, 3);
		case "defeated": return [...defeatAdvice(level, result), ...extraAdvice(level, result.frames)].slice(0, 3);
		case "goalsNotMet": return [
			...itemAdvice(level, result, has),
			...enemyGoalAdvice(level, result),
			...finishAdvice(level, result),
			...extraAdvice(level, result.frames)
		].slice(0, 3);
		case "tooLong": return has("repeatUntil") || has("forever") ? ["Герой ходить без кінця. Перевір умову в «повторити до»: чи стане вона колись правдою?"] : [];
		default: return [];
	}
};
// src/core/kit.ts
var SIGN = {
	wall: "#",
	floor: ".",
	start: "S",
	item: "c",
	finish: "F",
	trap: "x"
};
/** The smallest and the largest map a level can have, walls around it included. */
var MAP_LIMITS = {
	min: 3,
	max: 16
};
var clampSize = (n) => Math.min(MAP_LIMITS.max, Math.max(MAP_LIMITS.min, Math.round(n)));
/** A map of walls with the start in the top-left corner inside. */
var emptyMap = (width, height) => {
	const w = clampSize(width);
	const h = clampSize(height);
	return Array.from({ length: h }, (_, y) => y === 1 ? `#S${"#".repeat(w - 2)}` : "#".repeat(w));
};
var tileAt = (map, x, y) => {
	const sign = map[y]?.[x] ?? "#";
	return Object.keys(SIGN).find((t) => SIGN[t] === sign) ?? "wall";
};
/**
* The map with one cell changed. A map has one start and at most one finish: putting one moves it, and the old
* place becomes floor. The start is never painted over, so a map always keeps it.
*/
var setTile = (map, x, y, tile) => {
	if (y < 0 || y >= map.length || x < 0 || x >= (map[y]?.length ?? 0)) return map;
	if (tileAt(map, x, y) === "start") return map;
	const unique = tile === "start" || tile === "finish";
	return map.map((row, ry) => [...row].map((sign, rx) => {
		if (rx === x && ry === y) return SIGN[tile];
		return unique && sign === SIGN[tile] ? SIGN.floor : sign;
	}).join(""));
};
/** The map cut or grown to a new size; new cells are walls, and the start stays. */
var resizeMap = (map, width, height) => {
	const w = clampSize(width);
	const h = clampSize(height);
	const rows = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => map[y]?.[x] ?? "#").join(""));
	return rows.some((r) => r.includes("S")) ? rows : setStartAnywhere(rows);
};
var setStartAnywhere = (rows) => {
	const y = Math.min(1, rows.length - 1);
	return rows.map((row, ry) => ry === y ? `${row.slice(0, 1)}S${row.slice(2)}` : row);
};
var STEPS_AROUND = [
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1]
];
/** Floor cells the hero can walk to from the start without stepping on a trap. */
var reachable = (map) => {
	const world = parseMap(map);
	const seen = /* @__PURE__ */ new Set([cellKey(world.hero.x, world.hero.y)]);
	const queue = [world.hero];
	for (let c = queue.shift(); c !== void 0; c = queue.shift()) for (const [dx, dy] of STEPS_AROUND) {
		const x = c.x + dx;
		const y = c.y + dy;
		const key = cellKey(x, y);
		if (x < 0 || y < 0 || x >= world.width || y >= world.height || world.walls.has(key) || world.traps.has(key) || seen.has(key)) continue;
		seen.add(key);
		queue.push({
			x,
			y
		});
	}
	return seen;
};
/** What keeps a level from being played (errors) and what would make it better (warnings). */
var checkLevel = (level) => {
	let world;
	try {
		world = parseMap(level.map, level.dir);
	} catch (e) {
		return [{
			level: "error",
			text: e instanceof Error ? e.message : String(e)
		}];
	}
	const issues = [];
	const error = (text) => issues.push({
		level: "error",
		text
	});
	const warning = (text) => issues.push({
		level: "warning",
		text
	});
	const wants = (type) => level.goals.some((g) => g.type === type);
	const has = (b) => level.blocks.includes(b);
	if (level.title.trim() === "") error("Немає назви рівня");
	if (level.goals.length === 0) error("Немає мети: збери предмети, дійди до мети або обидва");
	if (wants("crystals") && world.totalCrystals === 0) error("Мета — зібрати предмети, а на мапі немає жодного c");
	if (wants("finish") && world.finish === null) error("Мета — дійти до F, а на мапі немає F");
	if (!has("move")) error("У палітрі немає «крок уперед»: герой не зрушить");
	if (wants("crystals") && !has("collect")) error("Предмети треба брати, а в палітрі немає «взяти»");
	const enemies = level.enemies ?? [];
	if (wants("enemies") && enemies.length === 0) error("Мета — перемогти ворогів, а ворогів на мапі немає");
	if (enemies.length > 0 && !has("attack")) (wants("enemies") ? error : warning)("На мапі є вороги, а в палітрі немає «вдарити»: їх можна лише обійти");
	const taken = /* @__PURE__ */ new Set();
	for (const e of enemies) {
		const key = cellKey(e.x, e.y);
		if (world.walls.has(key) || e.x < 0 || e.y < 0 || e.x >= world.width || e.y >= world.height) error(`Ворог на (${e.x}, ${e.y}) стоїть на стіні або поза мапою`);
		else if (e.x === world.hero.x && e.y === world.hero.y) error("Ворог стоїть на старті героя");
		else if (taken.has(key)) error(`Два вороги на одній клітинці (${e.x}, ${e.y})`);
		taken.add(key);
	}
	const open = reachable(level.map);
	const lost = [...world.crystals].filter((key) => !open.has(key)).length;
	if (lost > 0) error(`Герой не дійде до ${lost} предмет${lost === 1 ? "а" : "ів"}: їх відрізають стіни або пастки`);
	if (world.finish !== null && !open.has(cellKey(world.finish.x, world.finish.y))) error("Герой не дійде до мети F: її відрізають стіни або пастки");
	for (const e of enemies) if (world.traps.has(cellKey(e.x, e.y))) error(`Ворог на (${e.x}, ${e.y}) стоїть на пастці`);
	if (level.maxSteps !== void 0 && !(level.maxSteps >= 1)) error("Кроків має бути щонайменше 1");
	if (!wants("crystals") && world.totalCrystals > 0) warning("На мапі є предмети, але мета їх не просить");
	if (!wants("finish") && world.finish !== null) warning("На мапі є F, але мета не просить до неї дійти");
	const lostEnemies = enemies.filter((e) => !open.has(cellKey(e.x, e.y))).length;
	if (wants("enemies") && lostEnemies > 0) error(`Герой не дійде до ${lostEnemies} ворог${lostEnemies === 1 ? "а" : "ів"}: їх відрізають стіни`);
	if ((level.scene?.npcs ?? []).filter((n) => !world.walls.has(cellKey(n.x, n.y)) && n.x >= 0 && n.y >= 0 && n.x < world.width && n.y < world.height).length > 0) warning("Людина стоїть на стежці: герой пройде крізь неї. Краще постав її на стіну поруч");
	if (level.stars !== void 0 && level.stars.two < level.stars.three) error("Для двох зірок блоків має бути не менше, ніж для трьох");
	if (level.stars === void 0) warning("Без меж для зірок будь-який розв'язок отримає три зірки");
	if (level.task.every((line) => line.trim() === "")) warning("Немає тексту завдання для учня");
	if (level.hint === void 0 || level.hint.trim() === "") warning("Немає підказки після невдалої спроби");
	return issues;
};
var TURN_RIGHT = {
	up: "right",
	right: "down",
	down: "left",
	left: "up"
};
var directionTo = (from, to) => to.x > from.x ? "right" : to.x < from.x ? "left" : to.y > from.y ? "down" : "up";
/** Shortest walk between two cells, without the first cell. */
var walk = (map, from, to) => {
	const world = parseMap(map);
	const back = /* @__PURE__ */ new Map([[cellKey(from.x, from.y), null]]);
	const queue = [from];
	for (let c = queue.shift(); c !== void 0; c = queue.shift()) {
		if (c.x === to.x && c.y === to.y) {
			const path = [];
			for (let p = c; p !== null && p !== void 0; p = back.get(cellKey(p.x, p.y))) path.unshift(p);
			return path.slice(1);
		}
		for (const [dx, dy] of STEPS_AROUND) {
			const x = c.x + dx;
			const y = c.y + dy;
			const key = cellKey(x, y);
			if (x < 0 || y < 0 || x >= world.width || y >= world.height || world.walls.has(key) || world.traps.has(key) || back.has(key)) continue;
			back.set(key, c);
			queue.push({
				x,
				y
			});
		}
	}
	return null;
};
var cellOf = (key) => {
	const [x = 0, y = 0] = key.split(",").map(Number);
	return {
		x,
		y
	};
};
/** Items up to this many are taken in the order with the fewest steps; more are taken nearest first. */
var ORDER_LIMIT = 7;
/**
* The order of the items with the fewest steps from the start (and on to the finish when the level asks for it):
* on a level with few steps the nearest item first can be the wrong way. Empty when there are too many items.
*/
var itemOrder = (level, world) => {
	const items = [...world.crystals].map(cellOf);
	if (items.length === 0 || items.length > ORDER_LIMIT) return [];
	const finish = level.goals.some((g) => g.type === "finish") ? world.finish : null;
	const length = (a, b) => walk(level.map, a, b)?.length ?? Infinity;
	let best = {
		cost: Infinity,
		order: []
	};
	const visit = (at, order, cost) => {
		if (cost >= best.cost) return;
		const rest = items.filter((c) => !order.includes(c));
		if (rest.length === 0) {
			const total = finish === null ? cost : cost + length(at, finish);
			if (total < best.cost) best = {
				cost: total,
				order
			};
			return;
		}
		for (const next of rest) visit(next, [...order, next], cost + length(at, next));
	};
	visit(world.hero, [], 0);
	return best.order;
};
/** Hero actions a plain route may take before it gives up. */
var ROUTE_LIMIT = 500;
/**
* A plain route without loops: to the nearest item each time, then to the nearest enemy (struck until it falls)
* when the goal asks for it, then to the finish. An enemy in the way is struck too. The route is played on the
* real rules, so walking enemies are followed. Good to check that a level can be done and to see how long a program
* without «повторити» is. Null when the level cannot be done this way.
*/
var plainRoute = (level) => {
	if (checkLevel(level).some((i) => i.level === "error")) return null;
	let world = startWorld(level);
	const steps = [];
	/** False when the run is lost or too long. */
	const act = (action) => {
		steps.push(action);
		const done = applyAction(world, action);
		world = done.world;
		return allGoalsMet(level, world) || !isFatal(done.outcome) && world.hearts > 0 && steps.length < ROUTE_LIMIT;
	};
	const face = (want) => {
		const dir = world.hero.dir;
		if (TURN_RIGHT[TURN_RIGHT[dir]] === want) return act("turnRight") && act("turnRight");
		if (TURN_RIGHT[dir] === want) return act("turnRight");
		if (TURN_RIGHT[want] === dir) return act("turnLeft");
		return true;
	};
	/** One step toward a cell (striking an enemy in the way); false when there is no way or the run is lost. */
	const advance = (target) => {
		const next = walk(level.map, world.hero, target)?.[0];
		if (next === void 0) return false;
		if (!face(directionTo(world.hero, next))) return false;
		return act(enemyAhead(world) ? "attack" : "move");
	};
	const nearest = (cells) => cells.map((cell) => ({
		cell,
		length: walk(level.map, world.hero, cell)?.length ?? Infinity
	})).filter((c) => c.length < Infinity).sort((a, b) => a.length - b.length)[0]?.cell;
	const done = () => allGoalsMet(level, world);
	const wants = (type) => level.goals.some((g) => g.type === type);
	const order = itemOrder(level, world);
	while (wants("crystals") && world.crystals.size > 0 && !done()) {
		const left = order.filter((c) => world.crystals.has(cellKey(c.x, c.y)));
		const item = left.length > 0 ? left[0] : nearest([...world.crystals].map(cellOf));
		if (item === void 0) return null;
		if (world.hero.x === item.x && world.hero.y === item.y) {
			if (!act("collect")) return null;
		} else if (!advance(item)) return null;
	}
	while (wants("enemies") && world.enemies.some(isAlive) && !done()) {
		const enemy = nearest(world.enemies.filter(isAlive));
		if (enemy === void 0 || !advance(enemy)) return done() ? steps : null;
	}
	while (wants("finish") && world.finish !== null && !atFinish(world) && !done()) if (!advance(world.finish)) return null;
	return done() ? steps : null;
};
/** The level as a TypeScript object for `src/levels/index.ts`. */
var levelSource = (level) => {
	return JSON.stringify(level, null, 2).replace(/^(\s*)"([a-zA-Z]\w*)":/gm, "$1$2:");
};
export { BOSS_HP, DEFAULT_HEARTS, DEFAULT_SIGHT, FIRST_TRY_XP, HERO_BLOCKS, HERO_COLOR, HERO_EXTENSION_ID, HERO_LEVELS, MAP_LIMITS, MAX_ACTIONS, MAX_ADVICE, MAX_FRAMES, MAX_PASSES, MAX_PROGRAM_BLOCKS, MAX_STEPS, START_OPCODE, STAR_XP, TIER_XP, adviseRun, allGoalsMet, allowedOpcodes, applyAction, atFinish, buildProgram, cellAhead, cellKey, chapterLevels, chapterOf, chapters, checkLevel, checkProgram, describeGoal, emptyMap, enemiesLeft, enemyAhead, enemyAt, enemyOf, goalMet, heroLevelOf, isAlive, isFatal, isFirstChapter, isNumberShadow, isWall, judgeProgram, levelSource, levels, maxXp, onCrystal, opcodeOf, parseMap, plainRoute, resizeMap, setTile, solutions, starsFor, startWorld, tileAt, trapAhead, wallAhead, xpFor, xpGain };
