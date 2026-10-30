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
	let start = null;
	let finish = null;
	const width = Math.max(0, ...rows.map((r) => r.length));
	rows.forEach((row, y) => {
		for (let x = 0; x < width; x++) {
			const ch = row[x] ?? " ";
			if (ch === "#" || ch === " ") walls.add(cellKey(x, y));
			else if (ch === "c") crystals.add(cellKey(x, y));
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
		crashed: false
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
var onCrystal = (world) => world.crystals.has(cellKey(world.hero.x, world.hero.y));
var atFinish = (world) => world.finish !== null && world.hero.x === world.finish.x && world.hero.y === world.finish.y;
var applyAction = (world, action) => {
	if (action === "move") {
		const next = cellAhead(world);
		if (isWall(world, next.x, next.y)) return {
			world: {
				...world,
				crashed: true
			},
			outcome: "crashed"
		};
		return {
			world: {
				...world,
				hero: {
					...world.hero,
					x: next.x,
					y: next.y
				}
			},
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
// src/core/level.ts
var goalMet = (world, goal) => goal.type === "crystals" ? world.crystals.size === 0 : atFinish(world);
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
var describeGoal = (goal, world, scene = {}) => goal.type === "crystals" ? ITEM_GOALS[scene.item ?? "crystal"](world.totalCrystals) : FINISH_GOALS[scene.finish ?? "flag"];
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
	[`${HERO_EXTENSION_ID}_collect`]: "collect"
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
		world: parseMap(level.map, level.dir),
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
		if (outcome === "crashed") finish("crashed");
		else if (allGoalsMet(level, world)) finish(null);
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
* Sample levels from grade 3 to grade 6: steps, turns, loops, branches and the loop with a condition.
* Together they tell one story, «Зима в селі»: each level gives the hero a reason to go somewhere.
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
		grade: 3,
		tier: "intro",
		title: "Холодна хата",
		task: ["Надворі мороз, а в хаті згасла піч.", "Вийди з хати, дійди до дровітні й візьми дрова."],
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
			theme: "winter",
			item: "wood",
			props: [HOME, {
				kind: "woodshed",
				x: 4,
				y: -1
			}]
		}
	},
	{
		id: "g3-turn",
		grade: 3,
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
			theme: "winter",
			item: "wood",
			props: [HOME, {
				kind: "woodshed",
				x: 4,
				y: 2
			}]
		}
	},
	{
		id: "g3-finish",
		grade: 3,
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
		scene: {
			theme: "winter",
			finish: "well",
			props: [HOME]
		}
	},
	{
		id: "g4-repeat",
		grade: 4,
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
			theme: "winter",
			item: "apple",
			props: [HOME]
		}
	},
	{
		id: "g4-stairs",
		grade: 4,
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
			theme: "winter",
			finish: "grandma",
			props: [{
				kind: "house",
				x: 3.5,
				y: -2
			}]
		}
	},
	{
		id: "g4-if",
		grade: 4,
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
		id: "g4-until",
		grade: 4,
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
		id: "g6-nested",
		grade: 6,
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
		id: "g6-maze",
		grade: 6,
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
	}
];
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
		if (frame.action !== "move" && frame.action !== "collect" && prev === frame.action && frames[i - 2]?.action === frame.action) triple = true;
	});
	return {
		cancel,
		triple
	};
};
var crashAdvice = (level, result, has) => {
	const n = result.frames.length;
	const before = result.frames[n - 2]?.world ?? parseMap(level.map, level.dir);
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
	const start = parseMap(level.map, level.dir);
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
/** What is extra in a program: a «взяти» on an empty cell, turns that cancel out. */
var extraAdvice = (level, frames) => {
	const tips = [];
	const empty = frames.filter((f) => f.outcome === "nothingToCollect").length;
	const canAsk = level.blocks.includes("if") && level.blocks.includes("onCrystal");
	if (empty > 0) tips.push(`«Взяти» ${empty} ${times(empty)} спрацював на порожній клітинці. ${canAsk ? "Прибери зайвий «взяти» або сховай його в «якщо тут щось є?»." : "Прибери зайвий «взяти»."}`);
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
		case "goalsNotMet": return [
			...itemAdvice(level, result, has),
			...finishAdvice(level, result),
			...extraAdvice(level, result.frames)
		].slice(0, 3);
		case "tooLong": return has("repeatUntil") || has("forever") ? ["Герой ходить без кінця. Перевір умову в «повторити до»: чи стане вона колись правдою?"] : [];
		default: return [];
	}
};
export { FIRST_TRY_XP, HERO_BLOCKS, HERO_COLOR, HERO_EXTENSION_ID, HERO_LEVELS, MAX_ACTIONS, MAX_ADVICE, MAX_FRAMES, MAX_PASSES, MAX_PROGRAM_BLOCKS, MAX_STEPS, START_OPCODE, STAR_XP, TIER_XP, adviseRun, allGoalsMet, allowedOpcodes, applyAction, atFinish, buildProgram, cellAhead, cellKey, checkProgram, describeGoal, goalMet, heroLevelOf, isNumberShadow, isWall, judgeProgram, levels, maxXp, onCrystal, opcodeOf, parseMap, solutions, starsFor, wallAhead, xpFor, xpGain };
