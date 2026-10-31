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
/** A variable reporter that the editor keeps not as a block but as `[12, name, id]`. */
var VARIABLE_PRIMITIVE = 12;
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
// src/core/build.ts
/** The mutation of a custom block, as the editor keeps it. */
var mutation = (name, prototype) => ({
	tagName: "mutation",
	children: [],
	proccode: name,
	argumentids: "[]",
	...prototype ? {
		argumentnames: "[]",
		argumentdefaults: "[]"
	} : {},
	warp: "false"
});
var buildProgram = (steps, definition) => {
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
	const procedure = definition?.name ?? "мій блок";
	/** A number slot: a shadow with the number, covered by the counter when it is `"counter"`. */
	const numberInput = (id, name, shadow, value) => {
		const number = add(shadow, id, {
			shadow: true,
			fields: { NUM: [value === "counter" ? "0" : String(value), null] }
		});
		if (value !== "counter") {
			blocks[id].inputs[name] = [1, number];
			return;
		}
		const variable = add(VARIABLE_OPCODE, id, { fields: { VARIABLE: [COUNTER_NAME, COUNTER_ID] } });
		blocks[id].inputs[name] = [
			3,
			variable,
			number
		];
	};
	const step = (s, parent) => {
		if (s === "call") return add(CALL_OPCODE, parent, { mutation: mutation(procedure, false) });
		if (typeof s === "string") return add(opcodeOf(s), parent);
		if ("set" in s) {
			const id = add(SET_OPCODE, parent, { fields: { VARIABLE: [COUNTER_NAME, COUNTER_ID] } });
			blocks[id].inputs.VALUE = [1, add("text", id, {
				shadow: true,
				fields: { TEXT: [String(s.set), null] }
			})];
			return id;
		}
		if ("change" in s) {
			const id = add(CHANGE_OPCODE, parent, { fields: { VARIABLE: [COUNTER_NAME, COUNTER_ID] } });
			numberInput(id, "VALUE", "math_number", s.change);
			return id;
		}
		if ("repeat" in s) {
			const id = add("control_repeat", parent);
			numberInput(id, "TIMES", "math_whole_number", s.repeat);
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
	if (definition !== void 0) {
		const define = add(DEFINITION_OPCODE, null, {
			topLevel: true,
			x: 360,
			y: 40
		});
		blocks[define].inputs.custom_block = [1, add(PROTOTYPE_OPCODE, define, {
			shadow: true,
			mutation: mutation(procedure, true)
		})];
		blocks[define].next = stack(definition.body, define);
	}
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
var distance$1 = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
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
			if (distance$1(c, world.hero) === 1) return first.get(cellKey(c.x, c.y)) ?? null;
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
	const near = distance$1(self, world.hero);
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
// src/core/program.ts
var MAX_PROGRAM_BLOCKS = 300;
/** Hero actions in one run. A textbook level needs fewer than 100. */
var MAX_ACTIONS = 1e3;
/** VM frames in one run. A «завжди» loop without actions ends here. */
var MAX_FRAMES = 2e3;
/** The reason a run stops after this outcome, or null when it goes on. */
var fatalReason = (outcome) => outcome === "crashed" ? "crashed" : outcome === "fell" ? "trapped" : outcome === "tired" ? "tired" : null;
var isRecord$1 = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
var isProgramBlock = (value) => isRecord$1(value) && typeof value.opcode === "string";
/** A variable reporter as the editor keeps it: `[12, name, id]`, inside an input or alone on the canvas. */
var isVariablePrimitive = (value) => Array.isArray(value) && value[0] === 12;
/** Variable reporters kept inside the inputs of a block. Each is a block the student put, so it counts. */
var variablesIn = (block) => isRecord$1(block.inputs) ? Object.values(block.inputs).filter((input) => Array.isArray(input) && isVariablePrimitive(input[1])).length : 0;
/** A custom block «без оновлення екрана» runs on the clock in Scratch, so a run could differ: it is refused. */
var isWarp = (block) => isRecord$1(block.mutation) && (block.mutation.warp === true || block.mutation.warp === "true");
var proccodeOf = (block) => isRecord$1(block.mutation) ? block.mutation.proccode : void 0;
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
// src/core/judge.ts
/**
* Runs a program without the VM: a small interpreter for the blocks a level can have. Synchronous and pure,
* so the browser and the server get the same result, and a server does not need scratch-vm.
*
* It follows the Scratch 3 sequencer. Each «коли прапорець натиснуто» script is a thread with a stack of frames,
* as in the VM. A pass steps every thread in turn; a thread runs until the end of a loop iteration (or a custom
* block that calls itself), then gives the turn to the next thread.
* The tests compare it with the VM (`run.ts`) on many programs.
*/
/** Passes before a run stops as too long: the VM limit (MAX_FRAMES frames of PASSES_PER_FRAME passes). */
var MAX_PASSES = MAX_FRAMES * 20;
/** Blocks executed in one run. A program can go over it only with a damaged `next` that makes a circle. */
var MAX_STEPS = 2e5;
/**
* Custom blocks running inside each other. Only a block that calls itself goes deep; the VM has no limit, but
* each level that acts takes one of MAX_ACTIONS, so a run ends there before this limit.
*/
var MAX_CALL_DEPTH = MAX_ACTIONS;
/** Enclosing blocks the VM looks through to tell that a custom block calls itself (`Thread.isRecursiveCall`). */
var RECURSION_LOOKBACK = 6;
var newFrame = (id, depth, calls) => ({
	id,
	isLoop: false,
	loopCounter: void 0,
	depth,
	calls
});
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
	const session = newSession(level);
	const checked = checkProgram(level, program);
	if ("error" in checked) return resultOf(level, {
		...session,
		reason: "badProgram"
	}, 0, { detail: checked.error });
	if (!checked.hasStart) return resultOf(level, {
		...session,
		reason: "noStart"
	}, checked.blocks);
	/** What an input holds: a block id, a primitive `[type, value]`, or nothing. */
	const inputOf = (block, name) => {
		if (!isRecord(block.inputs)) return null;
		const input = block.inputs[name];
		return Array.isArray(input) ? input[1] : null;
	};
	const blockAt = (id) => {
		if (typeof id !== "string" || !Object.hasOwn(program, id)) return null;
		const block = program[id];
		if (!isRecord(block) || typeof block.opcode !== "string") return null;
		return {
			opcode: block.opcode,
			next: block.next,
			inputs: block.inputs,
			fields: block.fields,
			topLevel: block.topLevel,
			mutation: block.mutation
		};
	};
	const proccodeOf = (block) => block !== null && isRecord(block.mutation) ? block.mutation.proccode : void 0;
	/** Custom blocks by name: the first «визначити» with that name, as the VM finds it. */
	const definitions = /* @__PURE__ */ new Map();
	for (const [id] of Object.entries(program)) {
		const block = blockAt(id);
		if (block === null || block.opcode !== "procedures_definition") continue;
		const name = proccodeOf(blockAt(inputOf(block, "custom_block")));
		if (name !== void 0 && !definitions.has(name)) definitions.set(name, id);
	}
	const variables = /* @__PURE__ */ new Map([[COUNTER_ID, {
		name: COUNTER_NAME,
		value: 0
	}]]);
	const variable = (field) => {
		const [name, id] = Array.isArray(field) ? field : [];
		const byId = variables.get(id);
		if (byId !== void 0) return byId;
		for (const v of variables.values()) if (v.name === name) return v;
		const created = {
			name,
			value: 0
		};
		variables.set(id, created);
		return created;
	};
	const fieldOf = (block, name) => isRecord(block.fields) ? block.fields[name] : void 0;
	const counted = level.blocks.includes("counter");
	let steps = 0;
	const step = () => {
		if (++steps > 2e5) throw new Stop("tooLong");
	};
	const act = (action, blockId) => {
		const counter = counted ? { counter: String(variable([COUNTER_NAME, COUNTER_ID]).value) } : {};
		if (heroAct(level, session, action, {
			blockId,
			...counter
		})) throw new Stop(session.reason);
	};
	/** A Boolean input: an empty slot is false, as in Scratch. */
	const question = (ref, depth) => {
		if (depth > 300) throw new Stop("badProgram");
		const block = blockAt(ref);
		if (block === null) return false;
		step();
		const sensor = sensorOfOpcode(block.opcode);
		if (sensor !== void 0) return heroSense(session, sensor);
		switch (block.opcode) {
			case "operator_not": return !question(inputOf(block, "OPERAND"), depth + 1);
			case "operator_and": return question(inputOf(block, "OPERAND1"), depth + 1) && question(inputOf(block, "OPERAND2"), depth + 1);
			case "operator_or": return question(inputOf(block, "OPERAND1"), depth + 1) || question(inputOf(block, "OPERAND2"), depth + 1);
			default: return false;
		}
	};
	/** What a number or text slot gives: a primitive, a shadow with the number, the counter or a question. */
	const value = (ref) => {
		if (Array.isArray(ref)) return ref[0] === 12 ? variable([ref[1], ref[2]]).value : ref[1];
		const block = blockAt(ref);
		if (block === null) return "";
		if (block.opcode === "data_variable") return variable(fieldOf(block, "VARIABLE")).value;
		const field = fieldOf(block, "NUM") ?? fieldOf(block, "TEXT");
		if (Array.isArray(field)) return field[0];
		return question(ref, 0);
	};
	/** The count of «повторити», taken once when the loop starts, as in Scratch. */
	const count = (block) => Math.round(toNumber(value(inputOf(block, "TIMES"))));
	/** Does the VM see this call as a custom block calling itself (`Thread.isRecursiveCall`)? Then it yields. */
	const recursive = (thread, name) => {
		for (let i = thread.length - 2, looked = 0; i >= 0 && looked < RECURSION_LOOKBACK; i--, looked++) {
			const block = blockAt(thread[i]?.id);
			if (block !== null && block.opcode === "procedures_call" && proccodeOf(block) === name) return true;
		}
		return false;
	};
	/** Puts a branch of the block on top of the stack, as `startBranch` does. */
	const branch = (thread, frame, block, input, isLoop) => {
		if (frame.depth >= 300) throw new Stop("badProgram");
		frame.isLoop = isLoop;
		thread.push(newFrame(inputOf(block, input), frame.depth + 1, frame.calls));
		return "pushed";
	};
	/** Runs the block on top of the stack. */
	const execute = (thread, frame, block, id) => {
		const action = actionOfOpcode(block.opcode);
		if (action !== void 0) {
			act(action, id);
			return "next";
		}
		switch (block.opcode) {
			case "control_repeat":
				frame.loopCounter ??= count(block);
				frame.loopCounter--;
				return frame.loopCounter >= 0 ? branch(thread, frame, block, "SUBSTACK", true) : "next";
			case "control_forever": return branch(thread, frame, block, "SUBSTACK", true);
			case "control_repeat_until": return question(inputOf(block, "CONDITION"), 0) ? "next" : branch(thread, frame, block, "SUBSTACK", true);
			case "control_if": return question(inputOf(block, "CONDITION"), 0) ? branch(thread, frame, block, "SUBSTACK", false) : "next";
			case "control_if_else": return branch(thread, frame, block, question(inputOf(block, "CONDITION"), 0) ? "SUBSTACK" : "SUBSTACK2", false);
			case SET_OPCODE:
				variable(fieldOf(block, "VARIABLE")).value = value(inputOf(block, "VALUE"));
				return "next";
			case CHANGE_OPCODE: {
				const v = variable(fieldOf(block, "VARIABLE"));
				v.value = toNumber(v.value) + toNumber(value(inputOf(block, "VALUE")));
				return "next";
			}
			case CALL_OPCODE: {
				const name = proccodeOf(block);
				const definition = definitions.get(name);
				if (definition === void 0) return "next";
				if (frame.calls >= MAX_CALL_DEPTH) throw new Stop("tooLong");
				const yields = recursive(thread, name);
				thread.push(newFrame(definition, 0, frame.calls + 1));
				return yields ? "yield" : "pushed";
			}
			default: return "next";
		}
	};
	/** Moves the frame to the next block, as `goToNextBlock` does. */
	const advance = (frame, block) => {
		frame.id = block === null ? null : block.next;
		frame.isLoop = false;
		frame.loopCounter = void 0;
	};
	/** One turn of a thread (`Sequencer.stepThread`). False when the thread is done. */
	const stepThread = (thread) => {
		for (;;) {
			const frame = thread.at(-1);
			if (frame === void 0) return false;
			const block = blockAt(frame.id);
			if (block !== null && typeof frame.id === "string") {
				step();
				const signal = execute(thread, frame, block, frame.id);
				if (signal === "yield") return true;
				if (signal === "next") advance(frame, block);
			}
			while (blockAt(thread.at(-1)?.id) === null) {
				thread.pop();
				const below = thread.at(-1);
				if (below === void 0) return false;
				if (below.isLoop) return true;
				advance(below, blockAt(below.id));
			}
		}
	};
	const threads = Object.entries(program).filter(([id]) => {
		const block = blockAt(id);
		return block !== null && block.opcode === "event_whenflagclicked" && block.topLevel === true;
	}).map(([id]) => [newFrame(id, 0, 0)]);
	try {
		let alive = threads;
		for (let pass = 0; alive.length > 0; pass++) {
			if (pass >= MAX_PASSES) throw new Stop("tooLong");
			alive = alive.filter(stepThread);
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
	},
	{
		id: "c-apples",
		tier: "practice",
		title: "Яблука все далі",
		task: ["Наприкінці літа ніндзя збирає яблука вздовж стежки: кожне наступне лежить на крок далі за попереднє.", "Нехай лічильник пам'ятає, скільки кроків іти: щоразу додавай до нього 1."],
		map: [
			"#############",
			"#Sc.c..c...c#",
			"#############"
		],
		blocks: [
			"move",
			"collect",
			"repeat",
			"counter"
		],
		goals: [{ type: "crystals" }],
		stars: {
			three: 7,
			two: 11
		},
		hint: "Задай лічильник 1. Потім чотири рази: повтори (лічильник) кроків, візьми яблуко і зміни лічильник на 1.",
		scene: {
			theme: "summer",
			item: "apple"
		}
	},
	{
		id: "c-spiral",
		tier: "practice",
		title: "Равлик у траві",
		task: ["Влітку діти викосили в траві стежку-равлика, а прапорець поставили на її кінці.", "Кожен відрізок стежки на крок довший за попередній. Нехай лічильник рахує довжину."],
		map: [
			"#########",
			"##.....F#",
			"##.######",
			"##.#S.###",
			"##.##.###",
			"##....###",
			"#########"
		],
		blocks: [
			"move",
			"turnRight",
			"repeat",
			"counter"
		],
		goals: [{ type: "finish" }],
		stars: {
			three: 7,
			two: 12
		},
		hint: "Задай лічильник 1. П'ять разів: повтори (лічильник) кроків, поверни праворуч і зміни лічильник на 1.",
		scene: { theme: "summer" }
	},
	{
		id: "c-stones",
		tier: "practice",
		title: "Завали на стежці",
		task: ["Стежку до прапорця завалило: то пеньок, то кущ. Обійти завал — це вісім команд.", "Склади їх один раз у блоці «обійти», а далі просто клич його, коли попереду завал."],
		map: [
			"##############",
			"##...#......##",
			"#S.#...#..#.F#",
			"##############"
		],
		blocks: [
			"move",
			"turnLeft",
			"turnRight",
			"procedure"
		],
		procedure: "обійти",
		goals: [{ type: "finish" }],
		stars: {
			three: 17,
			two: 23
		},
		hint: "Під «визначити обійти»: ліворуч, крок, праворуч, два кроки, праворуч, крок, ліворуч. Головна програма: крок, обійти, два кроки, обійти, крок, обійти, крок.",
		scene: { theme: "summer" }
	},
	{
		id: "c-rocks",
		tier: "challenge",
		title: "Гірська стежка",
		task: ["Остання прогулянка літа: між завалами все більше кроків, а за кожним завалом лежить кристал.", "Поєднай лічильник і свій блок «обійти», щоб програма вийшла короткою."],
		map: [
			"###############",
			"##...#...##...#",
			"#S.#c..#c...#c#",
			"###############"
		],
		blocks: [
			"move",
			"turnLeft",
			"turnRight",
			"collect",
			"repeat",
			"counter",
			"procedure"
		],
		procedure: "обійти",
		goals: [{ type: "crystals" }],
		stars: {
			three: 17,
			two: 20
		},
		hint: "Три рази: повтори (лічильник) кроків, обійти, взяти, зміни лічильник на 1. А на початку задай лічильник 1.",
		scene: { theme: "summer" }
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
/** The levels of a chapter, in order. */
var chapterLevels = (chapter) => chapter.levels.flatMap((id) => levels.find((l) => l.id === id) ?? []);
/** The first chapter has bigger blocks and a bigger field for the youngest. */
var isFirstChapter = (levelId) => chapters[0]?.levels.includes(levelId) === true;
// src/levels/solutions.ts
var BYPASS = [
	"turnLeft",
	"move",
	"turnRight",
	"move",
	"move",
	"turnRight",
	"move",
	"turnLeft"
];
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
	}],
	"c-apples": [{ set: 1 }, {
		repeat: 4,
		body: [
			{
				repeat: "counter",
				body: ["move"]
			},
			"collect",
			{ change: 1 }
		]
	}],
	"c-spiral": [{ set: 1 }, {
		repeat: 5,
		body: [
			{
				repeat: "counter",
				body: ["move"]
			},
			"turnRight",
			{ change: 1 }
		]
	}],
	"c-stones": [
		"move",
		"call",
		"move",
		"move",
		"call",
		"move",
		"call",
		"move"
	],
	"c-rocks": [{ set: 1 }, {
		repeat: 3,
		body: [
			{
				repeat: "counter",
				body: ["move"]
			},
			"call",
			"collect",
			{ change: 1 }
		]
	}]
};
/** The custom block of the solutions that call one, by level id. */
var definitions = {
	"c-stones": {
		name: "обійти",
		body: BYPASS
	},
	"c-rocks": {
		name: "обійти",
		body: BYPASS
	}
};
/** The solution of a level as a program, with its custom block when it has one. Empty for an unknown level. */
var solutionProgram = (levelId) => buildProgram(solutions[levelId] ?? [], definitions[levelId]);
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
// src/core/heroes.ts
var HEROES = [
	{
		id: "ninja",
		name: "Ніндзя",
		about: "Тихий мандрівник у синьому. З ним починається пригода.",
		heroLevel: 1
	},
	{
		id: "robot",
		name: "Робот",
		about: "Залізний помічник із ріжками. Не знає втоми.",
		heroLevel: 2
	},
	{
		id: "rover",
		name: "Ровер",
		about: "Розвідник у фіолетовому шоломі. Перший на нових стежках.",
		heroLevel: 3
	},
	{
		id: "bee",
		name: "Бджілка",
		about: "Маленька і спритна. Гуде на всю долину.",
		heroLevel: 4
	}
];
/** Whether a hero is open at this hero level. */
var heroOpen = (hero, heroLevel) => heroLevel >= hero.heroLevel;
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
// src/core/python/errors.ts
/**
* A mistake in a student's Python program, with the line it is on. Every message is in Ukrainian and says what to
* change, not only what is wrong: the students are 9 to 12 years old.
*/
var PyError = class extends Error {
	line;
	constructor(message, line) {
		super(message);
		this.line = line;
		this.name = "PyError";
	}
};
/** Edit distance, a swap of two neighbouring letters counted as one edit: to suggest the name a student meant. */
var distance = (a, b) => {
	const rows = [Array.from({ length: b.length + 1 }, (_, j) => j)];
	for (let i = 1; i <= a.length; i++) {
		const row = [i];
		for (let j = 1; j <= b.length; j++) {
			const up = rows[i - 1] ?? [];
			let d = Math.min((up[j] ?? 0) + 1, (row[j - 1] ?? 0) + 1, (up[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1));
			if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, (rows[i - 2]?.[j - 2] ?? 0) + 1);
			row[j] = d;
		}
		rows.push(row);
	}
	return rows[a.length]?.[b.length] ?? 0;
};
/** The closest known name, when it is close enough to be a typo; the same name in other letter case first. */
var closest = (name, known) => {
	let best = null;
	let bestDistance = Infinity;
	for (const candidate of known) {
		if (candidate.toLowerCase() === name.toLowerCase()) return candidate;
		const d = distance(name, candidate);
		if (d < bestDistance) {
			best = candidate;
			bestDistance = d;
		}
	}
	return best !== null && bestDistance <= Math.max(1, Math.floor(name.length / 3)) ? best : null;
};
// src/core/python/api.ts
var PYTHON_METHODS = [
	{
		name: "move",
		signature: "move()",
		doc: "Крок уперед. hero.move(3) робить три кроки.",
		block: "move",
		action: "move"
	},
	{
		name: "turn_left",
		signature: "turn_left()",
		doc: "Поворот ліворуч.",
		block: "turnLeft",
		action: "turnLeft"
	},
	{
		name: "turn_right",
		signature: "turn_right()",
		doc: "Поворот праворуч.",
		block: "turnRight",
		action: "turnRight"
	},
	{
		name: "collect",
		signature: "collect()",
		doc: "Взяти те, що лежить тут.",
		block: "collect",
		action: "collect"
	},
	{
		name: "attack",
		signature: "attack()",
		doc: "Вдарити ворога попереду.",
		block: "attack",
		action: "attack"
	},
	{
		name: "wall_ahead",
		signature: "wall_ahead()",
		doc: "True, якщо попереду стіна.",
		block: "wallAhead",
		sensor: "wallAhead"
	},
	{
		name: "item_here",
		signature: "item_here()",
		doc: "True, якщо тут щось лежить.",
		block: "onCrystal",
		sensor: "onCrystal"
	},
	{
		name: "at_finish",
		signature: "at_finish()",
		doc: "True, якщо герой дійшов до мети.",
		block: "atFinish",
		sensor: "atFinish"
	},
	{
		name: "enemy_ahead",
		signature: "enemy_ahead()",
		doc: "True, якщо попереду ворог.",
		block: "enemyAhead",
		sensor: "enemyAhead"
	},
	{
		name: "trap_ahead",
		signature: "trap_ahead()",
		doc: "True, якщо попереду пастка.",
		block: "trapAhead",
		sensor: "trapAhead"
	}
];
/** The methods a level opens, in palette order. */
var pythonMethodsOf = (blocks) => PYTHON_METHODS.filter((m) => blocks.includes(m.block));
/** The name the hero has in a program. */
var HERO_NAME = "hero";
/** Steps one `hero.move(n)` may ask for. */
var MAX_MOVE_STEPS = 100;
// src/core/python/values.ts
/** Items one list or text may hold, so a program cannot fill the memory. */
var MAX_ITEMS = 1e4;
var list = (items) => ({
	type: "list",
	items
});
var isList = (v) => typeof v === "object" && v !== null && v.type === "list";
var isCallable = (v) => typeof v === "object" && v !== null && v.type !== "list" && v.type !== "hero";
/** What a value is, in the words of the messages. */
var typeName = (v) => {
	if (v === null) return "None";
	if (typeof v === "boolean") return "True/False";
	if (typeof v === "number") return "число";
	if (typeof v === "string") return "текст";
	if (v.type === "list") return "список";
	if (v.type === "hero") return "герой";
	return "функція";
};
var truthy = (v) => {
	if (v === null) return false;
	if (typeof v === "boolean") return v;
	if (typeof v === "number") return v !== 0;
	if (typeof v === "string") return v.length > 0;
	if (v.type === "list") return v.items.length > 0;
	return true;
};
var formatNumber = (n) => {
	if (Number.isNaN(n)) return "nan";
	if (!Number.isFinite(n)) return n > 0 ? "inf" : "-inf";
	return String(n);
};
/** `str(v)`, as `print` shows it. */
var str = (v) => typeof v === "string" ? v : repr(v);
/** `repr(v)`: a text in quotes, as it shows inside a list. */
var repr = (v) => {
	if (v === null) return "None";
	if (typeof v === "boolean") return v ? "True" : "False";
	if (typeof v === "number") return formatNumber(v);
	if (typeof v === "string") return `'${v.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;
	switch (v.type) {
		case "list": return `[${v.items.map(repr).join(", ")}]`;
		case "function": return `<функція ${v.def.name}>`;
		case "builtin": return `<функція ${v.name}>`;
		case "hero": return "hero";
		case "heroMethod": return `<метод hero.${v.method.name}>`;
		case "listMethod": return `<метод ${v.name}>`;
	}
};
/** A number for arithmetic: True and False count as 1 and 0, as in Python. */
var asNumber = (v) => typeof v === "number" ? v : typeof v === "boolean" ? v ? 1 : 0 : null;
var toInt = (v, what, line) => {
	const n = asNumber(v);
	if (n === null || !Number.isInteger(n)) throw new PyError(`${what} має бути цілим числом, а тут ${typeName(v)} ${repr(v)}`, line);
	return n;
};
var OP_WORDS = {
	"+": "додати",
	"-": "відняти",
	"*": "помножити",
	"/": "поділити",
	"//": "поділити",
	"%": "взяти остачу",
	"**": "піднести до степеня"
};
/** True when a list or text of this length is allowed; a longer one stops the program. */
var limited = (length, line) => {
	if (length > 1e4) throw new PyError(`Забагато елементів: більше ніж ${MAX_ITEMS}`, line);
	return true;
};
var repeatTimes = (n, length, line) => {
	limited(Math.max(0, n) * length, line);
	return Math.max(0, n);
};
var binary = (op, a, b, line) => {
	const x = asNumber(a);
	const y = asNumber(b);
	if (x !== null && y !== null) return arithmetic(op, x, y, line);
	if (op === "+" && typeof a === "string" && typeof b === "string") return limited(a.length + b.length, line) && a + b;
	if (op === "+" && isList(a) && isList(b)) return limited(a.items.length + b.items.length, line) && list([...a.items, ...b.items]);
	if (op === "*") {
		const [seq, times] = x === null ? [a, y] : [b, x];
		if (typeof seq === "string" && times !== null && Number.isInteger(times)) return seq.repeat(repeatTimes(times, seq.length, line));
		if (isList(seq) && times !== null && Number.isInteger(times)) {
			const n = repeatTimes(times, seq.items.length, line);
			return list(Array.from({ length: n }, () => seq.items).flat());
		}
	}
	const hint = op === "+" && (typeof a === "string" || typeof b === "string") ? ": число в текст перетворює str(…)" : "";
	throw new PyError(`Не можна ${OP_WORDS[op]} ${typeName(a)} і ${typeName(b)}${hint}`, line);
};
var arithmetic = (op, x, y, line) => {
	if ((op === "/" || op === "//" || op === "%") && y === 0) throw new PyError("Ділити на нуль не можна", line);
	switch (op) {
		case "+": return x + y;
		case "-": return x - y;
		case "*": return x * y;
		case "/": return x / y;
		case "//": return Math.floor(x / y);
		case "%": return x - y * Math.floor(x / y);
		case "**": return x ** y;
	}
};
var equal = (a, b) => {
	const x = asNumber(a);
	const y = asNumber(b);
	if (x !== null && y !== null) return x === y;
	if (isList(a) && isList(b)) return a.items.length === b.items.length && a.items.every((item, i) => equal(item, b.items[i] ?? null));
	return a === b;
};
var order = (a, b, line) => {
	const x = asNumber(a);
	const y = asNumber(b);
	if (x !== null && y !== null) return x - y;
	if (typeof a === "string" && typeof b === "string") return a < b ? -1 : a > b ? 1 : 0;
	throw new PyError(`Не можна порівняти ${typeName(a)} і ${typeName(b)}`, line);
};
var contains = (container, item, line) => {
	if (typeof container === "string") {
		if (typeof item !== "string") throw new PyError(`У тексті можна шукати тільки текст, а не ${typeName(item)}`, line);
		return container.includes(item);
	}
	if (isList(container)) return container.items.some((x) => equal(x, item));
	throw new PyError(`«in» працює зі списком або текстом, а тут ${typeName(container)}`, line);
};
var compare = (op, a, b, line) => {
	switch (op) {
		case "==": return equal(a, b);
		case "!=": return !equal(a, b);
		case "<": return order(a, b, line) < 0;
		case ">": return order(a, b, line) > 0;
		case "<=": return order(a, b, line) <= 0;
		case ">=": return order(a, b, line) >= 0;
		case "in": return contains(b, a, line);
		case "not in": return !contains(b, a, line);
	}
};
// src/core/python/builtins.ts
/** The built-in functions a program may call: `range`, `len`, `print` and a few for numbers. */
var arity = (name, args, min, max, line) => {
	if (args.length >= min && args.length <= max) return;
	throw new PyError(`${name}() приймає ${min === max ? `${min}` : `від ${min} до ${max}`} значень у дужках, а тут ${args.length}`, line);
};
var range = (args, line) => {
	arity("range", args, 1, 3, line);
	const numbers = args.map((a) => toInt(a, "Число в range()", line));
	const [start, stop, step] = numbers.length === 1 ? [
		0,
		numbers[0] ?? 0,
		1
	] : [
		numbers[0] ?? 0,
		numbers[1] ?? 0,
		numbers[2] ?? 1
	];
	if (step === 0) throw new PyError("Крок у range() не може бути нулем", line);
	const count = Math.max(0, Math.ceil((stop - start) / step));
	if (count > 1e4) throw new PyError(`range() задовгий: більше ніж ${MAX_ITEMS} чисел`, line);
	return list(Array.from({ length: count }, (_, i) => start + i * step));
};
var len = (args, line) => {
	arity("len", args, 1, 1, line);
	const [v] = args;
	if (typeof v === "string") return v.length;
	if (v !== void 0 && isList(v)) return v.items.length;
	throw new PyError(`len() рахує довжину списку або тексту, а тут ${typeName(v ?? null)}`, line);
};
/** The values `min`, `max` and `sum` look at: one list, or the values in the brackets. */
var valuesOf = (name, args, line) => {
	const [first] = args;
	const values = args.length === 1 && first !== void 0 && isList(first) ? first.items : args;
	if (values.length === 0) throw new PyError(`${name}() потрібне хоча б одне значення`, line);
	return values;
};
var number = (name, v, line) => {
	if (typeof v === "number") return v;
	if (typeof v === "boolean") return v ? 1 : 0;
	throw new PyError(`${name}() працює з числами, а тут ${typeName(v)} ${repr(v)}`, line);
};
var extreme = (name) => (args, line) => valuesOf(name, args, line).map((v) => number(name, v, line)).reduce((a, b) => name === "min" ? Math.min(a, b) : Math.max(a, b));
var toIntValue = (args, line) => {
	arity("int", args, 1, 1, line);
	const [v] = args;
	if (typeof v === "string") {
		const n = Number(v.trim());
		if (v.trim() === "" || !Number.isInteger(n)) throw new PyError(`int() не може зробити число з тексту ${repr(v)}`, line);
		return n;
	}
	return Math.trunc(number("int", v ?? null, line));
};
var makeBuiltins = (print) => {
	const entries = [
		["range", range],
		["len", len],
		["print", (args) => {
			print(args.map(str).join(" "));
			return null;
		}],
		["abs", (args, line) => {
			arity("abs", args, 1, 1, line);
			return Math.abs(number("abs", args[0] ?? null, line));
		}],
		["min", extreme("min")],
		["max", extreme("max")],
		["sum", (args, line) => valuesOf("sum", args, line).reduce((a, v) => a + number("sum", v, line), 0)],
		["str", (args, line) => {
			arity("str", args, 1, 1, line);
			return str(args[0] ?? null);
		}],
		["int", toIntValue],
		["bool", (args, line) => {
			arity("bool", args, 1, 1, line);
			return truthy(args[0] ?? null);
		}]
	];
	return new Map(entries.map(([name, call]) => [name, {
		type: "builtin",
		name,
		call
	}]));
};
// src/core/python/lexer.ts
var KEYWORDS = /* @__PURE__ */ new Set([
	"if",
	"elif",
	"else",
	"while",
	"for",
	"in",
	"def",
	"return",
	"pass",
	"break",
	"continue",
	"and",
	"or",
	"not",
	"True",
	"False",
	"None",
	"global"
]);
/** Python words this course does not use yet. A program with them gets a clear message, not a strange error. */
var UNSUPPORTED = /* @__PURE__ */ new Set([
	"class",
	"import",
	"from",
	"try",
	"except",
	"finally",
	"raise",
	"lambda",
	"with",
	"as",
	"yield",
	"async",
	"await",
	"del",
	"assert",
	"nonlocal",
	"is"
]);
/** Longest first, so `//=` is not read as `//` and `=`. */
var OPERATORS = [
	"//=",
	"**",
	"//",
	"==",
	"!=",
	"<=",
	">=",
	"+=",
	"-=",
	"*=",
	"/=",
	"%=",
	"->",
	"+",
	"-",
	"*",
	"/",
	"%",
	"<",
	">",
	"=",
	"(",
	")",
	"[",
	"]",
	",",
	":",
	".",
	";"
];
var OPENING = {
	"(": ")",
	"[": "]"
};
var CLOSING = /* @__PURE__ */ new Set([")", "]"]);
var NAME_START = /[\p{L}_]/u;
var NAME_PART = /[\p{L}\p{N}_]/u;
var DIGIT = /[0-9]/;
/** A program longer than this is refused before it runs. */
var MAX_SOURCE_LENGTH = 2e4;
var ESCAPES = {
	n: "\n",
	t: "	",
	"\\": "\\",
	"'": "'",
	"\"": "\""
};
var indentOf = (text) => {
	let width = 0;
	for (const ch of text) if (ch === " ") width++;
	else if (ch === "	") width += 4;
	else break;
	return width;
};
var tokenize = (source) => {
	if (source.length > 2e4) throw new PyError(`Програма задовга: більше ніж ${MAX_SOURCE_LENGTH} знаків`, 1);
	const tokens = [];
	const indents = [0];
	const brackets = [];
	const lines = source.replace(/\r\n?/g, "\n").split("\n");
	lines.forEach((text, index) => {
		const line = index + 1;
		const body = text.trimStart();
		if (brackets.length === 0) {
			if (body === "" || body.startsWith("#")) return;
			indentLine(tokens, indents, indentOf(text), line);
		}
		scanLine(text, text.length - body.length, line, tokens, brackets);
		if (brackets.length === 0 && tokens.at(-1)?.kind !== "newline") tokens.push({
			kind: "newline",
			value: "",
			line
		});
	});
	const open = brackets.at(-1);
	if (open !== void 0) throw new PyError(`Дужка «${open.ch}» не закрита: додай «${OPENING[open.ch]}»`, open.line);
	const last = lines.length;
	while (indents.length > 1) {
		indents.pop();
		tokens.push({
			kind: "dedent",
			value: "",
			line: last
		});
	}
	tokens.push({
		kind: "eof",
		value: "",
		line: last
	});
	return tokens;
};
var indentLine = (tokens, indents, width, line) => {
	if (width > (indents.at(-1) ?? 0)) {
		indents.push(width);
		tokens.push({
			kind: "indent",
			value: "",
			line
		});
		return;
	}
	while (width < (indents.at(-1) ?? 0)) {
		indents.pop();
		tokens.push({
			kind: "dedent",
			value: "",
			line
		});
	}
	if (width !== (indents.at(-1) ?? 0)) throw new PyError("Відступ не збігається з жодним рядком вище: вирівняй рядок з початком блоку", line);
};
var scanLine = (text, start, line, tokens, brackets) => {
	let i = start;
	while (i < text.length) {
		const ch = text[i] ?? "";
		if (ch === " " || ch === "	") {
			i++;
			continue;
		}
		if (ch === "#") return;
		if (NAME_START.test(ch)) {
			let end = i + 1;
			while (end < text.length && NAME_PART.test(text[end] ?? "")) end++;
			const word = text.slice(i, end);
			tokens.push({
				kind: KEYWORDS.has(word) ? "keyword" : "name",
				value: word,
				line
			});
			i = end;
			continue;
		}
		if (DIGIT.test(ch) || ch === "." && DIGIT.test(text[i + 1] ?? "")) {
			i = scanNumber(text, i, line, tokens);
			continue;
		}
		if (ch === "'" || ch === "\"") {
			i = scanString(text, i, line, tokens);
			continue;
		}
		const op = OPERATORS.find((o) => text.startsWith(o, i));
		if (op === void 0) throw new PyError(unknownCharacter(ch), line);
		trackBracket(op, line, brackets);
		tokens.push({
			kind: "op",
			value: op,
			line
		});
		i += op.length;
	}
};
var unknownCharacter = (ch) => {
	if (ch === "“" || ch === "”" || ch === "«" || ch === "»") return `Знак «${ch}» Python не знає: для тексту бери прості лапки " або '`;
	if (ch === "{" || ch === "}") return "Фігурні дужки { } тут не потрібні: блок у Python задає відступ";
	return `Знак «${ch}» Python не знає`;
};
var trackBracket = (op, line, brackets) => {
	if (OPENING[op] !== void 0) brackets.push({
		ch: op,
		line
	});
	if (!CLOSING.has(op)) return;
	const open = brackets.pop();
	if (open === void 0) throw new PyError(`Зайва дужка «${op}»: перед нею немає відкритої`, line);
	if (OPENING[open.ch] !== op) throw new PyError(`Дужка «${open.ch}» закривається дужкою «${OPENING[open.ch]}», а не «${op}»`, line);
};
var scanNumber = (text, start, line, tokens) => {
	let end = start;
	while (end < text.length && /[0-9_.]/.test(text[end] ?? "")) end++;
	const raw = text.slice(start, end).replaceAll("_", "");
	if (NAME_START.test(text[end] ?? "")) throw new PyError(`Ім'я не може починатися з цифри: «${text.slice(start, end + 1)}…»`, line);
	if (!/^(\d+\.?\d*|\.\d+)$/.test(raw)) throw new PyError(`Це не число: «${raw}»`, line);
	tokens.push({
		kind: "number",
		value: raw,
		line
	});
	return end;
};
var scanString = (text, start, line, tokens) => {
	const quote = text[start];
	let value = "";
	let i = start + 1;
	while (i < text.length && text[i] !== quote) {
		const ch = text[i] ?? "";
		if (ch === "\\" && i + 1 < text.length) {
			const next = text[i + 1] ?? "";
			value += ESCAPES[next] ?? `\\${next}`;
			i += 2;
			continue;
		}
		value += ch;
		i++;
	}
	if (i >= text.length) throw new PyError(`Текст не закрито: додай ${quote} у кінці`, line);
	tokens.push({
		kind: "string",
		value,
		line
	});
	return i + 1;
};
// src/core/python/interpreter.ts
/**
* Runs the tree of a program. Synchronous and pure apart from the host, so the browser and the server get the same
* run. Every statement and expression is a step; a program that takes too many stops, so an endless loop cannot
* hang a tab or the server.
*/
/** Steps of the interpreter in one run. A course program needs a few thousand. */
var MAX_PY_STEPS = 2e5;
/** Functions running inside each other. */
var MAX_PY_DEPTH = 100;
/** The run stops with no error: the hero is done, or the program ran too long. */
var Halt = class {
	tooLong;
	constructor(tooLong) {
		this.tooLong = tooLong;
	}
};
var BreakSignal = class {};
var ContinueSignal = class {};
var ReturnSignal = class {
	value;
	constructor(value) {
		this.value = value;
	}
};
var HERO = { type: "hero" };
var METHOD_NAMES = PYTHON_METHODS.map((m) => m.name);
var execute = (program, host) => new Interpreter(host).run(program);
var Interpreter = class {
	host;
	steps = 0;
	depth = 0;
	globals = /* @__PURE__ */ new Map([[HERO_NAME, HERO]]);
	builtins;
	scope = null;
	constructor(host) {
		this.host = host;
		this.builtins = makeBuiltins(host.print);
	}
	run(program) {
		try {
			this.block(program);
		} catch (signal) {
			if (signal instanceof BreakSignal || signal instanceof ContinueSignal) throw new PyError("break і continue працюють тільки всередині циклу", 1);
			if (signal instanceof ReturnSignal) throw new PyError("return працює тільки всередині функції", 1);
			throw signal;
		}
	}
	tick() {
		if (++this.steps > 2e5) throw new Halt(true);
	}
	block(body) {
		for (const s of body) this.statement(s);
	}
	statement(s) {
		this.tick();
		switch (s.k) {
			case "expr": return this.expressionStatement(s.expr);
			case "assign": return this.assign(s.target, this.eval(s.value));
			case "augassign": return this.assign(s.target, binary(s.op, this.eval(s.target), this.eval(s.value), s.line));
			case "if": return this.block(truthy(this.eval(s.test)) ? s.body : s.orelse);
			case "while": return this.whileLoop(s);
			case "for": return this.forLoop(s);
			case "def": return this.assign({
				k: "name",
				id: s.name,
				line: s.line
			}, {
				type: "function",
				def: s
			});
			case "return":
				if (this.scope === null) throw new PyError("return працює тільки всередині функції", s.line);
				throw new ReturnSignal(s.value === null ? null : this.eval(s.value));
			case "break": throw new BreakSignal();
			case "continue": throw new ContinueSignal();
			case "global":
				if (this.scope === null) throw new PyError("global пишуть тільки всередині функції", s.line);
				return;
			case "pass": return;
		}
	}
	expressionStatement(expr) {
		const value = this.eval(expr);
		if (expr.k !== "call" && isCallable(value)) {
			const shown = expr.k === "attribute" ? `${HERO_NAME}.${expr.name}` : expr.k === "name" ? expr.id : "функцію";
			throw new PyError(`Щоб виконати ${shown}, додай дужки: ${shown}()`, expr.line);
		}
	}
	/** Runs a loop body. False when the loop must stop (`break`). */
	loopBody(body) {
		try {
			this.block(body);
		} catch (signal) {
			if (signal instanceof BreakSignal) return false;
			if (!(signal instanceof ContinueSignal)) throw signal;
		}
		return true;
	}
	whileLoop(s) {
		while (truthy(this.eval(s.test))) {
			this.tick();
			if (!this.loopBody(s.body)) return;
		}
	}
	forLoop(s) {
		const iterable = this.eval(s.iter);
		const items = typeof iterable === "string" ? [...iterable] : isList(iterable) ? [...iterable.items] : null;
		if (items === null) throw new PyError(`for проходить по списку, тексту чи range(…), а тут ${typeName(iterable)}: може, range(${repr(iterable)})?`, s.line);
		for (const item of items) {
			this.tick();
			this.assign({
				k: "name",
				id: s.target,
				line: s.line
			}, item);
			if (!this.loopBody(s.body)) return;
		}
	}
	assign(target, value) {
		if (target.k === "index") {
			const [items, index] = this.item(target);
			items.items[index] = value;
			return;
		}
		if (target.id === "hero") throw new PyError(`Ім'я ${HERO_NAME} зайняте героєм: візьми для змінної інше`, target.line);
		if (this.scope !== null && this.scope.own.has(target.id)) this.scope.vars.set(target.id, value);
		else this.globals.set(target.id, value);
	}
	eval(e) {
		this.tick();
		switch (e.k) {
			case "number":
			case "string":
			case "constant": return e.value;
			case "name": return this.lookup(e.id, e.line);
			case "list": return list(e.items.map((x) => this.eval(x)));
			case "attribute": return this.attribute(this.eval(e.object), e.name, e.line);
			case "index": {
				const [items, index] = this.item(e);
				return items.items[index] ?? null;
			}
			case "call": return this.call(this.eval(e.fn), e.args.map((a) => this.eval(a)), e.line);
			case "unary": return this.unary(e.op, this.eval(e.arg), e.line);
			case "binary": return binary(e.op, this.eval(e.left), this.eval(e.right), e.line);
			case "bool": {
				const left = this.eval(e.left);
				return (e.op === "and" ? truthy(left) : !truthy(left)) ? this.eval(e.right) : left;
			}
			case "compare": return this.chain(e);
		}
	}
	unary(op, v, line) {
		if (op === "not") return !truthy(v);
		if (typeof v !== "number" && typeof v !== "boolean") throw new PyError(`Знак «${op}» ставлять перед числом, а тут ${typeName(v)}`, line);
		return op === "-" ? -Number(v) : Number(v);
	}
	chain(e) {
		let left = this.eval(e.operands[0]);
		for (let i = 0; i < e.ops.length; i++) {
			const right = this.eval(e.operands[i + 1]);
			if (!compare(e.ops[i] ?? "==", left, right, e.line)) return false;
			left = right;
		}
		return true;
	}
	/** The list and the index of `x[i]`; a negative index counts from the end, as in Python. */
	item(e) {
		const container = this.eval(e.object);
		if (!isList(container)) throw new PyError(`Квадратні дужки [ ] беруть елемент списку, а тут ${typeName(container)}`, e.line);
		const raw = toInt(this.eval(e.index), "Номер елемента", e.line);
		const index = raw < 0 ? container.items.length + raw : raw;
		if (index < 0 || index >= container.items.length) throw new PyError(`У списку немає елемента з номером ${raw}: номери від 0 до ${container.items.length - 1}`, e.line);
		return [container, index];
	}
	lookup(name, line) {
		const scope = this.scope;
		if (scope !== null && scope.own.has(name)) {
			const value = scope.vars.get(name);
			if (value === void 0) throw new PyError(`Змінна «${name}» у функції ще не має значення: задай його вище або напиши global ${name}`, line);
			return value;
		}
		const value = this.globals.get(name) ?? this.builtins.get(name);
		if (value !== void 0) return value;
		throw new PyError(this.unknownName(name), line);
	}
	unknownName(name) {
		const lower = name.toLowerCase();
		if (lower === "true" || lower === "false" || lower === "none") return `Пиши ${lower[0]?.toUpperCase()}${lower.slice(1)} з великої літери`;
		if (KEYWORDS.has(lower)) return `Python розрізняє великі й малі літери: пиши «${lower}»`;
		const guess = closest(name, [
			...this.globals.keys(),
			...this.scope?.vars.keys() ?? [],
			...this.builtins.keys()
		]);
		return `Python не знає імені «${name}»: ${guess === null ? "задай її значення вище, перш ніж брати" : `може, ${guess}?`}`;
	}
	attribute(object, name, line) {
		if (isList(object) && (name === "append" || name === "pop")) return {
			type: "listMethod",
			name,
			list: object
		};
		if (typeof object !== "object" || object === null || object.type !== "hero") throw new PyError(`У значення типу «${typeName(object)}» немає «.${name}»`, line);
		const method = PYTHON_METHODS.find((m) => m.name === name);
		if (method === void 0) {
			const guess = closest(name, METHOD_NAMES);
			throw new PyError(`Герой не вміє ${HERO_NAME}.${name}()${guess === null ? "" : `: може, ${HERO_NAME}.${guess}()?`}`, line);
		}
		if (!this.host.allows(method)) throw new PyError(`На цьому рівні ${HERO_NAME}.${name}() ще не відкрито`, line);
		return {
			type: "heroMethod",
			method
		};
	}
	call(fn, args, line) {
		if (typeof fn !== "object" || fn === null || fn.type === "list" || fn.type === "hero") throw new PyError(`${repr(fn)} — це ${typeName(fn)}, а не функція: дужки () після нього зайві`, line);
		switch (fn.type) {
			case "builtin": return fn.call(args, line);
			case "function": return this.callFunction(fn, args, line);
			case "heroMethod": return this.heroCall(fn.method, args, line);
			case "listMethod": return this.listCall(fn.name, fn.list, args, line);
		}
	}
	callFunction(fn, args, line) {
		const { def } = fn;
		if (args.length !== def.params.length) throw new PyError(`Функція ${def.name}() чекає ${def.params.length} значень у дужках, а отримала ${args.length}`, line);
		if (this.depth >= 100) throw new PyError(`Функція ${def.name}() викликає себе забагато разів`, line);
		const saved = this.scope;
		this.scope = {
			vars: new Map(def.params.map((p, i) => [p, args[i] ?? null])),
			own: def.locals
		};
		this.depth++;
		try {
			this.block(def.body);
			return null;
		} catch (signal) {
			if (signal instanceof ReturnSignal) return signal.value;
			if (signal instanceof BreakSignal || signal instanceof ContinueSignal) throw new PyError(`break і continue працюють тільки всередині циклу, а не просто у функції ${def.name}()`, line);
			throw signal;
		} finally {
			this.depth--;
			this.scope = saved;
		}
	}
	heroCall(method, args, line) {
		if (method.sensor !== void 0) {
			if (args.length > 0) throw new PyError(`${HERO_NAME}.${method.name}() нічого не приймає в дужках`, line);
			return this.host.sense(method.sensor);
		}
		const action = method.action;
		if (action !== "move" && args.length > 0) throw new PyError(`${HERO_NAME}.${method.name}() нічого не приймає в дужках`, line);
		if (args.length > 1) throw new PyError(`${HERO_NAME}.move() приймає одне число: скільки кроків`, line);
		const times = args.length === 0 ? 1 : toInt(args[0] ?? null, "Кількість кроків", line);
		if (times < 0 || times > 100) throw new PyError(`Кроків має бути від 0 до 100`, line);
		for (let i = 0; i < times; i++) {
			this.tick();
			this.host.act(action, line, this.globals);
		}
		return null;
	}
	listCall(name, target, args, line) {
		if (name === "append") {
			if (args.length !== 1) throw new PyError("append() додає одне значення: список.append(x)", line);
			if (target.items.length >= 1e4) throw new PyError(`Забагато елементів: більше ніж ${MAX_ITEMS}`, line);
			target.items.push(args[0] ?? null);
			return null;
		}
		if (target.items.length === 0) throw new PyError("pop() з порожнього списку: у ньому нічого немає", line);
		if (args.length === 0) return target.items.pop() ?? null;
		const raw = toInt(args[0] ?? null, "Номер елемента", line);
		const index = raw < 0 ? target.items.length + raw : raw;
		if (index < 0 || index >= target.items.length) throw new PyError(`У списку немає елемента з номером ${raw}`, line);
		return target.items.splice(index, 1)[0] ?? null;
	}
};
// src/core/python/parser.ts
/**
* Builds the tree of a program from its tokens: the part of Python this course uses. Variables, numbers, texts,
* lists, `if/elif/else`, `while`, `for … in`, functions with `def` and `return`, `and/or/not`, comparisons.
*/
var AUGMENTED = {
	"+=": "+",
	"-=": "-",
	"*=": "*",
	"/=": "/",
	"//=": "//",
	"%=": "%"
};
var COMPARE = /* @__PURE__ */ new Set([
	"==",
	"!=",
	"<",
	">",
	"<=",
	">="
]);
var parse = (source) => new Parser(tokenize(source)).program();
var Parser = class {
	tokens;
	pos = 0;
	/** Loops and functions around the statement being read: `break` needs a loop, `return` a function. */
	loops = 0;
	functions = 0;
	constructor(tokens) {
		this.tokens = tokens;
	}
	program() {
		const body = [];
		while (this.peek().kind !== "eof") body.push(...this.statement());
		return body;
	}
	peek(offset = 0) {
		return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)];
	}
	next() {
		const token = this.peek();
		if (this.pos < this.tokens.length - 1) this.pos++;
		return token;
	}
	is(value, kind) {
		const token = this.peek();
		return token.value === value && (kind === void 0 ? token.kind === "op" || token.kind === "keyword" : token.kind === kind);
	}
	accept(value) {
		if (!this.is(value)) return false;
		this.next();
		return true;
	}
	expect(value, message) {
		if (!this.is(value)) throw new PyError(message, this.peek().line);
		return this.next();
	}
	name(message) {
		const token = this.peek();
		if (token.kind !== "name") throw new PyError(message, token.line);
		this.next();
		return token.value;
	}
	statement() {
		const token = this.peek();
		if (token.kind === "indent") throw new PyError("Зайвий відступ: цей рядок зсунутий, хоча не стоїть усередині if, while, for чи def", token.line);
		if (token.kind === "keyword") switch (token.value) {
			case "if": return [this.ifStatement()];
			case "while": return [this.whileStatement()];
			case "for": return [this.forStatement()];
			case "def": return [this.defStatement()];
			case "elif":
			case "else": throw new PyError(`«${token.value}» стоїть без «if» над ним: перевір відступи`, token.line);
		}
		return this.simpleLine();
	}
	/** Simple statements up to the end of the line. */
	simpleLine() {
		const statements = [this.simple()];
		while (this.accept(";")) if (this.peek().kind !== "newline") statements.push(this.simple());
		this.endOfLine(statements.at(-1));
		return statements;
	}
	endOfLine(last) {
		const token = this.peek();
		if (token.kind === "newline") {
			this.next();
			return;
		}
		if (token.kind === "eof" || token.kind === "dedent") return;
		if (last?.k === "expr" && last.expr.k === "name" && KEYWORDS.has(last.expr.id.toLowerCase())) throw new PyError(`Python розрізняє великі й малі літери: пиши «${last.expr.id.toLowerCase()}»`, token.line);
		if (token.value === "=") throw new PyError("Ліворуч від «=» має бути ім'я змінної", token.line);
		throw new PyError(`Незрозуміло, що тут робить «${token.value}»: може, бракує дужки чи коми?`, token.line);
	}
	simple() {
		const token = this.peek();
		const line = token.line;
		if (token.kind === "keyword") switch (token.value) {
			case "pass":
				this.next();
				return {
					k: "pass",
					line
				};
			case "break":
			case "continue":
				if (this.loops === 0) throw new PyError(`«${token.value}» працює тільки всередині циклу while або for`, line);
				this.next();
				return {
					k: token.value,
					line
				};
			case "return":
				if (this.functions === 0) throw new PyError("«return» працює тільки всередині функції (def)", line);
				this.next();
				return {
					k: "return",
					value: this.peek().kind === "newline" || this.peek().kind === "eof" || this.is(";") ? null : this.expression(),
					line
				};
			case "global": {
				this.next();
				const names = [this.name("Після global напиши ім'я змінної")];
				while (this.accept(",")) names.push(this.name("Після коми напиши ім'я змінної"));
				return {
					k: "global",
					names,
					line
				};
			}
		}
		const expr = this.expression();
		if (this.is("=")) {
			this.next();
			return {
				k: "assign",
				target: this.target(expr),
				value: this.expression(),
				line
			};
		}
		const augmented = AUGMENTED[this.peek().value];
		if (augmented !== void 0 && this.peek().kind === "op") {
			this.next();
			return {
				k: "augassign",
				target: this.target(expr),
				op: augmented,
				value: this.expression(),
				line
			};
		}
		return {
			k: "expr",
			expr,
			line
		};
	}
	target(expr) {
		if (expr.k === "name" || expr.k === "index") return expr;
		if (expr.k === "call") throw new PyError("Виклику не можна нічого присвоїти: ліворуч від «=» має бути ім'я змінної", expr.line);
		throw new PyError("Ліворуч від «=» має бути ім'я змінної", expr.line);
	}
	/** The `:` and the indented lines after a header, or simple statements on the same line. */
	block(header) {
		const colon = this.peek();
		if (colon.value === "=" && colon.kind === "op") throw new PyError("Для порівняння пиши «==», а не «=»", colon.line);
		if (!this.accept(":")) throw new PyError(`Після «${header}» потрібна двокрапка «:» в кінці рядка`, colon.line);
		if (this.peek().kind !== "newline") return this.simpleLine();
		const line = this.next().line;
		if (this.peek().kind !== "indent") throw new PyError(`Після «${header} …:» рядки всередині треба зсунути вправо на 4 пробіли`, this.peek().kind === "eof" ? line : this.peek().line);
		this.next();
		const body = [];
		while (this.peek().kind !== "dedent" && this.peek().kind !== "eof") body.push(...this.statement());
		if (this.peek().kind === "dedent") this.next();
		return body;
	}
	loopBlock(header) {
		this.loops++;
		const body = this.block(header);
		this.loops--;
		return body;
	}
	ifStatement() {
		const line = this.next().line;
		return {
			k: "if",
			test: this.condition("if"),
			body: this.block("if"),
			orelse: this.elseBranch(),
			line
		};
	}
	elseBranch() {
		if (this.is("elif")) {
			const line = this.next().line;
			return [{
				k: "if",
				test: this.condition("elif"),
				body: this.block("elif"),
				orelse: this.elseBranch(),
				line
			}];
		}
		if (!this.is("else")) return [];
		this.next();
		if (this.is("if")) throw new PyError("Пиши «elif» замість «else if»", this.peek().line);
		return this.block("else");
	}
	condition(header) {
		if (this.is(":")) throw new PyError(`Після «${header}» напиши умову, а потім двокрапку`, this.peek().line);
		return this.expression();
	}
	whileStatement() {
		const line = this.next().line;
		return {
			k: "while",
			test: this.condition("while"),
			body: this.loopBlock("while"),
			line
		};
	}
	forStatement() {
		const line = this.next().line;
		const target = this.name("Після for напиши ім'я змінної: for i in range(5):");
		this.expect("in", "У циклі for після змінної потрібне слово «in»: for i in range(5):");
		return {
			k: "for",
			target,
			iter: this.condition("in"),
			body: this.loopBlock("for"),
			line
		};
	}
	defStatement() {
		const line = this.next().line;
		const name = this.name("Після def напиши ім'я функції: def обійти():");
		this.expect("(", `Після імені функції потрібні дужки: def ${name}():`);
		const params = [];
		if (!this.is(")")) do
			params.push(this.name("У дужках функції пишуть імена параметрів через кому"));
		while (this.accept(","));
		this.expect(")", "Закрий дужку після параметрів функції");
		const loops = this.loops;
		this.loops = 0;
		this.functions++;
		const body = this.block("def");
		this.functions--;
		this.loops = loops;
		return {
			k: "def",
			name,
			params,
			body,
			locals: localsOf(body, params),
			line
		};
	}
	expression() {
		return this.or();
	}
	or() {
		let left = this.and();
		while (this.is("or")) {
			const line = this.next().line;
			left = {
				k: "bool",
				op: "or",
				left,
				right: this.and(),
				line
			};
		}
		return left;
	}
	and() {
		let left = this.not();
		while (this.is("and")) {
			const line = this.next().line;
			left = {
				k: "bool",
				op: "and",
				left,
				right: this.not(),
				line
			};
		}
		return left;
	}
	not() {
		if (!this.is("not")) return this.comparison();
		const line = this.next().line;
		return {
			k: "unary",
			op: "not",
			arg: this.not(),
			line
		};
	}
	comparison() {
		const first = this.sum();
		const ops = [];
		const operands = [first];
		for (;;) {
			const token = this.peek();
			if (token.kind === "op" && COMPARE.has(token.value)) ops.push(this.next().value);
			else if (this.is("in")) {
				this.next();
				ops.push("in");
			} else if (this.is("not") && this.peek(1).value === "in") {
				this.next();
				this.next();
				ops.push("not in");
			} else break;
			operands.push(this.sum());
		}
		return ops.length === 0 ? first : {
			k: "compare",
			ops,
			operands,
			line: first.line
		};
	}
	sum() {
		let left = this.term();
		while (this.is("+") || this.is("-")) {
			const token = this.next();
			left = {
				k: "binary",
				op: token.value,
				left,
				right: this.term(),
				line: token.line
			};
		}
		return left;
	}
	term() {
		let left = this.factor();
		while (this.is("*") || this.is("/") || this.is("//") || this.is("%")) {
			const token = this.next();
			left = {
				k: "binary",
				op: token.value,
				left,
				right: this.factor(),
				line: token.line
			};
		}
		return left;
	}
	factor() {
		if (this.is("-") || this.is("+")) {
			const token = this.next();
			return {
				k: "unary",
				op: token.value,
				arg: this.factor(),
				line: token.line
			};
		}
		const base = this.primary();
		if (!this.is("**")) return base;
		const line = this.next().line;
		return {
			k: "binary",
			op: "**",
			left: base,
			right: this.factor(),
			line
		};
	}
	primary() {
		let expr = this.atom();
		for (;;) {
			const line = this.peek().line;
			if (this.accept("(")) expr = {
				k: "call",
				fn: expr,
				args: this.items(")", "Закрий дужку виклику: «)»"),
				line
			};
			else if (this.accept(".")) expr = {
				k: "attribute",
				object: expr,
				name: this.name("Після крапки напиши ім'я методу: hero.move()"),
				line
			};
			else if (this.accept("[")) {
				const index = this.expression();
				this.expect("]", "Закрий квадратну дужку: «]»");
				expr = {
					k: "index",
					object: expr,
					index,
					line
				};
			} else return expr;
		}
	}
	/** Expressions separated by commas up to the closing bracket, which is taken too. */
	items(close, message) {
		const items = [];
		while (!this.is(close)) {
			items.push(this.expression());
			if (!this.accept(",")) break;
		}
		this.expect(close, message);
		return items;
	}
	atom() {
		const token = this.peek();
		const line = token.line;
		switch (token.kind) {
			case "number":
				this.next();
				return {
					k: "number",
					value: Number(token.value),
					line
				};
			case "string":
				this.next();
				return {
					k: "string",
					value: token.value,
					line
				};
			case "name":
				if (UNSUPPORTED.has(token.value)) throw new PyError(`Слово «${token.value}» у цьому курсі ще не знадобиться`, line);
				this.next();
				return {
					k: "name",
					id: token.value,
					line
				};
			case "keyword":
				if (token.value === "True" || token.value === "False" || token.value === "None") {
					this.next();
					return {
						k: "constant",
						value: token.value === "None" ? null : token.value === "True",
						line
					};
				}
				throw new PyError(`Тут очікувалося значення, а стоїть «${token.value}»`, line);
			case "op": return this.bracketed(token);
			default: throw new PyError("Рядок обірвався: після цього знака має щось бути", line);
		}
	}
	bracketed(token) {
		if (token.value === "(") {
			this.next();
			const inner = this.expression();
			this.expect(")", "Закрий дужку: «)»");
			return inner;
		}
		if (token.value === "[") {
			this.next();
			return {
				k: "list",
				items: this.items("]", "Закрий список дужкою «]»"),
				line: token.line
			};
		}
		throw new PyError(`Тут очікувалося значення, а стоїть «${token.value}»`, token.line);
	}
};
/** The names a function assigns, as Python finds them: they belong to the function unless declared `global`. */
var localsOf = (body, params) => {
	const assigned = new Set(params);
	const globals = /* @__PURE__ */ new Set();
	const walk = (statements) => {
		for (const s of statements) if ((s.k === "assign" || s.k === "augassign") && s.target.k === "name") assigned.add(s.target.id);
		else if (s.k === "for") {
			assigned.add(s.target);
			walk(s.body);
		} else if (s.k === "def") assigned.add(s.name);
		else if (s.k === "global") for (const n of s.names) globals.add(n);
		else if (s.k === "if") {
			walk(s.body);
			walk(s.orelse);
		} else if (s.k === "while") walk(s.body);
	};
	walk(body);
	for (const g of globals) assigned.delete(g);
	return assigned;
};
// src/core/python/size.ts
/**
* The size of a Python program for the stars of a level, counted like the blocks of the same program in Scratch:
* a statement is one block, and so are a call, a variable read, `and`, `or`, `not` and an operator in an
* expression. Numbers and texts are free, as the number fields of blocks are. `while not …:` counts as one
* «повторити до», and `range(…)` in a `for` as part of «повторити».
*/
var programSize = (body) => body.reduce((n, s) => n + statementSize(s), 0);
var statementSize = (s) => {
	switch (s.k) {
		case "expr": return s.expr.k === "call" ? callArgsSize(s.expr) + 1 : 1 + exprSize(s.expr);
		case "assign":
		case "augassign": return 1 + targetSize(s.target) + exprSize(s.value);
		case "if": return 1 + exprSize(s.test) + programSize(s.body) + programSize(s.orelse);
		case "while": return 1 + exprSize(s.test.k === "unary" && s.test.op === "not" ? s.test.arg : s.test) + programSize(s.body);
		case "for": return 1 + iterableSize(s.iter) + programSize(s.body);
		case "def": return 1 + programSize(s.body);
		case "return": return 1 + (s.value === null ? 0 : exprSize(s.value));
		case "global":
		case "pass": return 0;
		case "break":
		case "continue": return 1;
	}
};
var targetSize = (t) => t.k === "name" ? 0 : exprSize(t.object) + exprSize(t.index);
var isRange = (e) => e.k === "call" && e.fn.k === "name" && e.fn.id === "range";
var iterableSize = (e) => isRange(e) ? callArgsSize(e) : exprSize(e);
var callArgsSize = (e) => e.args.reduce((n, a) => n + exprSize(a), e.fn.k === "attribute" ? exprSize(e.fn.object) - 1 : 0);
var exprSize = (e) => {
	switch (e.k) {
		case "number":
		case "string":
		case "constant": return 0;
		case "name": return 1;
		case "list": return 1 + e.items.reduce((n, x) => n + exprSize(x), 0);
		case "attribute": return exprSize(e.object);
		case "index": return 1 + exprSize(e.object) + exprSize(e.index);
		case "call": return 1 + callArgsSize(e);
		case "unary": return (e.op === "-" && e.arg.k === "number" ? 0 : 1) + exprSize(e.arg);
		case "binary":
		case "bool": return 1 + exprSize(e.left) + exprSize(e.right);
		case "compare": return e.ops.length + e.operands.reduce((n, x) => n + exprSize(x), 0);
	}
};
// src/core/python/judge.ts
/**
* Runs a Python program on a level and grades it, as `judgeProgram` does for blocks. Pure and synchronous:
* the browser plays the frames, and the server runs the same text again and trusts only its own result.
*/
/** Lines of `print` kept for the student. */
var MAX_OUTPUT_LINES = 200;
var judgePython = (level, source) => {
	const session = newSession(level);
	let program;
	try {
		program = parse(source);
	} catch (error) {
		if (!(error instanceof PyError)) throw error;
		return resultOf(level, {
			...session,
			reason: "badProgram"
		}, 0, {
			detail: error.message,
			line: error.line
		});
	}
	const size = programSize(program);
	if (program.length === 0) return resultOf(level, {
		...session,
		reason: "noStart"
	}, 0);
	const output = [];
	const counted = level.blocks.includes("counter");
	const host = {
		act: (action, line, globals) => {
			const counter = counted ? { counter: str(globals.get("лічильник") ?? 0) } : {};
			if (heroAct(level, session, action, {
				blockId: null,
				line,
				...counter
			})) throw new Halt(false);
		},
		sense: (sensor) => heroSense(session, sensor),
		allows: (method) => level.blocks.includes(method.block),
		print: (text) => {
			if (output.length < 200) output.push(text);
		}
	};
	const printed = () => output.length === 0 ? {} : { output };
	try {
		execute(program, host);
	} catch (error) {
		if (error instanceof Halt) {
			if (!session.done) session.reason = "tooLong";
		} else if (error instanceof PyError) return resultOf(level, {
			...session,
			reason: "badProgram"
		}, size, {
			detail: error.message,
			line: error.line,
			...printed()
		});
		else throw error;
	}
	return resultOf(level, session, size, printed());
};
export { BOSS_HP, CALL_OPCODE, CHANGE_OPCODE, COUNTER_ID, COUNTER_NAME, DEFAULT_HEARTS, DEFAULT_PROCEDURE, DEFAULT_SIGHT, DEFINITION_OPCODE, FIRST_TRY_XP, HEROES, HERO_ACTIONS, HERO_BLOCKS, HERO_COLOR, HERO_EXTENSION_ID, HERO_LEVELS, HERO_NAME, HERO_SENSORS, MAP_LIMITS, MAX_ACTIONS, MAX_ADVICE, MAX_FRAMES, MAX_MOVE_STEPS, MAX_OUTPUT_LINES, MAX_PASSES, MAX_PROGRAM_BLOCKS, MAX_PY_DEPTH, MAX_PY_STEPS, MAX_SOURCE_LENGTH, MAX_STEPS, PROTOTYPE_OPCODE, PYTHON_METHODS, SET_OPCODE, START_OPCODE, STAR_XP, TIER_XP, VARIABLE_OPCODE, VARIABLE_PRIMITIVE, actionOfOpcode, adviseRun, allGoalsMet, allowedOpcodes, applyAction, atFinish, buildProgram, cellAhead, cellKey, chapterLevels, chapterOf, chapters, checkLevel, checkProgram, definitions, describeGoal, emptyMap, enemiesLeft, enemyAhead, enemyAt, enemyOf, goalMet, goalStatus, heroAct, heroLevelOf, heroOpen, heroSense, isAlive, isFatal, isFirstChapter, isNumberShadow, isWall, judgeProgram, judgePython, levelSource, levels, maxXp, newSession, onCrystal, opcodeOf, opcodesOf, parseMap, plainRoute, procedureName, pythonMethodsOf, resizeMap, sensorOfOpcode, setTile, solutionProgram, solutions, starsFor, startWorld, tileAt, trapAhead, wallAhead, xpFor, xpGain };
