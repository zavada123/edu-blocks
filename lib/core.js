import VirtualMachine from "scratch-vm";
import vmLog from "scratch-vm/src/util/log.js";
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
		text: "зібрати кристал",
		boolean: false
	},
	{
		name: "wallAhead",
		text: "попереду стіна?",
		boolean: true
	},
	{
		name: "onCrystal",
		text: "тут кристал?",
		boolean: true
	},
	{
		name: "atFinish",
		text: "на прапорці?",
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
var describeGoal = (goal, world) => goal.type === "crystals" ? `Збери всі кристали (${world.totalCrystals})` : "Дійди до прапорця";
var starsFor = (level, blocks) => {
	if (level.stars === void 0 || blocks <= level.stars.three) return 3;
	return blocks <= level.stars.two ? 2 : 1;
};
// src/core/run.ts
vmLog.warn = vmLog.info = vmLog.debug = () => void 0;
var MAX_PROGRAM_BLOCKS = 300;
/** Hero actions in one run. A textbook level needs fewer than 100. */
var MAX_ACTIONS = 1e3;
/** VM frames in one run. A «завжди» loop without actions ends here. */
var MAX_FRAMES = 2e3;
/**
* Passes over the threads in one VM frame. The VM measures a frame in milliseconds; this package counts passes
* instead, so a run gives the same result on a slow phone and on the server.
*/
var PASSES_PER_FRAME = 20;
var isProgramBlock = (value) => typeof value === "object" && value !== null && !Array.isArray(value) && typeof value.opcode === "string";
/** Checks the program shape and palette before the VM sees it. Returns the error text or the block count. */
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
var COSTUME = {
	name: "hero",
	dataFormat: "svg",
	assetId: "00000000000000000000000000000000",
	md5ext: "00000000000000000000000000000000.svg",
	rotationCenterX: 0,
	rotationCenterY: 0
};
/** A project with the stage and one sprite whose blocks are the program. */
var projectFor = (program) => ({
	targets: [{
		isStage: true,
		name: "Stage",
		variables: {},
		lists: {},
		broadcasts: {},
		blocks: {},
		comments: {},
		currentCostume: 0,
		costumes: [{
			...COSTUME,
			name: "backdrop"
		}],
		sounds: [],
		volume: 100,
		layerOrder: 0
	}, {
		isStage: false,
		name: "Hero",
		variables: {},
		lists: {},
		broadcasts: {},
		blocks: program,
		comments: {},
		currentCostume: 0,
		costumes: [COSTUME],
		sounds: [],
		volume: 100,
		layerOrder: 1,
		visible: true,
		x: 0,
		y: 0,
		size: 100,
		direction: 90,
		draggable: false,
		rotationStyle: "all around"
	}],
	monitors: [],
	extensions: [HERO_EXTENSION_ID],
	meta: {
		semver: "3.0.0",
		vm: "0.2.0",
		agent: "edu-blocks"
	}
});
/** The VM extension class: block info for the palette and the block functions. */
var heroExtension = (level, session) => class HeroExtension {
	runtime;
	constructor(runtime) {
		this.runtime = runtime;
	}
	getInfo() {
		return {
			id: HERO_EXTENSION_ID,
			name: "Робот",
			color1: HERO_COLOR,
			color2: "#0DA57A",
			color3: "#0B8E69",
			blocks: HERO_BLOCKS.map((b) => ({
				opcode: b.name,
				blockType: b.boolean ? "Boolean" : "command",
				text: b.text
			}))
		};
	}
	act(action, util) {
		if (session === null || level === null || session.done) return;
		const { world, outcome } = applyAction(session.world, action);
		session.world = world;
		session.frames.push({
			action,
			outcome,
			blockId: util.thread.peekStack() ?? null,
			world
		});
		if (outcome === "crashed") this.finish("crashed");
		else if (allGoalsMet(level, world)) this.finish(null);
		else if (session.frames.length >= 1e3) this.finish("tooLong");
	}
	finish(reason) {
		if (session === null) return;
		session.done = true;
		session.reason = reason;
		this.runtime.stopAll();
	}
	move(_args, util) {
		this.act("move", util);
	}
	turnLeft(_args, util) {
		this.act("turnLeft", util);
	}
	turnRight(_args, util) {
		this.act("turnRight", util);
	}
	collect(_args, util) {
		this.act("collect", util);
	}
	wallAhead() {
		return session !== null && wallAhead(session.world);
	}
	onCrystal() {
		return session !== null && onCrystal(session.world);
	}
	atFinish() {
		return session !== null && atFinish(session.world);
	}
};
/**
* The VM keeps the current runtime and extension manager in a module-wide dispatcher, so two VMs must not
* load at the same time. Every VM in this package is created and loaded inside this lock.
*/
var lock = Promise.resolve();
var withVmLock = (work) => {
	const next = lock.then(work, work);
	lock = next.catch(() => void 0);
	return next;
};
/** Replaces the frame clock of the VM with a pass counter (see PASSES_PER_FRAME). */
var countPasses = (vm) => {
	let passes = 0;
	vm.runtime.sequencer.timer = {
		start: () => {
			passes = 0;
		},
		timeElapsed: () => passes++
	};
	vm.runtime.currentStepTime = PASSES_PER_FRAME / .75;
};
/** Lets the VM finish registering extension blocks (it does this in a promise). */
var settle = () => new Promise((resolve) => setTimeout(resolve, 0));
var createVm = (level, session) => {
	const vm = new VirtualMachine();
	vm.setCompilerOptions({ enabled: false });
	vm.extensionManager.addBuiltinExtension(HERO_EXTENSION_ID, heroExtension(level, session));
	return vm;
};
var result = (level, session, blocks, extra = {}) => {
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
/** Runs the program on the level from the start hat «коли натиснуто прапорець» and checks the goals. */
var runProgram = (level, program) => withVmLock(async () => {
	const session = {
		world: parseMap(level.map, level.dir),
		frames: [],
		done: false,
		reason: null
	};
	const checked = checkProgram(level, program);
	if ("error" in checked) return result(level, {
		...session,
		reason: "badProgram"
	}, 0, { detail: checked.error });
	if (!checked.hasStart) return result(level, {
		...session,
		reason: "noStart"
	}, checked.blocks);
	const vm = createVm(level, session);
	try {
		await vm.loadProject(projectFor(program));
	} catch {
		return result(level, {
			...session,
			reason: "badProgram"
		}, checked.blocks, { detail: "Програму не вдалося прочитати" });
	}
	await settle();
	countPasses(vm);
	vm.greenFlag();
	for (let frame = 0; frame < 2e3 && !session.done && vm.runtime.threads.length > 0; frame++) vm.runtime._step();
	if (!session.done && vm.runtime.threads.length > 0) session.reason = "tooLong";
	vm.stopAll();
	return result(level, session, checked.blocks);
});
// src/levels/index.ts
/**
* Sample levels from grade 3 to grade 6: steps, turns, loops, branches and the loop with a condition.
* The reference solution of each level is in `solutions.ts`.
*/
var levels = [
	{
		id: "g3-steps",
		grade: 3,
		title: "Перші кроки",
		task: ["Доведи робота до кристала і збери його."],
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
		hint: "Порахуй клітинки до кристала: стільки разів потрібен блок «крок уперед»."
	},
	{
		id: "g3-turn",
		grade: 3,
		title: "За ріг",
		task: ["Кристал за рогом. Поверни робота в потрібний бік."],
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
		hint: "Робот повертається на місці. Після повороту він іде туди, куди дивиться."
	},
	{
		id: "g3-finish",
		grade: 3,
		title: "До прапорця",
		task: ["Доведи робота до прапорця."],
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
		}
	},
	{
		id: "g4-repeat",
		grade: 4,
		title: "Повторення",
		task: ["Збери всі п'ять кристалів.", "Спробуй блок «повторити»: так програма буде коротшою."],
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
		hint: "Знайди дії, які повторюються: «крок, крок, зібрати». Поклади їх у «повторити»."
	},
	{
		id: "g4-stairs",
		grade: 4,
		title: "Сходинки",
		task: ["Підніми робота сходинками до прапорця."],
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
		hint: "Одна сходинка — це «крок, ліворуч, крок, праворуч». Скільки сходинок?"
	},
	{
		id: "g4-if",
		grade: 4,
		title: "Якщо тут кристал",
		task: ["Пройди коридор і збери всі кристали.", "Збирай лише там, де кристал є."],
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
		hint: "У «повторити» зроби крок, а потім перевір: «якщо тут кристал? то зібрати кристал»."
	},
	{
		id: "g4-until",
		grade: 4,
		title: "До самої стіни",
		task: ["Кристал у кінці довгого коридору.", "Іди, доки попереду не буде стіни, і збери кристал."],
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
		hint: "Блок «повторити до попереду стіна?» сам зупиниться біля стіни."
	},
	{
		id: "g6-nested",
		grade: 6,
		title: "Кімната з кутами",
		task: ["Обійди кімнату і збери кристали в кутах.", "Використай цикл у циклі."],
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
		hint: "Одна сторона — це три кроки, «зібрати» і поворот. Повтори сторону кілька разів."
	},
	{
		id: "g6-maze",
		grade: 6,
		title: "Лабіринт",
		task: ["Доведи робота до прапорця.", "Програма має сама вирішувати, коли повертати."],
		map: [
			"#######",
			"#S...##",
			"####.##",
			"#F...##",
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
		hint: "Повторюй, доки не дійдеш до прапорця: якщо попереду стіна, то поверни, інакше зроби крок."
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
			then: ["turnRight"],
			else: ["move"]
		}]
	}]
};
export { HERO_BLOCKS, HERO_COLOR, HERO_EXTENSION_ID, MAX_ACTIONS, MAX_FRAMES, MAX_PROGRAM_BLOCKS, START_OPCODE, allGoalsMet, allowedOpcodes, applyAction, atFinish, buildProgram, cellAhead, cellKey, checkProgram, describeGoal, goalMet, isNumberShadow, isWall, levels, onCrystal, opcodeOf, parseMap, runProgram, solutions, starsFor, wallAhead };
