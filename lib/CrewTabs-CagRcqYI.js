import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Fragment as Fragment$1, jsx, jsxs } from "react/jsx-runtime";
// src/core/blocks.ts
/** ID of the VM extension with the hero blocks. Opcodes in a program read `hero_move`. */
var HERO_EXTENSION_ID = "hero";
var HERO_COLOR = "#0FBD8C";
/** The field of «тут ‹…›?» that holds the item kind. */
var ITEM_FIELD = "ITEM";
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
		name: "store",
		text: "віднести на склад",
		boolean: false
	},
	{
		name: "wait",
		text: "зачекати ⏳",
		boolean: false
	},
	{
		name: "pull",
		text: "потягнути важіль",
		boolean: false
	},
	{
		name: "sow",
		text: "посіяти",
		boolean: false
	},
	{
		name: "feed",
		text: "нагодувати",
		boolean: false
	},
	{
		name: "chop",
		text: "рубати сокирою",
		boolean: false
	},
	{
		name: "water",
		text: "полити",
		boolean: false
	},
	{
		name: "build",
		text: "будувати",
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
	},
	{
		name: "handsFull",
		text: "руки повні?",
		boolean: true
	},
	{
		name: "atStorehouse",
		text: "тут склад?",
		boolean: true
	},
	{
		name: "onLever",
		text: "тут важіль?",
		boolean: true
	},
	{
		name: "leverOn",
		text: "важіль увімкнено?",
		boolean: true
	},
	{
		name: "bedEmpty",
		text: "тут порожня грядка?",
		boolean: true
	},
	{
		name: "sheepHungry",
		text: "вівці голодні?",
		boolean: true
	},
	{
		name: "woodAhead",
		text: "попереду дерево з колодою?",
		boolean: true
	},
	{
		name: "ripeAhead",
		text: "попереду стиглий гарбуз?",
		boolean: true
	},
	{
		name: "itemAhead",
		text: "у трубу видно річ?",
		boolean: true
	},
	{
		name: "atSite",
		text: "тут будмайданчик?",
		boolean: true
	},
	{
		name: "itemIs",
		text: "тут [ITEM]?",
		boolean: true
	},
	{
		name: "stock",
		text: "скільки [ITEM] у коморі",
		boolean: false,
		reporter: true
	}
];
/** What «скільки ‹…› у коморі» counts, by name in its drop-down: the barn of the farm. */
var STOCK_NAMES = {
	wood: "колод",
	carrot: "гарбузів",
	meat: "м'яса",
	gold: "золота",
	flour: "борошна"
};
var STOCK_KINDS = Object.keys(STOCK_NAMES);
/** Whether a value of a program is a kind the barn keeps. */
var isStockKind = (value) => typeof value === "string" && STOCK_KINDS.includes(value);
/** The kind a «скільки ‹…› у коморі» block holds in its field; logs when the field is damaged. */
var stockOfField = (field) => Array.isArray(field) && isStockKind(field[0]) ? field[0] : "wood";
/**
* What «взяти» says on a level: the hero lights a campfire and catches a fish, not «takes» them. Only the words on
* the block change; the opcode and the rule stay the same.
*/
var COLLECT_TEXT = {
	crystal: "взяти",
	wood: "взяти",
	apple: "взяти",
	key: "взяти",
	fish: "взяти",
	campfire: "розпалити",
	carrot: "взяти",
	egg: "взяти",
	meat: "взяти",
	gold: "взяти"
};
/** Item kinds by name, as the drop-down of «тут ‹…›?» shows them. */
var ITEM_NAMES = {
	crystal: "золото",
	wood: "дрова",
	apple: "гриб",
	fish: "м'ясо",
	key: "стріла",
	campfire: "вогнище",
	carrot: "гарбуз",
	egg: "ягня",
	meat: "м'ясо",
	gold: "злиток"
};
var ITEM_KINDS = Object.keys(ITEM_NAMES);
/** Whether a value of a program is an item kind. */
var isItemKind = (value) => typeof value === "string" && ITEM_KINDS.includes(value);
/** The kind a «тут ‹…›?» block holds in its field; a crystal when the field is damaged. */
var itemOfField = (field) => Array.isArray(field) && isItemKind(field[0]) ? field[0] : "crystal";
/**
* The choices of «тут ‹…›?» on a level: the kinds that lie on its map (`itemsAt`, then `item`), every kind when
* the level names none.
*/
var itemMenu = (scene) => {
	const kinds = /* @__PURE__ */ new Set([...(scene?.itemsAt ?? []).map((i) => i.item), ...scene?.item === void 0 ? [] : [scene.item]]);
	return kinds.size === 0 ? ITEM_KINDS : ITEM_KINDS.filter((k) => kinds.has(k));
};
/** The words of the «взяти» block on a level with these items. */
var collectText = (scene) => COLLECT_TEXT[scene?.item ?? "crystal"];
/** The words of a hero block on a level: «взяти» follows the level's items. */
var heroBlockText = (name, scene) => name === "collect" ? collectText(scene) : HERO_BLOCKS.find((b) => b.name === name)?.text ?? name;
var HERO_NAMES = new Set(HERO_BLOCKS.map((b) => b.name));
var SCRATCH_OPCODES = {
	repeat: "control_repeat",
	forever: "control_forever",
	repeatUntil: "control_repeat_until",
	if: "control_if",
	ifElse: "control_if_else",
	not: "operator_not",
	and: "operator_and",
	or: "operator_or",
	gt: "operator_gt",
	lt: "operator_lt",
	equals: "operator_equals"
};
var COMPARISON_OPCODES = {
	">": "operator_gt",
	"<": "operator_lt",
	"=": "operator_equals"
};
var comparisonOfOpcode = (opcode) => Object.keys(COMPARISON_OPCODES).find((c) => COMPARISON_OPCODES[c] === opcode);
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
/** A number parameter of a custom block, as the reporter inside its «визначити». */
var ARGUMENT_OPCODE = "argument_reporter_string_number";
/** Shadow blocks that hold the number in «повторити 10», and the text in «задати лічильник 0». */
var NUMBER_SHADOWS = /* @__PURE__ */ new Set([
	"math_whole_number",
	"math_positive_number",
	"math_number",
	"text"
]);
/** Blocks a palette name brings. Most names are one block; the counter and the custom block are several. */
var opcodesOf = (name) => {
	if (name === "counter" || name === "variables") return [
		SET_OPCODE,
		CHANGE_OPCODE,
		VARIABLE_OPCODE
	];
	if (name === "procedure") return [
		DEFINITION_OPCODE,
		PROTOTYPE_OPCODE,
		CALL_OPCODE
	];
	if (name === "myBlocks") return [
		DEFINITION_OPCODE,
		PROTOTYPE_OPCODE,
		CALL_OPCODE,
		ARGUMENT_OPCODE
	];
	return [HERO_NAMES.has(name) ? `${HERO_EXTENSION_ID}_${name}` : SCRATCH_OPCODES[name]];
};
/** The block of a palette name. For the counter it is «змінити», for the custom block the call. */
var opcodeOf$1 = (name) => {
	if (name === "counter" || name === "variables") return CHANGE_OPCODE;
	if (name === "procedure" || name === "myBlocks") return CALL_OPCODE;
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
/** The words of a custom block without its parameter slots: «пройти %s» is «пройти». */
var procedureTitle = (proccode) => proccode.replace(/%[snb]/g, " ").replace(/\s+/g, " ").trim();
// src/core/build.ts
/** The words of a custom block with a slot for each parameter, as Scratch keeps them: «пройти %s». */
var proccodeOf$1 = (name, params = []) => [name, ...params.map(() => "%s")].join(" ");
/** The id of a variable the student made, as the tests and solutions write it. */
var variableId = (name) => `eb-var-${name}`;
/** The mutation of a custom block, as the editor keeps it. */
var mutation = (proccode, ids, prototype) => ({
	tagName: "mutation",
	children: [],
	proccode,
	argumentids: JSON.stringify(ids),
	...prototype === false ? {} : {
		argumentnames: JSON.stringify(prototype),
		argumentdefaults: JSON.stringify(prototype.map(() => ""))
	},
	warp: "false"
});
/** The program of `steps`, with one custom block or several (`definition`). */
var buildProgram = (steps, definition) => {
	const defs = definition === void 0 ? [] : "body" in definition ? [definition] : definition;
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
		if (typeof q === "string") return add(opcodeOf$1(q), parent);
		if ("itemIs" in q) return add(opcodeOf$1("itemIs"), parent, { fields: { [ITEM_FIELD]: [q.itemIs, null] } });
		if ("compare" in q) {
			const id = add(COMPARISON_OPCODES[q.compare], parent);
			numberInput(id, "OPERAND1", "text", q.of[0]);
			numberInput(id, "OPERAND2", "text", q.of[1]);
			return id;
		}
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
	const procedure = defs[0]?.name ?? "мій блок";
	/** The argument ids of each custom block by its name: the call and the «визначити» must agree. */
	const argumentIds = new Map(defs.map((d, i) => [d.name ?? "мій блок", (d.params ?? []).map((_, j) => `eb-arg-${i}-${j}`)]));
	const paramsOf = new Map(defs.map((d) => [d.name ?? "мій блок", d.params ?? []]));
	const variableField = (name) => name === void 0 ? [COUNTER_NAME, COUNTER_ID] : [name, variableId(name)];
	/** A number slot: a shadow with the number, covered by the counter, a variable or a parameter. */
	const numberInput = (id, name, shadow, value) => {
		const number = add(shadow, id, {
			shadow: true,
			fields: { [shadow === "text" ? "TEXT" : "NUM"]: [typeof value === "number" ? String(value) : "0", null] }
		});
		if (typeof value === "number") {
			blocks[id].inputs[name] = [1, number];
			return;
		}
		const reporter = value === "counter" ? add(VARIABLE_OPCODE, id, { fields: { VARIABLE: variableField(void 0) } }) : "param" in value ? add(ARGUMENT_OPCODE, id, { fields: { VALUE: [value.param, null] } }) : "stock" in value ? add(opcodeOf$1("stock"), id, { fields: { [ITEM_FIELD]: [value.stock, null] } }) : add(VARIABLE_OPCODE, id, { fields: { VARIABLE: variableField(value.variable) } });
		blocks[id].inputs[name] = [
			3,
			reporter,
			number
		];
	};
	const call = (name, args, parent) => {
		const ids = argumentIds.get(name) ?? [];
		const id = add(CALL_OPCODE, parent, { mutation: mutation(proccodeOf$1(name, paramsOf.get(name) ?? []), ids, false) });
		ids.forEach((argId, i) => numberInput(id, argId, "text", args[i] ?? 0));
		return id;
	};
	const step = (s, parent) => {
		if (s === "call") return call(procedure, [], parent);
		if (typeof s === "string") return add(opcodeOf$1(s), parent);
		if ("call" in s) return call(s.call, s.args, parent);
		if ("set" in s) {
			const id = add(SET_OPCODE, parent, { fields: { VARIABLE: variableField(s.variable) } });
			blocks[id].inputs.VALUE = [1, add("text", id, {
				shadow: true,
				fields: { TEXT: [String(s.set), null] }
			})];
			return id;
		}
		if ("change" in s) {
			const id = add(CHANGE_OPCODE, parent, { fields: { VARIABLE: variableField(s.variable) } });
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
	defs.forEach((d, i) => {
		const name = d.name ?? "мій блок";
		const params = d.params ?? [];
		const ids = argumentIds.get(name) ?? [];
		const define = add(DEFINITION_OPCODE, null, {
			topLevel: true,
			x: 360,
			y: 40 + 300 * i
		});
		const prototype = add(PROTOTYPE_OPCODE, define, {
			shadow: true,
			mutation: mutation(proccodeOf$1(name, params), ids, params)
		});
		ids.forEach((argId, j) => {
			blocks[prototype].inputs[argId] = [1, add(ARGUMENT_OPCODE, prototype, {
				shadow: true,
				fields: { VALUE: [params[j] ?? "", null] }
			})];
		});
		blocks[define].inputs.custom_block = [1, prototype];
		blocks[define].next = stack(d.body, define);
	});
	return blocks;
};
// src/core/world.ts
/** What the sheep eat: the pumpkin of the beds. */
var FEED_ITEM = "carrot";
/**
* The world as worker `k` of the crew sees it: worker 0 is the hero of the level, worker k > 0 is `crew[k - 1]`.
* The same call again puts the workers back, so a helper acts with every rule of the hero and steps back after.
*/
var asWorker = (world, k) => {
	const other = world.crew[k - 1];
	if (k === 0 || other === void 0) return world;
	const crew = world.crew.map((w, i) => i === k - 1 ? {
		hero: world.hero,
		load: world.load,
		carrying: world.carrying
	} : w);
	return {
		...world,
		hero: other.hero,
		load: other.load,
		carrying: other.carrying,
		crew
	};
};
/** Flour: never lies on the map, the mill makes it of pumpkins and puts it in the barn. */
var FLOUR = "flour";
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
		route: (spec.route ?? []).map((c) => ({
			x: c.x,
			y: c.y
		})),
		target: 0,
		sees: spec.sees ?? "near",
		alerted: false,
		boss,
		...spec.look === void 0 ? {} : { look: spec.look }
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
	const levers = /* @__PURE__ */ new Set();
	const leversOn = /* @__PURE__ */ new Set();
	const gates = /* @__PURE__ */ new Set();
	const beds = /* @__PURE__ */ new Set();
	const sown = /* @__PURE__ */ new Set();
	const troughs = /* @__PURE__ */ new Set();
	let start = null;
	let finish = null;
	let storehouse = null;
	const storehouses = /* @__PURE__ */ new Set();
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
			else if (ch === "H") {
				storehouse ??= {
					x,
					y
				};
				storehouses.add(cellKey(x, y));
			} else if (ch === "L" || ch === "l") {
				levers.add(cellKey(x, y));
				if (ch === "l") leversOn.add(cellKey(x, y));
			} else if (ch === "G") gates.add(cellKey(x, y));
			else if (ch === "b" || ch === "B" || ch === "R") {
				beds.add(cellKey(x, y));
				if (ch === "B") sown.add(cellKey(x, y));
				if (ch === "R") crystals.add(cellKey(x, y));
			} else if (ch === "t") troughs.add(cellKey(x, y));
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
		maxHearts: 3,
		storehouse,
		carrying: 0,
		capacity: null,
		stored: 0,
		levers,
		leversOn,
		gates,
		gateLevers: /* @__PURE__ */ new Map(),
		itemKinds: /* @__PURE__ */ new Map(),
		beds,
		growing: new Map([...sown].map((key) => [key, 20])),
		growTurns: 20,
		regrowTurns: null,
		regrowAt: /* @__PURE__ */ new Map(),
		load: [],
		troughs,
		feedTurns: 12,
		towers: [],
		storehouses,
		barn: /* @__PURE__ */ new Map(),
		site: null,
		mill: null,
		crew: []
	};
};
/** What lies or lay on a cell. */
var kindAt = (world, key) => world.itemKinds.get(key) ?? "crystal";
/** «тут ‹морква›?»: a thing of this kind lies under the hero. */
var itemIs = (world, kind) => {
	const key = cellKey(world.hero.x, world.hero.y);
	return world.crystals.has(key) && kindAt(world, key) === kind;
};
/** Things of this kind on the map at the start, and the ones still lying there. */
var itemCount = (world, kind) => {
	const keys = [...world.crystals];
	return {
		total: [.../* @__PURE__ */ new Set([...world.itemKinds.keys(), ...keys])].filter((k) => kindAt(world, k) === kind).length,
		left: keys.filter((k) => kindAt(world, k) === kind).length
	};
};
/** The levers that open a gate: its own ones, or every lever of the map. */
var leversOf = (world, gate) => world.gateLevers.get(gate) ?? world.levers;
/** A gate stands open once all of its levers are on. */
var gateOpen = (world, gate) => [...leversOf(world, gate)].every((key) => world.leversOn.has(key));
/** Every gate stands open. True on a map without gates. */
var gatesOpen = (world) => [...world.gates].every((gate) => gateOpen(world, gate));
/** How many gates stand open now. */
var openGates = (world) => [...world.gates].filter((gate) => gateOpen(world, gate)).length;
/** A gate that is shut now. */
var isClosedGate = (world, x, y) => {
	const key = cellKey(x, y);
	return world.gates.has(key) && !gateOpen(world, key);
};
/** A wall, the edge of the map or a shut gate: nobody walks there now. */
var isWall = (world, x, y) => x < 0 || y < 0 || x >= world.width || y >= world.height || world.walls.has(cellKey(x, y)) || isClosedGate(world, x, y);
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
/** The hero stands on the storehouse. */
var atStorehouse = (world) => world.storehouses.has(cellKey(world.hero.x, world.hero.y));
/** The hero stands on the mill. */
var atMill = (world) => world.mill !== null && world.hero.x === world.mill.x && world.hero.y === world.mill.y;
/** «тут будмайданчик?»: the hero stands on the build site. */
var atSite = (world) => world.site !== null && world.hero.x === world.site.x && world.hero.y === world.site.y;
/** «скільки ‹колод› у коморі»: what lies in the barn now, with what was put there today. */
var stockOf = (world, kind) => world.barn.get(kind) ?? 0;
/** The hero carries as much as it can: «взяти» would take nothing now. Never true on a level without a limit. */
var handsFull = (world) => world.capacity !== null && world.carrying >= world.capacity || world.load.includes("gold");
/** The hero stands on a lever. */
var onLever = (world) => world.levers.has(cellKey(world.hero.x, world.hero.y));
/** The hero stands on a lever that is on. */
var leverOn = (world) => world.leversOn.has(cellKey(world.hero.x, world.hero.y));
/** The hero stands on a bed where nothing grows: «посіяти» would sow there. */
var bedEmpty = (world) => {
	const key = cellKey(world.hero.x, world.hero.y);
	return world.beds.has(key) && !world.growing.has(key) && !world.crystals.has(key);
};
/** The hero stands on a trough where the sheep neither eat nor left meat: «нагодувати» would feed them there. */
var sheepHungry = (world) => {
	const key = cellKey(world.hero.x, world.hero.y);
	return world.troughs.has(key) && !world.growing.has(key) && !world.crystals.has(key);
};
/** The cell ahead holds this kind of thing ready to take. */
var readyAhead = (world, ready) => {
	const next = cellAhead(world);
	const key = cellKey(next.x, next.y);
	return !isWall(world, next.x, next.y) && world.crystals.has(key) && ready(key);
};
/** «попереду дерево з колодою?»: the cell ahead is a tree (not a bed, a trough or the mine) with a log on it. */
var woodAhead = (world) => readyAhead(world, (key) => kindAt(world, key) === "wood" && !world.beds.has(key) && !world.regrowAt.has(key));
/** «попереду стиглий гарбуз?»: the cell ahead is a bed with a ripe crop. */
var ripeAhead = (world) => readyAhead(world, (key) => world.beds.has(key));
/** «у трубу видно річ?»: something to take lies on one of the next `SPYGLASS_RANGE` cells, before any wall. */
var itemAhead = (world) => {
	const d = DELTA[world.hero.dir];
	for (let i = 1; i <= 3; i++) {
		const x = world.hero.x + d.x * i;
		const y = world.hero.y + d.y * i;
		if (isWall(world, x, y)) return false;
		if (world.crystals.has(cellKey(x, y))) return true;
	}
	return false;
};
/** The hero stands on a bed where a crop grows and «полити» would make it ripe sooner. */
var canWater = (world) => {
	const key = cellKey(world.hero.x, world.hero.y);
	const left = world.growing.get(key);
	return world.beds.has(key) && left !== void 0 && left > wateredTurns(world);
};
/** A watered crop is ripe in at most half of its growing time. */
var wateredTurns = (world) => Math.ceil(world.growTurns / 2);
var at = (c) => ({
	x: c.x,
	y: c.y
});
/** The hero's own action, before the enemies, the towers and the crops take their turn (`worldTurn`). */
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
	if (action === "store") return store(world);
	if (action === "wait") return {
		world,
		outcome: "waited",
		events: [{ type: "heroWaited" }]
	};
	if (action === "pull") return pull(world);
	if (action === "sow") return sow(world);
	if (action === "feed") return feed(world);
	if (action === "water") return water(world);
	if (action === "build") return build(world);
	const key = cellKey(world.hero.x, world.hero.y);
	if (!world.crystals.has(key)) return {
		world,
		outcome: "nothingToCollect",
		events: [{
			type: "nothingToTake",
			at: here
		}]
	};
	const kind = kindAt(world, key);
	const onTree = kind === "wood" && !world.beds.has(key) && !world.troughs.has(key) && !world.regrowAt.has(key);
	if (action === "chop" && !onTree) return {
		world,
		outcome: "nothingToCollect",
		events: [{
			type: "nothingToTake",
			at: here
		}]
	};
	if (handsFull(world) || kind === "gold" && world.carrying > 0) return {
		world,
		outcome: "handsFull",
		events: [{
			type: "handsFull",
			at: here
		}]
	};
	const crystals = new Set(world.crystals);
	crystals.delete(key);
	const regrow = action === "chop" && world.regrowTurns !== null ? Math.ceil(world.regrowTurns / 2) : world.regrowTurns;
	const again = world.regrowAt.get(key) ?? (world.beds.has(key) || world.troughs.has(key) ? null : regrow);
	const growing = again === null ? world.growing : new Map([...world.growing, [key, again]]);
	const load = [...world.load, kind];
	return {
		world: {
			...world,
			crystals,
			growing,
			load,
			carrying: load.length
		},
		outcome: "collected",
		events: [{
			type: "itemTaken",
			at: here
		}]
	};
};
/** «нагодувати»: on a hungry trough the hero gives the sheep one pumpkin it carries; the meat lies there later. */
var feed = (world) => {
	const here = at(world.hero);
	const i = world.load.indexOf(FEED_ITEM);
	if (!sheepHungry(world) || i < 0) return {
		world,
		outcome: "cannotFeed",
		events: [{
			type: "cannotFeed",
			at: here
		}]
	};
	const load = world.load.filter((_, j) => j !== i);
	const growing = new Map([...world.growing, [cellKey(here.x, here.y), world.feedTurns]]);
	return {
		world: {
			...world,
			growing,
			load,
			carrying: load.length
		},
		outcome: "fed",
		events: [{
			type: "sheepFed",
			at: here
		}]
	};
};
/** «полити»: the crop on the bed under the hero is ripe in half of its growing time at most. */
var water = (world) => {
	const here = at(world.hero);
	if (!canWater(world)) return {
		world,
		outcome: "cannotWater",
		events: [{
			type: "cannotWater",
			at: here
		}]
	};
	const growing = new Map([...world.growing, [cellKey(here.x, here.y), wateredTurns(world)]]);
	return {
		world: {
			...world,
			growing
		},
		outcome: "watered",
		events: [{
			type: "bedWatered",
			at: here
		}]
	};
};
/** «посіяти»: on an empty bed the crop starts to grow. */
var sow = (world) => {
	const here = at(world.hero);
	if (!bedEmpty(world)) return {
		world,
		outcome: "cannotSow",
		events: [{
			type: "cannotSow",
			at: here
		}]
	};
	const growing = new Map([...world.growing, [cellKey(here.x, here.y), world.growTurns]]);
	return {
		world: {
			...world,
			growing
		},
		outcome: "sown",
		events: [{
			type: "seedSown",
			at: here
		}]
	};
};
/** One turn passes for what grows: a crop or a thing that is ready lies on its cell now. */
var growTurn = (world) => {
	if (world.growing.size === 0) return {
		world,
		events: []
	};
	const growing = /* @__PURE__ */ new Map();
	const crystals = new Set(world.crystals);
	const events = [];
	for (const [key, left] of world.growing) {
		if (left > 1) {
			growing.set(key, left - 1);
			continue;
		}
		crystals.add(key);
		const [x, y] = key.split(",").map(Number);
		events.push({
			type: "itemGrew",
			at: {
				x: x ?? 0,
				y: y ?? 0
			}
		});
	}
	return {
		world: {
			...world,
			growing,
			crystals
		},
		events
	};
};
/** The barn with `n` more of a kind. */
var addTo = (barn, kind, n) => new Map([...barn, [kind, (barn.get(kind) ?? 0) + n]]);
/**
* «віднести на склад»: on the storehouse the hero puts down everything it carries. On the mill it puts down only the
* pumpkins: the millstones grind them, and the flour lies in the barn.
*/
var store = (world) => {
	const here = at(world.hero);
	if (atMill(world)) {
		const ground = world.load.filter((k) => k === FEED_ITEM).length;
		if (ground === 0) return {
			world,
			outcome: "nothingToStore",
			events: [{
				type: "nothingToStore",
				at: here
			}]
		};
		const load = world.load.filter((k) => k !== FEED_ITEM);
		return {
			world: {
				...world,
				load,
				carrying: load.length,
				barn: addTo(world.barn, FLOUR, ground)
			},
			outcome: "milled",
			events: [{
				type: "flourMilled",
				at: here,
				count: ground
			}]
		};
	}
	if (!atStorehouse(world)) return {
		world,
		outcome: "notStorehouse",
		events: [{
			type: "nothingToStore",
			at: here
		}]
	};
	if (world.carrying === 0) return {
		world,
		outcome: "nothingToStore",
		events: [{
			type: "nothingToStore",
			at: here
		}]
	};
	return {
		world: {
			...world,
			stored: world.stored + world.carrying,
			carrying: 0,
			load: [],
			barn: world.load.reduce((b, k) => addTo(b, k, 1), world.barn)
		},
		outcome: "stored",
		events: [{
			type: "itemsStored",
			at: here,
			count: world.carrying
		}]
	};
};
/** «будувати»: on the site, with the price of a part in the barn, one more part stands and the price leaves the barn. */
var build = (world) => {
	const here = at(world.hero);
	const site = world.site;
	const cannot = {
		world,
		outcome: "cannotBuild",
		events: [{
			type: "cannotBuild",
			at: here
		}]
	};
	if (site === null || !atSite(world) || site.left <= 0) return cannot;
	if ([...site.part].some(([kind, n]) => stockOf(world, kind) < n)) return cannot;
	const barn = [...site.part].reduce((b, [kind, n]) => addTo(b, kind, -n), world.barn);
	const left = site.left - 1;
	return {
		world: {
			...world,
			barn,
			site: {
				...site,
				left
			}
		},
		outcome: "built",
		events: [{
			type: "partBuilt",
			at: here,
			left
		}]
	};
};
/** «потягнути важіль»: switches the lever under the hero. The gates follow: open when every lever is on. */
var pull = (world) => {
	const here = at(world.hero);
	const key = cellKey(here.x, here.y);
	if (!world.levers.has(key)) return {
		world,
		outcome: "noLever",
		events: [{
			type: "noLever",
			at: here
		}]
	};
	const leversOn = new Set(world.leversOn);
	const on = !leversOn.has(key);
	if (on) leversOn.add(key);
	else leversOn.delete(key);
	const after = {
		...world,
		leversOn
	};
	const wasOpen = openGates(world);
	const isOpen = openGates(after);
	return {
		world: after,
		outcome: "pulled",
		events: [{
			type: "leverPulled",
			at: here,
			on
		}, ...wasOpen === isOpen ? [] : [isOpen > wasOpen ? { type: "gatesOpened" } : { type: "gatesClosed" }]]
	};
};
var distance$1 = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
/** Cells an enemy may step on: floor with no hero and no other enemy. */
var freeFor = (world, enemies, self, x, y) => !isWall(world, x, y) && !(world.hero.x === x && world.hero.y === y) && !enemies.some((e) => e.id !== self.id && isAlive(e) && e.x === x && e.y === y);
/**
* The first step of a shortest way from the enemy to a cell where `arrived` is true, or null when there is none
* within `depth` steps.
*/
var firstStep = (world, enemies, self, arrived, depth) => {
	const first = /* @__PURE__ */ new Map();
	const seen = /* @__PURE__ */ new Set([cellKey(self.x, self.y)]);
	let wave = [self];
	for (let d = 0; wave.length > 0 && d <= depth; d++) {
		const next = [];
		for (const c of wave) {
			if (arrived(c)) return first.get(cellKey(c.x, c.y)) ?? null;
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
/** The first step of a shortest way to a cell next to the hero. Searched as far as the enemy sees, and a little more. */
var stepToward = (world, enemies, self) => firstStep(world, enemies, self, (c) => distance$1(c, world.hero) === 1, self.sight * 2 + 2);
/** The patrol searches its next cell this far: a route goes round a few walls at most. */
var PATROL_DEPTH = 32;
/** The enemy sees the hero in its row or column, `sight` cells away or closer, with no wall between. */
var seesInLine = (world, self) => {
	const { hero } = world;
	if (hero.x !== self.x && hero.y !== self.y) return false;
	const far = distance$1(self, hero);
	if (far > self.sight) return false;
	const dx = Math.sign(hero.x - self.x);
	const dy = Math.sign(hero.y - self.y);
	for (let i = 1; i < far; i++) if (isWall(world, self.x + dx * i, self.y + dy * i)) return false;
	return true;
};
/** Whether the enemy comes for the hero this turn, and whether it has just noticed them. */
var noticing = (world, self) => {
	if (self.sight === 0) return {
		comes: false,
		alerted: self.alerted
	};
	if (self.sees === "near") return {
		comes: distance$1(self, world.hero) <= self.sight,
		alerted: false
	};
	const alerted = self.alerted || seesInLine(world, self);
	return {
		comes: alerted,
		alerted
	};
};
/** A patrolling enemy's step along its route: to the cell it walks to, then on to the next one. */
var patrolStep = (world, enemies, self) => {
	if (self.route.length === 0) return self;
	let target = self.target % self.route.length;
	const goal = self.route[target];
	if (goal.x === self.x && goal.y === self.y) target = (target + 1) % self.route.length;
	const to = self.route[target];
	const step = firstStep(world, enemies, self, (c) => c.x === to.x && c.y === to.y, PATROL_DEPTH);
	return step === null ? {
		...self,
		target
	} : {
		...self,
		target,
		x: step.x,
		y: step.y
	};
};
/** One enemy's turn: swing or hit when next to the hero, come closer when it sees the hero, walk its way otherwise. */
var enemyTurn = (world, enemies, self) => {
	const near = distance$1(self, world.hero);
	const { comes, alerted } = noticing(world, self);
	const me = {
		...self,
		alerted
	};
	if (near === 1) return self.swinging ? {
		enemy: {
			...me,
			swinging: false
		},
		hit: true
	} : {
		enemy: {
			...me,
			swinging: true
		},
		hit: false
	};
	const calm = {
		...me,
		swinging: false
	};
	if (comes) {
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
	if (self.walk === "patrol") return {
		enemy: patrolStep(world, enemies, calm),
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
	if (after.alerted && !before.alerted) return [{
		type: "enemyAlerted",
		id: after.id
	}, ...enemyEvents({
		...before,
		alerted: true
	}, after, hit, hearts)];
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
/**
* After the enemies, each tower shoots the nearest enemy that is up and within its range, the first of them on a tie.
* The towers shoot in order, so two towers can take the same enemy down in one turn.
*/
var towersTurn = (world) => {
	if (world.towers.length === 0 || !world.enemies.some(isAlive)) return {
		world,
		events: []
	};
	let enemies = world.enemies;
	const events = [];
	for (const tower of world.towers) {
		const target = enemies.filter((e) => isAlive(e) && distance$1(e, tower) <= tower.range).reduce((best, e) => best === null || distance$1(e, tower) < distance$1(best, tower) ? e : best, null);
		if (target === null) continue;
		const hp = target.hp - 1;
		enemies = enemies.map((e) => e.id === target.id ? {
			...e,
			hp,
			swinging: false
		} : e);
		events.push({
			type: "towerShot",
			from: at(tower),
			id: target.id,
			hp
		});
		if (hp <= 0) events.push({
			type: "enemyDown",
			id: target.id
		});
	}
	return {
		world: {
			...world,
			enemies
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
	const turn = worldTurn(done.world);
	return {
		world: turn.world,
		outcome: done.outcome,
		events: [...done.events, ...turn.events]
	};
};
/** What happens after the hero's action, or after every worker of a crew acted: enemies, towers, crops. */
var worldTurn = (world) => {
	const turn = enemiesTurn(world);
	const shot = towersTurn(turn.world);
	const grown = growTurn(shot.world);
	return {
		world: grown.world,
		events: [
			...turn.events,
			...shot.events,
			...grown.events
		]
	};
};
// src/core/level.ts
/** The world at the start of a level: the map, the enemies and the hearts. */
var startWorld = (level) => {
	const world = parseMap(level.map, level.dir);
	const hearts = Math.max(1, Math.round(level.hearts ?? world.hearts));
	const energy = level.maxSteps === void 0 ? null : Math.max(0, Math.round(level.maxSteps));
	const capacity = level.capacity === void 0 ? null : Math.max(1, Math.round(level.capacity));
	const itemKinds = itemKindsOf(world, level.scene ?? {}, (level.growingAt ?? []).map((g) => cellKey(g.x, g.y)));
	const gateLevers = gateLeversOf(world, level.links ?? []);
	const growTurns = level.grow === void 0 ? world.growTurns : Math.max(1, Math.round(level.grow));
	const regrowTurns = level.regrow === void 0 ? null : Math.max(1, Math.round(level.regrow));
	const growing = new Map([...[...world.growing.keys()].map((key) => [key, growTurns]), ...(level.growingAt ?? []).filter((g) => !world.walls.has(cellKey(g.x, g.y)) && !world.crystals.has(cellKey(g.x, g.y))).map((g) => [cellKey(g.x, g.y), Math.max(1, Math.round(g.turns))])]);
	const towers = (level.towers ?? []).map((t) => ({
		x: t.x,
		y: t.y,
		range: Math.max(1, Math.round(t.range))
	}));
	const regrowAt = new Map((level.regrowAt ?? []).map((g) => [cellKey(g.x, g.y), Math.max(1, Math.round(g.turns))]));
	const feedTurns = level.feed === void 0 ? world.feedTurns : Math.max(1, Math.round(level.feed));
	const amounts = (a) => new Map(Object.entries(a).map(([k, n]) => [k, Math.max(0, Math.round(n ?? 0))]));
	const barn = amounts(level.barn ?? {});
	const site = level.site === void 0 ? null : {
		x: level.site.x,
		y: level.site.y,
		part: amounts(level.site.part),
		left: Math.max(0, Math.round(level.site.left))
	};
	const mill = level.mill === void 0 ? null : {
		x: level.mill.x,
		y: level.mill.y
	};
	return {
		...world,
		enemies: (level.enemies ?? []).map(enemyOf),
		hearts,
		maxHearts: hearts,
		energy,
		capacity,
		itemKinds,
		gateLevers,
		growTurns,
		regrowTurns,
		regrowAt,
		feedTurns,
		growing,
		towers,
		barn,
		site,
		mill,
		crew: (level.helpers ?? []).map((h) => ({
			hero: {
				x: h.x,
				y: h.y,
				dir: h.dir
			},
			load: [],
			carrying: 0
		}))
	};
};
/** The levers of each linked gate: links to cells that are no gate or no lever are left out (`checkLevel` tells). */
var gateLeversOf = (world, links) => new Map(links.filter((link) => world.gates.has(cellKey(link.gate.x, link.gate.y))).map((link) => [cellKey(link.gate.x, link.gate.y), new Set(link.levers.map((c) => cellKey(c.x, c.y)).filter((key) => world.levers.has(key)))]));
/** What lies on each `c` cell: its own kind from `itemsAt`, the level's `item` otherwise. */
/** What grows on a bed when the level does not say: pumpkins in the pack. */
var BED_ITEM = "carrot";
/** What the sheep leave on the trough after they ate. */
var TROUGH_ITEM = "meat";
var itemKindsOf = (world, scene, growing) => {
	const own = new Map((scene.itemsAt ?? []).map((i) => [cellKey(i.x, i.y), i.item]));
	const kindOf = (key) => own.get(key) ?? (world.beds.has(key) ? "carrot" : world.troughs.has(key) ? "meat" : scene.item ?? "crystal");
	return new Map([.../* @__PURE__ */ new Set([
		...world.crystals,
		...world.beds,
		...world.troughs,
		...growing
	])].map((key) => [key, kindOf(key)]));
};
var goalMet = (world, goal) => {
	switch (goal.type) {
		case "crystals": return world.crystals.size === 0;
		case "finish": return atFinish(world);
		case "enemies": return enemiesLeft(world) === 0;
		case "store": return world.crystals.size === 0 && world.carrying === 0;
		case "pick": {
			const mine = itemCount(world, goal.item);
			return mine.left === 0 && world.crystals.size === world.totalCrystals - mine.total;
		}
	}
};
var allGoalsMet = (level, world) => level.goals.every((g) => goalMet(world, g));
/** Which goals of the level are met now, in the order of `level.goals`: the live goal list of the game. */
var goalStatus = (level, world) => level.goals.map((g) => goalMet(world, g));
var ITEM_GOALS = {
	crystal: (n) => `Збери все золото (${n})`,
	wood: (n) => n === 1 ? "Візьми дрова" : `Візьми дрова (${n})`,
	apple: (n) => `Збери гриби (${n})`,
	fish: (n) => `Збери м'ясо (${n})`,
	key: (n) => n === 1 ? "Візьми стрілу" : `Збери стріли (${n})`,
	campfire: (n) => `Розпали вогнища (${n})`,
	carrot: (n) => `Збери гарбузи (${n})`,
	egg: (n) => n === 1 ? "Забери ягня" : `Збери ягнят (${n})`,
	meat: (n) => `Збери м'ясо (${n})`,
	gold: (n) => n === 1 ? "Візьми злиток" : `Збери злитки (${n})`
};
/** «Збери лише …»: the goal that takes one kind and leaves the others. */
var ITEM_PICKS = {
	crystal: "Збери лише золото",
	wood: "Візьми лише дрова",
	apple: "Збери лише гриби",
	fish: "Збери лише м'ясо",
	key: "Збери лише стріли",
	campfire: "Розпали лише вогнища",
	carrot: "Збери лише гарбузи",
	egg: "Забери лише ягнят",
	meat: "Збери лише м'ясо",
	gold: "Збери лише злитки"
};
/** The kind the goal names: the one kind of `itemsAt` when there is one, the level's `item` otherwise. */
var goalItem = (scene) => {
	const kinds = new Set((scene.itemsAt ?? []).map((i) => i.item));
	if (kinds.size > 1) return "harvest";
	return [...kinds][0] ?? scene.item ?? "crystal";
};
var FINISH_GOALS = {
	flag: "Дійди до вказівника",
	well: "Дійди до джерела",
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
		case "crystals": {
			const item = goalItem(scene);
			return item === "harvest" ? `Збери врожай (${world.totalCrystals})` : ITEM_GOALS[item](world.totalCrystals);
		}
		case "finish": return FINISH_GOALS[scene.finish ?? "flag"];
		case "enemies": return enemiesGoal(world);
		case "store": return `Віднеси все на склад (${world.totalCrystals})`;
		case "pick": return `${ITEM_PICKS[goal.item]} (${itemCount(world, goal.item).total}), а решту не чіпай`;
	}
};
var starsFor = (level, blocks) => {
	if (level.stars === void 0 || blocks <= level.stars.three) return 3;
	return blocks <= level.stars.two ? 2 : 1;
};
/**
* Whether a level's `hints` and `gift` are written for the way it is played now. A level of «Python: перші кроки»
* (`language: "python"`) speaks of Python code; a course level speaks of blocks, so in Python it keeps its `hint`.
*/
var speaksTo = (level, language) => level.language === "python" === (language === "python");
/** Hero actions in one run. A textbook level needs fewer than 100. */
var MAX_ACTIONS = 1e3;
/** VM frames in one run. A «завжди» loop without actions ends here. */
var MAX_FRAMES = 2e3;
/** The reason a run stops after this outcome, or null when it goes on. */
var fatalReason = (outcome) => outcome === "crashed" ? "crashed" : outcome === "fell" ? "trapped" : outcome === "tired" ? "tired" : null;
var isRecord$4 = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
var isProgramBlock = (value) => isRecord$4(value) && typeof value.opcode === "string";
/** A variable reporter as the editor keeps it: `[12, name, id]`, inside an input or alone on the canvas. */
var isVariablePrimitive = (value) => Array.isArray(value) && value[0] === 12;
/** Variable reporters kept inside the inputs of a block. Each is a block the student put, so it counts. */
var variablesIn = (block) => isRecord$4(block.inputs) ? Object.values(block.inputs).filter((input) => Array.isArray(input) && isVariablePrimitive(input[1])).length : 0;
/** A custom block «без оновлення екрана» runs on the clock in Scratch, so a run could differ: it is refused. */
var isWarp = (block) => isRecord$4(block.mutation) && (block.mutation.warp === true || block.mutation.warp === "true");
var proccodeOf = (block) => isRecord$4(block.mutation) ? block.mutation.proccode : void 0;
/** Hats a script hangs from: the blocks under them are the program. */
var HATS = /* @__PURE__ */ new Set([START_OPCODE, DEFINITION_OPCODE]);
/**
* Whether a block is part of a script: following its parents leads to «коли прапорець натиснуто» or «визначити».
* A block left alone on the canvas does not run, so it does not count against the stars.
*/
var attachedTo = (program) => {
	const memo = /* @__PURE__ */ new Map();
	const attached = (id, seen) => {
		const known = memo.get(id);
		if (known !== void 0) return known;
		const block = program[id];
		let result = false;
		if (isProgramBlock(block) && !seen.has(id)) {
			seen.add(id);
			const parent = block.parent;
			result = typeof parent === "string" && Object.hasOwn(program, parent) ? attached(parent, seen) : HATS.has(block.opcode);
		}
		memo.set(id, result);
		return result;
	};
	return (id) => attached(id, /* @__PURE__ */ new Set());
};
/**
* The variables a program names, each once, in the order of the program: those of «задати», «змінити» and the
* reporters. The project declares them, so the editor lists them and the VM starts each at 0.
*/
var programVariables = (program) => {
	const found = /* @__PURE__ */ new Map();
	const note = (name, id) => {
		if (typeof id === "string" && typeof name === "string" && !found.has(id)) found.set(id, name);
	};
	for (const block of Object.values(program)) {
		if (isVariablePrimitive(block)) {
			const [, name, id] = block;
			note(name, id);
			continue;
		}
		if (!isProgramBlock(block)) continue;
		const fields = block.fields;
		if (isRecord$4(fields) && Array.isArray(fields.VARIABLE)) note(fields.VARIABLE[0], fields.VARIABLE[1]);
		if (!isRecord$4(block.inputs)) continue;
		for (const input of Object.values(block.inputs)) if (Array.isArray(input) && isVariablePrimitive(input[1])) note(input[1][1], input[1][2]);
	}
	return [...found].map(([id, name]) => ({
		id,
		name
	}));
};
/** Checks the program shape and palette before it runs. Returns the error text or the block count. */
var checkProgram = (level, program) => {
	const entries = Object.entries(program);
	if (entries.length > 300) return { error: `Програма довша за 300 блоків` };
	const allowed = allowedOpcodes(level.blocks);
	const defined = /* @__PURE__ */ new Set();
	let blocks = 0;
	let hasStart = false;
	const attached = attachedTo(program);
	for (const [id, block] of entries) {
		if (isVariablePrimitive(block) && allowed.has("data_variable")) continue;
		if (!isProgramBlock(block)) return { error: "Блок без опкоду або змінна: цей рівень їх не має" };
		if (!allowed.has(block.opcode)) return { error: `Блок ${block.opcode} не з цього рівня` };
		if (isWarp(block)) return { error: "Власний блок «без оновлення екрана» тут не працює: зніми цю позначку" };
		if (block.opcode === "procedures_prototype") {
			const name = proccodeOf(block);
			if (defined.has(name)) return { error: `Блок «${String(name)}» визначено двічі: залиш одне «визначити»` };
			defined.add(name);
		}
		if (block.opcode === "event_whenflagclicked") hasStart = true;
		if (!attached(id)) continue;
		blocks += variablesIn(block);
		if (block.opcode !== "event_whenflagclicked" && block.shadow !== true && !isNumberShadow(block.opcode)) blocks++;
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
	"attack",
	"store",
	"wait",
	"pull",
	"sow",
	"feed",
	"chop",
	"water",
	"build"
];
/** Each question and how the world answers it. */
var HERO_SENSORS = {
	wallAhead,
	onCrystal,
	atFinish,
	enemyAhead,
	trapAhead,
	handsFull,
	atStorehouse,
	onLever,
	leverOn,
	bedEmpty,
	sheepHungry,
	woodAhead,
	ripeAhead,
	itemAhead,
	atSite
};
var SENSOR_NAMES = Object.keys(HERO_SENSORS);
var ACTION_BY_OPCODE = new Map(HERO_ACTIONS.map((a) => [opcodeOf$1(a), a]));
var SENSOR_BY_OPCODE = new Map(SENSOR_NAMES.map((s) => [opcodeOf$1(s), s]));
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
		...source.counter === void 0 ? {} : { counter: source.counter },
		...source.boxes === void 0 ? {} : { boxes: source.boxes }
	});
	const fatal = fatalReason(outcome);
	if (fatal !== null) return end(session, fatal);
	if (level.turns !== void 0) {
		if (session.frames.length >= level.turns) return end(session, null);
	} else if (allGoalsMet(level, world)) return end(session, null);
	if (world.hearts === 0) return end(session, "defeated");
	if (session.frames.length >= 1e3) return end(session, "tooLong");
	return false;
};
/** A program alone on a level: its actions are the hero's (`heroAct`). */
var soloStage = (level) => {
	const session = newSession(level);
	return {
		session,
		act: (action, source) => heroAct(level, session, action, source)
	};
};
/** Runs a program to its end, alone on its level. */
var runAlone = (run) => {
	let step = run.next(false);
	while (step.done !== true) step = run.next(false);
	return step.value;
};
/** The answer to a question about the world as it is now. */
var heroSense = (session, probe) => typeof probe === "string" ? HERO_SENSORS[probe](session.world) : itemIs(session.world, probe.itemIs);
/** «скільки ‹…› у коморі»: a number, what lies in the barn now. */
var heroCount = (session, kind) => stockOf(session.world, kind);
var end = (session, reason) => {
	session.done = true;
	session.reason = reason;
	return true;
};
// src/core/read.ts
var isRecord$3 = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
/** Scratch reads a text that is not a number as 0; a count is rounded. */
var numberOf = (value) => {
	const n = Number(value);
	return Number.isFinite(n) ? n : 0;
};
var readProgram = (program) => {
	const blockAt = (id) => {
		if (typeof id !== "string" || !Object.hasOwn(program, id)) return null;
		const b = program[id];
		if (!isRecord$3(b) || typeof b.opcode !== "string") return null;
		return {
			opcode: b.opcode,
			next: b.next,
			inputs: isRecord$3(b.inputs) ? b.inputs : {},
			fields: isRecord$3(b.fields) ? b.fields : {},
			mutation: b.mutation,
			topLevel: b.topLevel
		};
	};
	const inputOf = (block, name) => {
		const input = block.inputs[name];
		return Array.isArray(input) ? input[1] : null;
	};
	const proccodeOf = (block) => block !== null && isRecord$3(block.mutation) && typeof block.mutation.proccode === "string" ? block.mutation.proccode : null;
	/** A list the mutation keeps as JSON text: the argument ids or names. */
	const listOf = (block, key) => {
		const text = block !== null && isRecord$3(block.mutation) ? block.mutation[key] : void 0;
		try {
			const list = typeof text === "string" ? JSON.parse(text) : [];
			return Array.isArray(list) ? list.map(String) : [];
		} catch {
			return [];
		}
	};
	/** A variable field `[name, id]`: the counter or a variable the student made. */
	const variableOf = (field) => {
		const [name, id] = Array.isArray(field) ? field : [];
		return id === "eb-counter" ? "counter" : { variable: String(name ?? "") };
	};
	/** The variable a «задати» or «змінити» sets: nothing for the counter. */
	const target = (block) => {
		const v = variableOf(block.fields.VARIABLE);
		return typeof v === "object" && "variable" in v ? { variable: v.variable } : {};
	};
	const seen = /* @__PURE__ */ new Set();
	const visit = (id) => {
		if (typeof id !== "string" || seen.has(id) || seen.size > 300) return null;
		seen.add(id);
		return blockAt(id);
	};
	const slot = (ref) => {
		const block = visit(ref);
		if (block === null) return null;
		const sensor = sensorOfOpcode(block.opcode);
		if (sensor !== void 0) return sensor;
		if (block.opcode === opcodeOf$1("itemIs")) return { itemIs: itemOfField(block.fields[ITEM_FIELD]) };
		const comparison = comparisonOfOpcode(block.opcode);
		if (comparison !== void 0) return {
			compare: comparison,
			of: [amount(inputOf(block, "OPERAND1")), amount(inputOf(block, "OPERAND2"))]
		};
		if (block.opcode === "operator_not") return { not: slot(inputOf(block, "OPERAND")) };
		const pair = () => [slot(inputOf(block, "OPERAND1")), slot(inputOf(block, "OPERAND2"))];
		if (block.opcode === "operator_and") return { and: pair() };
		if (block.opcode === "operator_or") return { or: pair() };
		return null;
	};
	const amount = (ref) => {
		if (Array.isArray(ref)) return ref[0] === 12 ? variableOf([ref[1], ref[2]]) : numberOf(ref[1]);
		const block = visit(ref);
		if (block === null) return 0;
		if (block.opcode === "data_variable") return variableOf(block.fields.VARIABLE);
		if (block.opcode === opcodeOf$1("stock")) return { stock: stockOfField(block.fields[ITEM_FIELD]) };
		if (block.opcode === "argument_reporter_string_number") {
			const field = block.fields.VALUE;
			return { param: String(Array.isArray(field) ? field[0] : "") };
		}
		const field = block.fields.NUM ?? block.fields.TEXT;
		return Array.isArray(field) ? numberOf(field[0]) : 0;
	};
	const stack = (first) => {
		const steps = [];
		for (let block = visit(first); block !== null; block = visit(block.next)) {
			const s = stepOf(block);
			if (s !== null) steps.push(s);
		}
		return steps;
	};
	const stepOf = (block) => {
		const action = actionOfOpcode(block.opcode);
		if (action !== void 0) return action;
		switch (block.opcode) {
			case "control_repeat": {
				const times = amount(inputOf(block, "TIMES"));
				return {
					repeat: typeof times === "number" ? Math.max(0, Math.round(times)) : times,
					body: stack(inputOf(block, "SUBSTACK"))
				};
			}
			case "control_forever": return { forever: stack(inputOf(block, "SUBSTACK")) };
			case "control_repeat_until": return {
				until: slot(inputOf(block, "CONDITION")),
				body: stack(inputOf(block, "SUBSTACK"))
			};
			case "control_if": return {
				if: slot(inputOf(block, "CONDITION")),
				then: stack(inputOf(block, "SUBSTACK"))
			};
			case "control_if_else": return {
				if: slot(inputOf(block, "CONDITION")),
				then: stack(inputOf(block, "SUBSTACK")),
				else: stack(inputOf(block, "SUBSTACK2"))
			};
			case SET_OPCODE: return {
				set: amount(inputOf(block, "VALUE")),
				...target(block)
			};
			case CHANGE_OPCODE: return {
				change: amount(inputOf(block, "VALUE")),
				...target(block)
			};
			case CALL_OPCODE: return {
				call: procedureTitle(proccodeOf(block) ?? ""),
				args: listOf(block, "argumentids").map((id) => amount(inputOf(block, id)))
			};
			default: return null;
		}
	};
	const tops = Object.keys(program).flatMap((id) => {
		const block = blockAt(id);
		return block !== null && block.topLevel === true ? [{
			id,
			block
		}] : [];
	});
	const scripts = tops.filter((t) => t.block.opcode === START_OPCODE).map((t) => {
		seen.add(t.id);
		return stack(t.block.next);
	});
	const definitions = [];
	for (const t of tops) {
		if (t.block.opcode !== "procedures_definition") continue;
		const prototype = blockAt(inputOf(t.block, "custom_block"));
		const proccode = proccodeOf(prototype);
		if (proccode === null || definitions.some((d) => d.proccode === proccode)) continue;
		seen.add(t.id);
		definitions.push({
			proccode,
			name: procedureTitle(proccode),
			params: listOf(prototype, "argumentnames"),
			body: stack(t.block.next)
		});
	}
	return {
		scripts,
		definitions: definitions.map(({ proccode: _, ...d }) => d)
	};
};
// src/core/python/api.ts
/** The method of «скільки ‹…› у коморі». */
var STOCK_METHOD = "stock";
var STOCK_KINDS_TEXT = STOCK_KINDS.map((k) => `"${k}" (${STOCK_NAMES[k] ?? k})`).join(", ");
/** The method of «тут ‹…›?». */
var ITEM_METHOD = "item_is";
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
		doc: "Взяти те, що лежить тут: на інших рівнях — розпалити вогнище.",
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
		name: "store",
		signature: "store()",
		doc: "Віднести на склад усе, що несеш: герой має стояти на складі.",
		block: "store",
		action: "store"
	},
	{
		name: "wait",
		signature: "wait()",
		doc: "Зачекати один хід: герой стоїть, а вороги ходять.",
		block: "wait",
		action: "wait"
	},
	{
		name: "pull",
		signature: "pull()",
		doc: "Потягнути важіль під героєм: увімкнути або вимкнути. Ворота відчиняються, коли всі важелі увімкнено.",
		block: "pull",
		action: "pull"
	},
	{
		name: "sow",
		signature: "sow()",
		doc: "Посіяти на порожній грядці під героєм. Урожай достигне за кілька ходів.",
		block: "sow",
		action: "sow"
	},
	{
		name: "feed",
		signature: "feed()",
		doc: "Нагодувати вівць гарбузом, який несеш: герой стоїть на годівниці. М'ясо буде там за кілька ходів.",
		block: "feed",
		action: "feed"
	},
	{
		name: "chop",
		signature: "chop()",
		doc: "Рубати сокирою: взяти колоду з дерева під героєм. Дерево відросте вдвічі швидше, ніж після collect().",
		block: "chop",
		action: "chop"
	},
	{
		name: "water",
		signature: "water()",
		doc: "Полити грядку під героєм, де росте гарбуз: він достигне вдвічі швидше.",
		block: "water",
		action: "water"
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
	},
	{
		name: "hands_full",
		signature: "hands_full()",
		doc: "True, якщо руки повні й більше не взяти.",
		block: "handsFull",
		sensor: "handsFull"
	},
	{
		name: "at_storehouse",
		signature: "at_storehouse()",
		doc: "True, якщо герой стоїть на складі.",
		block: "atStorehouse",
		sensor: "atStorehouse"
	},
	{
		name: "on_lever",
		signature: "on_lever()",
		doc: "True, якщо герой стоїть на важелі.",
		block: "onLever",
		sensor: "onLever"
	},
	{
		name: "lever_on",
		signature: "lever_on()",
		doc: "True, якщо важіль під героєм увімкнено.",
		block: "leverOn",
		sensor: "leverOn"
	},
	{
		name: "bed_empty",
		signature: "bed_empty()",
		doc: "True, якщо герой стоїть на грядці, де нічого не росте й не лежить.",
		block: "bedEmpty",
		sensor: "bedEmpty"
	},
	{
		name: "sheep_hungry",
		signature: "sheep_hungry()",
		doc: "True, якщо герой на годівниці, а вівці не їдять і м'яса там немає.",
		block: "sheepHungry",
		sensor: "sheepHungry"
	},
	{
		name: "wood_ahead",
		signature: "wood_ahead()",
		doc: "True, якщо попереду дерево з колодою.",
		block: "woodAhead",
		sensor: "woodAhead"
	},
	{
		name: "ripe_ahead",
		signature: "ripe_ahead()",
		doc: "True, якщо попереду грядка зі стиглим гарбузом.",
		block: "ripeAhead",
		sensor: "ripeAhead"
	},
	{
		name: "build",
		signature: "build()",
		doc: "Будувати: стоячи на будмайданчику, додати одну частину будівлі. Її ціна береться з комори.",
		block: "build",
		action: "build"
	},
	{
		name: "at_site",
		signature: "at_site()",
		doc: "True, якщо герой стоїть на будмайданчику.",
		block: "atSite",
		sensor: "atSite"
	},
	{
		name: "item_ahead",
		signature: "item_ahead()",
		doc: "True, якщо в підзорну трубу видно річ: на одній із трьох клітинок попереду, до стіни.",
		block: "itemAhead",
		sensor: "itemAhead"
	},
	{
		name: "item_is",
		signature: "item_is(\"carrot\")",
		doc: `True, якщо тут лежить саме це: ${Object.keys(ITEM_NAMES).map((k) => `"${k}" (${ITEM_NAMES[k]})`).join(", ")}.`,
		block: "itemIs",
		probesItem: true
	},
	{
		name: STOCK_METHOD,
		signature: "stock(\"wood\")",
		doc: `Число: скільки цього лежить у коморі зараз, разом із принесеним сьогодні: ${STOCK_KINDS_TEXT}.`,
		block: "stock",
		countsStock: true
	}
];
/** The methods a level opens, in palette order. */
var pythonMethodsOf = (blocks) => PYTHON_METHODS.filter((m) => blocks.includes(m.block));
/** The name the hero has in a program. */
var HERO_NAME = "hero";
// src/core/python/convert.ts
/** Blocks programs as Python code, as a student would write them. */
var METHOD = new Map(PYTHON_METHODS.map((m) => [m.action ?? m.sensor, m.name]));
/** A Python name for the words of a block or a variable: letters, digits and `_`, not a digit first, not a keyword. */
var identifier = (name) => {
	const word = name.trim().replace(/[^\p{L}\p{N}_]+/gu, "_") || "_";
	const safe = /^\p{N}/u.test(word) ? `_${word}` : word;
	return KEYWORDS$1.has(safe) ? `${safe}_` : safe;
};
var KEYWORDS$1 = new Set("False None True and as assert break class continue def del elif else for from global if import in is lambda not or pass return try while with yield hero".split(" "));
/** A condition. An empty slot is `False`, as Scratch reads it. */
var question = (q, uses) => {
	if (q === null) return "False";
	if (typeof q === "string") return `hero.${METHOD.get(q)}()`;
	if ("itemIs" in q) return `hero.${ITEM_METHOD}("${q.itemIs}")`;
	if ("compare" in q) return `${amount(q.of[0], uses)} ${q.compare === "=" ? "==" : q.compare} ${amount(q.of[1], uses)}`;
	if ("not" in q) return `not ${question(q.not, uses)}`;
	const [a, b] = "and" in q ? q.and : q.or;
	return `(${question(a, uses)} ${"and" in q ? "and" : "or"} ${question(b, uses)})`;
};
var newUses = () => ({
	read: /* @__PURE__ */ new Set(),
	set: /* @__PURE__ */ new Set()
});
/** The Python name of the variable a step sets: the counter when it names none. */
var variableName = (variable) => variable === void 0 ? COUNTER_NAME : identifier(variable);
/** A number slot: a number, a variable or a parameter. A variable read goes to `uses`. */
var amount = (value, uses) => {
	if (typeof value === "number") return String(value);
	if (value !== "counter" && "param" in value) return identifier(value.param);
	if (value !== "counter" && "stock" in value) return `hero.${STOCK_METHOD}("${value.stock}")`;
	const name = variableName(value === "counter" ? void 0 : value.variable);
	uses.read.add(name);
	return name;
};
/** The blocks of a program as Python lines. */
var lines = (steps, indent, procedure, uses) => {
	if (steps.length === 0) return [`${indent}pass`];
	const inner = `${indent}    `;
	return steps.flatMap((s) => {
		if (s === "call") return [`${indent}${procedure}()`];
		if (typeof s === "string") return [`${indent}hero.${METHOD.get(s)}()`];
		if ("call" in s) return [`${indent}${identifier(s.call)}(${s.args.map((a) => amount(a, uses)).join(", ")})`];
		if ("set" in s) {
			const name = variableName(s.variable);
			uses.set.add(name);
			return [`${indent}${name} = ${amount(s.set, uses)}`];
		}
		if ("change" in s) {
			const name = variableName(s.variable);
			uses.read.add(name);
			uses.set.add(name);
			return [`${indent}${name} += ${amount(s.change, uses)}`];
		}
		if ("repeat" in s) return [`${indent}for _ in range(${amount(s.repeat, uses)}):`, ...lines(s.body, inner, procedure, uses)];
		if ("forever" in s) return [`${indent}while True:`, ...lines(s.forever, inner, procedure, uses)];
		if ("until" in s) return [`${indent}while not ${question(s.until, uses)}:`, ...lines(s.body, inner, procedure, uses)];
		const branch = [`${indent}if ${question(s.if, uses)}:`, ...lines(s.then, inner, procedure, uses)];
		return s.else === void 0 ? branch : [
			...branch,
			`${indent}else:`,
			...lines(s.else, inner, procedure, uses)
		];
	});
};
/**
* A function: its `def` line, `global` for the variables it sets, and its body. On a level with the counter a function
* says `global` for it always, as the course writes it.
*/
var functionLines = (level, name, params, body, procedure, uses) => {
	const own = newUses();
	const code = lines(body, "    ", procedure, own);
	for (const v of own.read) uses.read.add(v);
	for (const v of own.set) uses.set.add(v);
	const globals = /* @__PURE__ */ new Set([...level.blocks.includes("counter") ? [COUNTER_NAME] : [], ...own.set]);
	return [
		`def ${identifier(name)}(${params.map(identifier).join(", ")}):`,
		...[...globals].map((g) => `    global ${g}`),
		...code
	];
};
/** `= 0` for each variable the program reads, the counter first. */
var startLines = (uses) => [...uses.read].sort((a, b) => Number(b === COUNTER_NAME) - Number(a === COUNTER_NAME)).map((v) => `${v} = 0`);
/**
* The program in Python, and how many lines it has that the blocks do not (the start values of the variables). The
* code plays as the blocks do: `parity.test.ts` checks it on every level.
*/
var toPython = (level, steps, definition) => {
	const procedure = identifier(definition?.name ?? procedureName(level));
	const uses = newUses();
	const main = lines(steps, "", procedure, uses);
	const def = definition === void 0 ? [] : functionLines(level, definition.name ?? procedureName(level), definition.params ?? [], definition.body, procedure, uses);
	const start = startLines(uses);
	return {
		source: [
			...start,
			...def,
			...main
		].join("\n"),
		extra: start.length
	};
};
/**
* A program of the blocks editor in Python, for the view under the blocks. It writes the code as `toPython` does;
* an empty condition is `False`, as in Scratch. Python has no scripts that run side by side, so only the first
* «коли прапорець натиснуто» script is shown, with a note about the others.
*/
var programSource = (level, program) => {
	const { scripts, definitions } = readProgram(program);
	const book = bookSignatures(level);
	const header = book.length === 0 ? [] : [`# Книга команд: ${book.join(", ")}`, ""];
	const procedure = identifier(procedureName(level));
	const uses = newUses();
	const defs = definitions.flatMap((d) => [...functionLines(level, d.name, d.params, d.body, procedure, uses), ""]);
	const [first, ...others] = scripts;
	const main = first === void 0 ? ["# Немає блока «коли прапорець натиснуто»: програма не почнеться."] : first.length === 0 ? ["# Додай блоки під «коли прапорець натиснуто»."] : lines(first, "", procedure, uses);
	const note = others.length === 0 ? [] : ["", `# Ще скриптів «коли прапорець натиснуто»: ${others.length}. У Python програма одна, тут лише перший.`];
	return [
		...header,
		...startLines(uses),
		...defs,
		...main,
		...note
	].join("\n");
};
/** The definitions of the pages of «Книга команд» (`level.library`), each once, as `readProgram` reads them. */
var libraryDefinitions = (level) => {
	const seen = /* @__PURE__ */ new Set();
	return (level.library ?? []).flatMap((page) => readProgram(page).definitions.slice(0, 1)).filter((d) => !seen.has(d.name) && (seen.add(d.name), true));
};
/** The functions of «Книга команд» as Python calls them: «пройти(кроки)». */
var bookSignatures = (level) => libraryDefinitions(level).map((d) => `${identifier(d.name)}(${d.params.map(identifier).join(", ")})`);
/**
* «Книга команд» in Python: the start values of the variables its functions use, and a `def` for each page. A Python
* program runs after this code, so it calls them as built-in functions, and its own `def` of a name takes their place.
*/
var librarySource = (level) => {
	const pages = libraryDefinitions(level);
	const uses = newUses();
	const procedure = identifier(procedureName(level));
	const defs = pages.flatMap((d) => functionLines(level, d.name, d.params, d.body, procedure, uses));
	return {
		source: [...startLines(uses), ...defs].join("\n"),
		names: pages.map((d) => identifier(d.name))
	};
};
// src/core/broken.ts
/** The blocks a «Зламаний робот» level opens with, or null for a level without a broken program. */
var brokenProgram = (level) => level.broken === void 0 ? null : buildProgram(level.broken.steps, level.broken.definition);
/** The broken program of a level as Python code, or null for a level without one. */
var brokenSource = (level) => level.broken === void 0 ? null : toPython(level, level.broken.steps, level.broken.definition).source;
// src/core/fields.ts
/** A field as a level of its own: the same blocks, goals and stars on the field's map. */
var fieldLevel = (level, field) => {
	const { fields: _fields, enemies: _enemies, dir, maxSteps, scene, inputs, prints, ...rest } = level;
	const fieldDir = field.dir ?? dir;
	const fieldSteps = field.maxSteps ?? maxSteps;
	const fieldScene = field.scene ?? scene;
	const fieldInputs = field.inputs ?? inputs;
	const fieldPrints = field.prints ?? prints;
	return {
		...rest,
		map: field.map,
		...fieldDir === void 0 ? {} : { dir: fieldDir },
		...fieldSteps === void 0 ? {} : { maxSteps: fieldSteps },
		...fieldScene === void 0 ? {} : { scene: fieldScene },
		...field.enemies === void 0 ? {} : { enemies: field.enemies },
		...fieldInputs === void 0 ? {} : { inputs: fieldInputs },
		...fieldPrints === void 0 ? {} : { prints: fieldPrints }
	};
};
/** The fields of a level as levels, its own map first. A level without `fields` has one field: itself. */
var levelFields = (level) => {
	const extra = level.fields ?? [];
	if (extra.length === 0) return [level];
	const { fields: _fields, ...first } = level;
	return [first, ...extra.slice(0, 3).map((f) => fieldLevel(level, f))];
};
/**
* One grade from the runs of every field, in field order. The program passes when every field passes; the frames are
* those of the first field that failed, or of the first field when all passed. With more than one field the result
* names the field its frames are from (`field`) and which fields passed (`fields`). One field gives its run as it is.
*/
var combineFields = (results) => {
	const first = results[0];
	if (first === void 0) throw new Error("combineFields needs the run of at least one field");
	if (results.length === 1) return first;
	const fields = results.map((r) => r.passed);
	const failed = fields.indexOf(false);
	const field = failed === -1 ? 0 : failed;
	return {
		...results[field] ?? first,
		field,
		fields
	};
};
// src/core/estate.ts
/** Coins for each thing gathered, and for a day when the hero gathered everything and came home. */
var PRODUCE_COINS = {
	apple: 2,
	carrot: 3,
	egg: 4
};
/** Whether a level is a day of the estate (its id), so the game shows it as one. */
var isEstateLevel = (levelId) => /^estate-\d+$/.test(levelId);
/**
* The harvest of a run: what the hero took before the run ended, even when it failed, and the bonus of a full day.
* The bonus asks for one program from the morning: a day done in more `pieces` («Продовжити звідси») is work by hand,
* and pays only for what the hero gathered.
*/
var estateHarvest = (day, result, pieces = 1) => {
	const left = result.world.crystals;
	const taken = (kind) => day.produce.filter((p) => p.kind === kind && !left.has(cellKey(p.x, p.y))).length;
	const apple = taken("apple");
	const carrot = taken("carrot");
	const egg = taken("egg");
	const full = result.passed && pieces <= 1;
	return {
		apple,
		carrot,
		egg,
		full,
		coins: apple * PRODUCE_COINS.apple + carrot * PRODUCE_COINS.carrot + egg * PRODUCE_COINS.egg + (full ? 5 : 0)
	};
};
// src/core/book.ts
/** The start of the ids the blocks of a page get in a run: `eb-book-2-…` is a block of the third page. */
var BOOK_ID_PREFIX = "eb-book-";
var isRecord$2 = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
var opcodeOf = (block) => isRecord$2(block) && typeof block.opcode === "string" ? block.opcode : null;
/** The block ids an input holds: the block in it and its shadow. */
var inputIds$1 = (input) => Array.isArray(input) ? input.slice(1).filter((x) => typeof x === "string") : [];
/** The prototype of a «визначити»: the block in its `custom_block` input. */
var prototypeOf = (program, definition) => {
	if (!isRecord$2(definition) || !isRecord$2(definition.inputs)) return null;
	const id = inputIds$1(definition.inputs.custom_block)[0];
	const prototype = id === void 0 ? void 0 : program[id];
	return isRecord$2(prototype) && prototype.opcode === "procedures_prototype" ? prototype : null;
};
var proccodeIn = (block) => block !== null && isRecord$2(block.mutation) && typeof block.mutation.proccode === "string" ? block.mutation.proccode : null;
var listIn = (block, key) => {
	const text = block !== null && isRecord$2(block.mutation) ? block.mutation[key] : void 0;
	if (typeof text !== "string") return [];
	try {
		const list = JSON.parse(text);
		return Array.isArray(list) ? list.map(String) : [];
	} catch {
		return [];
	}
};
/** The «визначити» hats of a program, by the proccode of their block, the first one of each. */
var definitionsOf = (program) => {
	const found = /* @__PURE__ */ new Map();
	for (const [id, block] of Object.entries(program)) {
		if (opcodeOf(block) !== "procedures_definition") continue;
		const proccode = proccodeIn(prototypeOf(program, block));
		if (proccode !== null && !found.has(proccode)) found.set(proccode, id);
	}
	return found;
};
/** The own blocks a program defines, by proccode («пройти %s»). */
var definedBlocks = (program) => [...definitionsOf(program).keys()];
/** The own blocks a program calls, by proccode, each once. */
var calledBlocks = (program) => [...new Set(Object.values(program).filter((b) => opcodeOf(b) === CALL_OPCODE).map((b) => proccodeIn(b)).filter((p) => p !== null))];
/** What a page holds, or null when it holds no «визначити» (stored data can be anything). */
var pageInfo = (page) => {
	const [entry] = definitionsOf(page);
	if (entry === void 0) return null;
	const [proccode, id] = entry;
	const prototype = prototypeOf(page, page[id]);
	return {
		proccode,
		name: procedureTitle(proccode),
		params: listIn(prototype, "argumentnames"),
		ids: listIn(prototype, "argumentids")
	};
};
/** The «визначити» script of one own block of a program, as a page: the hat and every block under and inside it. */
var pageOf = (program, proccode) => {
	const start = definitionsOf(program).get(proccode);
	if (start === void 0) return null;
	const page = {};
	const visit = (id) => {
		if (typeof id !== "string" || Object.hasOwn(page, id) || !Object.hasOwn(program, id)) return;
		const block = program[id];
		page[id] = block;
		if (!isRecord$2(block)) return;
		visit(block.next);
		if (isRecord$2(block.inputs)) for (const input of Object.values(block.inputs)) for (const inner of inputIds$1(input)) visit(inner);
	};
	visit(start);
	return page;
};
/** The book with `page`: it takes the place of the page of the same block, or a free page. Null when the book is full. */
var writePage = (book, page, size) => {
	const proccode = pageInfo(page)?.proccode;
	if (proccode === void 0) return null;
	const at = book.findIndex((p) => pageInfo(p)?.proccode === proccode);
	if (at >= 0) return book.map((p, i) => i === at ? page : p);
	return book.length < size ? [...book, page] : null;
};
/** The book without the page of a block. */
var tearPage = (book, proccode) => book.filter((p) => pageInfo(p)?.proccode !== proccode);
/**
* The program with the pages of the book it does not define itself, ready to run. The blocks of a page get ids of their
* own, so they never meet the ids of the program, and a variable of a page is the program's variable of that name.
*/
var withLibrary = (program, book) => {
	if (book === void 0 || book.length === 0) return program;
	const own = new Set(definedBlocks(program));
	const variableIds = new Map(programVariables(program).map((v) => [v.name, v.id]));
	const joined = { ...program };
	book.forEach((page, i) => {
		const info = pageInfo(page);
		if (info === null || own.has(info.proccode)) return;
		own.add(info.proccode);
		const idOf = (id) => Object.hasOwn(page, id) ? `${BOOK_ID_PREFIX}${i}-${id}` : id;
		const variable = (name, id) => typeof name === "string" ? variableIds.get(name) ?? id : id;
		const input = (value) => {
			if (!Array.isArray(value)) return value;
			return value.map((x, j) => {
				if (j === 0) return x;
				if (typeof x === "string") return idOf(x);
				if (Array.isArray(x) && x[0] === 12) return [
					x[0],
					x[1],
					variable(x[1], x[2]),
					...x.slice(3)
				];
				return x;
			});
		};
		for (const [id, block] of Object.entries(page)) {
			if (Array.isArray(block)) {
				joined[idOf(id)] = block[0] === 12 ? [
					block[0],
					block[1],
					variable(block[1], block[2]),
					...block.slice(3)
				] : block;
				continue;
			}
			if (!isRecord$2(block)) continue;
			const fields = block.fields;
			joined[idOf(id)] = {
				...block,
				next: typeof block.next === "string" ? idOf(block.next) : block.next,
				parent: typeof block.parent === "string" ? idOf(block.parent) : block.parent,
				...isRecord$2(block.inputs) ? { inputs: Object.fromEntries(Object.entries(block.inputs).map(([k, v]) => [k, input(v)])) } : {},
				...isRecord$2(fields) && Array.isArray(fields.VARIABLE) ? { fields: {
					...fields,
					VARIABLE: [
						fields.VARIABLE[0],
						variable(fields.VARIABLE[0], fields.VARIABLE[1]),
						...fields.VARIABLE.slice(2)
					]
				} } : {}
			};
		}
	});
	return joined;
};
// src/core/crew.ts
var stepOf = (d) => ({
	action: d.action,
	outcome: d.outcome,
	events: d.events,
	blockId: d.source.blockId,
	...d.source.line === void 0 ? {} : { line: d.source.line }
});
/**
* Runs the day of a crew: `programs[0]` is the hero's, the next ones the helpers', in the order of `level.helpers`.
* The result is the hero's run with a frame for each turn (`Frame.crew` has the helpers' actions) and every
* worker's own run in `workers`.
*/
var runCrew = (level, programs) => {
	const turns = level.turns ?? 0;
	let world = startWorld(level);
	const count = Math.min(programs.length, world.crew.length + 1);
	const sessions = Array.from({ length: count }, () => ({
		...newSession(level),
		world
	}));
	let turn = 0;
	let done = [];
	const stageOf = (k) => {
		const session = sessions[k];
		const act = (action, source) => {
			const before = asWorker(world, k);
			const result = heroAction(before, action);
			const fatal = fatalReason(result.outcome);
			const after = fatal === null ? result.world : before;
			world = asWorker(after, k);
			session.world = after;
			session.frames.push({
				action,
				outcome: result.outcome,
				blockId: source.blockId,
				events: result.events,
				goals: goalStatus(level, result.world),
				world: result.world,
				...source.line === void 0 ? {} : { line: source.line },
				...source.counter === void 0 ? {} : { counter: source.counter },
				...source.boxes === void 0 ? {} : { boxes: source.boxes }
			});
			done[k] = {
				action,
				outcome: result.outcome,
				events: result.events,
				source
			};
			if (fatal !== null || turn >= turns - 1) {
				session.done = true;
				session.reason = fatal;
				return true;
			}
			return false;
		};
		return {
			session,
			act
		};
	};
	const runs = programs.slice(0, count).map((program, k) => program(stageOf(k)));
	const results = runs.map(() => null);
	const frames = [];
	/** Lets a worker's program go on to its next action, or to its end. */
	const resume = (k, over) => {
		const run = runs[k];
		if (run === void 0 || results[k] !== null) return;
		const session = sessions[k];
		if (!over) session.world = asWorker(world, k);
		const step = run.next(over);
		if (step.done === true) results[k] = step.value;
	};
	for (; turn < turns && results.some((r) => r === null); turn++) {
		done = runs.map(() => null);
		for (let k = 0; k < runs.length; k++) resume(k, false);
		if (done.every((d) => d === null)) break;
		const after = worldTurn(world);
		world = after.world;
		const hero = done[0] ?? null;
		frames.push({
			action: hero?.action ?? "wait",
			outcome: hero?.outcome ?? "waited",
			blockId: hero?.source.blockId ?? null,
			events: [...hero?.events ?? [], ...after.events],
			goals: goalStatus(level, world),
			world,
			...hero?.source.line === void 0 ? {} : { line: hero.source.line },
			crew: done.slice(1).map((d) => d === null ? null : stepOf(d))
		});
		if (world.hearts === 0) {
			const hero0 = sessions[0];
			if (hero0 !== void 0 && results[0] === null) {
				hero0.done = true;
				hero0.reason = "defeated";
			}
			break;
		}
	}
	for (let k = 0; k < runs.length; k++) {
		const session = sessions[k];
		if (results[k] === null && !session.done) session.done = true;
		resume(k, true);
	}
	const workers = results.map((r, k) => r ?? emptyResult(level, sessions[k]));
	return {
		...workers[0] ?? emptyResult(level, newSession(level)),
		frames,
		world,
		workers
	};
};
/** A run that gave no result: it cannot happen with `blocksRun` and `pythonRun`, which always return one. */
var emptyResult = (level, session) => ({
	levelId: level.id,
	passed: false,
	stars: 0,
	blocks: 0,
	collected: 0,
	totalCrystals: session.world.totalCrystals,
	reason: session.reason,
	frames: session.frames,
	world: session.world
});
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
// src/core/python/values.ts
/** The methods of a text a course needs: `"Привіт".upper()`. */
var TEXT_METHODS = [
	"upper",
	"lower",
	"strip"
];
/** Items one list or text may hold, so a program cannot fill the memory. */
var MAX_ITEMS = 1e4;
var list = (items) => ({
	type: "list",
	items
});
var isList = (v) => typeof v === "object" && v !== null && v.type === "list";
var isCallable = (v) => typeof v === "object" && v !== null && v.type !== "list" && v.type !== "hero";
/** Built-in functions that are types in Python: `type(5)` gives `int`, and it prints as `<class 'int'>`. */
var TYPE_NAMES = /* @__PURE__ */ new Set([
	"int",
	"float",
	"str",
	"bool",
	"list",
	"NoneType",
	"function"
]);
/** The Python type of a value, as `type()` names it. A whole number is an `int`, any other number a `float`. */
var pythonType = (v) => {
	if (v === null) return "NoneType";
	if (typeof v === "boolean") return "bool";
	if (typeof v === "number") return Number.isInteger(v) ? "int" : "float";
	if (typeof v === "string") return "str";
	if (v.type === "list") return "list";
	if (v.type === "hero") return "Hero";
	if (v.type === "builtin" && TYPE_NAMES.has(v.name)) return "type";
	return v.type === "function" ? "function" : "method";
};
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
		case "builtin": return TYPE_NAMES.has(v.name) ? `<class '${v.name}'>` : `<функція ${v.name}>`;
		case "hero": return "hero";
		case "heroMethod": return `<метод hero.${v.method.name}>`;
		case "listMethod": return `<метод ${v.name}>`;
		case "textMethod": return `<метод ${v.name}>`;
	}
};
/** A number for arithmetic: True and False count as 1 and 0, as in Python. */
var asNumber = (v) => typeof v === "number" ? v : typeof v === "boolean" ? v ? 1 : 0 : null;
/** A text that holds a whole number, like the answer of `input()`: "3" or " 12 ". */
var isNumberText = (v) => typeof v === "string" && /^\s*[-+]?\d+\s*$/.test(v);
var toInt = (v, what, line) => {
	const n = asNumber(v);
	if (n !== null && Number.isInteger(n)) return n;
	const hint = isNumberText(v) ? `: у лапках це текст, а число з нього робить int(…), наприклад int(${repr(v)})` : "";
	throw new PyError(`${what} має бути цілим числом, а тут ${typeName(v)} ${repr(v)}${hint}`, line);
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
	const textNumber = isNumberText(a) ? a : isNumberText(b) ? b : null;
	const hint = textNumber !== null && (asNumber(a) !== null || asNumber(b) !== null) ? `: ${repr(textNumber)} у лапках — це текст. Щоб рахувати, зроби з нього число: int(${repr(textNumber)}). Щоб склеїти текст, число перетворює str(…)` : op === "+" && (typeof a === "string" || typeof b === "string") ? ": число в текст перетворює str(…)" : "";
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
// src/core/python/boxes.ts
var kindOf = (v) => {
	const type = pythonType(v);
	return type === "int" || type === "float" || type === "str" || type === "bool" || type === "list" ? type : null;
};
/** The boxes of a program now: its variables that hold data, in the order they were made. The hero is not a box. */
var boxesOf = (globals) => [...globals].flatMap(([name, v]) => {
	const kind = kindOf(v);
	if (kind === null || name.startsWith("_")) return [];
	return [{
		name,
		value: typeof v === "string" ? `"${v}"` : isList(v) || typeof v !== "object" ? repr(v) : "",
		kind
	}];
});
/**
* «Змінні» of a block program: its one variable, «лічильник», as Scratch keeps it (`Frame.counter`). A number is a
* whole number or a number with a dot; anything else the student typed into «задати лічильник» is words.
*/
var counterBoxes = (counter) => counter === void 0 ? [] : blockBoxes([{
	name: COUNTER_NAME,
	value: counter
}]);
/** «Змінні» of a block program: each variable as a box, a number as a number and anything else as words. */
var blockBoxes = (variables) => variables.map(({ name, value }) => {
	const text = String(value);
	if (/^-?\d+$/.test(text)) return {
		name,
		value: text,
		kind: "int"
	};
	if (/^-?\d*\.\d+$/.test(text)) return {
		name,
		value: text,
		kind: "float"
	};
	return {
		name,
		value: `"${text}"`,
		kind: "str"
	};
});
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
/**
* Custom blocks running inside each other. Only blocks that call themselves or each other go deep; the VM has no
* limit. With own blocks («Створити блок») a cycle can make several calls for one action, so the limit leaves room
* for that many: a run that acts ends at MAX_ACTIONS before this limit.
*/
var MAX_CALL_DEPTH = MAX_ACTIONS * 10;
/** Enclosing blocks the VM looks through to tell that a custom block calls itself (`Thread.isRecursiveCall`). */
var RECURSION_LOOKBACK = 6;
var newFrame = (id, depth, calls) => ({
	id,
	isLoop: false,
	loopCounter: void 0,
	depth,
	calls,
	params: null
});
/** A list the mutation of a custom block keeps as JSON text: its argument ids, names or defaults. */
var listOf = (mutation, key) => {
	const text = isRecord$1(mutation) ? mutation[key] : void 0;
	try {
		const list = typeof text === "string" ? JSON.parse(text) : [];
		return Array.isArray(list) ? list : [];
	} catch {
		return [];
	}
};
/** The run stops: the hero is done, a limit is reached, or the program is damaged. */
var Stop = class {
	reason;
	constructor(reason) {
		this.reason = reason;
	}
};
var isRecord$1 = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
/** Scratch `Cast.toNumber`: a text that is not a number is 0. */
var toNumber = (value) => {
	if (typeof value === "number") return Number.isNaN(value) ? 0 : value;
	if (typeof value === "boolean") return value ? 1 : 0;
	const n = Number(value);
	return Number.isNaN(n) ? 0 : n;
};
/** A text Scratch reads as a number: not empty and not only spaces (`Cast.isWhiteSpace`). */
var numeric = (value) => {
	if (typeof value === "number") return Number.isNaN(value) ? null : value;
	if (typeof value === "boolean") return value ? 1 : 0;
	const text = String(value);
	if (text.trim() === "") return null;
	const n = Number(text);
	return Number.isNaN(n) ? null : n;
};
/** Scratch `Cast.compare`: numbers as numbers, anything else as text without case. Below 0, 0 or above 0. */
var scratchCompare = (a, b) => {
	const x = numeric(a);
	const y = numeric(b);
	if (x !== null && y !== null) return x - y;
	const s = String(a).toLowerCase();
	const t = String(b).toLowerCase();
	return s < t ? -1 : s > t ? 1 : 0;
};
/**
* Runs a program on one field: the map of `level` only, without its other `fields`. The rules of the game live
* here; `judgeProgram` runs it on every field of a level.
*/
var judgeField = (level, own) => runAlone(blocksRun(level, own, soloStage(level)));
/**
* The run of a block program on a stage: alone on a level, or one worker of a crew. It gives the turn away after
* each action (`ProgramSteps`).
*/
function* blocksRun(level, own, stage) {
	const { session } = stage;
	const checked = checkProgram(level, own);
	if ("error" in checked) return resultOf(level, {
		...session,
		reason: "badProgram"
	}, 0, { detail: checked.error });
	if (!checked.hasStart) return resultOf(level, {
		...session,
		reason: "noStart"
	}, checked.blocks);
	const program = withLibrary(own, level.library);
	/** What an input holds: a block id, a primitive `[type, value]`, or nothing. */
	const inputOf = (block, name) => {
		if (!isRecord$1(block.inputs)) return null;
		const input = block.inputs[name];
		return Array.isArray(input) ? input[1] : null;
	};
	const blockAt = (id) => {
		if (typeof id !== "string" || !Object.hasOwn(program, id)) return null;
		const block = program[id];
		if (!isRecord$1(block) || typeof block.opcode !== "string") return null;
		return {
			opcode: block.opcode,
			next: block.next,
			inputs: block.inputs,
			fields: block.fields,
			topLevel: block.topLevel,
			mutation: block.mutation
		};
	};
	const proccodeOf = (block) => block !== null && isRecord$1(block.mutation) ? block.mutation.proccode : void 0;
	/** Custom blocks by name: the first «визначити» with that name, as the VM finds it. */
	const definitions = /* @__PURE__ */ new Map();
	for (const [id] of Object.entries(program)) {
		const block = blockAt(id);
		if (block === null || block.opcode !== "procedures_definition") continue;
		const prototype = blockAt(inputOf(block, "custom_block"));
		const name = proccodeOf(prototype);
		if (name === void 0 || definitions.has(name)) continue;
		const mutation = prototype?.mutation;
		definitions.set(name, {
			id,
			names: listOf(mutation, "argumentnames"),
			ids: listOf(mutation, "argumentids"),
			defaults: listOf(mutation, "argumentdefaults")
		});
	}
	const variables = new Map([...level.blocks.includes("counter") ? [[COUNTER_ID, {
		name: COUNTER_NAME,
		value: 0
	}]] : [], ...programVariables(program).map((v) => [v.id, {
		name: v.name,
		value: 0
	}])]);
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
	const fieldOf = (block, name) => isRecord$1(block.fields) ? block.fields[name] : void 0;
	const counted = level.blocks.includes("counter");
	const shown = level.blocks.includes("variables");
	const boxesNow = () => blockBoxes([...variables.values()].map((v) => ({
		name: String(v.name),
		value: v.value
	})));
	/** The calls of custom blocks with parameters: each block with the values it got, once (`RunResult.calls`). */
	const calls = /* @__PURE__ */ new Set();
	/** The blocks of «Книга команд» the program called, by their words (`RunResult.bookCalls`). */
	const bookCalls = /* @__PURE__ */ new Set();
	/** The thread that runs now: a parameter reads its stack. */
	let current = [];
	let steps = 0;
	const step = () => {
		if (++steps > 2e5) throw new Stop("tooLong");
	};
	function* act(action, blockId) {
		const counter = counted ? { counter: String(variable([COUNTER_NAME, COUNTER_ID]).value) } : {};
		const boxes = shown ? { boxes: boxesNow() } : {};
		if (stage.act(action, {
			blockId,
			...counter,
			...boxes
		})) throw new Stop(session.reason);
		if (yield) throw new Stop(session.reason);
	}
	/** A Boolean input: an empty slot is false, as in Scratch. */
	const question = (ref, depth) => {
		if (depth > 300) throw new Stop("badProgram");
		const block = blockAt(ref);
		if (block === null) return false;
		step();
		const sensor = sensorOfOpcode(block.opcode);
		if (sensor !== void 0) return heroSense(session, sensor);
		if (block.opcode === opcodeOf$1("itemIs")) return heroSense(session, { itemIs: itemOfField(fieldOf(block, ITEM_FIELD)) });
		const comparison = comparisonOfOpcode(block.opcode);
		if (comparison !== void 0) {
			const order = scratchCompare(value(inputOf(block, "OPERAND1")), value(inputOf(block, "OPERAND2")));
			return comparison === ">" ? order > 0 : comparison === "<" ? order < 0 : order === 0;
		}
		switch (block.opcode) {
			case "operator_not": return !question(inputOf(block, "OPERAND"), depth + 1);
			case "operator_and": return question(inputOf(block, "OPERAND1"), depth + 1) && question(inputOf(block, "OPERAND2"), depth + 1);
			case "operator_or": return question(inputOf(block, "OPERAND1"), depth + 1) || question(inputOf(block, "OPERAND2"), depth + 1);
			default: return false;
		}
	};
	/** A parameter of the custom block that runs: the nearest frame with parameters, or 0 (`Thread.getParam`). */
	const param = (name) => {
		for (let i = current.length - 1; i >= 0; i--) {
			const params = current[i]?.params ?? null;
			if (params === null) continue;
			return typeof name === "string" && params.has(name) ? params.get(name) : 0;
		}
		return 0;
	};
	/** What a number or text slot gives: a primitive, a shadow with the number, a variable, a parameter or a question. */
	const value = (ref) => {
		if (Array.isArray(ref)) return ref[0] === 12 ? variable([ref[1], ref[2]]).value : ref[1];
		const block = blockAt(ref);
		if (block === null) return "";
		if (block.opcode === "data_variable") return variable(fieldOf(block, "VARIABLE")).value;
		if (block.opcode === "argument_reporter_string_number") {
			const field = fieldOf(block, "VALUE");
			return param(Array.isArray(field) ? field[0] : void 0);
		}
		if (block.opcode === opcodeOf$1("stock")) {
			step();
			return heroCount(session, stockOfField(fieldOf(block, ITEM_FIELD)));
		}
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
	function* execute(thread, frame, block, id) {
		const action = actionOfOpcode(block.opcode);
		if (action !== void 0) {
			yield* act(action, id);
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
				const args = definition.ids.map((argId, i) => isRecord$1(block.inputs) && typeof argId === "string" && Object.hasOwn(block.inputs, argId) ? value(inputOf(block, argId)) : definition.defaults[i]);
				frame.params = new Map(definition.names.map((n, i) => [String(n), args[i]]));
				if (args.length > 0) calls.add(`${procedureTitle(String(name))}(${args.map((a) => String(a)).join(", ")})`);
				if (definition.id.startsWith("eb-book-")) bookCalls.add(procedureTitle(String(name)));
				const yields = recursive(thread, name);
				thread.push(newFrame(definition.id, 0, frame.calls + 1));
				return yields ? "yield" : "pushed";
			}
			default: return "next";
		}
	}
	/** Moves the frame to the next block, as `goToNextBlock` does. */
	const advance = (frame, block) => {
		frame.id = block === null ? null : block.next;
		frame.isLoop = false;
		frame.loopCounter = void 0;
		frame.params = null;
	};
	/** One turn of a thread (`Sequencer.stepThread`). False when the thread is done. */
	function* stepThread(thread) {
		current = thread;
		for (;;) {
			const frame = thread.at(-1);
			if (frame === void 0) return false;
			const block = blockAt(frame.id);
			if (block !== null && typeof frame.id === "string") {
				step();
				const signal = yield* execute(thread, frame, block, frame.id);
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
	}
	const threads = Object.entries(program).filter(([id]) => {
		const block = blockAt(id);
		return block !== null && block.opcode === "event_whenflagclicked" && block.topLevel === true;
	}).map(([id]) => [newFrame(id, 0, 0)]);
	try {
		let alive = threads;
		for (let pass = 0; alive.length > 0; pass++) {
			if (pass >= MAX_PASSES) throw new Stop("tooLong");
			const next = [];
			for (const thread of alive) if (yield* stepThread(thread)) next.push(thread);
			alive = next;
		}
	} catch (error) {
		if (!(error instanceof Stop)) throw error;
		if (!session.done) {
			session.reason = error.reason;
			if (error.reason === "badProgram") return resultOf(level, session, checked.blocks, { detail: "Програму пошкоджено: блоки замкнулися в коло" });
		}
	}
	const boxes = shown ? boxesNow() : [];
	return resultOf(level, session, checked.blocks, {
		...boxes.length === 0 ? {} : { boxes },
		...calls.size === 0 ? {} : { calls: [...calls] },
		...bookCalls.size === 0 ? {} : { bookCalls: [...bookCalls] }
	});
}
/** Runs a program on every field of the level (`levelFields`): one result for each field, in order. */
var judgeFields = (level, program) => levelFields(level).map((field) => judgeField(field, program));
// src/core/python/ideas.ts
/**
* The ideas a Python program uses, for levels that teach them (`Level.uses`): a level about variables passes only
* when the program keeps a value in a variable and reads it back, not when it reaches the goal with numbers alone.
*/
var children = (e) => {
	switch (e.k) {
		case "number":
		case "string":
		case "constant":
		case "name": return [];
		case "list": return e.items;
		case "attribute": return [e.object];
		case "index": return [e.object, e.index];
		case "call": return [e.fn, ...e.args];
		case "unary": return [e.arg];
		case "binary":
		case "bool": return [e.left, e.right];
		case "compare": return e.operands;
	}
};
var allExprs = (e) => [e, ...children(e).flatMap(allExprs)];
/** The expressions a statement reads, and the statements inside it. */
var statementParts = (s) => {
	switch (s.k) {
		case "expr": return {
			exprs: [s.expr],
			bodies: []
		};
		case "assign": return {
			exprs: s.target.k === "index" ? [s.value, s.target] : [s.value],
			bodies: []
		};
		case "augassign": return {
			exprs: [s.value, s.target],
			bodies: []
		};
		case "if": return {
			exprs: [s.test],
			bodies: [s.body, s.orelse]
		};
		case "while": return {
			exprs: [s.test],
			bodies: [s.body]
		};
		case "for": return {
			exprs: [s.iter],
			bodies: [s.body]
		};
		case "def": return {
			exprs: [],
			bodies: [s.body]
		};
		case "return": return {
			exprs: s.value === null ? [] : [s.value],
			bodies: []
		};
		case "global":
		case "pass":
		case "break":
		case "continue": return {
			exprs: [],
			bodies: []
		};
	}
};
var allStatements = (body) => body.flatMap((s) => [s, ...statementParts(s).bodies.flatMap(allStatements)]);
var usageOf = (program) => {
	const statements = allStatements(program);
	const exprs = statements.flatMap((s) => statementParts(s).exprs.flatMap(allExprs));
	const assigned = statements.flatMap((s) => (s.k === "assign" || s.k === "augassign") && s.target.k === "name" ? [s.target.id] : s.k === "for" ? [s.target] : []);
	return {
		assigned: new Set(assigned),
		read: new Set(exprs.flatMap((e) => e.k === "name" ? [e.id] : [])),
		called: new Set(exprs.flatMap((e) => e.k === "call" && e.fn.k === "name" ? [e.fn.id] : []))
	};
};
var uses = (usage, idea) => {
	switch (idea) {
		case "variable": return [...usage.assigned].some((name) => usage.read.has(name));
		case "print":
		case "input":
		case "int":
		case "float":
		case "str": return usage.called.has(idea);
	}
};
var MISSING = {
	variable: "Герой дійшов, але без змінної. Поклади число в змінну, наприклад steps = 3, і пиши steps замість числа.",
	print: "Герой дійшов, але нічого не сказав. Додай print(…): так герой каже слова вголос.",
	input: "Програма не спитала. Відповідь дає input(\"…\"): на іншому полі вона буде інша.",
	int: "Відповідь input() — це текст. Зроби з неї число: int(input(\"…\")).",
	float: "Число з крапкою, тому зроби з відповіді таке число: float(input(\"…\")).",
	str: "Тут треба зробити з числа слова: str(…)."
};
/** What the program still has to use, as a message for the student, or null when it uses every idea of the level. */
var missingIdea = (level, program) => {
	const ideas = level.uses ?? [];
	if (ideas.length === 0) return null;
	const usage = usageOf(program);
	const missing = ideas.find((idea) => !uses(usage, idea));
	return missing === void 0 ? null : MISSING[missing];
};
/** What is wrong with the printed lines, or null when the program printed the line the level asks for. */
var missingPrint = (level, output) => {
	const want = level.prints;
	if (want === void 0 || output.some((line) => line.trim() === want)) return null;
	return `Програма мала надрукувати «${want}», а ${output.length === 0 ? "нічого не надрукувала" : `надрукувала «${output.at(-1) ?? ""}»`}.`;
};
// src/core/python/builtins.ts
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
		if (v.trim() === "" || !Number.isInteger(n)) {
			const hint = Number.isNaN(n) ? "" : ": це дробове число, його робить float(…)";
			throw new PyError(`int() не може зробити ціле число з тексту ${repr(v)}${hint}`, line);
		}
		return n;
	}
	return Math.trunc(number("int", v ?? null, line));
};
var toFloatValue = (args, line) => {
	arity("float", args, 1, 1, line);
	const [v] = args;
	if (typeof v === "string") {
		const n = Number(v.trim());
		if (v.trim() === "" || Number.isNaN(n)) throw new PyError(`float() не може зробити число з тексту ${repr(v)}`, line);
		return n;
	}
	return number("float", v ?? null, line);
};
/** A type with no function of its own in the course, such as `list`: `type([])` gives it, but it cannot be called. */
var bareType = (name) => ({
	type: "builtin",
	name,
	call: (_args, line) => {
		throw new PyError(`${name}() у цьому курсі не викликають: це лише назва типу`, line);
	}
});
var makeBuiltins = ({ print, input }) => {
	const types = /* @__PURE__ */ new Map();
	const typeOf = (args, line) => {
		arity("type", args, 1, 1, line);
		const name = pythonType(args[0] ?? null);
		return builtins.get(name) ?? types.get(name) ?? types.set(name, bareType(name)).get(name) ?? null;
	};
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
		["input", (args, line) => {
			arity("input", args, 0, 1, line);
			const prompt = args.length === 0 ? "" : str(args[0] ?? null);
			const answer = input(prompt, line);
			print(`${prompt}${answer}`);
			return answer;
		}],
		["type", typeOf],
		["int", toIntValue],
		["float", toFloatValue],
		["bool", (args, line) => {
			arity("bool", args, 1, 1, line);
			return truthy(args[0] ?? null);
		}]
	];
	const builtins = new Map(entries.map(([name, call]) => [name, {
		type: "builtin",
		name,
		call
	}]));
	return builtins;
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
/** `"Привіт".upper()`: a text method gives a new text and leaves the old one as it was. */
var textCall = (name, text, args, line) => {
	if (args.length > 0) throw new PyError(`.${name}() нічого не приймає в дужках`, line);
	switch (name) {
		case "upper": return text.toUpperCase();
		case "lower": return text.toLowerCase();
		case "strip": return text.trim();
	}
};
/** Runs a program. It gives the turn away after each action, and stops (`Halt`) when resumed with true. */
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
		this.builtins = makeBuiltins({
			print: host.print,
			input: host.input
		});
	}
	*run(program) {
		try {
			yield* this.block(program);
		} catch (signal) {
			if (signal instanceof BreakSignal || signal instanceof ContinueSignal) throw new PyError("break і continue працюють тільки всередині циклу", 1);
			if (signal instanceof ReturnSignal) throw new PyError("return працює тільки всередині функції", 1);
			throw signal;
		} finally {
			this.host.stopped?.(this.globals);
		}
	}
	tick() {
		if (++this.steps > 2e5) throw new Halt(true);
	}
	*block(body) {
		for (const s of body) yield* this.statement(s);
	}
	*statement(s) {
		this.tick();
		switch (s.k) {
			case "expr": return yield* this.expressionStatement(s.expr);
			case "assign": return yield* this.assign(s.target, yield* this.eval(s.value));
			case "augassign": {
				const old = yield* this.eval(s.target);
				return yield* this.assign(s.target, binary(s.op, old, yield* this.eval(s.value), s.line));
			}
			case "if": return yield* this.block(truthy(yield* this.eval(s.test)) ? s.body : s.orelse);
			case "while": return yield* this.whileLoop(s);
			case "for": return yield* this.forLoop(s);
			case "def": return yield* this.assign({
				k: "name",
				id: s.name,
				line: s.line
			}, {
				type: "function",
				def: s
			});
			case "return":
				if (this.scope === null) throw new PyError("return працює тільки всередині функції", s.line);
				throw new ReturnSignal(s.value === null ? null : yield* this.eval(s.value));
			case "break": throw new BreakSignal();
			case "continue": throw new ContinueSignal();
			case "global":
				if (this.scope === null) throw new PyError("global пишуть тільки всередині функції", s.line);
				return;
			case "pass": return;
		}
	}
	*expressionStatement(expr) {
		const value = yield* this.eval(expr);
		if (expr.k !== "call" && isCallable(value)) {
			const shown = expr.k === "attribute" ? `${HERO_NAME}.${expr.name}` : expr.k === "name" ? expr.id : "функцію";
			throw new PyError(`Щоб виконати ${shown}, додай дужки: ${shown}()`, expr.line);
		}
	}
	/** Runs a loop body. False when the loop must stop (`break`). */
	*loopBody(body) {
		try {
			yield* this.block(body);
		} catch (signal) {
			if (signal instanceof BreakSignal) return false;
			if (!(signal instanceof ContinueSignal)) throw signal;
		}
		return true;
	}
	*whileLoop(s) {
		while (truthy(yield* this.eval(s.test))) {
			this.tick();
			if (!(yield* this.loopBody(s.body))) return;
		}
	}
	*forLoop(s) {
		const iterable = yield* this.eval(s.iter);
		const items = typeof iterable === "string" ? [...iterable] : isList(iterable) ? [...iterable.items] : null;
		if (items === null) throw new PyError(`for проходить по списку, тексту чи range(…), а тут ${typeName(iterable)}: може, range(${repr(iterable)})?`, s.line);
		for (const item of items) {
			this.tick();
			yield* this.assign({
				k: "name",
				id: s.target,
				line: s.line
			}, item);
			if (!(yield* this.loopBody(s.body))) return;
		}
	}
	*assign(target, value) {
		if (target.k === "index") {
			const [items, index] = yield* this.item(target);
			items.items[index] = value;
			return;
		}
		if (target.id === "hero") throw new PyError(`Ім'я ${HERO_NAME} зайняте героєм: візьми для змінної інше`, target.line);
		if (this.scope !== null && this.scope.own.has(target.id)) this.scope.vars.set(target.id, value);
		else this.globals.set(target.id, value);
	}
	*eval(e) {
		this.tick();
		switch (e.k) {
			case "number":
			case "string":
			case "constant": return e.value;
			case "name": return this.lookup(e.id, e.line);
			case "list": return list(yield* this.all(e.items));
			case "attribute": return this.attribute(yield* this.eval(e.object), e.name, e.line);
			case "index": {
				const [items, index] = yield* this.item(e);
				return items.items[index] ?? null;
			}
			case "call": {
				const fn = yield* this.eval(e.fn);
				return yield* this.call(fn, yield* this.all(e.args), e.line);
			}
			case "unary": return this.unary(e.op, yield* this.eval(e.arg), e.line);
			case "binary": {
				const left = yield* this.eval(e.left);
				return binary(e.op, left, yield* this.eval(e.right), e.line);
			}
			case "bool": {
				const left = yield* this.eval(e.left);
				return (e.op === "and" ? truthy(left) : !truthy(left)) ? yield* this.eval(e.right) : left;
			}
			case "compare": return yield* this.chain(e);
		}
	}
	/** The values of expressions, left to right. */
	*all(es) {
		const values = [];
		for (const x of es) values.push(yield* this.eval(x));
		return values;
	}
	unary(op, v, line) {
		if (op === "not") return !truthy(v);
		if (typeof v !== "number" && typeof v !== "boolean") throw new PyError(`Знак «${op}» ставлять перед числом, а тут ${typeName(v)}`, line);
		return op === "-" ? -Number(v) : Number(v);
	}
	*chain(e) {
		let left = yield* this.eval(e.operands[0]);
		for (let i = 0; i < e.ops.length; i++) {
			const right = yield* this.eval(e.operands[i + 1]);
			if (!compare(e.ops[i] ?? "==", left, right, e.line)) return false;
			left = right;
		}
		return true;
	}
	/** The list and the index of `x[i]`; a negative index counts from the end, as in Python. */
	*item(e) {
		const container = yield* this.eval(e.object);
		if (!isList(container)) throw new PyError(`Квадратні дужки [ ] беруть елемент списку, а тут ${typeName(container)}`, e.line);
		const raw = toInt(yield* this.eval(e.index), "Номер елемента", e.line);
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
		const known = [
			...this.globals.keys(),
			...this.scope?.vars.keys() ?? [],
			...this.builtins.keys()
		];
		if (/[а-яіїєґ]/i.test(name)) return `Python не знає імені «${name}». Якщо це слова, візьми їх у лапки: "${name}"`;
		const guess = closest(name, known);
		return `Python не знає імені «${name}»: ${guess === null ? "задай її значення вище, перш ніж брати" : `може, ${guess}?`}`;
	}
	attribute(object, name, line) {
		if (isList(object) && (name === "append" || name === "pop")) return {
			type: "listMethod",
			name,
			list: object
		};
		if (typeof object === "string") {
			if (TEXT_METHODS.includes(name)) return {
				type: "textMethod",
				name,
				text: object
			};
			const guess = closest(name, TEXT_METHODS);
			throw new PyError(`У тексту немає методу .${name}()${guess === null ? `. Можна: ${TEXT_METHODS.map((m) => `.${m}()`).join(", ")}` : `: може, .${guess}()?`}`, line);
		}
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
	*call(fn, args, line) {
		if (typeof fn !== "object" || fn === null || fn.type === "list" || fn.type === "hero") throw new PyError(`${repr(fn)} — це ${typeName(fn)}, а не функція: дужки () після нього зайві`, line);
		switch (fn.type) {
			case "builtin": return fn.call(args, line);
			case "function": return yield* this.callFunction(fn, args, line);
			case "heroMethod": return yield* this.heroCall(fn.method, args, line);
			case "listMethod": return this.listCall(fn.name, fn.list, args, line);
			case "textMethod": return textCall(fn.name, fn.text, args, line);
		}
	}
	*callFunction(fn, args, line) {
		const { def } = fn;
		if (args.length !== def.params.length) throw new PyError(`Функція ${def.name}() чекає ${def.params.length} значень у дужках, а отримала ${args.length}`, line);
		if (this.depth >= 100) throw new PyError(`Функція ${def.name}() викликає себе забагато разів`, line);
		if (args.length > 0) this.host.called?.(def.name, args);
		const saved = this.scope;
		this.scope = {
			vars: new Map(def.params.map((p, i) => [p, args[i] ?? null])),
			own: def.locals
		};
		this.depth++;
		try {
			yield* this.block(def.body);
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
	*heroCall(method, args, line) {
		if (method.countsStock === true) {
			const kind = args[0];
			if (args.length !== 1 || typeof kind !== "string") throw new PyError(`${HERO_NAME}.${method.name}() чекає в дужках одне слово в лапках: ${HERO_NAME}.${method.name}("wood")`, line);
			if (!isStockKind(kind)) throw new PyError(`У коморі не лічать «${kind}». Можна: ${STOCK_KINDS.join(", ")}`, line);
			return this.host.count?.(kind) ?? 0;
		}
		if (method.probesItem === true) {
			const kind = args[0];
			if (args.length !== 1 || typeof kind !== "string") throw new PyError(`${HERO_NAME}.${method.name}() чекає в дужках одне слово в лапках: ${HERO_NAME}.${method.name}("carrot")`, line);
			if (!isItemKind(kind)) throw new PyError(`Немає такої речі «${kind}». Можна: ${Object.keys(ITEM_NAMES).join(", ")}`, line);
			return this.host.sense({ itemIs: kind });
		}
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
			if (yield) throw new Halt(false);
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
/** A tree of code with every line set to 0. */
var onLine0 = (node) => {
	if (Array.isArray(node)) return node.map(onLine0);
	if (typeof node !== "object" || node === null || node instanceof Set) return node;
	return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, k === "line" ? 0 : onLine0(v)]));
};
/** Runs a Python program on one field: the map of `level` only, without its other `fields`. */
var judgePythonField = (level, source) => runAlone(pythonRun(level, source, soloStage(level)));
/**
* The run of a Python program on a stage: alone on a level, or one worker of a crew. It gives the turn away after
* each action (`ProgramSteps`).
*/
function* pythonRun(level, source, stage) {
	const { session } = stage;
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
	const library = librarySource(level);
	const own = new Set(program.flatMap((s) => s.k === "def" ? [s.name] : []));
	const fromBook = new Set(library.names.filter((n) => !own.has(n)));
	const libraryBody = library.source === "" ? [] : onLine0(parse(library.source));
	const output = [];
	const answers = level.inputs ?? [];
	let asked = 0;
	let boxes = [];
	const keepBoxes = level.language === "python" || level.blocks.includes("variables");
	const calls = /* @__PURE__ */ new Set();
	const bookCalls = /* @__PURE__ */ new Set();
	const counted = level.blocks.includes("counter");
	const printsAtEnd = level.prints !== void 0 || (level.uses ?? []).includes("print");
	const host = {
		act: (action, line, globals) => {
			const counter = counted ? { counter: str(globals.get("лічильник") ?? 0) } : {};
			if (!stage.act(action, {
				blockId: null,
				line,
				...keepBoxes ? { boxes: boxesOf(globals) } : {},
				...counter
			})) return;
			if (printsAtEnd && session.reason === null) return;
			throw new Halt(false);
		},
		sense: (sensor) => heroSense(session, sensor),
		count: (kind) => heroCount(session, kind),
		allows: (method) => level.blocks.includes(method.block),
		print: (text) => {
			if (output.length < 200) output.push(text);
		},
		stopped: (globals) => {
			if (keepBoxes) boxes = boxesOf(globals);
		},
		called: (name, args) => {
			calls.add(`${name}(${args.map((a) => str(a)).join(", ")})`);
			if (fromBook.has(name)) bookCalls.add(name);
		},
		input: (prompt, line) => {
			const answer = answers[asked];
			if (answer === void 0) {
				const tail = answers.length === 0 ? "на цьому рівні ніхто не відповідає на input()" : `на цьому полі є лише ${answers.length} ${answers.length === 1 ? "відповідь" : "відповіді"}`;
				throw new PyError(`input(${prompt === "" ? "" : repr(prompt)}) питає, але ${tail}`, line);
			}
			asked += 1;
			return answer;
		}
	};
	const printed = () => ({
		...output.length === 0 ? {} : { output },
		...boxes.length === 0 ? {} : { boxes },
		...calls.size === 0 ? {} : { calls: [...calls] },
		...bookCalls.size === 0 ? {} : { bookCalls: [...bookCalls] }
	});
	try {
		yield* execute([...libraryBody, ...program], host);
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
	const missing = session.reason === null && allGoalsMet(level, session.world) ? missingIdea(level, program) ?? missingPrint(level, output) : null;
	if (missing !== null) return resultOf(level, {
		...session,
		reason: "badProgram"
	}, size, {
		detail: missing,
		...printed()
	});
	return resultOf(level, session, size, printed());
}
/** Runs a Python program on every field of the level: one result for each field, in order. */
var judgePythonFields = (level, source) => levelFields(level).map((field) => judgePythonField(field, source));
// src/core/farm.ts
var RESOURCES = [
	"wood",
	"pumpkin",
	"meat",
	"gold",
	"flour"
];
var RESOURCE_NAMES = {
	wood: "колоди",
	pumpkin: "гарбузи",
	meat: "м'ясо",
	gold: "золото",
	flour: "борошно"
};
/** The kind of the game that each resource is: what lies on the map, what the worker carries, what the barn counts. */
var ITEM_OF = {
	wood: "wood",
	pumpkin: BED_ITEM,
	meat: TROUGH_ITEM,
	gold: "gold",
	flour: FLOUR
};
var resourceOf = (item) => RESOURCES.find((r) => ITEM_OF[r] === item) ?? null;
var NO_AMOUNTS = {
	wood: 0,
	pumpkin: 0,
	meat: 0,
	gold: 0,
	flour: 0
};
/** «Програма Тараса»: the name after a noun. */
var HELPER_NAME_OF = "Тараса";
var IDLE = /* @__PURE__ */ new Set([
	"nothingToCollect",
	"handsFull",
	"notStorehouse",
	"nothingToStore",
	"cannotSow",
	"waited",
	"noLever",
	"swingMissed",
	"cannotFeed",
	"cannotWater",
	"cannotBuild"
]);
var add = (a, r, n = 1) => ({
	...a,
	[r]: a[r] + n
});
/** Reads the yield of a day from the frames: what each «взяти» took, and what each «віднести на склад» put down. */
var farmReport = (level, result, day) => {
	let load = [];
	let stored = NO_AMOUNTS;
	const byTurn = [];
	for (const frame of result.frames) {
		if (frame.outcome === "collected") {
			const kind = resourceOf(kindAt(frame.world, cellKey(frame.world.hero.x, frame.world.hero.y)));
			if (kind !== null) load = [...load, kind];
		}
		if (frame.outcome === "fed") {
			const i = load.indexOf("pumpkin");
			load = load.filter((_, j) => j !== i);
		}
		if (frame.outcome === "stored") {
			stored = load.reduce((sum, r) => add(sum, r), stored);
			load = [];
		}
		if (frame.outcome === "milled") {
			const ground = load.filter((r) => r === "pumpkin").length;
			stored = add(stored, "flour", ground);
			load = load.filter((r) => r !== "pumpkin");
		}
		byTurn.push(stored);
	}
	const carried = load.reduce((sum, r) => add(sum, r), NO_AMOUNTS);
	const built = result.frames.filter((f) => f.outcome === "built").length;
	const part = level.site?.part ?? {};
	const spent = RESOURCES.reduce((sum, r) => add(sum, r, built * (part[ITEM_OF[r]] ?? 0)), NO_AMOUNTS);
	return {
		day,
		stored,
		carried,
		byTurn,
		idle: result.frames.filter((f) => IDLE.has(f.outcome)).length,
		idleFeed: result.frames.filter((f) => f.outcome === "cannotFeed").length,
		used: result.frames.length,
		turns: level.turns ?? result.frames.length,
		goblins: level.enemies?.length ?? 0,
		beaten: result.frames.reduce((n, f) => n + f.events.filter((e) => e.type === "enemyDown").length, 0),
		stopped: result.reason === "goalsNotMet" ? null : result.reason,
		trips: result.frames.filter((f) => f.outcome === "stored").length,
		...built > 0 ? {
			built,
			spent
		} : {},
		...result.boxes === void 0 ? {} : { variables: Object.fromEntries(result.boxes.map((b) => [b.name, b.value])) },
		ownBlock: calledWithDifferentValues(result.calls ?? []),
		fromBook: (result.bookCalls ?? []).length > 0,
		...result.detail === void 0 ? {} : { detail: result.detail },
		...result.line === void 0 ? {} : { line: result.line }
	};
};
/**
* The report of a crew's day: each worker's from its own frames, and their sum. The yield by turn adds up turn by
* turn: a worker whose program stopped keeps what it brought.
*/
var crewReport = (level, result, day) => {
	const workers = (result.workers ?? [result]).map((w) => farmReport(level, w, day));
	const [first] = workers;
	if (first === void 0 || workers.length === 1) return farmReport(level, result, day);
	const sum = (pick) => workers.reduce((total, r) => RESOURCES.reduce((a, k) => add(a, k, pick(r)?.[k] ?? 0), total), NO_AMOUNTS);
	const used = result.frames.length;
	const byTurn = Array.from({ length: used }, (_, i) => sum((r) => r.byTurn[Math.min(i, r.byTurn.length - 1)]));
	const built = workers.reduce((n, r) => n + (r.built ?? 0), 0);
	const helperEvents = result.frames.flatMap((f) => (f.crew ?? []).flatMap((c) => c?.events ?? []));
	return {
		...first,
		stored: sum((r) => r.stored),
		carried: sum((r) => r.carried),
		byTurn,
		idle: workers.reduce((n, r) => n + r.idle, 0),
		idleFeed: workers.reduce((n, r) => n + (r.idleFeed ?? 0), 0),
		used,
		turns: level.turns ?? used,
		beaten: result.frames.reduce((n, f) => n + f.events.filter((e) => e.type === "enemyDown").length, 0) + helperEvents.filter((e) => e.type === "enemyDown").length,
		stopped: first.stopped ?? (workers.some((r) => r.stopped === "badProgram") ? "badProgram" : null),
		...result.detail === void 0 ? {} : { detail: result.detail },
		...built > 0 ? {
			built,
			spent: sum((r) => r.spent)
		} : {},
		ownBlock: workers.some((r) => r.ownBlock === true),
		fromBook: workers.some((r) => r.fromBook === true),
		workers
	};
};
/** Whether one own block was called with different values: `calls` are like «пройти(6)», each once. */
var calledWithDifferentValues = (calls) => {
	const names = calls.map((c) => c.slice(0, c.indexOf("(")));
	return names.some((n, i) => names.indexOf(n) !== i);
};
var crewProgram = (level, code) => (stage) => code.language === "blocks" ? blocksRun(level, code.program, stage) : pythonRun(level, code.source, stage);
/**
* The day of the worker and the helper on the level of a farm day (`farmDay` with the helper's house built). A
* mistake in the helper's program is the mistake of the day, named after him: the worker's own comes first.
*/
var runFarmCrew = (level, crew) => {
	const result = runCrew(level, [crewProgram(level, crew.worker), crewProgram(level, crew.helper)]);
	const helper = result.workers?.[1];
	if (result.reason === "badProgram" || helper?.reason !== "badProgram") return result;
	const where = helper.line === void 0 ? "" : `, рядок ${helper.line}`;
	const { line: _line, ...rest } = result;
	return {
		...rest,
		passed: false,
		stars: 0,
		reason: "badProgram",
		detail: `Програма ${HELPER_NAME_OF}${where}: ${helper.detail ?? "щось не так"}`
	};
};
/** The word after a number: one, two to four, five and more. */
var PRICE_WORDS = {
	wood: [
		"колода",
		"колоди",
		"колод"
	],
	pumpkin: [
		"гарбуз",
		"гарбузи",
		"гарбузів"
	],
	meat: [
		"шматок м'яса",
		"шматки м'яса",
		"шматків м'яса"
	],
	gold: [
		"золото",
		"золота",
		"золота"
	],
	flour: [
		"мірка борошна",
		"мірки борошна",
		"мірок борошна"
	]
};
/** «1 колода», «3 колоди», «12 колод». */
var amountText = (r, n) => {
	const [one, few, many] = PRICE_WORDS[r];
	const tens = Math.abs(n) % 100;
	const last = tens % 10;
	return `${n} ${tens >= 11 && tens <= 14 ? many : last === 1 ? one : last >= 2 && last <= 4 ? few : many}`;
};
/** Whether a level is a day of the farm (its id). */
var isFarmLevel = (levelId) => /^farm-\d+$/.test(levelId);
/** All the barn held after a day, both resources together: the height of a bar in the chart of the report. */
var totalOf = (amounts) => RESOURCES.reduce((sum, r) => sum + amounts[r], 0);
/**
* What to improve after a working day, in the words of the report: the turns spent for nothing, what was left in the
* hands, a program that stopped before the evening. At most three tips, the most useful first.
*
* `blocks`: the palette of the day. A tip names only the commands the student has; on the first days, before the
* loops and the questions open, it says what to do in other words.
*/
var farmTips = (report, capacity, language = "blocks", blocks) => {
	const py = language === "python";
	const can = (b) => blocks === void 0 || blocks.includes(b);
	const tips = [];
	if (report.stopped === "defeated") tips.push(`Гобліни здолали робітника: ${py ? "if hero.enemy_ahead(): hero.attack()" : "«якщо попереду ворог? то вдарити»"} перед кожним кроком.`);
	else if (report.stopped === "crashed") tips.push(can("wallAhead") ? `Робітник урізався в ${report.goblins > 0 ? "паркан або в гобліна" : "паркан"}: перед кроком спитай ${py ? "hero.wall_ahead()" : "«попереду стіна?»"}${report.goblins > 0 ? py ? " і hero.enemy_ahead()" : " і «попереду ворог?»" : ""}.` : `Робітник урізався в паркан: порахуй клітинки стежки й поверни там, де вона повертає.`);
	else if (report.used < report.turns && report.stopped === null) tips.push(can("forever") ? `Програма закінчилась на ході ${report.used} з ${report.turns}: ${py ? "загорни роботу в while True" : "загорни роботу в «завжди»"}, щоб робітник працював до вечора.` : `Програма закінчилась на ході ${report.used} з ${report.turns}: ходів ще багато, допиши команди, щоб робітник приніс більше.`);
	const left = totalOf(report.carried);
	if (left > 0) tips.push(`Наприкінці дня в руках лишилось ${left}: це пропало. Неси в комору, щойно руки повні (${capacity}).`);
	if (report.idle > 0) tips.push((report.idleFeed ?? 0) > 0 ? `Ходів дарма: ${report.idle}, з них ${report.idleFeed} ${py ? "hero.feed()" : "«нагодувати»"} без гарбуза в руках або коли вівці ще їли. Годуй, лише коли ${py ? "hero.sheep_hungry()" : "«вівці голодні?»"} і в руках є гарбуз.` : `Ходів дарма: ${report.idle}. ${py ? "hero.collect()" : "«Взяти»"} на порожній клітинці теж забирає хід: ${can("onCrystal") ? `спершу спитай ${py ? "hero.item_here()" : "«тут щось є?»"}` : "бери лише там, де лежить колода"}.`);
	return tips.slice(0, 3);
};
/** Palette blocks a piece cannot carry over: a custom block or the counter of an earlier piece. */
var KEPT_STATE = /* @__PURE__ */ new Set([
	"procedure",
	"counter",
	"variables",
	"myBlocks"
]);
/**
* Can the student go on from where this run stopped? Only when the program simply ended before the goals: after a
* crash, a trap, the steps or hearts running out, or a run too long, the student starts over, so that obstacles keep
* their meaning. A level with several fields needs one program for every field, and a «Зламаний робот» level is about
* fixing the program it gives. In blocks, a level with a custom block or the counter keeps one program too.
*/
var canContinue = (level, result, language, pieces) => result.reason === "goalsNotMet" && pieces < 8 && levelFields(level).length === 1 && level.broken === void 0 && (language === "python" || !level.blocks.some((b) => KEPT_STATE.has(b)));
/** The stars of a program written in `pieces` pieces. The first chapter (`large`) keeps its stars: there finishing matters most. */
var piecesStars = (stars, pieces, large) => pieces > 1 && !large && stars > 2 ? 2 : stars;
var isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
/** The block ids an input points to: `[1, id]`, `[2, id]` or `[3, id, shadowId]`. */
var inputIds = (input) => Array.isArray(input) ? input.slice(1).filter((v) => typeof v === "string") : [];
/** The ids of every block in the script under the hat: the stack, its branches and the blocks in its slots. */
var scriptIds = (program, hat) => {
	const seen = /* @__PURE__ */ new Set();
	const visit = (id) => {
		if (typeof id !== "string" || seen.has(id) || !Object.hasOwn(program, id)) return;
		const block = program[id];
		if (!isRecord(block)) return;
		seen.add(id);
		visit(block.next);
		if (isRecord(block.inputs)) for (const input of Object.values(block.inputs)) for (const ref of inputIds(input)) visit(ref);
	};
	visit(hat);
	return [...seen];
};
/** The top-level start hats of a program: each starts a script. */
var startHats = (program) => Object.entries(program).filter(([, b]) => isRecord(b) && b.opcode === "event_whenflagclicked" && b.topLevel === true).map(([id]) => id);
/** How many scripts a program has: one for each top-level start hat. */
var scriptCount = (program) => startHats(program).length;
/** The only top-level start hat of a piece, or null when it has none or more than one. */
var startHat = (program) => {
	const hats = startHats(program);
	return hats.length === 1 ? hats[0] ?? null : null;
};
/** Can this piece be joined: exactly one script, under one start hat. Two scripts would run side by side. */
var isPiece = (program) => startHat(program) !== null;
/** The id a block of piece `n` has in the joined program. */
var joinedId = (n, id) => `p${n}-${id}`;
/** A copy of the block with its ids renamed for the joined program. */
var renamed = (block, rename) => ({
	...block,
	next: rename(block.next),
	parent: rename(block.parent),
	...isRecord(block.inputs) ? { inputs: Object.fromEntries(Object.entries(block.inputs).map(([name, input]) => [name, Array.isArray(input) ? input.map((v, i) => i === 0 ? v : rename(v)) : input])) } : {}
});
/**
* One program from the pieces, in order: the script of the first piece, then the blocks under the hat of each next
* piece, joined to the end of the stack. Blocks outside the script do nothing in a run and are left out. Null when a
* piece is not one script (`isPiece`).
*/
var joinPrograms = (pieces) => {
	const joined = {};
	let tail = null;
	for (const [n, piece] of pieces.entries()) {
		const hat = startHat(piece);
		if (hat === null) return null;
		const ids = scriptIds(piece, hat);
		const own = new Set(ids);
		const rename = (id) => n > 0 && id === hat ? null : typeof id === "string" && own.has(id) ? joinedId(n, id) : id;
		for (const id of ids) {
			if (n > 0 && id === hat) continue;
			joined[joinedId(n, id)] = renamed(piece[id], rename);
		}
		const hatBlock = piece[hat];
		const first = n === 0 ? joinedId(0, hat) : typeof hatBlock.next === "string" ? joinedId(n, hatBlock.next) : null;
		if (first === null) continue;
		if (tail !== null) {
			joined[tail] = {
				...joined[tail],
				next: first
			};
			joined[first] = {
				...joined[first],
				parent: tail
			};
		}
		let end = first;
		for (let next = joined[end]?.next; typeof next === "string" && joined[next] !== void 0; next = joined[next]?.next) end = next;
		tail = end;
	}
	return joined;
};
/** The id in the editor of a block of the joined program, when it is a block of piece `n`; null for another piece. */
var pieceBlockId = (blockId, n) => {
	const prefix = joinedId(n, "");
	return blockId !== null && blockId.startsWith(prefix) ? blockId.slice(prefix.length) : null;
};
/** One Python program from the pieces, in order. Each piece starts on a new line. */
var joinSources = (pieces) => pieces.map((p) => p.endsWith("\n") ? p : `${p}\n`).join("");
/** Lines of the earlier pieces: a line of the new piece is this many lines down in the joined program. */
var linesBefore = (pieces) => joinSources(pieces).split("\n").length - 1;
/**
* The run of the joined program as the screen plays it: only the frames after the earlier pieces, which the student
* has seen already. `done` is the number of frames of the earlier pieces. The grade is the grade of the whole program.
*/
var continuedResult = (result, done) => done <= 0 || done > result.frames.length ? result : {
	...result,
	frames: result.frames.slice(done)
};
// src/ui/fields.ts
/**
* The fields of a level on the screen: which one is shown and the runs of the last check on each. Blocks and Python
* share it. A new level starts on its first field with no runs.
*/
var useFields = (level) => {
	const fields = useMemo(() => levelFields(level), [level]);
	const [index, setIndex] = useState(0);
	const [runs, setRuns] = useState(null);
	useEffect(() => {
		setIndex(0);
		setRuns(null);
	}, [level]);
	const field = fields[index] ?? fields[0] ?? level;
	return {
		fields,
		index,
		setIndex,
		runs,
		setRuns,
		field,
		start: useMemo(() => startWorld(field), [field])
	};
};
// src/ui/fullscreen.ts
/**
* How long a game that closes in full screen keeps it for the next game. «Далі» makes the app open the next level as
* a new game; the new game opens in full screen when it comes within this time.
*/
var FULL_SCREEN_HANDOFF_MS = 4e3;
/** Until when a closed game hands its full screen to the next game that opens (0: it does not). */
var handoffUntil = 0;
/** A game closes: in full screen, it hands it to the next game. */
var handOffFullScreen = (full, now) => {
	handoffUntil = full ? now + FULL_SCREEN_HANDOFF_MS : 0;
};
/** A handoff waits for the next game. */
var handoffPending = () => handoffUntil !== 0;
/** A game opens: true when it takes the full screen of the game before it. A handoff is taken once. */
var takeFullScreen = (now) => {
	const taken = now < handoffUntil;
	handoffUntil = 0;
	return taken;
};
/**
* What goes into the browser's full screen: the whole page. The page stays when the app opens the next level as a
* new game, so the browser stays in full screen; the game covers the page (`.eb-full`). The block editor puts its
* number field and its menus on the page body, so they show in full screen too.
*/
var fullScreenTarget = () => document.documentElement;
/** While the game covers the page, the page under it does not scroll. */
var PAGE_CLASS = "eb-page-full";
/**
* Full screen for the game. The browser's full screen where it works; elsewhere (an iPhone) the game covers the
* page. Esc or the button leaves it. The next level opens in full screen too (`handOffFullScreen`).
*/
var useFullScreen = () => {
	const rootRef = useRef(null);
	const [full, setFullState] = useState(false);
	const fullRef = useRef(false);
	const setFull = useCallback((on) => {
		fullRef.current = on;
		setFullState(on);
	}, []);
	const owns = useRef(false);
	const enter = useCallback(() => {
		setFull(true);
		const target = fullScreenTarget();
		if (document.fullscreenElement === target) {
			owns.current = true;
			return;
		}
		if (typeof target.requestFullscreen === "function") target.requestFullscreen().catch(() => void 0);
	}, [setFull]);
	useEffect(() => {
		if (takeFullScreen(Date.now())) enter();
		return () => {
			handOffFullScreen(fullRef.current, Date.now());
			if (!owns.current) return;
			const target = fullScreenTarget();
			setTimeout(() => {
				if (handoffPending() && document.fullscreenElement === target) document.exitFullscreen().catch(() => void 0);
			}, FULL_SCREEN_HANDOFF_MS);
		};
	}, [enter]);
	useEffect(() => {
		const onChange = () => {
			if (document.fullscreenElement === fullScreenTarget()) owns.current = true;
			else if (owns.current) {
				owns.current = false;
				setFull(false);
			}
		};
		document.addEventListener("fullscreenchange", onChange);
		return () => document.removeEventListener("fullscreenchange", onChange);
	}, [setFull]);
	const leave = useCallback(() => {
		setFull(false);
		owns.current = false;
		if (document.fullscreenElement !== null) document.exitFullscreen().catch(() => void 0);
	}, [setFull]);
	useEffect(() => {
		if (!full) return;
		const page = document.documentElement;
		page.classList.add(PAGE_CLASS);
		return () => page.classList.remove(PAGE_CLASS);
	}, [full]);
	useEffect(() => {
		if (!full) return;
		const onKey = (e) => {
			if (e.key === "Escape") leave();
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [full, leave]);
	return {
		rootRef,
		full,
		toggleFull: useCallback(() => full ? leave() : enter(), [
			full,
			enter,
			leave
		])
	};
};
// src/ui/prefs.ts
var RATE_KEY = "edu-blocks:rate";
var ZOOM_KEY = "edu-blocks:zoom";
/** The zoom is kept as a share of the start scale of the editor, so a phone and a computer each keep their size. */
var MIN_ZOOM = .3;
var browserStore = () => {
	try {
		return typeof localStorage === "undefined" ? null : localStorage;
	} catch {
		return null;
	}
};
var readNumber = (store, key) => {
	if (store === null) return null;
	try {
		const raw = store.getItem(key);
		if (raw === null) return null;
		const value = Number(raw);
		return Number.isFinite(value) ? value : null;
	} catch {
		return null;
	}
};
var writeNumber = (store, key, value) => {
	if (store === null) return;
	try {
		store.setItem(key, String(value));
	} catch {}
};
/** The saved speed if it is one of `rates`, else `fallback`. */
var loadRate = (rates, fallback, store = browserStore()) => {
	const saved = readNumber(store, RATE_KEY);
	return saved !== null && rates.includes(saved) ? saved : fallback;
};
var saveRate = (rate, store = browserStore()) => writeNumber(store, RATE_KEY, rate);
/** The saved zoom (a share of the start scale), 1 when nothing valid is saved. */
var loadZoom = (store = browserStore()) => {
	const saved = readNumber(store, ZOOM_KEY);
	return saved !== null && saved >= .3 && saved <= 4 ? saved : 1;
};
var saveZoom = (zoom, store = browserStore()) => {
	if (!Number.isFinite(zoom)) return;
	writeNumber(store, ZOOM_KEY, Math.min(4, Math.max(MIN_ZOOM, Math.round(zoom * 1e3) / 1e3)));
};
var PEEK_KEY = "edu-blocks:python-peek";
/** Is the «Як це в Python» view under the blocks open? Closed when nothing is saved. */
var loadPeek = (store = browserStore()) => readNumber(store, PEEK_KEY) === 1;
var savePeek = (open, store = browserStore()) => writeNumber(store, PEEK_KEY, open ? 1 : 0);
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
// src/ui/FieldTabs.tsx
var mark = (passed) => passed === void 0 ? "" : passed ? " ✓" : " ✗";
/**
* The fields of a level over the field: «Поле 1 · Поле 2 · Поле 3». Before a run a tab shows its map; after a run
* each tab has a mark, and a tab plays the run on its field.
*/
var FieldTabs = ({ count, index, passed, disabled, onPick }) => /* @__PURE__ */ jsxs("div", {
	className: "eb-fields",
	role: "group",
	"aria-label": "Поля рівня: одна програма має пройти всі",
	children: [/* @__PURE__ */ jsxs("span", {
		className: "eb-fields-note",
		children: [
			"Одна програма — ",
			count,
			" поля:"
		]
	}), Array.from({ length: count }, (_, i) => {
		const ok = passed?.[i];
		const state = ok === void 0 ? "" : ok ? " eb-field-tab-ok" : " eb-field-tab-fail";
		const said = ok === void 0 ? "" : ok ? ", пройдено" : ", не пройдено";
		return /* @__PURE__ */ jsxs("button", {
			type: "button",
			className: `eb-btn eb-btn-small eb-field-tab${state}`,
			"aria-pressed": i === index,
			"aria-label": `Поле ${i + 1}${said}`,
			disabled,
			onClick: () => onPick(i),
			children: [
				"Поле ",
				i + 1,
				mark(ok)
			]
		}, i);
	})]
});
// src/core/heroes.ts
var HEROES = [
	{
		id: "ninja",
		name: "Воїн",
		about: "Меч, щит і синій плащ. З ним починається пригода.",
		heroLevel: 1
	},
	{
		id: "robot",
		name: "Трудяга",
		about: "Селянин у синьому. Рубає, носить і нікуди не поспішає.",
		heroLevel: 2
	},
	{
		id: "rover",
		name: "Лучник",
		about: "Стріляє здалеку. Перший на нових стежках.",
		heroLevel: 3
	},
	{
		id: "bee",
		name: "Фіолетовий воїн",
		about: "Спритний і швидкий. Шолом із пером видно здалеку.",
		heroLevel: 4
	},
	{
		id: "knight",
		name: "Червоний лицар",
		about: "У червоних обладунках. Стежку не звертає.",
		heroLevel: 1,
		price: 60
	},
	{
		id: "eskimo",
		name: "Фіолетовий лучник",
		about: "Тятива напнута, око пильне. Зима йому не страшна.",
		heroLevel: 1,
		price: 80
	},
	{
		id: "cavegirl",
		name: "Лісоруб",
		about: "З сокирою в руках. Знає кожен кущ на стежці.",
		heroLevel: 2,
		price: 100
	},
	{
		id: "woman",
		name: "Червоний лучник",
		about: "Уже обійшов пів світу і не схибив жодного разу.",
		heroLevel: 2,
		price: 120
	},
	{
		id: "samurai",
		name: "Золотий лучник",
		about: "Спокійний і точний. Кожен постріл у нього продуманий.",
		heroLevel: 3,
		price: 150
	},
	{
		id: "knight-gold",
		name: "Золотий лицар",
		about: "Обладунки сяють, як сонце. Для справжніх майстрів.",
		heroLevel: 5,
		price: 250
	}
];
/** Whether the student may play a hero: the hero level is reached, and a hero with a price is bought (`owned`). */
var heroOpen = (hero, heroLevel, owned = []) => heroLevel >= hero.heroLevel && (hero.price === void 0 || owned.includes(hero.id));
/** Whether the shop sells a hero to the student now: it has a price, is not bought, the level is reached and the coins are enough. */
var canBuyHero = (hero, heroLevel, owned, coins) => hero.price !== void 0 && !owned.includes(hero.id) && heroLevel >= hero.heroLevel && coins >= hero.price;
/** Coins spent on the bought heroes. Unknown ids and heroes without a price cost nothing. */
var heroesCost = (owned) => HEROES.reduce((sum, h) => sum + (h.price !== void 0 && owned.includes(h.id) ? h.price : 0), 0);
// src/core/assets.ts
var isDirectional = (frames) => !Array.isArray(frames);
/** The frames a clip plays facing `direction`, and whether to flip them. Empty when the clip has no such direction. */
var clipFrames = (clip, direction = "down") => {
	const { frames } = clip;
	if (!isDirectional(frames)) return {
		frames,
		flip: false
	};
	const own = frames[direction];
	if (own !== void 0) return {
		frames: own,
		flip: false
	};
	const mirrored = clip.mirror?.[direction];
	const other = mirrored === void 0 ? void 0 : frames[mirrored];
	return other === void 0 ? {
		frames: [],
		flip: false
	} : {
		frames: other,
		flip: true
	};
};
/** Where frame `index` of the sprite's grid (or the clip's own picture) is. */
var frameRect = (sprite, index, clip, flip = false) => {
	const file = clip?.file ?? sprite.file;
	const size = clip?.size ?? sprite.size;
	const [w, h] = clip?.frame ?? sprite.frame ?? size;
	const columns = Math.max(1, Math.floor(size[0] / w));
	return {
		file,
		sx: index % columns * w,
		sy: Math.floor(index / columns) * h,
		w,
		h,
		flip
	};
};
/** Which of `count` frames shows `ms` milliseconds into a clip: looping, or holding the last frame. */
var frameIndexAt$1 = (count, fps, loop, ms) => {
	if (count <= 0) return 0;
	const step = Math.floor(Math.max(0, ms) * fps / 1e3);
	return loop ? step % count : Math.min(step, count - 1);
};
/** The frame to draw `ms` milliseconds into a clip, or null when the sprite has no such clip or direction. */
var frameAt = (sprite, clipName, direction, ms) => {
	const clip = sprite.clips?.[clipName];
	if (clip === void 0) return null;
	const { frames, flip } = clipFrames(clip, direction);
	const index = frames[frameIndexAt$1(frames.length, clip.fps, clip.loop, ms)];
	return index === void 0 ? null : frameRect(sprite, index, clip, flip);
};
/** The pack and the sprite of an asset reference `"<pack>:<sprite id>"`, or null when it is not one. */
var parseAssetRef = (ref) => {
	const at = ref.indexOf(":");
	if (at <= 0 || at === ref.length - 1) return null;
	return {
		pack: ref.slice(0, at),
		id: ref.slice(at + 1)
	};
};
/** Clips a figure plays when nothing else is asked, best first. */
var IDLE_CLIPS = [
	"idle",
	"play",
	"walk",
	"grow"
];
/**
* The clip a sprite plays standing on the field: its `idle` (or the like) or the first one that loops; null when it
* has none. A clip played once (a gold bag that appears in a flash) is not how the thing stands.
*/
var restClip = (sprite) => {
	const clips = sprite.clips ?? {};
	const names = Object.keys(clips);
	return IDLE_CLIPS.find((n) => names.includes(n)) ?? names.find((n) => clips[n]?.loop !== false) ?? null;
};
/** The clip of a walking figure: `walk` or `run`, else what it plays at rest. */
var walkClip = (sprite) => sprite.clips?.walk !== void 0 ? "walk" : sprite.clips?.run !== void 0 ? "run" : restClip(sprite);
/**
* One still frame that shows what the sprite is, for an icon: the `icon` clip of a crop, the ripe last stage of a
* growing crop, the first frame of the rest clip facing down, or the whole picture.
*/
var iconFrame = (sprite) => {
	const clips = sprite.clips ?? {};
	const icon = clips.icon;
	if (icon !== void 0) {
		const { frames, flip } = clipFrames(icon);
		if (frames[0] !== void 0) return frameRect(sprite, frames[0], icon, flip);
	}
	const grow = clips.grow;
	if (grow !== void 0) {
		const { frames } = clipFrames(grow);
		const last = frames[frames.length - 1];
		if (last !== void 0) return frameRect(sprite, last, grow);
	}
	const rest = restClip(sprite);
	if (rest !== null) {
		const frame = frameAt(sprite, rest, "down", 0);
		if (frame !== null) return frame;
	}
	return frameRect(sprite, 0);
};
// src/ui/stage/images.ts
/**
* Loaded pictures for the canvas. Each picture loads once per page; `whenLoaded` tells the field to draw again
* when a picture it asked for arrives.
*/
var cache = /* @__PURE__ */ new Map();
var waiting = /* @__PURE__ */ new Set();
/** Tells the fields that something they draw has arrived: a picture or an asset pack. */
var notifyLoaded = () => {
	for (const callback of [...waiting]) callback();
};
/** The picture, ready to draw, or null while it loads. */
var image = (href) => {
	let img = cache.get(href);
	if (img === void 0) {
		img = new Image();
		img.decoding = "async";
		img.onload = notifyLoaded;
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
// src/ui/stage/packs.ts
var base = "./packs/";
var packs = /* @__PURE__ */ new Map();
var pending = /* @__PURE__ */ new Map();
/** Where the pack folders are, ending with a slash. */
var setAssetBase = (url) => {
	const next = url.endsWith("/") ? url : `${url}/`;
	if (next === base) return;
	base = next;
	packs.clear();
	pending.clear();
	missing.clear();
};
/** The URL of a file of a pack, as the manifest names it. */
var packFile = (pack, file) => `${base}${pack}/${file}`;
/** Loads a pack once; resolves to null when there is no such pack. */
var loadPack = (id) => {
	const known = pending.get(id);
	if (known !== void 0) return known;
	const promise = fetch(`${base}${id}/manifest.json`).then((r) => r.ok ? r.json() : null).then((pack) => {
		if (pack !== null) {
			packs.set(id, pack);
			notifyLoaded();
		}
		return pack;
	}).catch(() => null);
	pending.set(id, promise);
	return promise;
};
/** The packs the build serves, from `<base>index.json`; empty when there is no list. */
var loadPackList = () => fetch(`${base}index.json`).then((r) => r.ok ? r.json() : []).catch(() => []);
var missing = /* @__PURE__ */ new Set();
/** Whether a pack is there: loading starts on the first call. A missing pack (no such folder) stays missing. */
var packStatus = (id) => {
	if (packs.has(id)) return "ready";
	if (missing.has(id)) return "missing";
	if (!pending.has(id)) loadPack(id).then((pack) => {
		if (pack === null) {
			missing.add(id);
			notifyLoaded();
		}
	});
	return "loading";
};
/** A sprite and its pack, by reference: null while the pack loads or when there is no such sprite. */
var spriteOf = (ref) => {
	const parsed = parseAssetRef(ref);
	if (parsed === null) return null;
	const pack = packs.get(parsed.pack);
	if (pack === void 0) {
		loadPack(parsed.pack);
		return null;
	}
	const sprite = pack.sprites.find((s) => s.id === parsed.id);
	return sprite === void 0 ? null : {
		pack,
		sprite
	};
};
// src/ui/art.ts
/**
* What the game draws, by sprite id of the Tiny Swords packs. The public pack `tiny-swords` (Update 010, CC0) is
* always there; when the build also serves the private Free Pack `tiny-swords-free`, a sprite it has under the same
* id is taken from it instead. Tilesets come from the public pack only: the Free Pack numbers its tiles differently
* and has no sand.
*
* Another pack can join the same way later: give it the same sprite ids, or point an entry here at its own id.
*/
var ART_PACK = "tiny-swords";
var ART_PACK_FREE = "tiny-swords-free";
/**
* A sprite of the game's art: from the Free Pack when it is served and has this id, else from the public pack. Null
* while a pack loads (the field draws again when it arrives) or when neither pack has the sprite.
*/
var art = (id) => {
	const free = packStatus(ART_PACK_FREE);
	if (free === "loading") return null;
	if (free === "ready") {
		const found = spriteOf(`${ART_PACK_FREE}:${id}`);
		if (found !== null) return found;
	}
	return spriteOf(`${ART_PACK}:${id}`);
};
/** A sprite of the public pack only: tilesets, whose tile numbers the code knows. */
var baseArt = (id) => spriteOf(`${ART_PACK}:${id}`);
/** The first of the clips that the sprite has, or null: the packs name some clips differently. */
var pickClip = (sprite, names) => names.find((n) => sprite.clips?.[n] !== void 0) ?? null;
/** The look of each hero. The ids stay those the app keeps for the student. */
var HERO_ART = {
	ninja: "character/warrior-blue",
	robot: "character/pawn-blue",
	rover: "character/archer-blue",
	bee: "character/warrior-purple",
	knight: "character/warrior-red",
	eskimo: "character/archer-purple",
	cavegirl: "character/pawn-red",
	woman: "character/archer-red",
	samurai: "character/archer-yellow",
	"knight-gold": "character/warrior-yellow"
};
var fighterOf = (spriteId) => spriteId.includes("archer") ? "archer" : spriteId.includes("pawn") ? "pawn" : "warrior";
var ATTACK_CLIPS = {
	warrior: {
		up: ["attack-up", "attack"],
		down: ["attack-down", "attack"],
		side: ["attack"]
	},
	archer: {
		up: ["shoot-up", "shoot"],
		down: ["shoot-down", "shoot"],
		side: ["shoot"]
	},
	pawn: {
		up: ["chop"],
		down: ["chop"],
		side: ["chop"]
	}
};
/** The clip of a hero's attack toward `dir`. */
var attackClips = (fighter, dir) => ATTACK_CLIPS[fighter][dir === "up" ? "up" : dir === "down" ? "down" : "side"];
/** A hero holding up what it took: a pawn carries it, the others just stand. */
var TAKE_CLIPS = [
	"carry-idle",
	"idle-wood",
	"idle"
];
/** Monsters of the course: goblins of the old pack in colours. */
var ENEMY_ART = {
	goblin: "enemy/goblin-torch-red",
	slime: "enemy/goblin-barrel-blue",
	skull: "enemy/goblin-torch-purple",
	flame: "enemy/goblin-tnt-red",
	bear: "enemy/goblin-torch-yellow",
	toad: "enemy/goblin-barrel-purple",
	spirit: "enemy/goblin-tnt-purple"
};
var NPC_ART = {
	grandpa: { id: "character/pawn-purple" },
	boy: {
		id: "character/pawn-blue",
		scale: .85
	},
	girl: {
		id: "character/pawn-red",
		scale: .85
	},
	villager: { id: "character/pawn-yellow" },
	hunter: { id: "character/archer-yellow" },
	kid: {
		id: "character/pawn-blue",
		scale: .7
	}
};
/** What lies on a cell to take. The ids are the old ones; the texts call them gold, mushrooms, meat, arrows, pumpkins and lambs. */
var ITEM_ART = {
	crystal: { id: "item/gold" },
	wood: { id: "item/wood" },
	apple: { id: "decor/mushroom-medium" },
	fish: { id: "item/meat" },
	key: {
		id: "weapon/arrow",
		scale: .8
	},
	campfire: { id: "item/wood" },
	carrot: {
		id: "decor/pumpkin-small",
		scale: .7
	},
	egg: {
		id: "animal/sheep",
		scale: .6
	},
	meat: { id: "item/meat" },
	gold: { id: "item/gold" }
};
/** The goal of a level: a signpost, a spring (water with stones), grandma, or home, where the cell gets the corners of a pointer. */
var FINISH_ART = {
	flag: {
		id: "decor/sign-arrow",
		scale: .8
	},
	well: null,
	grandma: { id: "character/pawn-yellow" },
	home: null
};
var POINTER_ART = "ui/pointer-select";
var WATER_ART = "tileset/water";
var SPRING_ROCKS_ART = "terrain/water-rocks-2";
var FOAM_ART = "terrain/foam";
var FIRE_ART = "effect/fire";
var DEAD_ART = "effect/dead";
var TREE_ART = "decor/tree";
/**
* Trees of the Free Pack: two firs and a birch, all swaying in the wind; in autumn the birch turns yellow. Where the
* Free Pack is not served, every tree is the fir of the public pack.
*/
var TREES = [
	"decor/tree",
	"decor/tree-2",
	"decor/tree-3",
	"decor/tree-3"
];
var AUTUMN_BIRCH = "decor/tree-4";
/** Bushes of the Free Pack that sway in the wind, in place of the still bushes of the public pack. */
var SWAYING_BUSHES = [
	"decor/bush-1",
	"decor/bush-2",
	"decor/bush-3",
	"decor/bush-4"
];
var GROUND_ART = "tileset/ground";
var BRIDGE_ART = "tileset/bridge";
var COIN_ART = "item/gold";
/** Buildings and big things, fitted to the cells the level gives them. */
var PROP_ART = {
	house: { id: "prop/house-blue" },
	woodshed: {
		id: "prop/wood-tower-yellow",
		scale: .8
	},
	appleTree: {
		id: "decor/tree",
		scale: .75
	}
};
/** What grows on a wall cell. A stump is the last frame of the tree. */
var OBSTACLE_ART = {
	bush: { id: "decor/bush-large" },
	bushRound: { id: "decor/bush-medium" },
	fern: { id: "decor/mushroom-large" },
	rock: { id: "decor/rock-large" },
	stump: {
		id: "decor/tree",
		clip: "stump",
		scale: .8
	},
	sunflower: { id: "decor/pumpkin-large" }
};
/** Small things in the meadow that do not block the way. */
var DECOR_ART = {
	petals: { id: "decor/grass-small" },
	flower: { id: "decor/mushroom-small" },
	tuft: { id: "decor/grass-large" },
	clover: { id: "decor/rock-small" },
	sprout: { id: "decor/mushroom-medium" }
};
// src/ui/ArtIcon.tsx
/**
* A picture of the game's art outside the field: a hero in the choice and the HUD, a coin, an icon of the editor.
* It shows the part of the frame where the figure is, not the empty room around it, and can play a clip.
*/
/** Kinds whose frames are wide stages for a swinging figure: they are cut around where it stands. */
var FIGURES = /* @__PURE__ */ new Set([
	"character",
	"enemy",
	"animal",
	"boss"
]);
/** The part of a figure's frame shown, in its pixels: the body without the room for a swing. */
var FIGURE_BOX = 84;
/** The square of a frame to show. */
var boxOf = (sprite, w, h) => {
	const anchor = sprite.anchor ?? [w / 2, h];
	if (FIGURES.has(sprite.category)) {
		const size = Math.min(FIGURE_BOX, w, h);
		const y = Math.min(h - size, Math.max(0, anchor[1] + 6 - size));
		return [
			Math.min(w - size, Math.max(0, anchor[0] - size / 2)),
			y,
			size
		];
	}
	const [bx, by, bw, bh] = sprite.bounds ?? [
		0,
		0,
		w,
		h
	];
	const size = Math.min(Math.max(bw, bh), Math.max(w, h));
	return [
		bx + bw / 2 - size / 2,
		by + bh / 2 - size / 2,
		size
	];
};
/** Draws a frame of the sprite into the whole canvas. False while its picture loads. */
var paint = (ctx, found, clip, now) => {
	const { pack, sprite } = found;
	const rect = (clip === null ? null : frameAt(sprite, clip, "down", now)) ?? iconFrame(sprite);
	const img = image(packFile(pack.id, rect.file));
	if (img === null) return false;
	const [bx, by, size] = boxOf(sprite, rect.w, rect.h);
	const { width, height } = ctx.canvas;
	ctx.clearRect(0, 0, width, height);
	ctx.save();
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = "high";
	if (rect.flip) {
		ctx.translate(width, 0);
		ctx.scale(-1, 1);
	}
	ctx.drawImage(img, rect.sx + bx, rect.sy + by, size, size, 0, 0, width, height);
	ctx.restore();
	return true;
};
/** Canvas pixels per CSS pixel: sharp on a dense screen without a huge canvas. */
var DENSITY = 2;
var ArtIcon = ({ id, clip, animate = false, className, size = 64 }) => {
	const ref = useRef(null);
	useEffect(() => {
		const ctx = ref.current?.getContext("2d") ?? null;
		if (ctx === null) return;
		let frame = 0;
		const draw = (now) => {
			const found = art(id);
			if (found !== null) paint(ctx, found, clip ?? restClip(found.sprite), animate ? now : 0);
			if (animate) frame = requestAnimationFrame(draw);
		};
		draw(0);
		const stop = whenLoaded(() => draw(performance.now()));
		return () => {
			cancelAnimationFrame(frame);
			stop();
		};
	}, [
		id,
		clip,
		animate
	]);
	return /* @__PURE__ */ jsx("canvas", {
		ref,
		className,
		width: size * DENSITY,
		height: size * DENSITY,
		"aria-hidden": "true"
	});
};
// src/ui/Coin.tsx
/** A bag of gold from the art pack, the size of the text around it. */
var Coin = () => /* @__PURE__ */ jsx(ArtIcon, {
	id: COIN_ART,
	className: "eb-coin",
	size: 24
});
// src/core/coins.ts
/**
* Coins: what the student earns by passing levels and spends in the shop (heroes, later the estate). Like XP, the
* coins of a level come from its best run, so replaying a level gives only the coins of new stars. All of it is pure
* functions, the same in the browser and on a server.
*/
/** Coins for any pass of a level of this tier. */
var TIER_COINS = {
	intro: 10,
	practice: 15,
	challenge: 25
};
/** Coins of one run of a level of this tier. A failed run gives none. */
var coinsFor = (tier, stars) => stars <= 0 ? 0 : TIER_COINS[tier] + Math.min(stars, 3) * 5;
/** Coins a run adds: only the part above the best earlier run of the level. */
var coinGain = (coins, bestBefore) => Math.max(0, coins - bestBefore);
// src/ui/rich-text.ts
/**
* Markup for task and hint texts. The same file is in every eduprostir trainer (edu-* repositories and
* mriya-study). Keep the copies the same; the convention is in mriya-study docs/trainer-text-markup.md.
*
*   **Створити**        name of a button, menu, field, tab or window: bold, in the accent color
*   [k]Ctrl+C[/k]       keys: each key is a keyboard key, «+» between them
*   `=SUM(A1:A3)`       text to type exactly: formula, code, name
*   [red]червоний[/red] a term in its color: red, green, blue, yellow, orange, purple
*   «Тварини»           name of a folder, file, sheet, site or other object: highlighted, the quotes stay
*
* The parser makes plain parts. It never makes HTML from the text, so a text cannot add tags or scripts.
* Markup does not nest. A mark without its end stays as plain text.
*/
var RichColors = {
	Red: "red",
	Green: "green",
	Blue: "blue",
	Yellow: "yellow",
	Orange: "orange",
	Purple: "purple"
};
var MARK = /\*\*(.+?)\*\*|\[k\](.+?)\[\/k\]|`([^`]+)`|\[(red|green|blue|yellow|orange|purple)\](.+?)\[\/\4\]|«([^«»\n]+)»/g;
var isRichColor = (value) => Object.values(RichColors).some((c) => c === value);
/** «Ctrl+Shift+S» → ["Ctrl", "Shift", "S"]; «Ctrl++» → ["Ctrl", "+"]. */
var splitKeys = (keys) => keys.split(/(?<=\S)\s*\+\s*(?=\S)/).map((k) => k.trim()).filter((k) => k !== "");
var markPart = (m) => {
	const [, ui, keys, code, color, colored, name] = m;
	if (ui !== void 0) return {
		kind: "ui",
		text: ui
	};
	if (keys !== void 0) return {
		kind: "keys",
		keys: splitKeys(keys)
	};
	if (code !== void 0) return {
		kind: "code",
		text: code
	};
	if (color !== void 0 && colored !== void 0 && isRichColor(color)) return {
		kind: "color",
		color,
		text: colored
	};
	if (name !== void 0) return {
		kind: "name",
		text: name
	};
	return {
		kind: "text",
		text: m[0]
	};
};
/** Splits a text with markup into parts. Text without markup gives one "text" part. */
var parseRich = (source) => {
	const parts = [];
	let last = 0;
	for (const m of source.matchAll(MARK)) {
		const at = m.index;
		if (at > last) parts.push({
			kind: "text",
			text: source.slice(last, at)
		});
		parts.push(markPart(m));
		last = at + m[0].length;
	}
	if (last < source.length) parts.push({
		kind: "text",
		text: source.slice(last)
	});
	return parts;
};
// src/ui/RichText.tsx
/** One part of a marked text. Class names start with `rt-`; rich-text.css gives the look. */
var Part = ({ part }) => {
	switch (part.kind) {
		case "text": return /* @__PURE__ */ jsx(Fragment$1, { children: part.text });
		case "ui": return /* @__PURE__ */ jsx("strong", {
			className: "rt-ui",
			children: part.text
		});
		case "code": return /* @__PURE__ */ jsx("code", {
			className: "rt-code",
			children: part.text
		});
		case "name": return /* @__PURE__ */ jsxs(Fragment$1, { children: [
			"«",
			/* @__PURE__ */ jsx("span", {
				className: "rt-name",
				children: part.text
			}),
			"»"
		] });
		case "color": return /* @__PURE__ */ jsx("span", {
			className: `rt-color rt-${part.color}`,
			children: part.text
		});
		case "keys": return /* @__PURE__ */ jsx("span", {
			className: "rt-keys",
			children: part.keys.map((key, i) => /* @__PURE__ */ jsxs(Fragment, { children: [i > 0 && /* @__PURE__ */ jsx("span", {
				className: "rt-plus",
				children: "+"
			}), /* @__PURE__ */ jsx("kbd", {
				className: "rt-key",
				children: key
			})] }, i))
		});
	}
};
/** Shows a task or hint text with its markup (see rich-text.ts). Never sets HTML. */
var RichText = ({ text }) => /* @__PURE__ */ jsx(Fragment$1, { children: parseRich(text).map((part, i) => /* @__PURE__ */ jsx(Part, { part }, i)) });
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
/** The XP and coins of a run and what the hero gets of them. */
var rewardOf = (level, result, firstTry, xp, coins) => {
	const tier = level.tier ?? "intro";
	const runXp = xpFor(tier, {
		stars: result.stars,
		firstTry
	});
	const gain = xpGain(runXp, xp?.best ?? 0);
	const runCoins = result.passed ? coinsFor(tier, result.stars) : 0;
	const coinsGained = coinGain(runCoins, coins?.best ?? 0);
	return {
		runXp,
		runCoins,
		reward: {
			gain,
			firstTry,
			total: xp === void 0 ? null : xp.total + gain,
			coins: coins === void 0 ? null : {
				gain: coinsGained,
				total: coins.total + coinsGained
			},
			harvest: null,
			farm: null
		}
	};
};
/** The reward of a run on a day of the estate: no XP, the coins of the harvest above the best run of the day. */
var harvestRewardOf = (harvest, estate, firstTry, xp, coins) => {
	const gain = coinGain(harvest.coins, estate.best);
	return {
		runXp: 0,
		runCoins: harvest.coins,
		reward: {
			gain: 0,
			firstTry,
			total: xp?.total ?? null,
			coins: {
				gain,
				total: (coins?.total ?? 0) + gain
			},
			harvest,
			farm: null
		}
	};
};
/** The reward of a working day of the farm: no XP and no coins, its yield goes to the barn when the app ends the day. */
var farmRewardOf = (report, firstTry, xp) => ({
	runXp: 0,
	runCoins: 0,
	reward: {
		gain: 0,
		firstTry,
		total: xp?.total ?? null,
		coins: null,
		harvest: null,
		farm: report
	}
});
/** «3 гриби», «1 гарбуз», «5 ягнят». */
var countOf$1 = (n, forms) => {
	const last = n % 10;
	const tens = n % 100;
	return `${n} ${last === 1 && tens !== 11 ? forms[0] : last >= 2 && last <= 4 && (tens < 12 || tens > 14) ? forms[1] : forms[2]}`;
};
/** What the hero gathered, as a sentence part: «3 гриби, 2 гарбузи і 1 ягня». */
var harvestText = (harvest) => {
	const parts = [
		harvest.apple > 0 ? countOf$1(harvest.apple, [
			"гриб",
			"гриби",
			"грибів"
		]) : "",
		harvest.carrot > 0 ? countOf$1(harvest.carrot, [
			"гарбуз",
			"гарбузи",
			"гарбузів"
		]) : "",
		harvest.egg > 0 ? countOf$1(harvest.egg, [
			"ягня",
			"ягняти",
			"ягнят"
		]) : ""
	].filter((p) => p !== "");
	if (parts.length === 0) return "нічого";
	return parts.length === 1 ? parts[0] ?? "" : `${parts.slice(0, -1).join(", ")} і ${parts.at(-1) ?? ""}`;
};
/** The harvest of a day and its coins, in a passed or a failed run. */
var HarvestLine = ({ reward }) => {
	if (reward.harvest === null) return null;
	const coins = reward.coins;
	return /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsxs("p", {
		className: "eb-harvest",
		children: [
			"Зібрано: ",
			/* @__PURE__ */ jsx("strong", { children: harvestText(reward.harvest) }),
			".",
			reward.harvest.full ? ` Повний день: +5.` : ""
		]
	}), coins !== null && (coins.gain > 0 ? /* @__PURE__ */ jsxs("p", {
		className: "eb-coins-won",
		children: [
			/* @__PURE__ */ jsx(Coin, {}),
			" ",
			/* @__PURE__ */ jsxs("strong", { children: [
				"+",
				coins.gain,
				" ",
				coinWord(coins.gain)
			] }),
			" · у тебе ",
			coins.total
		]
	}) : /* @__PURE__ */ jsx("p", {
		className: "eb-harvest-note",
		children: "Це не більше, ніж найкращий запуск цього дня: монет не додано."
	}))] });
};
/** The coins a passed run added, when the app keeps coins and the run beat the best one. */
var CoinLine = ({ reward }) => reward.coins === null || reward.coins.gain === 0 ? null : /* @__PURE__ */ jsxs("p", {
	className: "eb-coins-won",
	children: [
		/* @__PURE__ */ jsx(Coin, {}),
		" ",
		/* @__PURE__ */ jsxs("strong", { children: [
			"+",
			reward.coins.gain,
			" ",
			coinWord(reward.coins.gain)
		] }),
		" · у тебе ",
		reward.coins.total
	]
});
/** «монета», «монети» or «монет» for a number, as Ukrainian says it. */
var coinWord = (n) => {
	const last = n % 10;
	const tens = n % 100;
	if (last === 1 && tens !== 11) return "монета";
	if (last >= 2 && last <= 4 && (tens < 12 || tens > 14)) return "монети";
	return "монет";
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
/** On a level with several fields: which field the run failed on, before the reason. */
var fieldOf = (result) => result.fields === void 0 || result.field === void 0 ? "" : `Поле ${result.field + 1} з ${result.fields.length}. `;
/** On a level with several fields: the program passed them all. */
var allFields = (result) => result.fields === void 0 ? "" : `Програма пройшла всі ${result.fields.length} поля. `;
/** «Продовжити звідси» next to «Спробувати ще». */
var ContinueButton = ({ onContinue }) => /* @__PURE__ */ jsx("button", {
	type: "button",
	className: "eb-btn eb-btn-go",
	onClick: onContinue,
	title: "Герой лишиться тут, а ти допишеш наступний шматок програми",
	children: "Продовжити звідси →"
});
var HINTED = /* @__PURE__ */ new Set([
	"crashed",
	"trapped",
	"tired",
	"defeated",
	"goalsNotMet"
]);
/**
* A ladder of hints (`Level.hints`): the student opens one more step at a time, from a nudge to a frame with gaps.
* The step lives in the app, so it stays open across runs of the same level.
*/
var HintLadder = ({ hints, step, onMore }) => /* @__PURE__ */ jsxs("div", {
	className: "eb-hint-ladder",
	children: [hints.slice(0, step).map((hint, i) => hint.includes("\n") ? /* @__PURE__ */ jsx("pre", {
		className: "eb-hint eb-hint-code",
		"aria-label": `Підказка ${i + 1}`,
		children: hint
	}, hint) : /* @__PURE__ */ jsxs("p", {
		className: "eb-hint",
		children: [
			"Підказка ",
			i + 1,
			": ",
			/* @__PURE__ */ jsx(RichText, { text: hint })
		]
	}, hint)), step < hints.length && /* @__PURE__ */ jsxs("button", {
		type: "button",
		className: "eb-btn eb-btn-small",
		onClick: onMore,
		children: [
			step === 0 ? "Підказка" : "Ще підказка",
			" (",
			step + 1,
			" з ",
			hints.length,
			")"
		]
	})]
});
/** The result over the field: stars and XP for a pass, what went wrong and a hint for a fail. */
var Verdict = ({ level, result, reward, advice, language, onClose, onNext, onContinue, hintStep = 0, onHint, farmCapacity = 0 }) => {
	if (reward.farm !== null) return /* @__PURE__ */ jsx(FarmVerdict, {
		report: reward.farm,
		capacity: farmCapacity,
		language,
		blocks: level.blocks,
		onClose,
		onNext
	});
	if (reward.harvest !== null) return /* @__PURE__ */ jsx(HarvestVerdict, {
		result,
		reward,
		language,
		onClose,
		onNext,
		onContinue
	});
	const own = speaksTo(level, language);
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
					advice.length === 0 ? /* @__PURE__ */ jsxs("p", { children: [allFields(result), size] }) : /* @__PURE__ */ jsx(Advice, { tips: advice }),
					own && level.gift !== void 0 && /* @__PURE__ */ jsxs("p", {
						className: "eb-gift",
						children: [
							"Новий предмет: ",
							/* @__PURE__ */ jsx("strong", { children: level.gift.name }),
							". ",
							level.gift.skill
						]
					}),
					/* @__PURE__ */ jsx(XpLine, { reward }),
					/* @__PURE__ */ jsx(CoinLine, { reward }),
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
				/* @__PURE__ */ jsxs("p", { children: [fieldOf(result), failText(result, language)] }),
				/* @__PURE__ */ jsx(Advice, { tips: advice }),
				own && level.hints !== void 0 && onHint !== void 0 ? /* @__PURE__ */ jsx(HintLadder, {
					hints: level.hints,
					step: hintStep,
					onMore: onHint
				}) : level.hint !== void 0 && HINTED.has(reason) && /* @__PURE__ */ jsxs("p", {
					className: "eb-hint",
					children: ["Підказка: ", /* @__PURE__ */ jsx(RichText, { text: level.hint })]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "eb-verdict-actions",
					children: [onContinue !== void 0 && /* @__PURE__ */ jsx(ContinueButton, { onContinue }), /* @__PURE__ */ jsx("button", {
						type: "button",
						className: "eb-btn eb-btn-gold",
						onClick: onClose,
						autoFocus: true,
						children: "Спробувати ще"
					})]
				})
			]
		})
	});
};
/** The result of a day of the estate: the harvest and its coins instead of stars and XP; «Далі» starts a new day. */
var HarvestVerdict = ({ result, reward, language, onClose, onNext, onContinue }) => /* @__PURE__ */ jsx("div", {
	className: "eb-verdict-layer",
	children: /* @__PURE__ */ jsxs("div", {
		className: `eb-verdict ${result.passed ? "eb-verdict-ok" : "eb-verdict-fail"} eb-frame eb-parchment`,
		role: "dialog",
		"aria-modal": "false",
		"aria-labelledby": "eb-verdict-title",
		children: [
			/* @__PURE__ */ jsx("h3", {
				id: "eb-verdict-title",
				children: result.passed ? "День завершено!" : "Зібрано не все"
			}),
			!result.passed && /* @__PURE__ */ jsx("p", { children: failText(result, language) }),
			/* @__PURE__ */ jsx(HarvestLine, { reward }),
			!result.passed && /* @__PURE__ */ jsx("p", {
				className: "eb-hint",
				children: "Зміни програму і запусти ще раз: заплатять лише за те, що понад найкращий запуск."
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "eb-verdict-actions",
				children: [
					!result.passed && onContinue !== void 0 && /* @__PURE__ */ jsx(ContinueButton, { onContinue }),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						className: result.passed ? "eb-btn" : "eb-btn eb-btn-gold",
						onClick: onClose,
						autoFocus: onNext === void 0,
						children: result.passed ? "Ще раз" : "Спробувати ще"
					}),
					onNext !== void 0 && /* @__PURE__ */ jsx("button", {
						type: "button",
						className: "eb-btn eb-btn-go",
						onClick: onNext,
						autoFocus: true,
						children: "Новий день →"
					})
				]
			})
		]
	})
});
/** The bars of the chart: what the barn held, sampled so that the chart has at most this many bars. */
var CHART_BARS = 24;
var chartOf = (report) => {
	const totals = report.byTurn.map(totalOf);
	if (totals.length === 0) return [];
	const step = Math.max(1, Math.ceil(totals.length / CHART_BARS));
	return Array.from({ length: Math.ceil(totals.length / step) }, (_, i) => totals[Math.min(totals.length - 1, (i + 1) * step - 1)] ?? 0);
};
/** The report of a working day: what went to the barn, the turns spent for nothing, the chart and what to improve. */
/** «9 колод, 2 гарбузи»: what one worker brought to the barn. */
var crewYield = (report) => {
	const brought = RESOURCES.filter((r) => report.stored[r] > 0).map((r) => amountText(r, report.stored[r]));
	return brought.length === 0 ? "нічого не приніс" : brought.join(", ");
};
var FarmVerdict = ({ report, capacity, language, blocks, onClose, onNext }) => {
	const bars = chartOf(report);
	const top = Math.max(1, ...bars);
	const tips = farmTips(report, capacity, language, blocks);
	const failed = report.stopped === "badProgram" || report.stopped === "noStart" || report.stopped === "tooLong";
	return /* @__PURE__ */ jsx("div", {
		className: "eb-verdict-layer",
		children: /* @__PURE__ */ jsxs("div", {
			className: "eb-verdict eb-verdict-ok eb-farm-report eb-frame eb-parchment",
			role: "dialog",
			"aria-modal": "false",
			"aria-labelledby": "eb-verdict-title",
			children: [
				/* @__PURE__ */ jsxs("h3", {
					id: "eb-verdict-title",
					children: ["Звіт дня ", report.day]
				}),
				failed && /* @__PURE__ */ jsx("p", { children: report.detail === void 0 ? FAIL_TEXT[report.stopped ?? "badProgram"] : report.line === void 0 ? report.detail : `Рядок ${report.line}: ${report.detail}` }),
				/* @__PURE__ */ jsxs("dl", {
					className: "eb-farm-tiles",
					children: [
						RESOURCES.filter((r) => r === "wood" || r === "pumpkin" || report.stored[r] > 0).map((r) => /* @__PURE__ */ jsxs("div", {
							className: "eb-farm-tile",
							children: [/* @__PURE__ */ jsx("dd", { children: report.stored[r] }), /* @__PURE__ */ jsxs("dt", { children: [RESOURCE_NAMES[r], " у коморі"] })]
						}, r)),
						/* @__PURE__ */ jsxs("div", {
							className: "eb-farm-tile",
							children: [/* @__PURE__ */ jsx("dd", { children: report.idle }), /* @__PURE__ */ jsx("dt", { children: "ходів дарма" })]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "eb-farm-tile",
							children: [/* @__PURE__ */ jsx("dd", { children: totalOf(report.carried) }), /* @__PURE__ */ jsx("dt", { children: "лишилось у руках" })]
						}),
						report.goblins > 0 && /* @__PURE__ */ jsxs("div", {
							className: "eb-farm-tile",
							children: [/* @__PURE__ */ jsxs("dd", { children: [
								report.beaten,
								" з ",
								report.goblins
							] }), /* @__PURE__ */ jsx("dt", { children: "гоблінів прогнано" })]
						})
					]
				}),
				bars.length > 0 && /* @__PURE__ */ jsxs("figure", {
					className: "eb-farm-chart",
					children: [/* @__PURE__ */ jsx("div", {
						className: "eb-farm-bars",
						"aria-hidden": "true",
						children: bars.map((b, i) => /* @__PURE__ */ jsx("span", { style: { height: `${Math.round(b / top * 100)}%` } }, i))
					}), /* @__PURE__ */ jsxs("figcaption", { children: [
						"Усе в коморі за день: ",
						totalOf(report.stored),
						" за ",
						report.used,
						" з ",
						report.turns,
						" ходів."
					] })]
				}),
				(report.workers ?? []).length > 1 && /* @__PURE__ */ jsx("ul", {
					className: "eb-farm-crew",
					"aria-label": "Що приніс кожен",
					children: (report.workers ?? []).map((w, i) => /* @__PURE__ */ jsxs("li", { children: [
						/* @__PURE__ */ jsxs("b", { children: [i === 0 ? "Робітник" : "Тарас", ":"] }),
						" ",
						crewYield(w),
						w.stopped === "crashed" && `, урізався в паркан і простояв до вечора`
					] }, i))
				}),
				tips.map((t) => /* @__PURE__ */ jsx("p", {
					className: "eb-hint",
					children: t
				}, t)),
				/* @__PURE__ */ jsxs("div", {
					className: "eb-verdict-actions",
					children: [/* @__PURE__ */ jsx("button", {
						type: "button",
						className: onNext === void 0 ? "eb-btn eb-btn-gold" : "eb-btn",
						onClick: onClose,
						autoFocus: onNext === void 0,
						children: "Змінити програму"
					}), onNext !== void 0 && /* @__PURE__ */ jsx("button", {
						type: "button",
						className: "eb-btn eb-btn-go",
						onClick: onNext,
						autoFocus: true,
						children: "Завершити день →"
					})]
				})
			]
		})
	});
};
// src/ui/HeroPicker.tsx
/** A hero that can be played breathes in place; a locked one stands as a still shadow. */
var HeroSprite = ({ skin, walking }) => /* @__PURE__ */ jsx(ArtIcon, {
	id: HERO_ART[skin],
	animate: walking && !reducedMotion(),
	className: "eb-hero-sprite",
	size: 64
});
/** Whether the viewer asked for less motion. */
var reducedMotion = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var stateOf = (hero, skin, heroLevel, owned, shop) => {
	if (hero.id === skin) return { kind: "chosen" };
	if (heroOpen(hero, heroLevel, owned)) return { kind: "open" };
	if (hero.price === void 0 || heroLevel < hero.heroLevel) return {
		kind: "locked",
		heroLevel: hero.heroLevel
	};
	if (shop !== null && canBuyHero(hero, heroLevel, owned, shop.coins)) return {
		kind: "buy",
		price: hero.price
	};
	return {
		kind: "short",
		price: hero.price,
		missing: hero.price - (shop?.coins ?? 0)
	};
};
var labelOf = (state) => {
	switch (state.kind) {
		case "chosen": return "Обрано";
		case "open": return "Обрати";
		case "buy": return `Купити за ${state.price}`;
		case "short": return `Бракує ${state.missing} ${coinWord(state.missing)}`;
		case "locked": return `Відкриється на рівні ${state.heroLevel}`;
	}
};
var CARD_CLASS = {
	chosen: "eb-hero-card eb-hero-card-on",
	open: "eb-hero-card",
	buy: "eb-hero-card eb-hero-card-sale",
	short: "eb-hero-card eb-hero-card-short",
	locked: "eb-hero-card eb-hero-card-locked"
};
/**
* The choice of the hero, over the game: every hero with its look, name and a line about it. A hero that the hero
* level has not opened yet shows as a shadow with the level it opens at. With a shop, heroes with a price show it:
* the student buys one with the coins and plays it at once. Without a shop those heroes are not offered.
*/
var HeroPicker = ({ skin, heroLevel, owned, shop, onPick, onClose }) => {
	const chosenRef = useRef(null);
	useEffect(() => {
		chosenRef.current?.focus();
		const onKey = (e) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);
	const offered = HEROES.filter((h) => h.price === void 0 || shop !== null || owned.includes(h.id));
	return /* @__PURE__ */ jsx("div", {
		className: "eb-picker-layer",
		onClick: (e) => e.target === e.currentTarget && onClose(),
		children: /* @__PURE__ */ jsxs("div", {
			className: "eb-picker eb-frame eb-parchment",
			role: "dialog",
			"aria-modal": "true",
			"aria-labelledby": "eb-picker-title",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "eb-picker-head",
				children: [
					/* @__PURE__ */ jsx("h3", {
						id: "eb-picker-title",
						children: shop === null ? "Обери героя" : "Герої та крамниця"
					}),
					shop !== null && /* @__PURE__ */ jsxs("p", {
						className: "eb-picker-coins",
						"aria-label": `У тебе ${shop.coins} ${coinWord(shop.coins)}`,
						children: [
							/* @__PURE__ */ jsx(Coin, {}),
							" ",
							shop.coins
						]
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						className: "eb-btn eb-btn-small",
						onClick: onClose,
						"aria-label": "Закрити",
						children: "✕"
					})
				]
			}), /* @__PURE__ */ jsx("ul", {
				className: "eb-picker-list",
				children: offered.map((hero) => {
					const state = stateOf(hero, skin, heroLevel, owned, shop);
					const usable = state.kind === "chosen" || state.kind === "open" || state.kind === "buy";
					return /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs("button", {
						ref: state.kind === "chosen" ? chosenRef : void 0,
						type: "button",
						className: CARD_CLASS[state.kind],
						disabled: !usable,
						"aria-pressed": state.kind === "chosen",
						onClick: () => {
							if (state.kind === "buy") shop?.onBuy(hero.id);
							onPick(hero.id);
							onClose();
						},
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "eb-hero-stage",
								children: /* @__PURE__ */ jsx(HeroSprite, {
									skin: hero.id,
									walking: usable
								})
							}),
							/* @__PURE__ */ jsx("span", {
								className: "eb-hero-name",
								children: hero.name
							}),
							/* @__PURE__ */ jsx("span", {
								className: "eb-hero-about",
								children: hero.about
							}),
							hero.price !== void 0 && !owned.includes(hero.id) && /* @__PURE__ */ jsxs("span", {
								className: "eb-hero-price",
								children: [
									/* @__PURE__ */ jsx(Coin, {}),
									" ",
									hero.price
								]
							}),
							/* @__PURE__ */ jsx("span", {
								className: "eb-hero-state",
								children: labelOf(state)
							})
						]
					}) }, hero.id);
				})
			})]
		})
	});
};
// src/levels/index.ts
/**
* The course in the order a student plays it, chapter by chapter (see `chapters.ts`): steps and turns, loops,
* branches, the loop with a condition, traps and few steps, enemies, the counter and custom blocks (functions). In each chapter a new idea comes first,
* then practice, then a challenge. The ids keep their old grade prefix: saved progress refers to them.
* Together they tell one story, **Рік у селі**, from autumn through winter and spring to summer: each level gives the
* hero a reason to go somewhere.
* The reference solution of each level is in `solutions.ts`.
*/
/** The hero's house: its door opens onto the start cell (1, 1) of a level. */
var HOME$1 = {
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
		hint: "Порахуй клітинки до дров: стільки разів потрібен блок **крок уперед**.",
		hints: [
			"Скільки клітинок від героя до дров?",
			"Кожен **крок уперед** — це одна клітинка. Коли герой стоїть на дровах, постав **взяти**.",
			"крок уперед\nкрок уперед\n_\n_\nвзяти"
		],
		gift: {
			name: "Чоботи мандрівника",
			skill: "**крок уперед** і **взяти**: герой ходить і бере речі."
		},
		scene: {
			theme: "autumn",
			item: "wood",
			props: [HOME$1, {
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
		hint: "Герой повертається на місці. Після повороту він іде туди, куди дивиться.",
		hints: [
			"Куди треба повернути на розі: праворуч чи ліворуч?",
			"Іди до рогу, поверни праворуч, спустись униз і візьми дрова.",
			"крок уперед\nкрок уперед\nповорот _\n_\n_\nвзяти"
		],
		gift: {
			name: "Компас",
			skill: "**поворот ліворуч** і **поворот праворуч**: герой повертає."
		},
		scene: {
			theme: "autumn",
			item: "wood",
			props: [HOME$1, {
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
		hints: [
			"Де стежка звертає? Скільки кроків до цього місця?",
			"Іди до рогу, там поверни ліворуч і йди вгору до хати.",
			"крок уперед\nкрок уперед\nповорот _\n_\n_"
		],
		scene: {
			theme: "autumn",
			finish: "home",
			props: [{
				kind: "house",
				x: 1.5,
				y: -2
			}]
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
		hints: [
			"Яке поліно ближче? Почни з нього.",
			"Візьми перше поліно, дійди до кінця стежки, поверни праворуч і спустись до другого.",
			"крок уперед\nкрок уперед\nвзяти\nкрок уперед\n_\n_\nповорот _\n_\n_\nвзяти"
		],
		scene: {
			theme: "autumn",
			item: "wood",
			props: [HOME$1, {
				kind: "woodshed",
				x: 6,
				y: -1
			}]
		}
	},
	{
		id: "g3-finish",
		tier: "practice",
		title: "До джерела",
		task: ["Піч розгорілась, у хаті тепло.", "Тепер треба води на чай. Дійди до джерела."],
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
		hint: "Перед кожним поворотом подумай, куди дивиться герой: праворуч для нього — це його права рука.",
		hints: [
			"Куди дивиться герой після кожного повороту?",
			"Крок, поворот праворуч і вниз; потім поворот ліворуч і до джерела. Праворуч і ліворуч рахуй від героя, а не від себе.",
			"крок уперед\nповорот праворуч\nкрок уперед\n_\nповорот _\n_\n_\n_"
		],
		scene: {
			theme: "autumn",
			finish: "well",
			props: [HOME$1]
		}
	},
	{
		id: "g3-zigzag",
		tier: "challenge",
		title: "Звивиста стежка",
		task: ["Друзі кличуть стрибати в купі листя.", "Стежка петляє між кущами: то вниз, то вправо. Не зійди зі стежки."],
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
		hints: [
			"Подивись на стежку: які кроки й повороти йдуть по черзі?",
			"Стежка — це сходинки: крок, праворуч, крок, ліворуч. Так тричі, а в кінці ще крок.",
			"крок уперед\nповорот праворуч\nкрок уперед\nповорот ліворуч\n_ (ще двічі те саме)\nкрок уперед"
		],
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
		task: ["Дідусь рубає дрова в лісі й поставив там дерев'яний вказівник.", "Дорога пряма, але довга. Скільки кроків? Поклади **крок уперед** у **повторити**."],
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
		hint: "Порахуй клітинки до вказівника і впиши це число в **повторити**.",
		hints: [
			"Скільки клітинок до вказівника?",
			"Поклади один **крок уперед** у **повторити** і впиши туди кількість кроків.",
			"повторити _ разів\n   крок уперед"
		],
		gift: {
			name: "Барабан",
			skill: "**повторити**: герой робить те саме кілька разів."
		},
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
		title: "Гриби для пирога",
		task: ["Бабуся пече пиріг із грибами. З кошика на дорогу висипались п'ять грибів — збери їх.", "Спробуй блок **повторити**: так програма буде коротшою."],
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
		hint: "Знайди дії, які повторюються: **крок, крок, взяти**. Поклади їх у **повторити**.",
		hints: [
			"Що герой робить біля кожного гриба?",
			"Два кроки й **взяти** — це одна порція. Скільки грибів, стільки разів її і повтори.",
			"повторити _ разів\n   крок уперед\n   _\n   взяти"
		],
		scene: {
			theme: "autumn",
			item: "apple",
			props: [HOME$1]
		}
	},
	{
		id: "g4-corner",
		tier: "practice",
		title: "Хата лісника",
		task: ["Лісник залишив дрова біля своєї хати.", "Іди вздовж лісу, поверни праворуч і спустись до дров. Тут знадобиться два **повторити**."],
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
		hint: "Один **повторити** для кроків праворуч, поворот, і другий **повторити** для кроків униз.",
		hints: [
			"Скільки кроків праворуч до повороту і скільки вниз?",
			"Два **повторити**: один для кроків праворуч, другий для кроків униз. Між ними поворот.",
			"повторити _ разів\n   крок уперед\nповорот праворуч\nповторити _ разів\n   _\nвзяти"
		],
		scene: {
			theme: "autumn",
			item: "wood",
			props: [{
				kind: "house",
				x: 3,
				y: 2
			}],
			npcs: [{
				who: "hunter",
				x: 6,
				y: 5
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
		hint: "Одна сходинка — це **крок, ліворуч, крок, праворуч**. Скільки сходинок?",
		hints: [
			"Скільки сходинок до бабусиної хати?",
			"Одна сходинка: крок, ліворуч, крок, праворуч. Поклади її в **повторити**.",
			"повторити _ разів\n   крок уперед\n   поворот ліворуч\n   _\n   _"
		],
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
		task: ["Друзі поставили вказівник біля великої гірки, а до неї веде довга стежка між кучугурами.", "Знайди, що повторюється, і зроби програму короткою."],
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
		hint: "Одна сходинка — **крок, праворуч, крок, ліворуч**. Скільки їх до гірки?",
		hints: [
			"Що повторюється на стежці між кучугурами?",
			"Сходинка: крок, праворуч, крок, ліворуч. Повтори її, а після циклу зроби ще один крок.",
			"повторити _ разів\n   крок уперед\n   поворот праворуч\n   _\n   _\nкрок уперед"
		],
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
		id: "b-loop",
		tier: "practice",
		title: "Зламаний робот: вогнища",
		task: ["Дідусь змайстрував робота, щоб той розпалював вогнища вздовж стежки. Але одне вогнище лишилося холодним.", "Програма робота вже в редакторі. Запусти її, знайди помилку й виправ."],
		map: [
			"##############",
			"#S.c.c.c.c.c.c#",
			"##############"
		],
		blocks: [
			"move",
			"collect",
			"repeat"
		],
		goals: [{ type: "crystals" }],
		stars: {
			three: 4,
			two: 6
		},
		hint: "Порахуй вогнища на стежці. А тепер порахуй, скільки разів повторює робот.",
		hints: [
			"Котре вогнище лишилося холодним: перше чи останнє?",
			"Робот робить усе правильно, але повторює на один раз менше, ніж треба. Порахуй вогнища.",
			"повторити _ разів\n   крок уперед\n   крок уперед\n   розпалити"
		],
		scene: {
			theme: "winter",
			item: "campfire"
		},
		broken: { steps: [{
			repeat: 5,
			body: [
				"move",
				"move",
				"collect"
			]
		}] }
	},
	{
		id: "g6-nested",
		tier: "practice",
		title: "Вогнища на ніч",
		task: ["Сутеніє, у лісі виють вовки.", "Обійди двір і розпали вогнища в його кутах блоком **розпалити**. Використай цикл у циклі."],
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
		hint: "Одна сторона двору — це три кроки, **розпалити** і поворот. Повтори сторону кілька разів.",
		hints: [
			"Що герой робить на одній стороні двору?",
			"Одна сторона: три кроки, **розпалити**, поворот праворуч. Сторін чотири, тож повтори сторону ще одним **повторити**.",
			"повторити _ разів\n   повторити _ разів\n      крок уперед\n   розпалити\n   поворот _"
		],
		scene: {
			theme: "winter",
			item: "campfire",
			props: [HOME$1]
		}
	},
	{
		id: "g4-if",
		tier: "intro",
		title: "Запаси на ставку",
		task: ["Мисливці лишили на замерзлому ставку запаси м'яса для бабусі, але не всюди.", "Пройди ставком і бери блоком **взяти** лише там, де лежить м'ясо."],
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
		hint: "У **повторити** зроби крок, а потім перевір: **якщо тут щось є? то взяти**.",
		hints: [
			"Що буде, якщо **взяти** там, де нічого немає? А на другому полі м'ясо лежить інакше.",
			"Після кожного кроку спитай **тут щось є?** і бери лише тоді. Так програма підійде обом полям.",
			"повторити _ разів\n   крок уперед\n   якщо <тут щось є?> то\n      _"
		],
		gift: {
			name: "Ліхтарик",
			skill: "**якщо … то** і **тут щось є?**: герой дивиться під ноги, перш ніж брати."
		},
		scene: {
			theme: "winter",
			ground: "ice",
			item: "fish"
		},
		fields: [{ map: [
			"###########",
			"#Sc...c.c.#",
			"###########"
		] }, { map: [
			"###########",
			"#S..cc.cc.#",
			"###########"
		] }]
	},
	{
		id: "g4-fence",
		tier: "practice",
		title: "Дрова біля дровітні",
		task: ["Дрова попадали з воза на стежку біля дровітні, але не всюди.", "Іди стежкою й бери поліно лише там, де воно є."],
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
		hint: "У кожному **повторити**: крок, а потім **якщо тут щось є? то взяти**.",
		hints: [
			"Стежка має поворот. Скільки кроків до нього і скільки після?",
			"Два **повторити**, у кожному крок і **якщо тут щось є? то взяти**. Між ними поворот праворуч.",
			"повторити _ разів\n   крок уперед\n   якщо <тут щось є?> то взяти\nповорот праворуч\nповторити _ разів\n   _"
		],
		scene: {
			theme: "winter",
			item: "wood",
			props: [{
				kind: "woodshed",
				x: 3,
				y: -1
			}]
		},
		fields: [{ map: [
			"#########",
			"#S.c.c...#",
			"#######c#",
			"#######.#",
			"#######c#",
			"#######.#",
			"#########"
		] }, { map: [
			"#########",
			"#Sc....c#",
			"#######.#",
			"#######c#",
			"#######c#",
			"#######c#",
			"#########"
		] }]
	},
	{
		id: "g5-snake",
		tier: "intro",
		title: "Навколо гаю",
		task: ["Гай замело снігом, тож додому треба йти стежкою навколо нього.", "Повторюй: якщо попереду стіна — поверни праворуч, інакше зроби крок."],
		map: [
			"########",
			"#.....F#",
			"#.######",
			"#.....S#",
			"########"
		],
		dir: "left",
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
		hint: "Блок **якщо… то… інакше** сам вирішує, що робити: повернути чи йти. Залишилось порахувати, скільки разів повторити.",
		hints: [
			"Коли герой має повертати, а коли йти?",
			"Один блок **якщо попереду стіна? то поворот, інакше крок** у **повторити**. Лишилося підібрати число.",
			"повторити _ разів\n   якщо <попереду стіна?> то\n      _\n   інакше\n      _"
		],
		gift: {
			name: "Підзорна труба",
			skill: "**якщо … то … інакше** і **попереду стіна?**: герой бачить, що попереду, і вибирає."
		},
		scene: {
			theme: "winter",
			finish: "home",
			props: [{
				kind: "house",
				x: 4.5,
				y: -2
			}]
		},
		fields: [{
			map: [
				"#######",
				"#....F#",
				"#.#####",
				"#.#####",
				"#.#####",
				"#....S#",
				"#######"
			],
			scene: {
				theme: "winter",
				finish: "home",
				props: [{
					kind: "house",
					x: 3.5,
					y: -2
				}]
			}
		}, {
			map: [
				"#########",
				"#....F###",
				"#.#######",
				"#......S#",
				"#########"
			],
			scene: {
				theme: "winter",
				finish: "home",
				props: [{
					kind: "house",
					x: 3.5,
					y: -2
				}]
			}
		}]
	},
	{
		id: "b-branch",
		tier: "practice",
		title: "Зламаний робот: до джерела",
		task: ["Робот мав дійти стежкою до джерела. Але щойно вийшов із двору, як урізався в кучугуру.", "Програма вже в редакторі. Подивись, що робот робить, коли попереду стіна, і виправ."],
		map: [
			"#######",
			"#S....#",
			"#####.#",
			"#####.#",
			"#F....#",
			"#######"
		],
		blocks: [
			"move",
			"turnRight",
			"repeat",
			"ifElse",
			"wallAhead"
		],
		goals: [{ type: "finish" }],
		stars: {
			three: 5,
			two: 7
		},
		hint: "Що треба робити, коли попереду стіна: йти чи повернути? А що робить робот?",
		hints: [
			"Подивись, що робить робот, коли перед ним стіна.",
			"У **якщо попереду стіна?** гілки переплутані: біля стіни треба повертати, а без неї йти.",
			"повторити … разів\n   якщо <попереду стіна?> то\n      _\n   інакше\n      _"
		],
		scene: {
			theme: "winter",
			finish: "well"
		},
		broken: { steps: [{
			repeat: 13,
			body: [{
				if: "wallAhead",
				then: ["move"],
				else: ["turnRight"]
			}]
		}] }
	},
	{
		id: "g4-until",
		tier: "practice",
		title: "Довгий міст",
		task: ["Лучникам на вежі бракує стріл, а одна стріла лежить на тому боці довгого мосту.", "Іди мостом, доки попереду не скінчиться міст, і візьми стрілу."],
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
		hint: "Блок **повторити до попереду стіна?** сам зупиниться в кінці мосту.",
		hints: [
			"Чи знаєш ти, скільки кроків на кожному полі?",
			"Мости різної довжини. **Повторити до попереду стіна?** сам зупинить героя в кінці мосту.",
			"повторити до <_>\n   крок уперед\n_"
		],
		gift: {
			name: "Пісочний годинник",
			skill: "**повторити до**: герой повторює, доки умова не стане правдою."
		},
		scene: {
			theme: "winter",
			ground: "bridge",
			item: "key"
		},
		fields: [{ map: [
			"########",
			"#S....c#",
			"########"
		] }, { map: [
			"##############",
			"#S..........c#",
			"##############"
		] }]
	},
	{
		id: "b-until",
		tier: "practice",
		title: "Зламаний робот: дрова",
		task: ["Робот мав дійти до кінця стежки й узяти дрова. А він навіть не зрушив з місця.", "Програма вже в редакторі. Прочитай умову циклу **повторити до** уголос і знайди помилку."],
		map: [
			"##########",
			"#S.......c#",
			"##########"
		],
		blocks: [
			"move",
			"collect",
			"repeatUntil",
			"wallAhead",
			"not"
		],
		goals: [{ type: "crystals" }],
		stars: {
			three: 4,
			two: 6
		},
		hint: "**Повторити до** повторює, ДОКИ умова не стане правдою. Коли має зупинитися робот?",
		hints: [
			"Прочитай умову циклу вголос. Чи правда вона вже на старті?",
			"**Повторити до** зупиняється, щойно умова стане правдою. Робот має йти, доки попереду не стіна, тож **не** тут зайве.",
			"повторити до <_>\n   крок уперед\nвзяти"
		],
		scene: {
			theme: "winter",
			item: "wood"
		},
		broken: { steps: [{
			until: { not: "wallAhead" },
			body: ["move"]
		}, "collect"] },
		fields: [{ map: [
			"######",
			"#S..c#",
			"######"
		] }, { map: [
			"#############",
			"#S..........c#",
			"#############"
		] }]
	},
	{
		id: "g5-bridge",
		tier: "practice",
		title: "Міст із поворотом",
		task: ["Ще одна стріла лежить за мостом, що повертає.", "Іди, доки попереду не стіна, поверни — і знову іди до кінця."],
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
		hint: "Два блоки **повторити до попереду стіна?**, а між ними поворот праворуч.",
		hints: [
			"Скільки разів міст змінює напрям?",
			"Іди до стіни, поверни праворуч і знову йди до стіни. Потім візьми стрілу.",
			"повторити до <попереду стіна?>\n   крок уперед\nповорот _\nповторити до <_>\n   _\nвзяти"
		],
		scene: {
			theme: "winter",
			ground: "bridge",
			item: "key"
		},
		fields: [{ map: [
			"########",
			"#S.....#",
			"######.#",
			"######c#",
			"########"
		] }, { map: [
			"#######",
			"#S...##",
			"####.##",
			"####.##",
			"####.##",
			"####c##",
			"#######"
		] }]
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
		hint: "**Повторити до на меті?**, а всередині: крок і **якщо тут щось є? то взяти**.",
		hints: [
			"Коли герой має зупинитися? А коли брати дрова?",
			"Повторюй до **дійшов до мети?**, а в циклі зроби крок і **якщо тут щось є? то взяти**.",
			"повторити до <_>\n   крок уперед\n   якщо <_> то\n      взяти"
		],
		scene: {
			theme: "winter",
			item: "wood",
			finish: "home",
			props: [{
				kind: "house",
				x: 9.5,
				y: -2
			}]
		},
		fields: [{
			map: [
				"##########",
				"#Sc..c..F#",
				"##########"
			],
			scene: {
				theme: "winter",
				item: "wood",
				finish: "home",
				props: [{
					kind: "house",
					x: 6.5,
					y: -2
				}]
			}
		}, {
			map: [
				"###############",
				"#S.cc...c.c.cF#",
				"###############"
			],
			scene: {
				theme: "winter",
				item: "wood",
				finish: "home",
				props: [{
					kind: "house",
					x: 11.5,
					y: -2
				}]
			}
		}]
	},
	{
		id: "g6-spiral",
		tier: "practice",
		title: "Сніжний равлик",
		task: ["Діти протоптали в снігу стежку-равлика, а в її серці поставили вказівник.", "Стежка закручується праворуч. Склади правило, яке приведе до центру."],
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
		hints: [
			"Що робити, коли попереду стіна? А коли її немає?",
			"Повторюй до **дійшов до мети?**. Усередині: якщо попереду стіна, то поворот праворуч, інакше крок.",
			"повторити до <дійшов до мети?>\n   якщо <_> то\n      _\n   інакше\n      _"
		],
		scene: { theme: "winter" },
		fields: [{ map: [
			"#######",
			"#S....#",
			"#####.#",
			"#F..#.#",
			"#.###.#",
			"#.....#",
			"#######"
		] }, { map: [
			"##########",
			"#S.......#",
			"########.#",
			"#....F#..#",
			"#.######.#",
			"#........#",
			"##########"
		] }]
	},
	{
		id: "g6-maze",
		tier: "challenge",
		title: "Заметіль",
		task: ["Почалася заметіль, нічого не видно.", "Програма має сама вирішувати, коли повертати, і привести героя додому."],
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
		hints: [
			"У який бік повертати біля стіни, щоб стежка вела далі?",
			"Правило те саме, що в равлику, але подумай, у який бік тут звертає стежка.",
			"повторити до <дійшов до мети?>\n   якщо <попереду стіна?> то\n      поворот _\n   інакше\n      _"
		],
		scene: {
			theme: "winter",
			finish: "home",
			props: [HOME$1]
		},
		fields: [{ map: [
			"#########",
			"#F.....##",
			"######.##",
			"######.##",
			"#S.....##",
			"#########"
		] }, {
			map: [
				"########",
				"#F.....#",
				"######.#",
				"##.S##.#",
				"##.###.#",
				"##.....#",
				"########"
			],
			dir: "left"
		}]
	},
	{
		id: "l-mill",
		tier: "intro",
		title: "До млина",
		task: ["Бабуся меле зерно на млині за ставком. Стежка по льоду звертає праворуч, коли попереду стіна або ополонка.", "Склади одну умову з блоком **або**: **попереду стіна? або попереду пастка?**."],
		map: [
			"#########",
			"#S....x##",
			"#####.###",
			"#####.###",
			"#F....###",
			"#########"
		],
		blocks: [
			"move",
			"turnRight",
			"repeatUntil",
			"ifElse",
			"or",
			"wallAhead",
			"trapAhead",
			"atFinish"
		],
		goals: [{ type: "finish" }],
		stars: {
			three: 8,
			two: 10
		},
		hint: "Повторюй до мети: якщо (попереду стіна? або попереду пастка?), то поверни праворуч, інакше крок.",
		hints: [
			"Перед чим герой має повертати? Таких речей дві.",
			"Склади одну умову **попереду стіна? або попереду пастка?** і встав її в **якщо**.",
			"повторити до <дійшов до мети?>\n   якщо <<_> або <_>> то\n      поворот праворуч\n   інакше\n      крок уперед"
		],
		gift: {
			name: "Терези",
			skill: "**або** і **попереду пастка?**: умова з двох частин, і герой бачить тонкий лід."
		},
		scene: {
			theme: "winter",
			ground: "ice",
			finish: "grandma"
		},
		fields: [{ map: [
			"########",
			"#S...###",
			"##F#.###",
			"##.#.###",
			"#x...###",
			"########"
		] }]
	},
	{
		id: "l-fish",
		tier: "practice",
		title: "М'ясо біля берега",
		task: ["Мисливці склали м'ясо вздовж берега, шматок за шматком. Збери все, а де воно скінчиться, поверни праворуч до бабусі.", "Тут немає **якщо**. Повторюй, доки під тобою НЕ скінчиться м'ясо: для цього є блок **не**."],
		map: [
			"########",
			"#Sccc.##",
			"#####.##",
			"#####.##",
			"#####F##",
			"########"
		],
		blocks: [
			"move",
			"turnRight",
			"collect",
			"repeatUntil",
			"not",
			"onCrystal",
			"atFinish"
		],
		goals: [{ type: "crystals" }, { type: "finish" }],
		stars: {
			three: 10,
			two: 13
		},
		hint: "Крок до першого шматка, потім **повторити до (не тут щось є?)**: взяти й крок. Далі поверни й іди до бабусі.",
		hints: [
			"Де починається м'ясо і де закінчується?",
			"Зроби крок до першого шматка. Повторюй **взяти, крок**, доки під тобою не скінчиться м'ясо, тоді йди до бабусі.",
			"крок уперед\nповторити до <не <_>>\n   взяти\n   крок уперед\nповорот праворуч\nповторити до <_>\n   _"
		],
		scene: {
			theme: "winter",
			ground: "ice",
			item: "fish",
			finish: "grandma"
		},
		fields: [{ map: [
			"##########",
			"#Sccccc.##",
			"#######.##",
			"#######F##",
			"##########"
		] }, { map: [
			"#######",
			"#Scc.##",
			"####.##",
			"####.##",
			"####.##",
			"####F##",
			"#######"
		] }]
	},
	{
		id: "l-drift",
		tier: "challenge",
		title: "Хата в заметі",
		task: ["Хату замело, і додому лишився шлях замерзлим ставком між кучугурами й ополонками. Тут є лише **якщо… то**, без **інакше**.", "Іди, якщо попереду не стіна і не ополонка. Повертай праворуч, якщо попереду стіна або ополонка."],
		map: [
			"##########",
			"#S......x#",
			"#######.##",
			"#######.##",
			"#######.##",
			"##F.....##",
			"##########"
		],
		blocks: [
			"move",
			"turnRight",
			"repeatUntil",
			"if",
			"and",
			"or",
			"not",
			"wallAhead",
			"trapAhead",
			"atFinish"
		],
		goals: [{ type: "finish" }],
		stars: {
			three: 14,
			two: 18
		},
		hint: "У **повторити до мети** два **якщо**: (не стіна і не пастка) — крок; (стіна або пастка) — поворот праворуч.",
		hints: [
			"Коли герою можна йти? А коли треба повернути?",
			"Два **якщо** в циклі: якщо не стіна і не пастка, то крок; якщо стіна або пастка, то поворот праворуч.",
			"повторити до <дійшов до мети?>\n   якщо <<не <попереду стіна?>> і <не <_>>> то\n      крок уперед\n   якщо <<_> або <_>> то\n      _"
		],
		scene: {
			theme: "winter",
			ground: "ice",
			finish: "home",
			props: [{
				kind: "house",
				x: .5,
				y: 2
			}]
		},
		fields: [{ map: [
			"#########",
			"#S....###",
			"#####.###",
			"#####.###",
			"#####.###",
			"##F...###",
			"#####x###",
			"#########"
		] }, {
			map: [
				"##########",
				"#S......x#",
				"#######.##",
				"#######.##",
				"#######.##",
				"###F###.##",
				"###.###.##",
				"##x.....##",
				"##########"
			],
			scene: {
				theme: "winter",
				ground: "ice",
				finish: "home",
				props: [{
					kind: "house",
					x: 1.5,
					y: 2
				}]
			}
		}]
	},
	{
		id: "s-woodshed",
		tier: "intro",
		title: "Дрова в дровітню",
		task: ["Узимку дрова мокнуть під снігом. Їх треба занести в дровітню.", "Візьми обидва поліна, дійди до дровітні й віднеси їх на склад."],
		map: [
			"########",
			"#S.c.cH#",
			"########"
		],
		blocks: [
			"move",
			"collect",
			"store"
		],
		goals: [{ type: "store" }],
		stars: {
			three: 8,
			two: 10
		},
		hint: "**Віднести на склад** працює лише тоді, коли герой стоїть на складі, тобто на останній клітинці.",
		hints: [
			"Де склад? Скільки кроків до кожного поліна і до складу?",
			"Збери обидва поліна дорогою, а **віднести на склад** постав, коли герой стоїть на складі.",
			"крок уперед\nкрок уперед\nвзяти\n_\n_\nвзяти\nкрок уперед\n_"
		],
		gift: {
			name: "Кошик",
			skill: "**віднести на склад**: герой носить речі на склад."
		},
		scene: {
			theme: "winter",
			item: "wood",
			props: [{
				kind: "woodshed",
				x: 5.5,
				y: -1
			}]
		}
	},
	{
		id: "s-two-hands",
		tier: "practice",
		title: "Лише дві руки",
		task: ["Під парканом три поліна, а ніндзя може нести лише два за раз.", "Принеси два, віднеси їх на склад, тоді повернись по третє."],
		map: [
			"#######",
			"#HSccc#",
			"#######"
		],
		capacity: 2,
		blocks: [
			"move",
			"turnRight",
			"collect",
			"store",
			"repeat"
		],
		goals: [{ type: "store" }],
		stars: {
			three: 18,
			two: 23
		},
		hint: "Дві ходки. Розвернутися назад — це два повороти праворуч. Порахуй кроки до складу: склад ліворуч від старту.",
		hints: [
			"Скільки полін герой несе за раз? А скільки їх тут?",
			"Перша ходка: два поліна на склад. Друга: повернись по третє й віднеси його. Розвернутися — це два повороти праворуч.",
			"повторити 2 рази\n   крок уперед\n   взяти\nповорот праворуч\nповорот праворуч\nповторити _ разів\n   крок уперед\nвіднести на склад\n_ (друга ходка)"
		],
		scene: {
			theme: "winter",
			item: "wood",
			props: [{
				kind: "woodshed",
				x: .5,
				y: -1
			}]
		}
	},
	{
		id: "s-trips",
		tier: "practice",
		title: "Ходки до складу",
		task: ["Сусідам теж треба занести дрова, а в кожного їх різна кількість.", "Одна програма для обох дворів: іди, поки руки не повні, вертайся на склад, віднеси і йди знову."],
		map: [
			"########",
			"#HScccc#",
			"########"
		],
		capacity: 2,
		blocks: [
			"move",
			"turnRight",
			"collect",
			"store",
			"forever",
			"repeatUntil",
			"if",
			"onCrystal",
			"handsFull",
			"atStorehouse"
		],
		goals: [{ type: "store" }],
		stars: {
			three: 15,
			two: 19
		},
		hint: "**Завжди**: повторюй до **руки повні?** крок і **якщо тут щось є? — взяти**. Потім розвернись, іди до складу, віднеси й розвернись знову.",
		hints: [
			"Чи знаєш ти, скільки ходок треба в кожному дворі?",
			"У **завжди**: іди й бери, доки руки не повні; розвернись, іди до складу, віднеси й розвернись знову.",
			"завжди\n   повторити до <руки повні?>\n      крок уперед\n      якщо <тут щось є?> то взяти\n   поворот праворуч\n   поворот праворуч\n   повторити до <_>\n      _\n   _\n   поворот праворуч\n   поворот праворуч"
		],
		gift: {
			name: "Ноші",
			skill: "**завжди** і **руки повні?**: герой ходить ходками без кінця."
		},
		scene: {
			theme: "winter",
			item: "wood",
			props: [{
				kind: "woodshed",
				x: .5,
				y: -1
			}]
		},
		fields: [{ map: [
			"###########",
			"#HS.cccccc#",
			"###########"
		] }]
	},
	{
		id: "s-last-trip",
		tier: "challenge",
		title: "Остання ходка",
		task: ["Ціла купа хмизу вздовж стежки, а несеш ти лише по два.", "Але останньої ходки руки можуть і не наповнитися: тоді вертайся, коли стежка скінчилася."],
		map: [
			"##########",
			"#HS.ccccc#",
			"##########"
		],
		capacity: 2,
		blocks: [
			"move",
			"turnRight",
			"collect",
			"store",
			"forever",
			"repeatUntil",
			"if",
			"or",
			"onCrystal",
			"handsFull",
			"atStorehouse",
			"wallAhead"
		],
		goals: [{ type: "store" }],
		stars: {
			three: 17,
			two: 21
		},
		hint: "Повертайся на склад, коли руки повні АБО попереду стіна: **повторити до ‹руки повні?› або ‹попереду стіна?›**.",
		hints: [
			"Що буде на останній ходці, коли хмизу лишилось менше двох?",
			"Вертайся на склад, коли руки повні АБО попереду стіна. Решта програми як у **Ходках до складу**.",
			"завжди\n   повторити до <<руки повні?> або <_>>\n      крок уперед\n      якщо <тут щось є?> то взяти\n   _ (розвернись, до складу, віднеси, розвернись)"
		],
		scene: {
			theme: "winter",
			item: "wood",
			props: [{
				kind: "woodshed",
				x: .5,
				y: -1
			}]
		},
		fields: [{ map: [
			"#######",
			"#HSccc#",
			"#######"
		] }, { map: [
			"##########",
			"#HSc.c.cc#",
			"##########"
		] }]
	},
	{
		id: "w-lever",
		tier: "intro",
		title: "Важіль біля воріт",
		task: ["Дорогу до прапорця перегородили дерев'яні ворота. Вони відчиняються важелем.", "Дійди до важеля, потягни його й пройди крізь ворота."],
		map: [
			"########",
			"#S.L.GF#",
			"########"
		],
		blocks: [
			"move",
			"pull",
			"repeat"
		],
		goals: [{ type: "finish" }],
		stars: {
			three: 5,
			two: 6
		},
		hint: "**Потягнути важіль** працює, коли герой стоїть на важелі. Червоний важіль вимкнений, зелений увімкнений.",
		hints: [
			"Де стоїть важіль? Скільки кроків до нього?",
			"Дійди до важеля, потягни його, а потім пройди крізь ворота.",
			"повторити _ разів\n   крок уперед\nпотягнути важіль\nповторити _ разів\n   _"
		],
		gift: {
			name: "Рукавиці",
			skill: "**потягнути важіль**: герой відчиняє ворота."
		},
		scene: { theme: "autumn" }
	},
	{
		id: "w-careful",
		tier: "practice",
		title: "Не чіпай зеленого",
		task: ["Тут три важелі, і ворота відчиняться, коли всі три увімкнені (зелені).", "Один уже увімкнено. Якщо потягнути його, він вимкнеться!"],
		map: [
			"############",
			"#S.L.l.L.GF#",
			"############"
		],
		blocks: [
			"move",
			"pull",
			"repeat"
		],
		goals: [{ type: "finish" }],
		stars: {
			three: 8,
			two: 10
		},
		hint: "Тягни лише червоні важелі. Порахуй кроки від одного червоного важеля до наступного.",
		hints: [
			"Які важелі червоні, а який уже зелений?",
			"Тягни лише червоні. Зелений пройди мимо, бо від **потягнути** він вимкнеться.",
			"повторити 2 рази\n   крок уперед\nпотягнути важіль\nповторити _ разів\n   крок уперед\n_\nповторити _ разів\n   _"
		],
		scene: { theme: "autumn" }
	},
	{
		id: "w-row",
		tier: "practice",
		title: "Ряд важелів",
		task: ["У кожному дворі свій ряд важелів: одні ввімкнені, інші ні.", "Одна програма для всіх дворів: іди до прапорця і на кожному вимкненому важелі тягни його."],
		map: [
			"#########",
			"#SLlLlGF#",
			"#########"
		],
		blocks: [
			"move",
			"pull",
			"repeatUntil",
			"if",
			"and",
			"not",
			"onLever",
			"leverOn",
			"atFinish"
		],
		goals: [{ type: "finish" }],
		stars: {
			three: 9,
			two: 11
		},
		hint: "Тягни, якщо **тут важіль?** І НЕ **важіль увімкнено?**. Склади цю умову з блоків **і** та **не**.",
		hints: [
			"На яких важелях треба тягнути, а на яких ні?",
			"Тягни, якщо **тут важіль?** і НЕ **важіль увімкнено?**. Склади цю умову з **і** та **не**.",
			"повторити до <дійшов до мети?>\n   крок уперед\n   якщо <<тут важіль?> і <не <_>>> то\n      _"
		],
		scene: { theme: "autumn" },
		fields: [{ map: [
			"#########",
			"#SllLLGF#",
			"#########"
		] }, { map: [
			"##########",
			"#S.L.l.GF#",
			"##########"
		] }]
	},
	{
		id: "w-yard",
		tier: "challenge",
		title: "Двір з воротами",
		task: ["Стежка двору звивається, а важелі стоять і на прямій, і на поворотах.", "Пройди стежкою до прапорця: увімкни дорогою всі вимкнені важелі й повертай, коли попереду стіна."],
		map: [
			"#######",
			"#SLl.L#",
			"#####.#",
			"#F.G.l#",
			"#######"
		],
		blocks: [
			"move",
			"turnRight",
			"pull",
			"repeatUntil",
			"if",
			"ifElse",
			"and",
			"not",
			"onLever",
			"leverOn",
			"wallAhead",
			"atFinish"
		],
		goals: [{ type: "finish" }],
		stars: {
			three: 12,
			two: 15
		},
		hint: "У кожному кроці циклу дві перевірки по черзі: спершу важіль (тягни, якщо він вимкнений), потім стіна (повертай, якщо попереду стіна, інакше крок).",
		hints: [
			"Що герой має перевірити на кожній клітинці і в якому порядку?",
			"Спершу важіль: тягни, якщо тут вимкнений важіль. Потім стіна: поворот праворуч, інакше крок.",
			"повторити до <дійшов до мети?>\n   якщо <<тут важіль?> і <не <важіль увімкнено?>>> то\n      _\n   якщо <_> то\n      поворот праворуч\n   інакше\n      _"
		],
		scene: { theme: "autumn" },
		fields: [{ map: [
			"########",
			"#S.L.Ll#",
			"######.#",
			"#F.G..L#",
			"########"
		] }]
	},
	{
		id: "k-carrots",
		tier: "intro",
		title: "Лише гарбузи",
		task: ["На городі вперемішку гарбузи і ягнята, що вибігли з кошари.", "Збери лише гарбузи: перед **взяти** спитай **тут гарбуз?**. Ягнят не чіпай."],
		map: [
			"#########",
			"#Scccccc#",
			"#########"
		],
		blocks: [
			"move",
			"collect",
			"repeat",
			"if",
			"itemIs"
		],
		goals: [{
			type: "pick",
			item: "carrot"
		}],
		stars: {
			three: 5,
			two: 7
		},
		hint: "Повтори: крок, а тоді **якщо тут гарбуз? — взяти**. У блоці **тут …?** вибери гарбуз.",
		hints: [
			"Що лежить на городі, крім гарбузів?",
			"Після кожного кроку спитай **тут гарбуз?** і бери лише тоді. У блоці **тут …?** вибери гарбуз.",
			"повторити _ разів\n   крок уперед\n   якщо <тут _?> то\n      взяти"
		],
		gift: {
			name: "Лупа",
			skill: "**тут ‹…›?**: герой розрізняє, що лежить під ногами."
		},
		scene: {
			theme: "spring",
			item: "carrot",
			itemsAt: [
				{
					x: 2,
					y: 1,
					item: "carrot"
				},
				{
					x: 3,
					y: 1,
					item: "egg"
				},
				{
					x: 4,
					y: 1,
					item: "carrot"
				},
				{
					x: 5,
					y: 1,
					item: "carrot"
				},
				{
					x: 6,
					y: 1,
					item: "egg"
				},
				{
					x: 7,
					y: 1,
					item: "carrot"
				}
			]
		},
		fields: [{
			map: [
				"#########",
				"#Scccccc#",
				"#########"
			],
			scene: {
				theme: "spring",
				item: "carrot",
				itemsAt: [
					{
						x: 2,
						y: 1,
						item: "egg"
					},
					{
						x: 3,
						y: 1,
						item: "carrot"
					},
					{
						x: 4,
						y: 1,
						item: "carrot"
					},
					{
						x: 5,
						y: 1,
						item: "egg"
					},
					{
						x: 6,
						y: 1,
						item: "carrot"
					},
					{
						x: 7,
						y: 1,
						item: "egg"
					}
				]
			}
		}]
	},
	{
		id: "k-eggs",
		tier: "practice",
		title: "Ягнята в кошару",
		task: ["Ягнята розбіглися поміж гарбузів. Пройди стежкою до кінця й забери всіх ягнят.", "Стежки різної довжини, тож іди, поки попереду не стіна."],
		map: [
			"##########",
			"#Sccccccc#",
			"##########"
		],
		blocks: [
			"move",
			"collect",
			"repeatUntil",
			"if",
			"wallAhead",
			"itemIs"
		],
		goals: [{
			type: "pick",
			item: "egg"
		}],
		stars: {
			three: 6,
			two: 8
		},
		hint: "Повторюй до **попереду стіна?**: крок, і **якщо тут ягня? — взяти**.",
		hints: [
			"Чи однакові стежки на всіх полях?",
			"Іди, доки попереду не стіна, а дорогою питай **тут ягня?** і бери лише ягнят.",
			"повторити до <_>\n   крок уперед\n   якщо <тут _?> то\n      взяти"
		],
		scene: {
			theme: "spring",
			item: "egg",
			itemsAt: [
				{
					x: 2,
					y: 1,
					item: "egg"
				},
				{
					x: 3,
					y: 1,
					item: "carrot"
				},
				{
					x: 4,
					y: 1,
					item: "egg"
				},
				{
					x: 5,
					y: 1,
					item: "egg"
				},
				{
					x: 6,
					y: 1,
					item: "carrot"
				},
				{
					x: 7,
					y: 1,
					item: "carrot"
				},
				{
					x: 8,
					y: 1,
					item: "egg"
				}
			]
		},
		fields: [{
			map: [
				"#######",
				"#Scccc#",
				"#######"
			],
			scene: {
				theme: "spring",
				item: "egg",
				itemsAt: [
					{
						x: 2,
						y: 1,
						item: "carrot"
					},
					{
						x: 3,
						y: 1,
						item: "egg"
					},
					{
						x: 4,
						y: 1,
						item: "egg"
					},
					{
						x: 5,
						y: 1,
						item: "carrot"
					}
				]
			}
		}]
	},
	{
		id: "k-garden",
		tier: "challenge",
		title: "Город довкола",
		task: ["Стежка обходить город довкола і веде до прапорця.", "Збери дорогою лише гарбузи і повертай праворуч, коли попереду стіна."],
		map: [
			"#######",
			"#Scccc#",
			"#####c#",
			"#Fcccc#",
			"#######"
		],
		blocks: [
			"move",
			"turnRight",
			"collect",
			"repeatUntil",
			"if",
			"ifElse",
			"wallAhead",
			"atFinish",
			"itemIs"
		],
		goals: [{
			type: "pick",
			item: "carrot"
		}, { type: "finish" }],
		stars: {
			three: 9,
			two: 11
		},
		hint: "У кожному кроці циклу: спершу **якщо тут гарбуз? — взяти**, потім **якщо попереду стіна? — поворот, інакше крок**.",
		hints: [
			"Що герой має перевірити на кожній клітинці?",
			"Спершу **якщо тут гарбуз? то взяти**, потім **якщо попереду стіна? то поворот праворуч, інакше крок**.",
			"повторити до <дійшов до мети?>\n   якщо <тут гарбуз?> то\n      _\n   якщо <попереду стіна?> то\n      _\n   інакше\n      _"
		],
		scene: {
			theme: "spring",
			item: "carrot",
			itemsAt: [
				{
					x: 2,
					y: 1,
					item: "carrot"
				},
				{
					x: 3,
					y: 1,
					item: "egg"
				},
				{
					x: 4,
					y: 1,
					item: "carrot"
				},
				{
					x: 5,
					y: 1,
					item: "egg"
				},
				{
					x: 5,
					y: 2,
					item: "egg"
				},
				{
					x: 2,
					y: 3,
					item: "carrot"
				},
				{
					x: 3,
					y: 3,
					item: "carrot"
				},
				{
					x: 4,
					y: 3,
					item: "egg"
				},
				{
					x: 5,
					y: 3,
					item: "carrot"
				}
			]
		},
		fields: [{
			map: [
				"#######",
				"#Scccc#",
				"#####c#",
				"#Fcccc#",
				"#######"
			],
			scene: {
				theme: "spring",
				item: "carrot",
				itemsAt: [
					{
						x: 2,
						y: 1,
						item: "egg"
					},
					{
						x: 3,
						y: 1,
						item: "egg"
					},
					{
						x: 4,
						y: 1,
						item: "carrot"
					},
					{
						x: 5,
						y: 1,
						item: "carrot"
					},
					{
						x: 5,
						y: 2,
						item: "carrot"
					},
					{
						x: 2,
						y: 3,
						item: "egg"
					},
					{
						x: 3,
						y: 3,
						item: "egg"
					},
					{
						x: 4,
						y: 3,
						item: "carrot"
					},
					{
						x: 5,
						y: 3,
						item: "egg"
					}
				]
			}
		}]
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
		hints: [
			"Де тонкий лід? Яким рядом його можна обійти?",
			"Зійди на нижній ряд перед пасткою, пройди під нею й піднімись назад на стежку.",
			"крок уперед\nповорот праворуч\nкрок уперед\nповорот ліворуч\n_\n_\nповорот _\nкрок уперед\nповорот _\nкрок уперед"
		],
		scene: {
			theme: "winter",
			ground: "ice",
			finish: "home",
			props: [{
				kind: "house",
				x: 3.5,
				y: -2
			}]
		}
	},
	{
		id: "p-field",
		tier: "practice",
		title: "Ополонки",
		task: ["Рибалки надовбали на ставку ополонок, а мороз такий, що сил вистачить лише на 7 кроків.", "Знайди шлях до джерела без пасток і без зайвих кроків."],
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
		hints: [
			"Порахуй кроки кожним шляхом. Який з них уміщається в 7?",
			"Ні край, ні лівий шлях не підходять. Зроби два кроки, поверни праворуч і йди посередині.",
			"крок уперед\nкрок уперед\nповорот праворуч\nповторити _ разів\n   крок уперед\nповорот _\n_"
		],
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
		hints: [
			"Котре поліно лежить окремо від інших?",
			"Почни з самотнього поліна: розвернись, іди до нього, а тоді вертайся по ближні.",
			"поворот ліворуч\nповорот ліворуч\nповторити _ разів\n   крок уперед\nвзяти\nповорот ліворуч\nповорот ліворуч\nповторити _ разів\n   крок уперед\nвзяти\n_"
		],
		scene: {
			theme: "winter",
			item: "wood"
		}
	},
	{
		id: "p-fires",
		tier: "challenge",
		title: "Три вогнища",
		task: ["Вечоріє: у кутах галявини треба розпалити три вогнища. Дійди до кожного й постав блок **розпалити**.", "Сил вистачить на 15 кроків, а на галявині є замерзлі калюжі з тонким льодом. Вибери, з якого вогнища почати."],
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
		hints: [
			"З якого вогнища до двох інших можна дійти без повернень назад?",
			"Почни з лівого верхнього вогнища: від нього край галявини веде до двох інших.",
			"поворот ліворуч\nкрок уперед\nповорот праворуч\n_ (до першого вогнища)\nрозпалити\nповорот ліворуч\nповорот ліворуч\nповторити _ разів\n   крок уперед\nрозпалити\nповорот _\nповторити _ разів\n   крок уперед\nрозпалити"
		],
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
		hints: [
			"Що робить герой, коли бачить пастку? А коли її немає?",
			"Сходинка вгору — це ліворуч, крок, праворуч. Роби її, коли попереду пастка, інакше просто крок.",
			"повторити до <дійшов до мети?>\n   якщо <попереду пастка?> то\n      поворот ліворуч\n      _\n      _\n   інакше\n      _"
		],
		scene: {
			theme: "winter",
			ground: "ice",
			finish: "grandma"
		},
		fields: [{ map: [
			"###########",
			"#####....F#",
			"##....x####",
			"#S.x#######",
			"###########"
		] }, { map: [
			"###########",
			"######...F#",
			"####...x###",
			"##...x#####",
			"#S.x#######",
			"###########"
		] }]
	},
	{
		id: "p-river",
		tier: "practice",
		title: "Обхід ополонок",
		task: ["Рибалки зробили на річці дві ополонки.", "Обхід біля кожної однаковий: напиши його один раз у **якщо попереду пастка**."],
		map: [
			"###############",
			"###...##...####",
			"#S..x....x...F#",
			"###############"
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
		hints: [
			"Що однакове біля обох ополонок?",
			"Обхід: ліворуч, крок, праворуч, два кроки, праворуч, крок, ліворуч. Постав його в **якщо попереду пастка?**, а в **інакше** крок.",
			"повторити до <дійшов до мети?>\n   якщо <попереду пастка?> то\n      _ (обхід, 8 блоків)\n   інакше\n      крок уперед"
		],
		scene: {
			theme: "winter",
			ground: "ice",
			finish: "home",
			props: [{
				kind: "house",
				x: 11.5,
				y: -1
			}]
		},
		fields: [{ map: [
			"###############",
			"##...###...####",
			"#S.x.....x...F#",
			"###############"
		] }, {
			map: [
				"################",
				"#...#...#...####",
				"#Sx...x...x...F#",
				"################"
			],
			scene: {
				theme: "winter",
				ground: "ice",
				finish: "home",
				props: [{
					kind: "house",
					x: 12.5,
					y: -1
				}]
			}
		}]
	},
	{
		id: "p-fork",
		tier: "challenge",
		title: "Розвилка",
		task: ["Стежка розходиться: одна гілка веде в глухий кут, друга — до джерела.", "Сил вистачить лише на 9 кроків. Склади правило: у який бік повертати біля стіни?"],
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
		hints: [
			"Куди веде кожна гілка? Порахуй кроки обома.",
			"Правило: якщо попереду стіна, то поворот, інакше крок. Спробуй обидва повороти: лише один уміщається в 9 кроків.",
			"повторити до <дійшов до мети?>\n   якщо <попереду стіна?> то\n      поворот _\n   інакше\n      _"
		],
		scene: {
			theme: "winter",
			finish: "well"
		}
	},
	{
		id: "g5-spirit",
		tier: "intro",
		title: "Гоблін-підривник",
		task: ["Прийшла весна, а гоблін-підривник стереже дорогу до джерела. Він стоїть, а коли герой підходить на дві клітинки, біжить назустріч.", "Вдар гобліна і дійди до джерела."],
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
		hint: "Зроби крок — гоблін підбіжить упритул. Тоді **вдарити**, а далі йди до джерела.",
		hints: [
			"Що робить гоблін, коли герой підходить ближче?",
			"Зроби крок, і гоблін підбіжить упритул. Вдар його, а потім іди до джерела.",
			"крок уперед\n_\nповторити _ разів\n   крок уперед"
		],
		gift: {
			name: "Дерев'яний меч",
			skill: "**вдарити**: герой проганяє ворогів."
		},
		scene: {
			theme: "spring",
			finish: "well"
		}
	},
	{
		id: "g5-glade",
		tier: "practice",
		title: "Дрова на галявині",
		task: ["Після весняного дощу на галявині лежать дрова, а по ній туди-сюди котиться гоблін у бочці.", "Галявина велика: обери свій шлях. Збери всі дрова, а гобліна обійди або вдар."],
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
		hint: "Гоблін у бочці помічає героя лише впритул. Якщо він на шляху — **вдарити**, інакше обійди його.",
		hints: [
			"Де лежать дрова і куди котиться гоблін?",
			"Збирай дрова по черзі. Якщо гоблін на шляху, то **вдарити**, інакше обійди його.",
			"крок уперед\nповорот праворуч\nкрок уперед\nкрок уперед\nвзяти\n_ (далі до наступних дров)"
		],
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
		title: "Варта біля дровітні",
		task: ["Біля дровітні вештаються гобліни. Прожени всіх.", "Питай **попереду ворог?**: якщо так — бий, а ні — іди далі."],
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
		hints: [
			"Чи знаєш ти, на якій клітинці кожен гоблін?",
			"Перед кожним ходом питай **попереду ворог?**: так — вдар, ні — крок.",
			"повторити _ разів\n   якщо <попереду ворог?> то\n      _\n   інакше\n      _"
		],
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
		title: "Ватажок гоблінів",
		task: ["Ватажок гоблінів із факелом вийшов з лісу і не пускає героя до бабусі.", "Він витримує три удари і б'є у відповідь. Підійди, коли він поруч, і бий, доки не впаде."],
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
		hint: "Іди, доки попереду не з'явиться ватажок, тоді вдар тричі. Далі шлях до бабусі вільний.",
		hints: [
			"Скільки ударів витримує ватажок?",
			"Іди, доки попереду не з'явиться ватажок, вдар його тричі, а далі йди стежкою до бабусі.",
			"повторити до <попереду ворог?>\n   крок уперед\nповторити _ разів\n   вдарити\nповторити до <дійшов до мети?>\n   якщо <попереду стіна?> то\n      _\n   інакше\n      _"
		],
		scene: {
			theme: "summer",
			finish: "grandma"
		}
	},
	{
		id: "v-ambush",
		tier: "intro",
		title: "Засідка в ущелині",
		task: ["Гобліни помітили героя з того кінця ущелини й біжать сюди. Тікати нікуди.", "Стій на місці: якщо гоблін попереду — вдар, інакше зачекай. Ця програма спрацює, скільки б їх не прибігло."],
		map: [
			"##########",
			"#S.......#",
			"##########"
		],
		blocks: [
			"move",
			"attack",
			"wait",
			"forever",
			"ifElse",
			"enemyAhead"
		],
		goals: [{ type: "enemies" }],
		enemies: [{
			kind: "goblin",
			x: 6,
			y: 1,
			sees: "line",
			sight: 7
		}, {
			kind: "goblin",
			x: 8,
			y: 1,
			sees: "line",
			sight: 7,
			walk: "patrol",
			route: [{
				x: 8,
				y: 1
			}, {
				x: 7,
				y: 1
			}]
		}],
		hearts: 3,
		stars: {
			three: 5,
			two: 7
		},
		hint: "**Завжди**: **якщо попереду ворог? — вдарити, інакше — зачекати**. Гобліни самі прийдуть до тебе.",
		hints: [
			"Чи треба героєві кудись іти?",
			"Стій на місці й **завжди** питай **попереду ворог?**: так — вдар, ні — зачекай.",
			"завжди\n   якщо <попереду ворог?> то\n      _\n   інакше\n      _"
		],
		gift: {
			name: "Щит",
			skill: "**зачекати**: герой стоїть і чекає слушної миті."
		},
		scene: { theme: "summer" }
	},
	{
		id: "v-unseen",
		tier: "practice",
		title: "Не трапитися на очі",
		task: ["Наприкінці стежки стоїть ватажок гоблінів. Він бачить уздовж свого ряду й стовпчика, але не крізь кущі.", "Якщо помітить — наздожене. Дійди до мети так, щоб він тебе не побачив."],
		map: [
			"###########",
			"#S........#",
			"#.#########",
			"#........F#",
			"###########"
		],
		blocks: [
			"move",
			"turnLeft",
			"turnRight",
			"repeat"
		],
		goals: [{ type: "finish" }],
		enemies: [{
			kind: "bear",
			x: 9,
			y: 1,
			boss: true,
			sees: "line",
			sight: 5
		}],
		hearts: 1,
		stars: {
			three: 6,
			two: 9
		},
		hint: "Верхня стежка коротша, але ватажок дивиться вздовж неї. Спустися вниз за кущі й іди нижньою стежкою.",
		hints: [
			"Куди дивиться ватажок і де кущі закривають йому погляд?",
			"Спершу спустися на нижню стежку за кущі, а там іди до кінця.",
			"поворот праворуч\nповторити _ разів\n   крок уперед\nповорот _\nповторити _ разів\n   крок уперед"
		],
		scene: { theme: "summer" }
	},
	{
		id: "v-patrol",
		tier: "challenge",
		title: "Патруль на стежці",
		task: ["По стежці до джерела ходять гобліни-патрульні, а під ногами ростуть гриби.", "Одна програма на обидві стежки: йди до мети, збирай гриби, а коли патрульний попереду — вдар його."],
		map: [
			"#############",
			"#S.c..c..c.F#",
			"#############"
		],
		blocks: [
			"move",
			"collect",
			"attack",
			"repeatUntil",
			"if",
			"ifElse",
			"enemyAhead",
			"onCrystal",
			"atFinish"
		],
		goals: [
			{ type: "crystals" },
			{ type: "enemies" },
			{ type: "finish" }
		],
		enemies: [{
			kind: "goblin",
			x: 8,
			y: 1,
			walk: "patrol",
			route: [{
				x: 9,
				y: 1
			}, {
				x: 5,
				y: 1
			}],
			sight: 0
		}, {
			kind: "goblin",
			x: 10,
			y: 1,
			sees: "line",
			sight: 3
		}],
		hearts: 3,
		stars: {
			three: 9,
			two: 12
		},
		hint: "**Повторити до ‹дійшов до мети?›**: якщо ворог попереду — вдарити, інакше — крок і **якщо тут щось є? — взяти**.",
		hints: [
			"Що має робити герой, коли попереду патрульний? А коли ні?",
			"Повторюй до мети: якщо ворог попереду, то вдар, інакше крок і **якщо тут щось є? то взяти**.",
			"повторити до <дійшов до мети?>\n   якщо <попереду ворог?> то\n      _\n   інакше\n      крок уперед\n      якщо <_> то\n         взяти"
		],
		scene: {
			theme: "summer",
			item: "apple",
			finish: "well"
		},
		fields: [{
			map: [
				"##########",
				"#S..c.c.F#",
				"##########"
			],
			enemies: [{
				kind: "goblin",
				x: 6,
				y: 1,
				walk: "patrol",
				route: [{
					x: 7,
					y: 1
				}, {
					x: 3,
					y: 1
				}],
				sight: 0
			}]
		}]
	},
	{
		id: "c-apples",
		tier: "practice",
		title: "Гриби все далі",
		task: ["Наприкінці літа герой збирає гриби вздовж стежки: кожен наступний росте на крок далі за попередній.", "Нехай лічильник пам'ятає, скільки кроків іти: щоразу додавай до нього 1."],
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
		hint: "Задай лічильник 1. Потім чотири рази: повтори (лічильник) кроків, візьми гриб і зміни лічильник на 1.",
		hints: [
			"На скільки кроків далі росте кожен наступний гриб?",
			"Лічильник пам'ятає, скільки кроків іти. Пройди стільки, візьми гриб і додай до лічильника 1.",
			"надати лічильник значення _\nповторити 4 рази\n   повторити (лічильник) разів\n      крок уперед\n   взяти\n   змінити лічильник на _"
		],
		gift: {
			name: "Рахівниця",
			skill: "**лічильник**: змінна, що пам'ятає число."
		},
		scene: {
			theme: "summer",
			item: "apple"
		}
	},
	{
		id: "c-spiral",
		tier: "practice",
		title: "Равлик у траві",
		task: ["Влітку діти викосили в траві стежку-равлика, а вказівник поставили на її кінці.", "Кожен відрізок стежки на крок довший за попередній. Нехай лічильник рахує довжину."],
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
		hints: [
			"Як змінюється довжина відрізків стежки?",
			"Пройди (лічильник) кроків, поверни праворуч і додай до лічильника 1. Почни з 1.",
			"надати лічильник значення _\nповторити _ разів\n   повторити (лічильник) разів\n      крок уперед\n   поворот праворуч\n   змінити лічильник на 1"
		],
		scene: { theme: "summer" }
	},
	{
		id: "f-stairs",
		tier: "intro",
		title: "Сходинки до пасіки",
		task: ["Дідусь кличе на пасіку, а вона на пагорбі: стежка йде п'ятьма однаковими сходинками.", "Одна сходинка — це чотири команди. Склади їх один раз у свій блок **сходинка**, а потім просто клич його."],
		map: [
			"########",
			"######F#",
			"#####..#",
			"####..##",
			"###..###",
			"##..####",
			"#S.#####",
			"########"
		],
		blocks: [
			"move",
			"turnLeft",
			"turnRight",
			"procedure"
		],
		procedure: "сходинка",
		goals: [{ type: "finish" }],
		stars: {
			three: 10,
			two: 14
		},
		hint: "Під **визначити сходинка**: крок, ліворуч, крок, праворуч. А головна програма — п'ять блоків **сходинка**.",
		hints: [
			"Яка частина стежки повторюється?",
			"Сходинка: крок, ліворуч, крок, праворуч. Склади її під **визначити сходинка**, а в програмі клич **сходинка**.",
			"визначити сходинка\n   крок уперед\n   поворот ліворуч\n   _\n   _\n\nсходинка\nсходинка\n_"
		],
		gift: {
			name: "Записник",
			skill: "**визначити**: свій блок із кількох команд."
		},
		scene: {
			theme: "summer",
			npcs: [{
				who: "grandpa",
				x: 7,
				y: 2
			}]
		}
	},
	{
		id: "b-define",
		tier: "practice",
		title: "Зламаний робот: сходинки",
		task: ["Робот спускається з пагорба до джерела сходинками. Сходинку він знає як свій блок, але вже на другій спіткнувся.", "Головна програма правильна. Помилка у визначенні блока **сходинка**: знайди її."],
		map: [
			"#######",
			"#S.####",
			"##..###",
			"###..##",
			"####..#",
			"#####F#",
			"#######"
		],
		blocks: [
			"move",
			"turnLeft",
			"turnRight",
			"procedure"
		],
		procedure: "сходинка",
		goals: [{ type: "finish" }],
		stars: {
			three: 9,
			two: 12
		},
		hint: "Пройди одну сходинку пальцем по мапі: куди треба повернути в кінці, щоб дивитися туди, куди йде стежка?",
		hints: [
			"Пройди одну сходинку пальцем по мапі. Куди дивиться робот наприкінці?",
			"Помилка в останньому повороті **сходинки**: після нього робот має дивитися туди ж, куди на початку.",
			"визначити сходинка\n   крок уперед\n   поворот праворуч\n   крок уперед\n   поворот _"
		],
		scene: {
			theme: "summer",
			finish: "well"
		},
		broken: {
			steps: [
				"call",
				"call",
				"call",
				"call"
			],
			definition: {
				name: "сходинка",
				body: [
					"move",
					"turnRight",
					"move",
					"turnRight"
				]
			}
		}
	},
	{
		id: "f-apples",
		tier: "practice",
		title: "Гриби під ялинками",
		task: ["Під ялинками біля стежки виросли гриби, і бабуся просить їх принести.", "Сходити по гриб і повернутися на стежку — сім команд. Склади їх у блок **по гриб** і клич щоразу, як дійдеш до ялинки."],
		map: [
			"############",
			"##c##c###c##",
			"#S........F#",
			"############"
		],
		blocks: [
			"move",
			"turnLeft",
			"turnRight",
			"collect",
			"procedure"
		],
		procedure: "по гриб",
		goals: [{ type: "crystals" }, { type: "finish" }],
		stars: {
			three: 20,
			two: 26
		},
		hint: "Під **визначити по гриб**: ліворуч, крок, взяти, праворуч, праворуч, крок, ліворуч. Головна програма: крок, по гриб, три кроки, по гриб, чотири кроки, по гриб, крок.",
		hints: [
			"Що однакове біля кожної ялинки?",
			"По гриб: ліворуч, крок, взяти, розвернутися, крок, ліворуч. Склади це в блок **по гриб** і клич біля ялинок.",
			"визначити по гриб\n   поворот ліворуч\n   крок уперед\n   взяти\n   поворот праворуч\n   поворот праворуч\n   _\n   _\n\nкрок уперед\nпо гриб\n_"
		],
		scene: {
			theme: "summer",
			item: "apple",
			finish: "grandma"
		}
	},
	{
		id: "c-stones",
		tier: "practice",
		title: "Завали на стежці",
		task: ["Стежку до вказівника завалило: то пеньок, то кущ. Обійти завал — це вісім команд.", "Склади їх один раз у блоці **обійти**, а далі просто клич його, коли попереду завал."],
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
		hint: "Під **визначити обійти**: ліворуч, крок, праворуч, два кроки, праворуч, крок, ліворуч. Головна програма: крок, обійти, два кроки, обійти, крок, обійти, крок.",
		hints: [
			"Скільки команд займає один обхід завалу?",
			"Обхід: ліворуч, крок, праворуч, два кроки, праворуч, крок, ліворуч. Склади його в **обійти** і клич перед кожним завалом.",
			"визначити обійти\n   поворот ліворуч\n   крок уперед\n   поворот праворуч\n   _\n\nкрок уперед\nобійти\n_"
		],
		scene: { theme: "summer" }
	},
	{
		id: "f-bushes",
		tier: "practice",
		title: "Кущі на стежці",
		task: ["Після грози на стежці до джерела виросли кущі, і стоять вони де заманеться.", "Склади блок **обійти**, а головна програма нехай сама вирішує: якщо попереду кущ — обійти, інакше крок."],
		map: [
			"################",
			"##......#.....##",
			"#S.#..#...#.#.F#",
			"################"
		],
		blocks: [
			"move",
			"turnLeft",
			"turnRight",
			"repeatUntil",
			"ifElse",
			"wallAhead",
			"atFinish",
			"procedure"
		],
		procedure: "обійти",
		goals: [{ type: "finish" }],
		stars: {
			three: 15,
			two: 19
		},
		hint: "Повторюй, доки не дійдеш до мети: якщо попереду стіна, то **обійти**, інакше крок. Блок **обійти** — той самий, що на завалах.",
		hints: [
			"Чи знаєш ти, де кущі на кожному полі?",
			"Програма сама вирішує: якщо попереду кущ, то **обійти**, інакше крок. **Обійти** той самий, що на завалах.",
			"повторити до <дійшов до мети?>\n   якщо <попереду стіна?> то\n      _\n   інакше\n      _"
		],
		scene: {
			theme: "summer",
			finish: "well"
		},
		fields: [{ map: [
			"################",
			"#...######...###",
			"#S#...........F#",
			"################"
		] }, { map: [
			"################",
			"##...#...#...###",
			"#S.#...#...#..F#",
			"################"
		] }]
	},
	{
		id: "c-rocks",
		tier: "challenge",
		title: "Гриби за завалами",
		task: ["Остання прогулянка літа: між завалами все більше кроків, а за кожним завалом росте гриб.", "Поєднай лічильник і свій блок **обійти**, щоб програма вийшла короткою."],
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
		hints: [
			"Що змінюється від завалу до завалу, а що ні?",
			"Обхід завжди однаковий: це твій блок **обійти**. А кроків між завалами щоразу більше: це лічильник.",
			"надати лічильник значення 1\nповторити _ разів\n   повторити (лічильник) разів\n      крок уперед\n   _\n   взяти\n   змінити лічильник на _"
		],
		scene: {
			theme: "summer",
			item: "apple"
		}
	}
];
// src/levels/python-start.ts
/**
* «Python: перші кроки», for students who have never written a program in text. It goes in six small chapters, in the
* order of the school books (Ривкінд, 6 кл. § 7.1 and 7 кл. § 2.2): a variable as a box, what a box holds, the hero's
* commands, `input()`, turning words into numbers and back, and counting. Each level brings one small idea in two or
* three short sentences, and a new word comes only after the student has seen the thing it names. The first levels
* have the hero's commands written already, so the student only changes what lies in a box.
* The ideas have no blocks, so `<EduBlocks>` and the block course skip these levels (`language: "python"`).
* The levels that teach an idea pass only when the program uses it (`uses`, `prints`), and the levels with `input()`
* have fields with other answers, so the answer cannot be written into the program by hand.
* The reference solutions are in `pythonSolutions`.
*/
/** The hero's house: its door opens onto the start cell (1, 1). */
var HOME = {
	kind: "house",
	x: -.5,
	y: -2
};
/** A straight path of `steps` cells from the start to an item: `#S...c#`. */
var straight = (steps, end = "c") => {
	const wall = "#".repeat(steps + 3);
	return [
		wall,
		`#S${".".repeat(steps - 1)}${end}#`,
		wall
	];
};
/** A path `first` cells to the right, then `second` cells down after a right turn, to an item. */
var corner = (first, second) => {
	const width = first + 3;
	const turn = first + 1;
	const row = (cell) => `${"#".repeat(turn)}${cell}${"#".repeat(width - turn - 1)}`;
	return [
		"#".repeat(width),
		`#S${".".repeat(first)}#`,
		...Array.from({ length: second - 1 }, () => row(".")),
		row("c"),
		"#".repeat(width)
	];
};
/** Stairs: `n` cells right, `n` down after a right turn, then `2n` right after a left turn, to the finish. */
var stairs = (n) => {
	const width = 3 * n + 3;
	const turn = n + 1;
	const row = (body) => `${body}${"#".repeat(width - body.length)}`;
	return [
		"#".repeat(width),
		row(`#S${".".repeat(n)}`),
		...Array.from({ length: n - 1 }, () => row(`${"#".repeat(turn)}.`)),
		row(`${"#".repeat(turn)}${".".repeat(2 * n)}F`),
		"#".repeat(width)
	];
};
/** A villager who waits for the hero, on the wall cell below the path at `x`. */
var below = (who, x) => [{
	who,
	x,
	y: 2
}];
/** The levels of «Python: перші кроки» in six small chapters, in the order of play. See `pythonStartChapters`. */
var pythonLevelGroups = {
	pyHero: [
		{
			id: "py-methods",
			language: "python",
			tier: "intro",
			title: "Перші команди",
			task: ["Дрова лежать за 3 клітинки від хати.", "Зроби 3 кроки, по одному в рядку, а потім візьми дрова."],
			lesson: {
				title: "Як дати героєві команду",
				text: [
					"Герой у програмі зветься hero. Щоб він щось зробив, пиши hero, крапку і що зробити.",
					"`hero.move()` — один крок уперед. `hero.collect()` — взяти те, що лежить під ногами.",
					"Кожна команда пишеться з нового рядка. Дужки в кінці обов'язкові."
				],
				example: "hero.move()      # крок\nhero.collect()   # взяти\n"
			},
			starter: "hero.move()\n",
			map: straight(3),
			blocks: ["move", "collect"],
			goals: [{ type: "crystals" }],
			stars: {
				three: 4,
				two: 6
			},
			hint: "Три рядки `hero.move()` і один `hero.collect()`.",
			hints: [
				"Скільки клітинок до дров? Стільки разів і треба зробити крок.",
				"Крок — `hero.move()`, взяти — `hero.collect()`. Кожна команда з нового рядка.",
				"hero.move()\nhero.move()\nhero.____()\nhero.________()"
			],
			gift: {
				name: "Чоботи мандрівника",
				skill: "hero.move() і hero.collect(): герой ходить і бере речі."
			},
			scene: {
				theme: "autumn",
				item: "wood",
				props: [HOME, {
					kind: "woodshed",
					x: 3,
					y: -1
				}]
			}
		},
		{
			id: "py-move-number",
			language: "python",
			tier: "intro",
			title: "Число в дужках",
			task: ["Дрова далеко: за 6 клітинок.", "Дійди до них і візьми. Спробуй уміститися у два рядки."],
			lesson: {
				title: "Багато кроків одним рядком",
				text: ["У дужки можна написати число: `hero.move(6)` — це 6 кроків.", "Так коротше: один рядок замість шести."],
				example: "hero.move(2)   # 2 кроки\n"
			},
			starter: "# Дійди до дров і візьми їх.\n",
			map: straight(6),
			blocks: ["move", "collect"],
			goals: [{ type: "crystals" }],
			stars: {
				three: 2,
				two: 4
			},
			hint: "`hero.move(6)`, а потім `hero.collect()`.",
			hints: [
				"Скільки кроків до дров? Це число можна написати в дужках.",
				"`hero.move(6)` робить 6 кроків одним рядком. Потім візьми дрова.",
				"hero.move(_)\nhero.collect()"
			],
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
			id: "py-turns",
			language: "python",
			tier: "intro",
			title: "Поворот",
			task: ["Яблуко за рогом: 3 клітинки вправо, а потім 3 вниз.", "Дійди й візьми його."],
			lesson: {
				title: "Як повернути",
				text: ["`hero.turn_right()` — повернути праворуч. `hero.turn_left()` — повернути ліворуч.", "Герой повертається на місці, без кроку. Праворуч і ліворуч — це від героя, куди він дивиться."],
				example: "hero.turn_right()   # тепер герой дивиться вниз\n"
			},
			starter: "# Іди вправо, поверни, іди вниз.\n",
			map: corner(3, 3),
			blocks: [
				"move",
				"turnLeft",
				"turnRight",
				"collect"
			],
			goals: [{ type: "crystals" }],
			stars: {
				three: 4,
				two: 6
			},
			hint: "`hero.move(3)`, `hero.turn_right()`, `hero.move(3)`, `hero.collect()`.",
			hints: [
				"Куди треба повернути, коли дійдеш до рогу: праворуч чи ліворуч?",
				"Іди вправо, поверни праворуч командою `hero.turn_right()`, іди вниз і візьми.",
				"hero.move(_)\nhero.turn_____()\nhero.move(_)\nhero.collect()"
			],
			gift: {
				name: "Компас",
				skill: "hero.turn_right() і hero.turn_left(): герой повертає."
			},
			scene: {
				theme: "autumn",
				item: "apple",
				props: [HOME]
			}
		},
		{
			id: "py-print",
			language: "python",
			tier: "intro",
			title: "Герой говорить",
			task: ["Дід біля вказівника погано бачить. Привітайся з ним: Добрий день!", "Потім дійди до вказівника."],
			lesson: {
				title: "Як сказати вголос",
				text: ["`print(\"…\")` — ще одна команда: герой каже вголос те, що в дужках.", "Слова пиши в лапках: `print(\"Привіт!\")`. Сказане видно у віконці під кодом."],
				example: "print(\"Привіт!\")   # герой каже: Привіт!\n"
			},
			starter: "# Спершу привітайся, потім іди.\n",
			map: straight(5, "F"),
			blocks: ["move"],
			goals: [{ type: "finish" }],
			uses: ["print"],
			prints: "Добрий день!",
			stars: {
				three: 3,
				two: 5
			},
			hint: "`print(\"Добрий день!\")`, а потім `hero.move(5)`.",
			hints: [
				"Що треба зробити спершу: сказати чи піти?",
				"Тобі потрібні дві команди: print, щоб сказати, і hero.move, щоб піти.",
				"print(\"_____\")\nhero.move(_)"
			],
			gift: {
				name: "Горн",
				skill: "print(): герой говорить."
			},
			scene: {
				theme: "autumn",
				props: [HOME],
				npcs: below("grandpa", 6)
			}
		},
		{
			id: "py-fix",
			language: "python",
			tier: "intro",
			title: "Виправ робота",
			task: ["Робот написав програму, і в кожному рядку помилка.", "Запусти, прочитай, що каже Python, і виправ. Потім запусти знову, до наступної помилки."],
			lesson: {
				title: "Помилки — це нормально",
				text: [
					"Python каже, у якому рядку помилка і що не так. Читай і виправляй по одній.",
					"Часті помилки: забули дужки, написали Hero з великої літери, забули лапки навколо слів.",
					"Команди героя через крапку ще називають методами. Це просто **що вміє герой**."
				],
				example: "hero.move()    # дужки є\nprint(\"Ура\")    # слова в лапках\n"
			},
			starter: "hero.move\nHero.move(2)\nprint(Привіт)\n",
			map: straight(3, "F"),
			blocks: ["move"],
			goals: [{ type: "finish" }],
			uses: ["print"],
			prints: "Привіт",
			stars: {
				three: 4,
				two: 6
			},
			hint: "`hero.move()`, `hero.move(2)`, `print(\"Привіт\")`.",
			hints: [
				"Python показує номер рядка з помилкою. Почни з нього.",
				"Рядок 1 без дужок, у рядку 2 велика літера H, у рядку 3 слово без лапок.",
				"hero.____()\nhero.move(_)\nprint(\"______\")"
			],
			scene: {
				theme: "autumn",
				props: [HOME],
				npcs: below("grandpa", 4)
			}
		}
	],
	pyBoxes: [
		{
			id: "py-box-first",
			language: "python",
			tier: "intro",
			title: "Змінна з числом",
			task: ["Дрова лежать за 3 клітинки від хати.", "У змінній steps зараз 0, тому герой стоїть. Поклади в неї 3."],
			lesson: {
				title: "Що таке змінна",
				text: [
					"Рядок `steps = 0` — це змінна. Вона як скринька з написом: зліва назва steps, справа те, що лежить усередині.",
					"`hero.move(steps)` — герой іде стільки кроків, скільки лежить у змінній steps. Нижні рядки вже готові.",
					"Заміни 0 на інше число й натисни **Запустити**."
				],
				example: "steps = 5   # у змінній steps лежить 5\n"
			},
			starter: "steps = 0\n# Нижче все готово.\nhero.move(steps)\nhero.collect()\n",
			map: straight(3),
			blocks: ["move", "collect"],
			goals: [{ type: "crystals" }],
			uses: ["variable"],
			stars: {
				three: 4,
				two: 6
			},
			hint: "Перший рядок має бути `steps = 3`.",
			hints: [
				"Скільки клітинок до дров?",
				"Герой іде стільки кроків, скільки лежить у змінній steps. Поклади туди це число.",
				"`steps = _`"
			],
			scene: {
				theme: "autumn",
				item: "wood",
				props: [HOME, {
					kind: "woodshed",
					x: 3,
					y: -1
				}]
			}
		},
		{
			id: "py-box-twice",
			language: "python",
			tier: "intro",
			title: "Одна змінна, два рази",
			task: ["Стежка йде вправо, а потім униз. Обидві частини однакові: по 4 клітинки.", "Поклади в змінну steps одне число, і герой пройде обидві частини."],
			lesson: {
				title: "Одну змінну можна брати багато разів",
				text: ["Герой бере число зі змінної steps двічі: коли йде вправо і коли йде вниз.", "Тому число міняєш лише в одному місці, у рядку steps = …"],
				example: "steps = 2\n# герой іде 2 кроки, повертає, і ще 2 кроки\n"
			},
			starter: "steps = 0\n# Нижче все готово.\nhero.move(steps)\nhero.turn_right()\nhero.move(steps)\nhero.collect()\n",
			map: corner(4, 4),
			blocks: [
				"move",
				"turnRight",
				"collect"
			],
			goals: [{ type: "crystals" }],
			uses: ["variable"],
			stars: {
				three: 7,
				two: 10
			},
			hint: "Перший рядок має бути `steps = 4`.",
			hints: [
				"Скільки клітинок у кожній частині стежки?",
				"Обидві частини однакові, тому одне число в змінній підходить для обох.",
				"`steps = _`"
			],
			scene: {
				theme: "autumn",
				item: "apple",
				props: [HOME]
			}
		},
		{
			id: "py-box-new",
			language: "python",
			tier: "intro",
			title: "Нове число в змінній",
			task: ["Тепер частини різні: вправо 2 клітинки, а вниз 4.", "Перед другою частиною поклади в змінну steps нове число."],
			lesson: {
				title: "Нове число замінює старе",
				text: ["У змінній лежить лише одне число. Коли кладеш нове, старе зникає.", "Python читає програму згори вниз. Тому герой бере те число, яке лежить у змінній саме в цю мить."],
				example: "apples = 5   # у змінній 5\napples = 7   # тепер у змінній 7, а 5 зникло\n"
			},
			starter: "steps = 2\nhero.move(steps)\nhero.turn_right()\nsteps = 2\nhero.move(steps)\nhero.collect()\n",
			map: corner(2, 4),
			blocks: [
				"move",
				"turnRight",
				"collect"
			],
			goals: [{ type: "crystals" }],
			uses: ["variable"],
			stars: {
				three: 8,
				two: 11
			},
			hint: "Другий рядок steps = … стоїть перед поворотом униз. Поклади туди 4.",
			hints: [
				"Скільки клітинок униз після повороту?",
				"Друге steps = … стоїть перед другою частиною стежки. Поклади туди нове число.",
				"steps = 2\n...\nsteps = _"
			],
			scene: {
				theme: "autumn",
				item: "apple",
				props: [HOME]
			}
		},
		{
			id: "py-box-two",
			language: "python",
			tier: "intro",
			title: "Дві змінні",
			task: ["До гарбуза 5 клітинок управо і 2 вниз.", "Поклади ці числа у дві змінні: forward і down."],
			lesson: {
				title: "У кожної змінної своя назва",
				text: [
					"Змінних може бути скільки завгодно. Їх розрізняють за назвою.",
					"Назва підказує, що лежить усередині: forward — скільки вперед, down — скільки вниз.",
					"Назву пишуть латинськими літерами, без пробілів."
				],
				example: "forward = 1\ndown = 6\n"
			},
			starter: "forward = 0\ndown = 0\n# Нижче все готово.\nhero.move(forward)\nhero.turn_right()\nhero.move(down)\nhero.collect()\n",
			map: corner(5, 2),
			blocks: [
				"move",
				"turnRight",
				"collect"
			],
			goals: [{ type: "crystals" }],
			uses: ["variable"],
			stars: {
				three: 8,
				two: 11
			},
			hint: "`forward = 5` і `down = 2`.",
			hints: [
				"Скільки клітинок управо? А скільки вниз?",
				"У forward поклади, скільки вправо, а в down — скільки вниз.",
				"forward = _\ndown = _"
			],
			scene: {
				theme: "autumn",
				item: "carrot",
				props: [HOME]
			}
		},
		{
			id: "py-box-make",
			language: "python",
			tier: "intro",
			title: "Зроби змінну сам",
			task: ["Тепер змінної немає. Зроби її сам: назва steps, а в ній 6.", "Пиши її в першому рядку, над командами героя."],
			lesson: {
				title: "Як зробити змінну",
				text: [
					"Пишеш назву, знак = і число: `steps = 6`. Так ти робиш змінну й кладеш у неї 6.",
					"Знак = тут означає **поклади**. Зліва завжди назва, справа те, що кладеш.",
					"Змінна так зветься, бо число в ній можна змінити."
				],
				example: "coins = 10   # нова змінна coins, у ній 10\n"
			},
			starter: "# Зроби тут змінну steps.\n\nhero.move(steps)\nhero.collect()\n",
			map: straight(6),
			blocks: ["move", "collect"],
			goals: [{ type: "crystals" }],
			uses: ["variable"],
			stars: {
				three: 4,
				two: 6
			},
			hint: "Перед `hero.move(steps)` додай рядок `steps = 6`.",
			hints: [
				"Чого бракує Python у рядку `hero.move(steps)`?",
				"Змінної steps ще немає. Зроби її рядком над командами.",
				"steps = _\nhero.move(steps)\nhero.collect()"
			],
			gift: {
				name: "Скринька",
				skill: "steps = 6: ти робиш змінні сам."
			},
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
			id: "py-box-case",
			language: "python",
			tier: "practice",
			title: "Велика чи мала літера",
			task: ["Робот зробив змінну, але герой не йде. Запусти програму й прочитай, що каже Python.", "Знайди помилку й виправ її."],
			lesson: {
				title: "Steps і steps — різні змінні",
				text: ["Для Python велика й мала літери різні. Steps і steps — дві різні назви.", "Тому назву змінної пиши щоразу однаково, літера в літеру."],
				example: "score = 1\nScore = 5    # це вже інша змінна\nprint(score)  # 1\n"
			},
			starter: "Steps = 4\nhero.move(steps)\nhero.collect()\n",
			map: straight(4),
			blocks: ["move", "collect"],
			goals: [{ type: "crystals" }],
			uses: ["variable"],
			stars: {
				three: 4,
				two: 6
			},
			hint: "У першому рядку Steps з великої літери, а нижче steps з малої. Зроби обидві однаковими.",
			hints: [
				"Порівняй назву змінної в першому і в другому рядку. Чи вони однакові?",
				"Steps і steps для Python різні. Зроби літери однаковими.",
				"_teps = 4\nhero.move(steps)"
			],
			scene: {
				theme: "autumn",
				item: "apple",
				props: [HOME]
			}
		},
		{
			id: "py-variable",
			language: "python",
			tier: "practice",
			title: "Команди і змінна",
			task: ["Стежка до джерела — три шматки по 3 клітинки: вправо, вниз, знову вправо.", "Змінна steps уже є. Напиши всю програму сам і пиши steps замість 3 у кожному hero.move."],
			lesson: {
				title: "Усе разом",
				text: ["Тепер ти пишеш сам і змінну, і команди. `hero.move(steps)` бере число зі змінної.", "Поворот праворуч — `hero.turn_right()`, ліворуч — `hero.turn_left()`."],
				example: "steps = 2\nhero.move(steps)\nhero.turn_left()\n"
			},
			starter: "steps = 3\n",
			map: [
				"##########",
				"#S...#####",
				"####.#####",
				"####.#####",
				"####...F##",
				"##########"
			],
			blocks: [
				"move",
				"turnLeft",
				"turnRight"
			],
			goals: [{ type: "finish" }],
			uses: ["variable"],
			stars: {
				three: 9,
				two: 12
			},
			hint: "`hero.move(steps)`, поворот праворуч, `hero.move(steps)`, поворот ліворуч, `hero.move(steps)`.",
			hints: [
				"З яких частин складається стежка? Скільки в кожній клітинок?",
				"Три рази `hero.move(steps)`, а між ними поворот праворуч і поворот ліворуч.",
				"hero.move(steps)\nhero.turn_right()\nhero.move(_____)\nhero.turn____()\nhero.move(steps)"
			],
			scene: {
				theme: "autumn",
				finish: "well",
				props: [HOME]
			}
		}
	],
	pyMath: [
		{
			id: "py-plus",
			language: "python",
			tier: "practice",
			title: "Два шматки стежки",
			task: ["Стежка до дров — два шматки: first і second. Вони вже лежать у змінних.", "Не рахуй сам. Нехай Python додасть їх просто в дужках hero.move."],
			lesson: {
				title: "Python уміє рахувати",
				text: ["Зі змінними можна рахувати: + додати, - відняти, * помножити.", "`hero.move(first + second)`: Python спершу додає, а потім герой іде стільки кроків."],
				example: "a = 2\nb = 5\nprint(a + b)   # 7\nprint(b - a)   # 3\nprint(a * b)   # 10\n"
			},
			starter: "first = 3\nsecond = 4\n",
			map: straight(7),
			blocks: ["move", "collect"],
			goals: [{ type: "crystals" }],
			uses: ["variable"],
			stars: {
				three: 7,
				two: 10
			},
			hint: "`hero.move(first + second)`, а потім `hero.collect()`.",
			hints: [
				"Скільки разом клітинок у двох шматках?",
				"Python може додати сам: first + second прямо в дужках.",
				"hero.move(first + ______)\nhero.collect()"
			],
			gift: {
				name: "Рахівниця",
				skill: "+, - і *: Python рахує за тебе."
			},
			scene: {
				theme: "autumn",
				item: "wood",
				props: [HOME, {
					kind: "woodshed",
					x: 7,
					y: -1
				}]
			}
		},
		{
			id: "py-double",
			language: "python",
			tier: "practice",
			title: "Удвічі далі",
			task: ["У змінній n лежить 3, а дрова вдвічі далі: за n * 2 клітинок.", "Не рахуй сам. Напиши n * 2 просто в дужках hero.move."],
			lesson: {
				title: "Множимо",
				text: ["Зірочка * означає **помножити**: n * 2 — удвічі більше, ніж у змінній n.", "Якщо `n = 3`, то n * 2 дає 6."],
				example: "n = 5\nhero.move(n * 2)   # 10 кроків\n"
			},
			starter: "n = 3\n",
			map: straight(6),
			blocks: ["move", "collect"],
			goals: [{ type: "crystals" }],
			uses: ["variable"],
			stars: {
				three: 5,
				two: 7
			},
			hint: "`hero.move(n * 2)`, а потім `hero.collect()`.",
			hints: [
				"Скільки це — удвічі більше, ніж 3?",
				"У дужках hero.move можна рахувати: n * 2.",
				"hero.move(n * _)\nhero.collect()"
			],
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
			id: "py-total",
			language: "python",
			tier: "practice",
			title: "Решта в змінній",
			task: ["У героя 20 гривень, а хліб коштує 7. Порахуй решту в змінну change.", "Потім скажи: Решта: і число зі змінної. І дійди до продавчині."],
			lesson: {
				title: "Результат — у змінну",
				text: [
					"Що порахував, можна покласти в змінну: `change = money - price`.",
					"Python спершу рахує праву частину, а потім кладе результат у змінну зліва.",
					"print може сказати слова і число разом. Пиши їх через кому: `print(\"Решта:\", change)`."
				],
				example: "apples = 4\npears = 3\ntotal = apples + pears\nprint(\"Разом:\", total)   # Разом: 7\n"
			},
			starter: "money = 20\nprice = 7\n",
			map: straight(4, "F"),
			blocks: ["move"],
			goals: [{ type: "finish" }],
			uses: ["variable", "print"],
			prints: "Решта: 13",
			stars: {
				three: 9,
				two: 12
			},
			hint: "`change = money - price`, потім `print(\"Решта:\", change)` і `hero.move(4)`.",
			hints: [
				"Решта — це скільки було грошей мінус ціна.",
				"Зроби змінну change, поклади в неї money - price і скажи її через print.",
				"change = money - _____\nprint(\"Решта:\", ______)\nhero.move(4)"
			],
			scene: {
				theme: "autumn",
				props: [HOME],
				npcs: below("girl", 5)
			}
		},
		{
			id: "py-count",
			language: "python",
			tier: "practice",
			title: "Рахуємо гриби",
			task: ["Бабуся просить порахувати гриби. Збери всі три, а після кожного додавай 1 у змінну mushrooms.", "Наприкінці скажи: Грибів: 3. Число візьми зі змінної."],
			lesson: {
				title: "Змінна-лічильник",
				text: ["`mushrooms = mushrooms + 1` — це не задачка з математики. Це команда.", "Вона означає: візьми число зі змінної, додай 1 і поклади назад. Було 0, стало 1."],
				example: "score = 0\nscore = score + 1   # тепер 1\nscore = score + 1   # тепер 2\nprint(\"Очки:\", score)   # Очки: 2\n"
			},
			starter: "mushrooms = 0\n",
			map: [
				"######",
				"#Sccc#",
				"######"
			],
			blocks: ["move", "collect"],
			goals: [{ type: "crystals" }],
			uses: ["variable", "print"],
			prints: "Грибів: 3",
			stars: {
				three: 18,
				two: 22
			},
			hint: "Тричі: `hero.move()`, `hero.collect()`, `mushrooms = mushrooms + 1`. Потім `print(\"Грибів:\", mushrooms)`.",
			hints: [
				"Що треба зробити біля кожного гриба, крім того, щоб узяти його?",
				"Після кожного `hero.collect()` додай 1 у змінну: `mushrooms = mushrooms + 1`.",
				"hero.move()\nhero.collect()\nmushrooms = mushrooms + _\n...\nprint(\"Грибів:\", _________)"
			],
			scene: {
				theme: "autumn",
				item: "apple",
				props: [HOME],
				npcs: [{
					who: "villager",
					x: 5,
					y: 2
				}]
			}
		}
	],
	pyTypes: [
		{
			id: "py-text-box",
			language: "python",
			tier: "intro",
			title: "Змінна зі словами",
			task: ["Дід біля вказівника хоче почути: Добрий день!", "Поклади ці слова в змінну greeting. Герой скаже їх і піде до вказівника."],
			lesson: {
				title: "У змінну можна покласти слова",
				text: ["У змінній може лежати не лише число, а й слова. Слова, як і в print, беруть у лапки: \"Привіт\".", "`print(greeting)` без лапок каже не слово greeting, а те, що лежить у змінній."],
				example: "word = \"Привіт!\"\nprint(word)   # Привіт!\n"
			},
			starter: "greeting = \"...\"\n# Нижче все готово.\nprint(greeting)\nhero.move(5)\n",
			map: straight(5, "F"),
			blocks: ["move"],
			goals: [{ type: "finish" }],
			uses: ["variable", "print"],
			prints: "Добрий день!",
			stars: {
				three: 4,
				two: 6
			},
			hint: "`greeting = \"Добрий день!\"` — з лапками і знаком оклику.",
			hints: [
				"Що хоче почути дід?",
				"Поклади в змінну greeting саме ці слова, у лапках.",
				"`greeting = \"_____ ____!\"`"
			],
			scene: {
				theme: "autumn",
				props: [HOME],
				npcs: below("grandpa", 6)
			}
		},
		{
			id: "py-text-number",
			language: "python",
			tier: "intro",
			title: "Слова і число",
			task: ["Бабуся записує, хто скільки приніс. Героя звати Тарас, і він приніс 3 яблука.", "Поклади ім'я в змінну name, а число в змінну apples."],
			lesson: {
				title: "Слова в лапках, число без лапок",
				text: [
					"Слова кладуть у змінну в лапках: `name = \"Оля\"`.",
					"Число пишуть без лапок: `apples = 5`.",
					"print може сказати кілька речей одразу. Їх пишуть через кому, а Python ставить між ними пробіл."
				],
				example: "name = \"Оля\"\napples = 5\nprint(name, \"має\", apples)   # Оля має 5\n"
			},
			starter: "name = \"?\"\napples = 0\n# Нижче все готово.\nprint(name, \"приніс яблук:\", apples)\nhero.move(4)\n",
			map: straight(4, "F"),
			blocks: ["move"],
			goals: [{ type: "finish" }],
			uses: ["variable", "print"],
			prints: "Тарас приніс яблук: 3",
			stars: {
				three: 6,
				two: 9
			},
			hint: "`name = \"Тарас\"` і `apples = 3`.",
			hints: [
				"Як звати героя? Скільки яблук він приніс?",
				"Ім'я — слова, тому в лапках. Число — без лапок.",
				"name = \"_____\"\napples = _"
			],
			scene: {
				theme: "autumn",
				finish: "grandma",
				props: [HOME]
			}
		},
		{
			id: "py-types",
			language: "python",
			tier: "intro",
			title: "5 чи \"5\"",
			task: ["Робот поклав кроки в лапках: \"5\". Герой не рушає з місця.", "Запусти програму, прочитай, що каже Python, і виправ."],
			lesson: {
				title: "Число чи слова",
				text: [
					"5 без лапок — це число. Герой може пройти 5 кроків.",
					"\"5\" у лапках — це вже слова, як напис на табличці. Ходити написом герой не вміє.",
					"Подивись на змінну steps під кодом: там видно, що в ній лежить, число чи слова."
				],
				example: "print(5 + 5)       # 10: числа додаються\nprint(\"5\" + \"5\")   # 55: слова склеюються\n"
			},
			starter: "steps = \"5\"\nhero.move(steps)\nhero.collect()\n",
			map: straight(5),
			blocks: ["move", "collect"],
			goals: [{ type: "crystals" }],
			stars: {
				three: 7,
				two: 10
			},
			hint: "Прибери лапки: `steps = 5`.",
			hints: [
				"Подивись на перший рядок. Що в ньому не так з числом 5?",
				"\"5\" у лапках — це слова. Герой ходить числом без лапок.",
				"`steps = _`"
			],
			gift: {
				name: "Лупа",
				skill: "Тепер ти відрізняєш число від слів."
			},
			scene: {
				theme: "autumn",
				item: "apple",
				props: [HOME]
			}
		},
		{
			id: "py-float-box",
			language: "python",
			tier: "intro",
			title: "Число з крапкою",
			task: ["Кошик моркви важить два з половиною кілограми.", "Поклади вагу в змінну weight, щоб герой сказав: Кошик важить 2.5 кг."],
			lesson: {
				title: "Не всі числа цілі",
				text: ["Два з половиною в Python пишуть так: 2.5. Між цілою частиною і дробовою ставлять крапку, а не кому.", "Таке число теж кладуть без лапок. Його звуть дробовим."],
				example: "price = 12.5   # дванадцять з половиною\n"
			},
			starter: "weight = 0\n# Нижче все готово.\nprint(\"Кошик важить\", weight, \"кг\")\nhero.move(3)\nhero.collect()\n",
			map: straight(3),
			blocks: ["move", "collect"],
			goals: [{ type: "crystals" }],
			uses: ["variable", "print"],
			prints: "Кошик важить 2.5 кг",
			stars: {
				three: 5,
				two: 7
			},
			hint: "`weight = 2.5` — з крапкою, без лапок.",
			hints: [
				"Як записати два з половиною в Python?",
				"Дробову частину відділяють крапкою, і число пишуть без лапок.",
				"`weight = _._`"
			],
			scene: {
				theme: "autumn",
				item: "carrot",
				props: [HOME]
			}
		},
		{
			id: "py-bool",
			language: "python",
			tier: "intro",
			title: "Так чи ні",
			task: ["Хвіртка біля хати зачинена. Відчини її: поклади в змінну door_open слово True.", "Герой скаже: Хвіртка відчинена: True."],
			lesson: {
				title: "True і False",
				text: [
					"Буває, що треба зберегти лише **так** чи **ні**. Для цього в Python є True і False.",
					"True означає **так**, False означає **ні**. Пишуть їх з великої літери і без лапок.",
					"Тепер ти знаєш чотири речі, які лежать у змінній: ціле число, число з крапкою, слова і True або False."
				],
				example: "is_raining = False   # дощу немає\n"
			},
			starter: "door_open = False\n# Нижче все готово.\nprint(\"Хвіртка відчинена:\", door_open)\nhero.move(4)\n",
			map: straight(4, "F"),
			blocks: ["move"],
			goals: [{ type: "finish" }],
			uses: ["variable", "print"],
			prints: "Хвіртка відчинена: True",
			stars: {
				three: 4,
				two: 6
			},
			hint: "`door_open = True` — з великої літери, без лапок.",
			hints: [
				"Яке слово означає **так** у Python?",
				"True пишуть з великої літери і без лапок.",
				"`door_open = ____`"
			],
			scene: {
				theme: "autumn",
				finish: "home",
				props: [HOME]
			}
		}
	],
	pyAsk: [{
		id: "py-ask",
		language: "python",
		tier: "practice",
		title: "Як вас звати?",
		task: ["Підійди до діда і спитай, як його звати. Потім привітайся: Добрий день, і його ім'я.", "Тут три поля, і на кожному інший дід."],
		lesson: {
			title: "Як спитати",
			text: [
				"`input(\"Як вас звати?\")` ставить питання й чекає відповіді. Тут відповідає дід.",
				"Відповідь кладуть у змінну: `name = input(\"Як вас звати?\")`.",
				"Ти не знаєш наперед, що скаже дід. Але змінна name запам'ятає відповідь."
			],
			example: "pet = input(\"Як звати кота?\")   # відповідь: Мурчик\nprint(\"Привіт,\", pet)           # Привіт, Мурчик\n"
		},
		starter: "hero.move(3)\n# Спитай діда, як його звати.\n",
		map: straight(3, "F"),
		inputs: ["Іван"],
		prints: "Добрий день, Іван",
		fields: [{
			map: straight(3, "F"),
			inputs: ["Петро"],
			prints: "Добрий день, Петро"
		}, {
			map: straight(3, "F"),
			inputs: ["Остап"],
			prints: "Добрий день, Остап"
		}],
		blocks: ["move"],
		goals: [{ type: "finish" }],
		uses: [
			"input",
			"variable",
			"print"
		],
		stars: {
			three: 5,
			two: 7
		},
		hint: "`name = input(\"Як вас звати?\")`, а потім `print(\"Добрий день,\", name)`.",
		hints: [
			"Що треба дізнатися в діда? Куди покласти відповідь?",
			"`name = input(\"Як вас звати?\")` питає й кладе відповідь у змінну. Потім скажи її через print.",
			"name = input(\"___ ___ ______?\")\nprint(\"Добрий день,\", ____)"
		],
		gift: {
			name: "Сурма",
			skill: "input(): герой питає."
		},
		scene: {
			theme: "autumn",
			props: [HOME],
			npcs: below("grandpa", 4)
		}
	}, {
		id: "py-ask-two",
		language: "python",
		tier: "practice",
		title: "Звідки ти?",
		task: ["Мисливець скаже два слова: своє ім'я і своє село.", "Спитай двічі, а потім скажи обидві відповіді: спершу ім'я, потім село."],
		lesson: {
			title: "Два питання — дві змінні",
			text: ["Питати можна кілька разів. Перший `input()` отримує першу відповідь, другий — другу.", "Кожну відповідь клади в окрему змінну з назвою, яка підказує, що там."],
			example: "food = input(\"Що їси?\")     # каша\ndrink = input(\"Що п'єш?\")   # чай\nprint(food, drink)          # каша чай\n"
		},
		starter: "hero.move(2)\n# Спитай ім'я, потім село.\n",
		map: straight(2, "F"),
		inputs: ["Богдан", "Липівка"],
		prints: "Богдан Липівка",
		fields: [{
			map: straight(2, "F"),
			inputs: ["Степан", "Гаї"],
			prints: "Степан Гаї"
		}],
		blocks: ["move"],
		goals: [{ type: "finish" }],
		uses: [
			"input",
			"variable",
			"print"
		],
		stars: {
			three: 8,
			two: 11
		},
		hint: "`name = input(\"Як тебе звати?\")`, `village = input(\"Звідки ти?\")`, `print(name, village)`.",
		hints: [
			"Скільки питань треба поставити?",
			"Два `input()`, кожен у свою змінну. Потім print з обома змінними через кому.",
			"name = input(\"Як тебе звати?\")\nvillage = _____(\"Звідки ти?\")\nprint(____, _______)"
		],
		scene: {
			theme: "autumn",
			props: [HOME],
			npcs: below("hunter", 3)
		}
	}],
	pyConvert: [
		{
			id: "py-sum-bug",
			language: "python",
			tier: "practice",
			title: "3 + 4 = 34?",
			task: ["Робот питає два числа й додає їх. Дід каже 3 і 4, а робот каже: Разом: 34.", "Запусти, подивись і виправ, щоб вийшло Разом: 7. На другому полі числа інші."],
			lesson: {
				title: "input() дає слова",
				text: ["Що б не сказав дід, `input()` дає слова. \"3\" + \"4\" склеюються в \"34\", як два написи.", "Зробити з напису число вміє `int()`: `int(\"3\")` дає 3. Тоді 3 + 4 дасть 7."],
				example: "print(\"3\" + \"4\")             # 34\nprint(int(\"3\") + int(\"4\"))   # 7\n"
			},
			starter: "a = input(\"Перше число?\")\nb = input(\"Друге число?\")\nprint(\"Разом:\", a + b)\nhero.move(2)\n",
			map: straight(2, "F"),
			inputs: ["3", "4"],
			prints: "Разом: 7",
			fields: [{
				map: straight(2, "F"),
				inputs: ["5", "1"],
				prints: "Разом: 6"
			}],
			blocks: ["move"],
			goals: [{ type: "finish" }],
			uses: [
				"input",
				"int",
				"print"
			],
			stars: {
				three: 11,
				two: 14
			},
			hint: "`a = int(input(\"Перше число?\"))` і так само b.",
			hints: [
				"Чому вийшло 34, а не 7? Що дає `input()`: число чи слова?",
				"Загорни кожен `input()` в `int()`, щоб відповідь стала числом.",
				"a = int(input(\"Перше число?\"))\nb = ___(input(\"Друге число?\"))"
			],
			gift: {
				name: "Перетворювач",
				skill: "int(): зі слів виходить число."
			},
			scene: {
				theme: "autumn",
				props: [HOME],
				npcs: below("grandpa", 3)
			}
		},
		{
			id: "py-input",
			language: "python",
			tier: "practice",
			title: "Дід підкаже кроки",
			task: ["Дрова щоразу лежать деінде, а дід знає, скільки до них кроків.", "Спитай діда, зроби стільки кроків і візьми дрова. Тут три поля."],
			lesson: {
				title: "Відповідь — це слова",
				text: [
					"Що б не сказав дід, `input()` дає слова. Навіть \"3\" для Python — це напис, а не число.",
					"Зробити з напису число вміє `int()`: `int(\"3\")` дає 3.",
					"Тому відповідь загортають в `int()`: `steps = int(input(\"Скільки кроків?\"))`."
				],
				example: "age = int(input(\"Скільки тобі років?\"))   # \"11\" стало числом 11\nprint(age + 1)                           # 12\n"
			},
			starter: "# Спитай діда, скільки кроків.\n",
			map: straight(3),
			inputs: ["3"],
			fields: [{
				map: straight(5),
				inputs: ["5"]
			}, {
				map: straight(7),
				inputs: ["7"]
			}],
			blocks: ["move", "collect"],
			goals: [{ type: "crystals" }],
			uses: ["input"],
			stars: {
				three: 6,
				two: 9
			},
			hint: "`steps = int(input(\"Скільки кроків?\"))`, потім `hero.move(steps)` і `hero.collect()`.",
			hints: [
				"Що дає `input()`: число чи слова? А чим ходить герой?",
				"Загорни відповідь в `int()`, поклади в змінну і йди стільки кроків.",
				"steps = ___(input(\"Скільки кроків?\"))\nhero.move(_____)\nhero.collect()"
			],
			scene: {
				theme: "autumn",
				item: "wood",
				props: [HOME],
				npcs: [{
					who: "grandpa",
					x: 1,
					y: 2
				}]
			}
		},
		{
			id: "py-two-answers",
			language: "python",
			tier: "practice",
			title: "Два числа",
			task: ["Мисливець підкаже дорогу до гарбуза: скільки йти прямо і скільки вниз після повороту праворуч.", "Спитай двічі. Кожну відповідь зроби числом і поклади в свою змінну."],
			lesson: {
				title: "Два числа від мисливця",
				text: ["Тут усе як раніше: два питання, дві змінні.", "Тільки кожну відповідь загортаєш в `int()`, бо герой ходить числами, а не словами."],
				example: "a = int(input(\"Перше число?\"))   # 4\nb = int(input(\"Друге число?\"))   # 6\n"
			},
			starter: "# Спитай, скільки йти прямо, а потім скільки вниз.\n",
			map: corner(3, 2),
			inputs: ["3", "2"],
			fields: [{
				map: corner(5, 3),
				inputs: ["5", "3"]
			}, {
				map: corner(2, 4),
				inputs: ["2", "4"]
			}],
			blocks: [
				"move",
				"turnLeft",
				"turnRight",
				"collect"
			],
			goals: [{ type: "crystals" }],
			uses: ["input", "variable"],
			stars: {
				three: 12,
				two: 15
			},
			hint: "Дві змінні з `int(input(…))`, потім `hero.move(перша)`, `hero.turn_right()`, `hero.move(друга)`, `hero.collect()`.",
			hints: [
				"Скільки питань треба поставити мисливцю?",
				"Дві змінні, кожна з `int(input(…))`. Потім вправо, поворот праворуч, униз.",
				"forward = int(input(\"Скільки прямо?\"))\ndown = ___(_____(\"Скільки вниз?\"))\nhero.move(forward)\nhero.turn_right()\nhero.move(____)\nhero.collect()"
			],
			scene: {
				theme: "autumn",
				item: "carrot",
				props: [HOME],
				npcs: [{
					who: "hunter",
					x: 1,
					y: 2
				}]
			}
		},
		{
			id: "py-float-input",
			language: "python",
			tier: "practice",
			title: "Скільки важить?",
			task: ["Бабуся зважила кошик і скаже вагу. Вага буває з крапкою: 2.5.", "Спитай вагу, зроби з неї число і скажи: Кошик важить, число і кг."],
			lesson: {
				title: "Слова в число з крапкою",
				text: ["`int()` робить лише цілі числа. Напис \"2.5\" він не зрозуміє.", "Для чисел з крапкою є `float()`: `float(\"2.5\")` дає 2.5."],
				example: "price = float(input(\"Скільки коштує?\"))   # \"7.5\" стало 7.5\n"
			},
			starter: "hero.move(3)\n# Спитай вагу кошика.\n",
			map: straight(3, "F"),
			inputs: ["2.5"],
			prints: "Кошик важить 2.5 кг",
			fields: [{
				map: straight(3, "F"),
				inputs: ["3.5"],
				prints: "Кошик важить 3.5 кг"
			}],
			blocks: ["move"],
			goals: [{ type: "finish" }],
			uses: [
				"input",
				"float",
				"print"
			],
			stars: {
				three: 6,
				two: 9
			},
			hint: "`weight = float(input(\"Скільки важить?\"))`, потім `print(\"Кошик важить\", weight, \"кг\")`.",
			hints: [
				"Вага з крапкою. Чи впорається з нею `int()`?",
				"Для чисел з крапкою є `float()`. Загорни в нього `input()`.",
				"weight = _____(input(\"Скільки важить?\"))\nprint(\"Кошик важить\", ______, \"кг\")"
			],
			scene: {
				theme: "autumn",
				finish: "grandma",
				props: [HOME]
			}
		},
		{
			id: "py-to-text",
			language: "python",
			tier: "practice",
			title: "Число в слова",
			task: ["Робот хотів сказати: Яблук: 3. Але Python сварить на другий рядок.", "Запусти, прочитай, що каже Python, і виправ."],
			lesson: {
				title: "Слова і число не склеюються",
				text: ["Знак + склеює слова зі словами: \"Добрий\" + \" день\". А слова з числом не склеює.", "`str()` робить із числа слова: `str(3)` дає \"3\". Тепер їх можна склеїти."],
				example: "coins = 5\nprint(\"Монет: \" + str(coins))   # Монет: 5\n"
			},
			starter: "apples = 3\nprint(\"Яблук: \" + apples)\nhero.move(2)\n",
			map: straight(2, "F"),
			blocks: ["move"],
			goals: [{ type: "finish" }],
			uses: ["str", "print"],
			prints: "Яблук: 3",
			stars: {
				three: 6,
				two: 9
			},
			hint: "`print(\"Яблук: \" + str(apples))`.",
			hints: [
				"Python каже, що не може додати слова і число. Що з них треба змінити?",
				"`str(apples)` робить із числа слова, і тоді їх можна склеїти.",
				"`print(\"Яблук: \" + ___(apples))`"
			],
			gift: {
				name: "Перо",
				skill: "str(): із числа виходять слова."
			},
			scene: {
				theme: "autumn",
				finish: "grandma",
				props: [HOME]
			}
		},
		{
			id: "py-change",
			language: "python",
			tier: "practice",
			title: "Решта",
			task: ["У героя 20 гривень. Дійди до продавчині й спитай, скільки коштує хліб.", "Порахуй решту і скажи: Решта: і число. На другому полі ціна інша."],
			lesson: {
				title: "Віднімаємо",
				text: ["Решта — це скільки грошей було мінус ціна. У Python це 20 - price.", "Ціну дає `input()`, тому не забудь загорнути її в `int()`."],
				example: "money = 50\nprice = 30\nprint(\"Залишилось:\", money - price)   # Залишилось: 20\n"
			},
			starter: "hero.move(4)\n# Спитай ціну хліба.\n",
			map: straight(4, "F"),
			inputs: ["12"],
			prints: "Решта: 8",
			fields: [{
				map: straight(4, "F"),
				inputs: ["15"],
				prints: "Решта: 5"
			}],
			blocks: ["move"],
			goals: [{ type: "finish" }],
			uses: [
				"input",
				"int",
				"print"
			],
			stars: {
				three: 7,
				two: 10
			},
			hint: "`price = int(input(\"Скільки коштує хліб?\"))`, потім `print(\"Решта:\", 20 - price)`.",
			hints: [
				"Решта — це скільки було мінус ціна. А ціну дізнаєшся в продавчині.",
				"Спитай ціну через `int(input(…))`, а потім скажи 20 - price.",
				"price = int(input(\"Скільки коштує хліб?\"))\nprint(\"Решта:\", __ - _____)"
			],
			scene: {
				theme: "autumn",
				props: [HOME],
				npcs: below("girl", 5)
			}
		},
		{
			id: "py-market",
			language: "python",
			tier: "practice",
			title: "На ярмарку",
			task: ["Бабуся послала по яблука: треба 3 кілограми. Дійди до ярмарку й спитай, скільки коштує кілограм.", "Порахуй, скільки заплатити, і скажи: Разом: і суму. На другому полі ціна інша."],
			lesson: {
				title: "Множимо",
				text: ["Ціна буває з копійками: 12.5. Тому відповідь загортай у `float()`.", "Три кілограми коштують утричі більше: price * 3. Зірочка * — це **помножити**."],
				example: "price = float(\"2.5\")\nprint(price * 3)   # 7.5\n"
			},
			starter: "# Дійди до ярмарку, спитай ціну й порахуй суму.\n",
			map: straight(4, "F"),
			inputs: ["12.5"],
			prints: "Разом: 37.5",
			fields: [{
				map: straight(4, "F"),
				inputs: ["8.5"],
				prints: "Разом: 25.5"
			}],
			blocks: ["move"],
			goals: [{ type: "finish" }],
			uses: [
				"input",
				"float",
				"print"
			],
			stars: {
				three: 9,
				two: 12
			},
			hint: "`price = float(input(\"Скільки коштує кілограм?\"))`, потім `total = price * 3` і `print(\"Разом:\", total)`.",
			hints: [
				"Ціна з копійками. Яким перетворенням зробити з неї число?",
				"`float(input(…))` дає ціну, а price * 3 — ціну трьох кілограмів.",
				"price = float(input(\"Скільки коштує кілограм?\"))\ntotal = price * _\nprint(\"Разом:\", _____)"
			],
			scene: {
				theme: "autumn",
				props: [HOME],
				npcs: [{
					who: "villager",
					x: 5,
					y: 2
				}]
			}
		},
		{
			id: "py-stairs",
			language: "python",
			tier: "challenge",
			title: "Сходинки до джерела",
			task: ["Дід каже довжину сходинки. Іди так: сходинка вправо, сходинка вниз, а останній шматок до джерела вдвічі довший.", "Спитай лише раз, а довжину останнього шматка порахуй у програмі."],
			lesson: {
				title: "Рахуємо в дужках",
				text: ["`hero.move(n * 2)` — удвічі більше кроків, ніж лежить у змінній n.", "Якщо `n = 3`, герой пройде 6 кроків."],
				example: "n = 4\nprint(n * 2)   # 8\n"
			},
			starter: "# Спитай довжину сходинки.\n",
			map: stairs(2),
			inputs: ["2"],
			fields: [{
				map: stairs(3),
				inputs: ["3"]
			}],
			blocks: [
				"move",
				"turnLeft",
				"turnRight"
			],
			goals: [{ type: "finish" }],
			uses: ["input", "variable"],
			stars: {
				three: 12,
				two: 15
			},
			hint: "`n = int(input(…))`; вправо n, поворот праворуч, вниз n, поворот ліворуч, і `hero.move(n * 2)`.",
			hints: [
				"Скільки разів треба спитати діда?",
				"Один `int(input(…))` у змінну n. Перші два шматки — n, останній — n * 2.",
				"n = int(input(\"Яка довжина сходинки?\"))\nhero.move(n)\nhero.turn_right()\nhero.move(_)\nhero.turn_left()\nhero.move(n * _)"
			],
			scene: {
				theme: "autumn",
				finish: "well",
				props: [HOME],
				npcs: [{
					who: "grandpa",
					x: 1,
					y: 2
				}]
			}
		}
	]
};
var pythonLevels = Object.values(pythonLevelGroups).flat();
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
			"b-loop",
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
			"g5-snake",
			"b-branch"
		]
	},
	{
		id: "while",
		title: "Цикл «поки»",
		skill: "Повторювати, доки не справдиться умова, навіть не знаючи, скільки разів.",
		levels: [
			"g4-until",
			"b-until",
			"g5-bridge",
			"g5-way-home",
			"g6-spiral",
			"g6-maze"
		]
	},
	{
		id: "logic",
		title: "Правда чи ні",
		skill: "Скласти умову з частин: «і», «або», «не». Умова буває правдою або неправдою.",
		levels: [
			"l-mill",
			"l-fish",
			"l-drift"
		]
	},
	{
		id: "store",
		title: "Склад і ходки",
		skill: "Носити не більше, ніж уміщається в руки: рахувати ходки й вертатися на склад, коли руки повні.",
		levels: [
			"s-woodshed",
			"s-two-hands",
			"s-trips",
			"s-last-trip"
		]
	},
	{
		id: "gates",
		title: "Важелі й ворота",
		skill: "Перевірити стан, перш ніж діяти: тягнути лише вимкнений важіль, склавши умову з «і» та «не».",
		levels: [
			"w-lever",
			"w-careful",
			"w-row",
			"w-yard"
		]
	},
	{
		id: "pick",
		title: "Що тут лежить?",
		skill: "Спитати, що саме лежить під ногами, і взяти лише потрібне: питання з вибором у самому блоці.",
		levels: [
			"k-carrots",
			"k-eggs",
			"k-garden"
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
		id: "guards",
		title: "Вартові й патрулі",
		skill: "Вороги ходять і помічають героя: чекати слушної миті, реагувати на ворога й не трапитися йому на очі.",
		levels: [
			"v-ambush",
			"v-unseen",
			"v-patrol"
		]
	},
	{
		id: "counter",
		title: "Лічильник",
		skill: "Рахувати змінною, що змінюється в циклі: щоразу на крок більше.",
		levels: ["c-apples", "c-spiral"]
	},
	{
		id: "functions",
		title: "Власні блоки (функції)",
		skill: "Скласти свій блок із команд, що повторюються, і кликати його, де треба: у програмі, у циклі, в «якщо».",
		levels: [
			"f-stairs",
			"b-define",
			"f-apples",
			"c-stones",
			"f-bushes",
			"c-rocks"
		]
	}
];
/** What each chapter of «Python: перші кроки» is called and teaches. */
var pythonStartTitles = {
	pyHero: {
		title: "Команди героя",
		skill: "Писати героєві команди: крок, кілька кроків, поворот, взяти, сказати. І читати помилки."
	},
	pyBoxes: {
		title: "Змінна",
		skill: "Зрозуміти, що змінна — це ніби скринька з назвою, і класти в неї числа."
	},
	pyMath: {
		title: "Рахуємо",
		skill: "Додавати, віднімати й множити числа зі змінних і класти результат у змінну."
	},
	pyTypes: {
		title: "Що лежить у змінній",
		skill: "Класти в змінну ціле число, число з крапкою, слова в лапках і True або False."
	},
	pyAsk: {
		title: "Питаємо",
		skill: "Спитати через input() і покласти відповідь у змінну."
	},
	pyConvert: {
		title: "Слова чи число",
		skill: "Робити зі слів число через int() і float(), а з числа слова через str(), і розв'язувати задачки."
	}
};
/**
* «Python: перші кроки»: six small chapters only for Python, before the course, for students who meet variables,
* `print` and `input()` for the first time. They are not in `chapters`, the course of blocks and Python alike; see
* `courseChapters`.
*/
var pythonStartChapters = Object.keys(pythonLevelGroups).map((id) => ({
	id,
	...pythonStartTitles[id],
	levels: pythonLevelGroups[id].map((l) => l.id)
}));
/** Whether a chapter is one of «Python: перші кроки», the chapters before the course. */
var isPythonStartChapter = (chapter) => pythonStartChapters.includes(chapter);
/** The words before a chapter's title: «Вступ 1»…«Вступ 6» for «Python: перші кроки», «Глава N» for the course. */
var chapterLabel = (chapter) => isPythonStartChapter(chapter) ? `Вступ ${pythonStartChapters.indexOf(chapter) + 1}` : `Глава ${chapters.indexOf(chapter) + 1}`;
/** The chapters a student sees: the Python course starts with the chapters of «Python: перші кроки». */
var courseChapters = (language) => language === "python" ? [...pythonStartChapters, ...chapters] : chapters;
[...pythonLevels, ...levels];
/** The chapter of a level, or undefined for a level outside the course (a teacher's task). */
var chapterOf = (levelId) => courseChapters("python").find((c) => c.levels.includes(levelId));
// src/ui/Hud.tsx
/**
* The levels of the chapter as squares: passed, this one, still ahead. When the app can open a level, the other
* squares are buttons that open it.
*/
var ChapterLevels = ({ ids, current, progress, onLevel }) => {
	const place = ids.indexOf(current) + 1;
	return /* @__PURE__ */ jsx("ol", {
		className: "eb-hud-levels",
		"aria-label": `Рівень ${place} з ${ids.length}`,
		children: ids.map((id, i) => {
			const done = (progress[id] ?? 0) > 0;
			const now = id === current;
			const kind = now ? "eb-hud-dot eb-hud-dot-now" : done ? "eb-hud-dot eb-hud-dot-done" : "eb-hud-dot";
			if (onLevel === void 0 || now) return /* @__PURE__ */ jsx("li", {
				className: kind,
				"aria-hidden": onLevel === void 0 ? true : void 0,
				"aria-current": now ? "step" : void 0,
				children: i + 1
			}, id);
			return /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("button", {
				type: "button",
				className: `${kind} eb-hud-dot-go`,
				onClick: () => onLevel(id),
				"aria-label": `Рівень ${i + 1}${done ? ", пройдено" : ""}`,
				title: `Рівень ${i + 1}`,
				children: i + 1
			}) }, id);
		})
	});
};
/** The hero's portrait, level and XP to the next level, and the coins when the app keeps them. */
var HeroBadge = ({ skin, total, coins, onPickHero }) => {
	const hero = heroLevelOf(total);
	const share = hero.next === null ? 1 : (total - hero.from) / (hero.next - hero.from);
	const name = HEROES.find((h) => h.id === skin)?.name ?? "";
	const portrait = /* @__PURE__ */ jsx("span", {
		className: "eb-avatar",
		"aria-hidden": "true",
		children: /* @__PURE__ */ jsx(ArtIcon, {
			id: HERO_ART[skin],
			size: 36
		})
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "eb-hud-hero",
		children: [
			onPickHero === void 0 ? portrait : /* @__PURE__ */ jsxs("button", {
				type: "button",
				className: "eb-hud-pick",
				onClick: onPickHero,
				"aria-label": `Герой: ${name}. Змінити героя`,
				title: "Змінити героя",
				children: [portrait, /* @__PURE__ */ jsx("span", {
					className: "eb-hud-pick-label",
					"aria-hidden": "true",
					children: "Змінити"
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "eb-hud-xp",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "eb-hud-xp-line",
					children: [/* @__PURE__ */ jsxs("span", { children: [
						name,
						" · рівень ",
						hero.level
					] }), /* @__PURE__ */ jsxs("b", { children: [
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
			}),
			coins !== void 0 && /* @__PURE__ */ jsxs("p", {
				className: "eb-hud-coins",
				"aria-label": `Монет: ${coins}`,
				children: [
					/* @__PURE__ */ jsx(Coin, {}),
					" ",
					coins
				]
			})
		]
	});
};
/**
* The bar over the game: the way back to the map, the chapter with its levels, and the hero with the XP. A level
* outside the course (a teacher's task) shows its title instead of the chapter.
*/
var Hud = ({ level, skin, xpTotal, coinsTotal, progress, onMap, onLevel, onPickHero }) => {
	const chapter = chapterOf(level.id);
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
					children: chapter !== void 0 ? `${chapterLabel(chapter)} · ${chapter.title}` : isEstateLevel(level.id) || isFarmLevel(level.id) ? level.title : "Завдання"
				}), chapter !== void 0 && /* @__PURE__ */ jsx(ChapterLevels, {
					ids: chapter.levels,
					current: level.id,
					progress,
					onLevel
				})]
			}),
			xpTotal !== void 0 && /* @__PURE__ */ jsx(HeroBadge, {
				skin,
				total: xpTotal,
				coins: coinsTotal,
				onPickHero
			})
		]
	});
};
// src/ui/Quest.tsx
/** The task of the level on parchment: what to do, the goals that tick as the hero meets them, and the star sizes. */
var Quest = ({ level, start, world }) => /* @__PURE__ */ jsxs("div", {
	className: "eb-quest eb-frame eb-parchment",
	role: "group",
	"aria-label": "Завдання",
	children: [
		level.title !== "" && /* @__PURE__ */ jsx("h2", { children: level.title }),
		level.task.map((line) => /* @__PURE__ */ jsx("p", { children: /* @__PURE__ */ jsx(RichText, { text: line }) }, line)),
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
// src/core/terrain.ts
/**
* Autotiles, as LDtk and Tiled paint them: a level says which ground lies on which cell (`Scene.terrain`), and the
* tile of each cell is picked from its neighbours, so a path gets its edges and its corners by itself. Pure: the field
* draws the tiles, the editor paints the letters, the tests read both.
*/
/** Sides where a cell's ground ends: north 1, east 2, south 4, west 8, as `TileInfo.mask`. */
var N = 1;
var E = 2;
var S = 4;
var W = 8;
/** Inner corners, where both sides go on and the diagonal does not: NE 1, SE 2, SW 4, NW 8, as `TileInfo.cornerMask`. */
var NE = 1;
var SE = 2;
var SW = 4;
var NW = 8;
/** One cell in this many shows a variant of a whole tile (grass with tufts) in place of the plain one. */
var VARIANT_EVERY = 4;
/** A ground of a described tileset: `"ninja-adventure:tileset/floor#path"` is the sprite and the terrain in it. */
var parseTerrainRef = (ref) => {
	const at = ref.lastIndexOf("#");
	if (at <= 0 || at === ref.length - 1) return null;
	return {
		sprite: ref.slice(0, at),
		terrain: ref.slice(at + 1)
	};
};
/** Where a cell's ground ends and which of its inner corners are open, given which cells have the same ground. */
var shapeAt = (same, x, y) => {
	const n = same(x, y - 1);
	const e = same(x + 1, y);
	const s = same(x, y + 1);
	const w = same(x - 1, y);
	return {
		mask: (n ? 0 : N) | (e ? 0 : E) | (s ? 0 : S) | (w ? 0 : W),
		corners: (n && e && !same(x + 1, y - 1) ? NE : 0) | (s && e && !same(x + 1, y + 1) ? SE : 0) | (s && w && !same(x - 1, y + 1) ? SW : 0) | (n && w && !same(x - 1, y - 1) ? NW : 0)
	};
};
var bitCount = (n) => (n & 1) + (n >> 1 & 1) + (n >> 2 & 1) + (n >> 3 & 1);
/** A stable number for a cell, so variants do not change from one drawing to the next. */
var hashOf = (x, y) => {
	let h = Math.imul(x + 7, 73856093) ^ Math.imul(y + 13, 19349663);
	h = Math.imul(h ^ h >>> 13, 1274126177);
	return (h ^ h >>> 16) >>> 0;
};
/** The whole tile of a cell: mostly the first (plain) one, now and then a variant. */
var variantOf = (tiles, x, y) => {
	if (tiles.length <= 1) return tiles[0] ?? null;
	const h = hashOf(x, y);
	return h % VARIANT_EVERY === 0 ? tiles[1 + (h >>> 8) % (tiles.length - 1)] ?? null : tiles[0] ?? null;
};
/**
* The tile (numbered from 1) of `terrain` for a cell of this shape, or null when the tileset has nothing near it.
* Without a tile for every open inner corner, the one with the most of them (and no others) stands in; the edges
* must match. A whole cell now and then shows a `variant` tile: grass with a tuft.
*/
var pickTile = (tiles, terrain, shape, x = 0, y = 0) => {
	if (shape.mask === 0 && shape.corners === 0) {
		const whole = tiles.filter((t) => t.terrain === terrain && (t.mask ?? 0) === 0 && (t.cornerMask ?? 0) === 0);
		const plain = whole.filter((t) => t.role === "fill").map((t) => t.index);
		if (plain.length > 0) return variantOf([...plain.slice(0, 1), ...whole.filter((t) => t.role === "variant").map((t) => t.index)], x, y);
	}
	const own = tiles.filter((t) => t.terrain === terrain && (t.role === "fill" || t.role === "edge") && (t.mask ?? 0) === shape.mask);
	let best = [];
	let bestBits = -1;
	for (const t of own) {
		const corners = t.cornerMask ?? 0;
		if ((corners & ~shape.corners) !== 0) continue;
		const bits = bitCount(corners);
		if (bits > bestBits) {
			best = [t.index];
			bestBits = bits;
		} else if (bits === bestBits) best.push(t.index);
	}
	return variantOf(best, x, y);
};
/** The letter of a cell; outside the rows it is empty. */
var letterAt = (paint, x, y) => paint.rows[y]?.[x] ?? ".";
/** The level cell of the first cell of `rows`. */
var originOf = (paint) => ({
	x: paint.x ?? 0,
	y: paint.y ?? 0
});
/**
* The tiles of one ground of a painting, in level coordinates. `tilesOf` gives the described tiles of a tileset by its
* sprite reference (null while it loads). A cell with no fitting tile is left out.
*/
var paintTiles = (paint, letter, tilesOf) => {
	const ref = paint.kinds[letter];
	const parsed = ref === void 0 ? null : parseTerrainRef(ref);
	const tiles = parsed === null ? null : tilesOf(parsed.sprite);
	if (parsed === null || tiles === null) return [];
	const { x: ox, y: oy } = originOf(paint);
	const same = (x, y) => letterAt(paint, x, y) === letter;
	const out = [];
	paint.rows.forEach((row, y) => {
		for (let x = 0; x < row.length; x++) {
			if (row[x] !== letter) continue;
			const tile = pickTile(tiles, parsed.terrain, shapeAt(same, x, y), ox + x, oy + y);
			if (tile !== null) out.push({
				x: ox + x,
				y: oy + y,
				tile
			});
		}
	});
	return out;
};
/** The whole tiles of the base ground over a rectangle of level cells: grass with a tuft here and there. */
var baseTiles = (ref, view, tilesOf) => {
	const parsed = parseTerrainRef(ref);
	const tiles = parsed === null ? null : tilesOf(parsed.sprite);
	if (parsed === null || tiles === null) return [];
	const out = [];
	for (let y = view.y; y < view.y + view.height; y++) for (let x = view.x; x < view.x + view.width; x++) {
		const tile = pickTile(tiles, parsed.terrain, {
			mask: 0,
			corners: 0
		}, x, y);
		if (tile !== null) out.push({
			x,
			y,
			tile
		});
	}
	return out;
};
/** The level cells a painting covers with a ground, as `x,y` keys: no tree or bush of the meadow grows there. */
var paintedCells = (paint) => {
	const { x: ox, y: oy } = originOf(paint);
	return paint.rows.flatMap((row, y) => [...row].flatMap((c, x) => c === "." || paint.kinds[c] === void 0 ? [] : [`${ox + x},${oy + y}`]));
};
/** The grounds of a painting in drawing order: the letters as `kinds` lists them. */
var paintLetters = (paint) => Object.keys(paint.kinds).filter((k) => k !== ".");
// src/core/tilemap.ts
/** The tiles of one layer that are not empty, in level coordinates, row by row. */
var layerTiles = (map, layer) => {
	const ox = map.x ?? 0;
	const oy = map.y ?? 0;
	const tiles = [];
	for (let i = 0; i < Math.min(layer.data.length, map.width * map.height); i++) {
		const tile = layer.data[i] ?? 0;
		if (tile > 0) tiles.push({
			x: ox + i % map.width,
			y: oy + Math.floor(i / map.width),
			tile
		});
	}
	return tiles;
};
/**
* The tiles of every layer of a kind, in layer order. A layer that waits for an upgrade (`when`) is left out unless
* `waiting` is set: the field shows it only after `tilemapFor`.
*/
var tilesOfKind = (map, kind, waiting = false) => map.layers.filter((l) => l.kind === kind && (waiting || l.when === void 0)).flatMap((l) => layerTiles(map, l));
/** The cells the map covers, in level coordinates: the field shows exactly these. */
var tilemapView = (map) => ({
	x: map.x ?? 0,
	y: map.y ?? 0,
	width: map.width,
	height: map.height
});
// src/ui/look.ts
var SUMMER = {
	weather: null,
	icy: false,
	decor: DECOR_ART
};
var WINTER = {
	weather: "snow",
	icy: true,
	tint: "rgba(236, 244, 255, 0.6)",
	plants: "saturate(0.25) brightness(1.35)",
	decor: {
		petals: null,
		flower: null,
		tuft: DECOR_ART.clover,
		clover: DECOR_ART.clover,
		sprout: null
	}
};
var SEASONS = {
	spring: {
		weather: "rain",
		icy: false,
		tint: "rgba(120, 220, 120, 0.08)",
		decor: DECOR_ART
	},
	summer: SUMMER,
	autumn: {
		weather: "leaves",
		icy: false,
		tint: "rgba(214, 140, 40, 0.18)",
		plants: "hue-rotate(-50deg) saturate(1.3)",
		decor: {
			...DECOR_ART,
			sprout: DECOR_ART.petals
		}
	},
	winter: WINTER
};
var seasonOf = (scene) => SEASONS[scene.theme ?? "summer"];
/** The cells a prop takes on the map, from its top-left cell: what the level and the editor count with. */
var PROPS = {
	house: {
		width: 4,
		height: 3
	},
	woodshed: {
		width: 3,
		height: 2
	},
	appleTree: {
		width: 1.5,
		height: 1.5
	}
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
var MIN_MARGIN = 3;
/** Plateau sizes to try in the meadow, biggest first: width and rows of grass on top. */
var PLATEAUS = [
	[5, 2],
	[4, 2],
	[3, 2],
	[4, 1],
	[3, 1]
];
var MAX_PLATEAUS = 3;
var TREE_CHANCE = 3;
var MEADOW_TREE_CHANCE = 5;
var PATH_DECOR_CHANCE = 4;
/** Out of 10 meadow cells: 2 get a bush or a stone, 3 a flower or grass, the rest stay plain. */
var MEADOW_OBSTACLES = 2;
var MEADOW_DECOR = 5;
/** Sheep in the meadow: one for this many meadow cells, at most `MAX_SHEEP`. */
var CELLS_PER_SHEEP = 60;
var MAX_SHEEP = 4;
/** A small integer hash of a cell: the same cell always gets the same number. */
var cellHash = (x, y, salt = 0) => {
	let h = Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663) ^ Math.imul(salt + 1, 83492791);
	h = Math.imul(h ^ h >>> 13, 1274126177);
	return (h ^ h >>> 16) >>> 0;
};
var pick = (list, hash) => list[hash % list.length];
var buildScenery = (world, { reserved = /* @__PURE__ */ new Set(), bareWalls = false, water = /* @__PURE__ */ new Set() } = {}) => {
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
	const plateau = /* @__PURE__ */ new Set();
	const cliffs = /* @__PURE__ */ new Set();
	const near = (x, y, keys) => {
		for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (keys.has(cellKey(x + dx, y + dy))) return true;
		return false;
	};
	const roomy = (x, y) => x >= view.x && y >= view.y && x < view.x + view.width && y < view.y + view.height && !(x >= -1 && y >= -1 && x <= world.width && y <= world.height) && !near(x, y, water) && !near(x, y, plateau) && !near(x, y, cliffs) && !reserved.has(cellKey(x, y));
	const spots = [];
	for (const [w, h] of PLATEAUS) for (let y = view.y; y + h < view.y + view.height; y++) for (let x = view.x; x + w <= view.x + view.width; x++) spots.push({
		x,
		y,
		w,
		h,
		hash: cellHash(x, y, 16 + w * 3 + h)
	});
	spots.sort((a, b) => b.w * b.h - a.w * a.h || a.hash - b.hash);
	let raised = 0;
	for (const spot of spots) {
		if (raised >= MAX_PLATEAUS) break;
		const cells = [];
		for (let j = 0; j <= spot.h; j++) for (let i = 0; i < spot.w; i++) cells.push({
			x: spot.x + i,
			y: spot.y + j
		});
		if (!cells.every((c) => roomy(c.x, c.y))) continue;
		for (const c of cells) (c.y === spot.y + spot.h ? cliffs : plateau).add(cellKey(c.x, c.y));
		raised++;
	}
	const taken = /* @__PURE__ */ new Set([
		...reserved,
		...water,
		...cliffs,
		...plateau
	]);
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
	for (const key of plateau) taken.delete(key);
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
	const blockedByThings = /* @__PURE__ */ new Set([
		...taken,
		...plateau,
		...obstacles.map((o) => cellKey(o.x, o.y))
	]);
	const free = (x, y) => !inside(x, y) && x >= view.x && x < view.x + view.width && y >= view.y && y < view.y + view.height && !blockedByThings.has(cellKey(x, y));
	const pastures = [];
	for (let y = view.y; y < view.y + view.height; y++) for (let x = view.x; x < view.x + view.width - 1; x++) if (free(x, y) && free(x + 1, y)) pastures.push({
		x,
		y
	});
	const meadowCells = view.width * view.height - world.width * world.height;
	const count = Math.min(MAX_SHEEP, Math.floor(meadowCells / CELLS_PER_SHEEP));
	const sheep = [];
	for (const p of [...pastures].sort((a, b) => cellHash(a.x, a.y, 14) - cellHash(b.x, b.y, 14))) {
		if (sheep.length >= count) break;
		if (sheep.some((o) => Math.abs(o.x - p.x) < 4 && Math.abs(o.y - p.y) < 3)) continue;
		sheep.push(p);
	}
	return {
		view,
		trees,
		obstacles,
		decor,
		water,
		plateau,
		cliffs,
		sheep
	};
};
/**
* Pond shapes to try for a spring, biggest first: the first that fits next to the goal without covering the path.
* Cut corners make a pond look round, not like a box.
*/
var POND_SHAPES = [
	[
		".~~.",
		"~~~~",
		"~~~.",
		".~.."
	],
	[
		".~~.",
		"~~~~",
		".~~."
	],
	[
		".~.",
		"~~~",
		"~~~",
		".~."
	],
	["~~~", ".~~"],
	[
		".~",
		"~~",
		"~."
	],
	["~~", "~~"],
	["~~"],
	["~", "~"],
	["~"]
];
var shapeCells = (shape, x, y) => shape.flatMap((row, j) => [...row].flatMap((ch, i) => ch === "~" ? [{
	x: x + i,
	y: y + j
}] : []));
var inside = (w, x, y) => x >= 0 && y >= 0 && x < w.width && y < w.height;
/** Where the hero can stand: water never goes there. */
var open = (w, x, y) => inside(w, x, y) && !w.walls.has(cellKey(x, y));
/** The cells a level paints with water, without those the hero walks on. */
var painted = (world, scene) => {
	const paint = scene.water;
	if (paint === void 0) return [];
	const ox = paint.x ?? 0;
	const oy = paint.y ?? 0;
	return paint.rows.flatMap((row, dy) => [...row].flatMap((ch, dx) => ch === "~" && !open(world, ox + dx, oy + dy) ? [{
		x: ox + dx,
		y: oy + dy
	}] : []));
};
/**
* The pond of a spring: the biggest block of cells next to the goal that are not the path, the house or a villager,
* and the one that lies most straight ahead of the hero who comes to the goal along the path. Null when the goal
* stands in a corner with no room.
*/
var springPond = (world, reserved = /* @__PURE__ */ new Set()) => {
	const goal = world.finish;
	if (goal === null) return null;
	const steps = [
		[1, 0],
		[-1, 0],
		[0, 1],
		[0, -1]
	];
	let ax = 0;
	let ay = 0;
	for (const [dx, dy] of steps) if (open(world, goal.x + dx, goal.y + dy)) {
		ax -= dx;
		ay -= dy;
	}
	const aheadX = goal.x + .5 + ax * 2;
	const aheadY = goal.y + .5 + ay * 2;
	for (const shape of POND_SHAPES) {
		const w = Math.max(...shape.map((r) => r.length));
		const h = shape.length;
		let best = null;
		for (let y = goal.y - h; y <= goal.y + 1; y++) for (let x = goal.x - w; x <= goal.x + 1; x++) {
			const cells = shapeCells(shape, x, y);
			if (cells.some((c) => open(world, c.x, c.y) || reserved.has(cellKey(c.x, c.y)))) continue;
			if (!cells.some((c) => Math.abs(c.x - goal.x) + Math.abs(c.y - goal.y) === 1)) continue;
			const score = Math.hypot(x + w / 2 - aheadX, y + h / 2 - aheadY);
			if (best === null || score < best.score) best = {
				cells,
				score
			};
		}
		if (best !== null) return best.cells;
	}
	return null;
};
/** Every water cell of the field, as keys: what the level paints, and the pond of a spring. */
var waterCells = (world, scene, reserved = /* @__PURE__ */ new Set()) => {
	const cells = new Set(painted(world, scene).map((c) => cellKey(c.x, c.y)));
	if (scene.finish === "well" && scene.finishLook === void 0 && scene.tilemap === void 0) for (const c of springPond(world, reserved) ?? []) cells.add(cellKey(c.x, c.y));
	return cells;
};
// src/ui/stage/sprites.ts
/**
* Drawing pictures of the asset packs on the field: placed sprites (`scene.sprites`) and the pack looks of villagers,
* enemies, items and the goal. A pack picture is scaled so that one cell of the pack is one cell of the field.
*/
/** One cell of the field, in canvas units: the same as `CELL` in draw.ts. */
var CELL$1 = 16;
/** Canvas units per picture pixel of a pack. */
var scaleOf = (pack) => CELL$1 / (pack.cell > 0 ? pack.cell : CELL$1);
var drawRect = (ctx, pack, rect, x, y, w, h, smooth = false) => {
	const img = image(packFile(pack.id, rect.file));
	if (img === null) return false;
	if (smooth) {
		ctx.save();
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = "high";
		drawRect(ctx, pack, rect, x, y, w, h);
		ctx.restore();
		return true;
	}
	if (!rect.flip) {
		ctx.drawImage(img, rect.sx, rect.sy, rect.w, rect.h, x, y, w, h);
		return true;
	}
	ctx.save();
	ctx.translate(x + w, y);
	ctx.scale(-1, 1);
	ctx.drawImage(img, rect.sx, rect.sy, rect.w, rect.h, 0, 0, w, h);
	ctx.restore();
	return true;
};
/** The frame of a clip `progress` of the way through it (0…1), for an act that takes its own time. */
var frameThrough = (sprite, clip, dir, progress) => {
	const found = sprite.clips?.[clip];
	if (found === void 0) return null;
	const { frames, flip } = clipFrames(found, dir);
	const index = frames[Math.min(frames.length - 1, Math.max(0, Math.floor(progress * frames.length)))];
	return index === void 0 ? null : frameRect(sprite, index, found, flip);
};
/** The frame of a clip at `now`, or the sprite's icon when it has no such clip. */
var frameOf = (sprite, clip, dir, now, progress) => {
	if (clip !== null && progress !== void 0) {
		const frame = frameThrough(sprite, clip, dir, progress);
		if (frame !== null) return frame;
	}
	if (clip !== null) {
		const frame = frameAt(sprite, clip, dir, now);
		if (frame !== null) return frame;
		const down = frameAt(sprite, clip, "down", now);
		if (down !== null) return down;
	}
	return iconFrame(sprite);
};
/** Where a frame stands, in its pixels: the sprite's `anchor` when the frame has the sprite's size, else the middle of the bottom. */
var anchorOf = (sprite, rect) => {
	const [fw, fh] = sprite.frame ?? sprite.size;
	const anchor = sprite.anchor;
	if (anchor === void 0 || fw !== rect.w || fh !== rect.h) return [rect.w / 2, rect.h];
	return rect.flip ? [rect.w - anchor[0], anchor[1]] : anchor;
};
/** A figure standing at (`cx`, `bottom`). Returns the top edge it was drawn to, or null when not drawn yet. */
var drawFigure = (ctx, found, o) => {
	const { pack, sprite } = found;
	const rect = frameOf(sprite, o.clip === void 0 ? restClip(sprite) : o.clip, o.dir ?? "down", o.now, o.progress);
	const k = scaleOf(pack) * (o.scale ?? 1);
	const w = rect.w * k;
	const h = rect.h * k;
	const flipped = o.flip === true ? {
		...rect,
		flip: !rect.flip
	} : rect;
	const [ax, ay] = anchorOf(sprite, flipped);
	const x = o.cx - ax * k;
	const y = o.bottom - ay * k;
	const top = y + (sprite.bounds?.[1] ?? 0) * k;
	return drawRect(ctx, pack, flipped, x, y, w, h, k < 1) ? top : null;
};
/** A picture of the public Tiny Swords pack comes from the Free Pack when that has it (see art.ts). */
var placedLook = (ref) => {
	const parsed = parseAssetRef(ref);
	if (parsed?.pack !== "tiny-swords") return spriteOf(ref);
	return art(parsed.id) ?? spriteOf(ref);
};
/** A sprite looks this way unless it says otherwise: tiles and animated ground lie flat, the rest stands up. */
var layerOf = (placed, found) => {
	if (placed.layer !== void 0) return placed.layer;
	if (placed.tiles !== void 0) return "ground";
	const category = found?.sprite.category;
	return category === "tileset" || category === "terrain" ? "ground" : "object";
};
/** Whether the placed sprite plays an animation of more than one frame: then it is drawn every animation frame. */
var isAnimated = (placed, found) => {
	if (placed.tiles !== void 0 || placed.frame !== void 0) return false;
	const clip = placed.clip ?? restClip(found.sprite);
	const frames = clip === null ? void 0 : found.sprite.clips?.[clip]?.frames;
	if (frames === void 0) return false;
	return Array.isArray(frames) ? frames.length > 1 : Object.values(frames).some((f) => (f?.length ?? 0) > 1);
};
/** The size of one cell of a tileset, in its pixels. */
var tileSize = (found) => found.sprite.frame ?? [found.pack.cell, found.pack.cell];
/** A placed sprite. Tiles lie from the cell's top-left corner; anything else stands on the cell. */
var drawPlaced = (ctx, placed, now) => {
	const found = placed.tiles === void 0 ? placedLook(placed.asset) : spriteOf(placed.asset);
	if (found === null) return;
	if (placed.tiles !== void 0) {
		const [col, row, w, h] = placed.tiles;
		const [tw, th] = tileSize(found);
		const rect = {
			file: found.sprite.file,
			sx: col * tw,
			sy: row * th,
			w: w * tw,
			h: h * th,
			flip: placed.flip === true
		};
		drawRect(ctx, found.pack, rect, placed.x * CELL$1, placed.y * CELL$1, w * CELL$1, h * CELL$1);
		return;
	}
	if (placed.frame !== void 0) {
		const rect = frameRect(found.sprite, placed.frame, void 0, placed.flip === true);
		const k = scaleOf(found.pack);
		const [ax, ay] = anchorOf(found.sprite, rect);
		drawRect(ctx, found.pack, rect, (placed.x + .5) * CELL$1 - ax * k, (placed.y + 1) * CELL$1 - ay * k, rect.w * k, rect.h * k, k < 1);
		return;
	}
	drawFigure(ctx, found, {
		cx: (placed.x + .5) * CELL$1,
		bottom: (placed.y + 1) * CELL$1,
		clip: placed.clip,
		dir: placed.dir ?? "down",
		now,
		flip: placed.flip === true
	});
};
/**
* Tile `tile` of a tileset sprite (numbered from 1, as in `TileLayer`) with its top-left corner at cell `x`, `y`.
* False until the pack and its picture have loaded.
*/
var drawTile = (ctx, tileset, tile, x, y) => {
	const [tw, th] = tileSize(tileset);
	const columns = Math.max(1, Math.floor(tileset.sprite.size[0] / tw));
	const index = tile - 1;
	const rect = {
		file: tileset.sprite.file,
		sx: index % columns * tw,
		sy: Math.floor(index / columns) * th,
		w: tw,
		h: th,
		flip: false
	};
	return drawRect(ctx, tileset.pack, rect, x * CELL$1, y * CELL$1, CELL$1, CELL$1);
};
/** The cells a placed sprite covers on the field, so no bush or tree grows under it. */
var placedCells = (placed) => {
	const [, , w, h] = placed.tiles ?? [
		0,
		0,
		1,
		1
	];
	const cells = [];
	for (let y = Math.floor(placed.y); y < Math.ceil(placed.y + h); y++) for (let x = Math.floor(placed.x); x < Math.ceil(placed.x + w); x++) cells.push(cellKey(x, y));
	return cells;
};
/** Where the bottom edge of a placed sprite is, to draw what stands lower later. */
var placedDepth = (placed) => placed.y + (placed.tiles?.[3] ?? 1) - 1;
// src/ui/stage/tiles.ts
/**
* Tiles of a described tileset by what they show, not by number: the packs number their tiles differently, so the
* code asks for «grass with edges to the north and west» and gets the tile of whichever pack it draws.
*/
var byKey = /* @__PURE__ */ new WeakMap();
var keysOf = (sprite) => {
	const known = byKey.get(sprite);
	if (known !== void 0) return known;
	const keys = /* @__PURE__ */ new Map();
	for (const t of sprite.tiles ?? []) {
		if (t.mask !== void 0 && (t.role === "fill" || t.role === "edge")) keys.set(`${t.terrain}/${t.mask}`, t.index);
		if (!keys.has(`role:${t.role}`)) keys.set(`role:${t.role}`, t.index);
	}
	byKey.set(sprite, keys);
	return keys;
};
/**
* The tile (numbered from 1) of `terrain` whose open edges are `mask`: north 1, east 2, south 4, west 8. 0 is the
* middle of a field of it. Null when the tileset has no such tile.
*/
var groundTile = (sprite, terrain, mask) => keysOf(sprite).get(`${terrain}/${mask}`) ?? null;
/** The first tile with this role, as `horizontal-middle` of a bridge. */
var tileByRole = (sprite, role) => keysOf(sprite).get(`role:${role}`) ?? null;
// src/ui/stage/weather.ts
var KINDS = {
	snow: {
		density: .35,
		seconds: 9,
		drift: .25
	},
	rain: {
		density: .3,
		seconds: 1.4,
		drift: .12
	},
	leaves: {
		density: .06,
		seconds: 12,
		drift: .5
	}
};
var LEAF_COLOURS = [
	"#e8a33a",
	"#d9692c",
	"#c9452b",
	"#f0c24a"
];
/** A number from 0 to 1, the same for the same drop. */
var rand = (i, salt) => {
	let h = Math.imul(i + 1, 2654435761) ^ Math.imul(salt + 7, 40503);
	h = Math.imul(h ^ h >>> 15, 2246822519);
	return ((h ^ h >>> 13) >>> 0) / 4294967296;
};
var wrap = (v, size) => (v % size + size) % size;
var drawWeather = (ctx, weather, view, cell, now) => {
	const kind = KINDS[weather];
	const w = view.width * cell;
	const h = view.height * cell;
	const left = view.x * cell;
	const top = view.y * cell;
	const count = Math.round(view.width * view.height * kind.density);
	const t = now / 1e3 / kind.seconds;
	ctx.save();
	for (let i = 0; i < count; i++) {
		const fall = (t * (.7 + .6 * rand(i, 3)) + rand(i, 1)) * h;
		const x = left + wrap(rand(i, 2) * w + fall * kind.drift + Math.sin(t * 6 + i) * (weather === "rain" ? 0 : 2), w);
		const y = top + wrap(fall, h);
		if (weather === "snow") {
			ctx.globalAlpha = .85;
			ctx.fillStyle = "#ffffff";
			ctx.beginPath();
			ctx.arc(x, y, .5 + .6 * rand(i, 4), 0, Math.PI * 2);
			ctx.fill();
		} else if (weather === "rain") {
			ctx.globalAlpha = .45;
			ctx.strokeStyle = "#cfe6ff";
			ctx.lineWidth = .4;
			ctx.beginPath();
			ctx.moveTo(x, y);
			ctx.lineTo(x - .8, y + 4);
			ctx.stroke();
		} else {
			ctx.globalAlpha = .9;
			ctx.fillStyle = LEAF_COLOURS[i % LEAF_COLOURS.length] ?? "#e8a33a";
			ctx.beginPath();
			ctx.ellipse(x, y, 1.4, .7, t * 8 + i, 0, Math.PI * 2);
			ctx.fill();
		}
	}
	ctx.restore();
};
/** Figures stand a little above the bottom of their cell, so their feet are on it. */
var FEET = 3;
var BOSS_SCALE = 1.5;
/** A tree of the scenery takes 2×2 cells: smaller than the pack draws it, so its crown does not hide the path. */
var TREE_SCALE = .8;
/** A bush of the Free Pack is drawn for two cells; one cell of the field holds it at this size. */
var BUSH_SCALE = .85;
/** How tall a figure of the pack stands, in canvas units: where a bar over its head goes. */
var HEAD = 20;
var HEART = 9;
var HUD_BACK = "rgba(30, 20, 30, 0.45)";
var DANGER = "#ff3355";
var ICE = "rgba(225, 242, 255, 0.62)";
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
var shadow = (ctx, cx, cy, scale = 1) => ellipse(ctx, cx, cy + 5, 4.5 * scale, 1.4 * scale, "rgba(0, 0, 0, 0.22)");
/** Draws with a filter where the browser can filter a canvas; elsewhere just the picture. */
var withFilter = (ctx, filter, draw) => {
	if (filter === void 0) {
		draw();
		return;
	}
	ctx.save();
	if ("filter" in ctx) ctx.filter = filter;
	draw();
	ctx.restore();
};
/** A look standing on cell (x, y), or at (`cx`, `bottom`). */
var stand = (ctx, look, cx, bottom, now, extra = {}) => {
	const found = art(look.id);
	if (found === null) return null;
	return drawFigure(ctx, found, {
		cx,
		bottom,
		now,
		...look.clip === void 0 ? {} : { clip: look.clip },
		scale: (look.scale ?? 1) * (extra.scale ?? 1),
		...extra.flip === void 0 ? {} : { flip: extra.flip }
	});
};
var cellBottom = (y) => (y + 1) * 16 - FEET;
/** The flat layers of a hand-drawn tile map, in place of the field's own ground. */
var tilemapGround = (ctx, map) => {
	const tileset = spriteOf(map.tileset);
	if (tileset === null) return;
	for (const t of tilesOfKind(map, "ground")) drawTile(ctx, tileset, t.tile, t.x, t.y);
};
var describedTiles = (sprite) => spriteOf(sprite)?.sprite.tiles ?? null;
/** The tileset of a ground of a painting: null while its pack loads. */
var tilesetOf = (ref) => {
	const parsed = ref === void 0 ? null : parseTerrainRef(ref);
	return parsed === null ? null : spriteOf(parsed.sprite);
};
/** The base of a painted ground under the whole view. False while it loads or when the painting has none. */
var paintedBase = (ctx, paint, view) => {
	const tileset = tilesetOf(paint.base);
	if (tileset === null || paint.base === void 0) return false;
	for (const t of baseTiles(paint.base, view, describedTiles)) drawTile(ctx, tileset, t.tile, t.x, t.y);
	return true;
};
/** Paths, water and sand painted by cells, each tile fitted to its neighbours. */
var paintedGround = (ctx, paint) => {
	for (const letter of paintLetters(paint)) {
		const tileset = tilesetOf(paint.kinds[letter]);
		if (tileset === null) continue;
		for (const t of paintTiles(paint, letter, describedTiles)) drawTile(ctx, tileset, t.tile, t.x, t.y);
	}
};
/** A bush of the Free Pack that sways, for a bush of the scenery; null for other obstacles or without the Free Pack. */
var swayingBush = (kind, x, y) => {
	if (kind !== "bush" && kind !== "bushRound") return null;
	return spriteOf(`${ART_PACK_FREE}:${SWAYING_BUSHES[cellHash(x, y, 7) % SWAYING_BUSHES.length] ?? ""}`);
};
/** The tree that grows at a place: a fir or a birch, the same each time; the public fir without the Free Pack. */
var treeAt = (x, y, theme) => {
	const id = TREES[cellHash(x, y, 8) % TREES.length] ?? "decor/tree";
	const look = id === "decor/tree-3" && theme === "autumn" ? AUTUMN_BIRCH : id;
	const free = spriteOf(`${ART_PACK_FREE}:${look}`);
	if (free !== null) return {
		art: free,
		autumnal: look === AUTUMN_BIRCH
	};
	const fir = art(TREE_ART);
	return fir === null ? null : {
		art: fir,
		autumnal: false
	};
};
var SHEEP_ART = "animal/sheep";
/** One round of a sheep, in seconds: it grazes, walks a cell to the right, grazes, walks back. */
var SHEEP_ROUND = 14;
var SHEEP_GRAZE = 5.5;
var SHEEP_WALK = 1.5;
/** Where a sheep of the meadow is now: each starts its round at its own moment. */
var sheepAt = (home, now) => {
	const t = (now / 1e3 + cellHash(home.x, home.y, 15) % SHEEP_ROUND) % SHEEP_ROUND;
	const there = 7;
	if (t < SHEEP_GRAZE) return {
		x: home.x,
		y: home.y,
		walking: false,
		left: false
	};
	if (t < there) return {
		x: home.x + (t - SHEEP_GRAZE) / SHEEP_WALK,
		y: home.y,
		walking: true,
		left: false
	};
	if (t < 12.5) return {
		x: home.x + 1,
		y: home.y,
		walking: false,
		left: true
	};
	return {
		x: home.x + 1 - (t - there - SHEEP_GRAZE) / SHEEP_WALK,
		y: home.y,
		walking: true,
		left: true
	};
};
var sheepFigure = (ctx, pose, now) => {
	const sheep = art(SHEEP_ART);
	if (sheep === null) return;
	const clip = pose.walking ? pickClip(sheep.sprite, [
		"run",
		"walk",
		"idle"
	]) : pickClip(sheep.sprite, ["graze", "idle"]);
	const cx = (pose.x + .5) * 16;
	shadow(ctx, cx, (pose.y + .5) * 16, .8);
	drawFigure(ctx, sheep, {
		cx,
		bottom: cellBottom(pose.y),
		now,
		flip: pose.left,
		...clip === null ? {} : { clip },
		scale: .85
	});
};
/** Cliff walls by their neighbours in the row: a lone cell, the left end, the right end or the middle. */
var PLATEAU_ART = "tileset/ground-3";
var CLIFF_ROLES = {
	single: 3,
	left: 0,
	right: 2,
	middle: 1
};
/**
* Plateaus in the meadow, as the Tiny Swords guide lays them: the shadow one cell down, the grass on top with its
* edges, and a stone wall under the bottom row. Only with the Free Pack, whose ground has plateaus and cliffs.
*/
var raisedGround = (ctx, scenery) => {
	if (scenery.plateau.size === 0) return;
	const ground = spriteOf(`tiny-swords-free:${PLATEAU_ART}`) ?? spriteOf(`tiny-swords-free:tileset/ground`);
	if (ground === null || groundTile(ground.sprite, "plateau", 0) === null) return;
	const cells = (keys) => [...keys].map((key) => key.split(",").map(Number));
	const top = (x, y) => scenery.plateau.has(cellKey(x, y));
	const shade = spriteOf(`${ART_PACK_FREE}:terrain/shadow`);
	if (shade !== null) {
		const { anchor } = shade.sprite;
		const drop = anchor === void 0 ? 0 : (anchor[1] - (shade.sprite.size[1] ?? 0) / 2) * 16 / shade.pack.cell;
		for (const [x, y] of cells(scenery.plateau)) drawFigure(ctx, shade, {
			cx: (x + .5) * 16,
			bottom: (y + 1.5) * 16 + drop,
			now: 0
		});
	}
	for (const [x, y] of cells(scenery.plateau)) {
		const mask = (top(x, y - 1) ? 0 : 1) | (top(x + 1, y) ? 0 : 2) | (top(x, y + 1) ? 0 : 4) | (top(x - 1, y) ? 0 : 8);
		const tile = groundTile(ground.sprite, "plateau", mask);
		if (tile !== null) drawTile(ctx, ground, tile, x, y);
	}
	const walls = (ground.sprite.tiles ?? []).filter((t) => t.terrain === "cliff" && t.role === "wall").sort((a, b) => a.col - b.col);
	for (const [x, y] of cells(scenery.cliffs)) {
		const left = scenery.cliffs.has(cellKey(x - 1, y));
		const right = scenery.cliffs.has(cellKey(x + 1, y));
		const tile = walls[CLIFF_ROLES[!left && !right ? "single" : !left ? "left" : !right ? "right" : "middle"]];
		if (tile !== void 0) drawTile(ctx, ground, tile.index, x, y);
	}
};
/** Grass, the ground or the ice under the path, flowers, bushes and stones; or the flat layers of a tile map. */
var drawGround = (ctx, { world, scene, season, scenery }) => {
	if (scene.tilemap !== void 0) tilemapGround(ctx, scene.tilemap);
	else if (scene.terrain === void 0 || !paintedBase(ctx, scene.terrain, scenery.view)) naturalGround(ctx, {
		world,
		scene,
		season,
		scenery
	});
	if (scene.terrain !== void 0) paintedGround(ctx, scene.terrain);
	if (season.tint !== void 0) {
		const { view } = scenery;
		ctx.fillStyle = season.tint;
		ctx.fillRect(view.x * 16, view.y * 16, view.width * 16, view.height * 16);
	}
	for (const placed of scene.sprites ?? []) {
		const found = spriteOf(placed.asset);
		if (found !== null && layerOf(placed, found) === "ground" && !isAnimated(placed, found)) drawPlaced(ctx, placed, 0);
	}
	const { width, height } = world;
	withFilter(ctx, season.plants, () => {
		for (const { x, y, kind } of scenery.decor) {
			const look = x < 0 || y < 0 || x >= width || y >= height ? season.decor[kind] : null;
			if (look !== null) stand(ctx, look, (x + .5) * 16, cellBottom(y), 0);
		}
		for (const { x, y, kind } of scenery.obstacles) if (swayingBush(kind, x, y) === null) stand(ctx, OBSTACLE_ART[kind], (x + .5) * 16, cellBottom(y) + 1, 0);
	});
};
/**
* The field's own ground. Under everything lies sand (or water for ice and a bridge); grass covers every cell where
* the hero does not walk, with soft edges toward the path, as the islands of Tiny Swords lie on the sand.
*/
/**
* The grass of the meadow: the newer grass of the Free Pack when it is served, whose edges end in a light shore over
* water as in the pack's own maps; else the grass of the public pack.
*/
var meadowArt = (ground) => {
	const free = spriteOf(`${ART_PACK_FREE}:${GROUND_ART}`);
	return free !== null && groundTile(free.sprite, "ground", 0) !== null ? {
		art: free,
		terrain: "ground"
	} : {
		art: ground,
		terrain: "grass"
	};
};
var naturalGround = (ctx, { world, scene, scenery }) => {
	const ground = baseArt(GROUND_ART);
	const water = baseArt(WATER_ART);
	if (ground === null || water === null) return;
	const { view } = scenery;
	const kind = scene.ground ?? "path";
	const meadow = meadowArt(ground);
	const { width, height, walls } = world;
	const inside = (x, y) => x >= 0 && y >= 0 && x < width && y < height;
	const open = (x, y) => inside(x, y) && !walls.has(cellKey(x, y));
	const pond = (x, y) => scenery.water.has(cellKey(x, y));
	const low = kind === "bridge" ? inside : (x, y) => open(x, y) || pond(x, y);
	for (let y = view.y; y < view.y + view.height; y++) for (let x = view.x; x < view.x + view.width; x++) {
		if (pond(x, y)) continue;
		const shore = (pond(x, y - 1) ? 1 : 0) | (pond(x + 1, y) ? 2 : 0) | (pond(x, y + 1) ? 4 : 0) | (pond(x - 1, y) ? 8 : 0);
		const sand = groundTile(ground.sprite, "sand", shore);
		if (kind === "path" && sand !== null) drawTile(ctx, ground, sand, x, y);
		else drawTile(ctx, water, 1, x, y);
	}
	if (kind === "ice") {
		ctx.fillStyle = ICE;
		ctx.fillRect(view.x * 16, view.y * 16, view.width * 16, view.height * 16);
	}
	for (let y = view.y; y < view.y + view.height; y++) for (let x = view.x; x < view.x + view.width; x++) {
		if (low(x, y) || pond(x, y)) continue;
		const mask = (low(x, y - 1) ? 1 : 0) | (low(x + 1, y) ? 2 : 0) | (low(x, y + 1) ? 4 : 0) | (low(x - 1, y) ? 8 : 0);
		const tile = groundTile(meadow.art.sprite, meadow.terrain, mask);
		if (tile !== null) drawTile(ctx, meadow.art, tile, x, y);
	}
	raisedGround(ctx, scenery);
	if (kind === "path") {
		const pebbles = ground.sprite.tiles?.find((t) => t.terrain === "sand" && t.role === "detail")?.index;
		for (const { x, y, kind: decor } of scenery.decor) if (decor === "petals" && open(x, y) && pebbles !== void 0) drawTile(ctx, ground, pebbles, x, y);
	}
	if (kind === "bridge") bridge(ctx, open, width, height);
};
/** Planks over the water: along a row where the path runs sideways, along a column where it runs up and down. */
var bridge = (ctx, open, width, height) => {
	const planks = baseArt(BRIDGE_ART);
	if (planks === null) return;
	const sideways = tileByRole(planks.sprite, "horizontal-middle");
	const upright = tileByRole(planks.sprite, "vertical-middle");
	for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
		if (!open(x, y)) continue;
		const across = open(x - 1, y) || open(x + 1, y);
		const along = open(x, y - 1) || open(x, y + 1);
		const tile = across || !along ? sideways : upright;
		if (tile !== null) drawTile(ctx, planks, tile, x, y);
		if (across && along && upright !== null) drawTile(ctx, planks, upright, x, y);
	}
};
/** Each shore cell starts its waves at its own moment, as the pack advises: up to this many ms apart. */
var FOAM_SPREAD_MS = 1600;
/**
* The water of ponds and the sea, under the ground layer: water tiles, then white foam centred on every cell of land
* that touches the water. The ground drawn over it covers the inner part of the foam, so only the surf shows.
*/
var drawWater = (ctx, { scenery, now, still }) => {
	if (scenery.water.size === 0) return;
	const water = baseArt(WATER_ART);
	const foam = art(FOAM_ART);
	const cells = [...scenery.water].map((key) => key.split(",").map(Number));
	if (water !== null) for (const [x, y] of cells) drawTile(ctx, water, 1, x, y);
	if (foam === null) return;
	const shores = /* @__PURE__ */ new Set();
	for (const [x, y] of cells) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
		const key = cellKey(x + dx, y + dy);
		if (!scenery.water.has(key)) shores.add(key);
	}
	const { frame, anchor } = foam.sprite;
	const drop = frame === void 0 || anchor === void 0 ? 0 : (anchor[1] - frame[1] / 2) * 16 / foam.pack.cell;
	for (const key of shores) {
		const [x = 0, y = 0] = key.split(",").map(Number);
		const phase = cellHash(x, y, 9) % FOAM_SPREAD_MS;
		drawFigure(ctx, foam, {
			cx: (x + .5) * 16,
			bottom: (y + .5) * 16 + drop,
			clip: "play",
			now: still ? phase : now + phase
		});
	}
};
/** Villagers stand and breathe, each at their own pace, some facing left. */
var villager = (ctx, npc, now, still) => {
	const cx = npc.x * 16 + 8;
	const bottom = cellBottom(npc.y);
	shadow(ctx, cx, npc.y * 16 + 8);
	const t = still ? 0 : now + cellHash(npc.x, npc.y, 11) % 8 * 300;
	const own = npc.look === void 0 ? null : spriteOf(npc.look);
	if (own !== null) {
		drawFigure(ctx, own, {
			cx,
			bottom: (npc.y + 1) * 16,
			now: t
		});
		return;
	}
	stand(ctx, NPC_ART[npc.who], cx, bottom, t, { flip: cellHash(npc.x, npc.y, 12) % 2 === 0 });
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
var flame = (ctx, cx, bottom, now, still) => stand(ctx, {
	id: FIRE_ART,
	scale: .55
}, cx, bottom, still ? 0 : now);
/** The water cells next to the goal and joined to it: the pond of a spring. */
var pondBy = (water, goal) => {
	const seen = /* @__PURE__ */ new Set();
	const queue = [goal];
	const found = [];
	while (queue.length > 0) {
		const c = queue.shift();
		for (const [dx, dy] of [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1]
		]) {
			const n = {
				x: c.x + dx,
				y: c.y + dy
			};
			const key = cellKey(n.x, n.y);
			if (!water.has(key) || seen.has(key)) continue;
			seen.add(key);
			found.push(n);
			queue.push(n);
		}
	}
	return found;
};
/** The goal. A well is a spring in the grass: water with stones. At home the house is the goal: the cell is marked. */
var finishLook = (ctx, scene, x, y, now, still, pond) => {
	const kind = scene.finish ?? "flag";
	const cx = x * 16 + 8;
	const own = scene.finishLook === void 0 ? null : spriteOf(scene.finishLook);
	if (own !== null && drawFigure(ctx, own, {
		cx,
		bottom: (y + 1) * 16,
		now: still ? 0 : now
	}) !== null) return;
	const look = FINISH_ART[kind];
	if (look !== null) {
		shadow(ctx, cx, y * 16 + 8);
		stand(ctx, look, cx, cellBottom(y), still ? 0 : now);
		return;
	}
	if (kind === "well" && pond.length > 0) {
		const far = pond.reduce((a, b) => Math.abs(b.x - x) + Math.abs(b.y - y) > Math.abs(a.x - x) + Math.abs(a.y - y) ? b : a);
		stand(ctx, {
			id: SPRING_ROCKS_ART,
			clip: "play"
		}, (far.x + .5) * 16, (far.y + 1) * 16 - 3, still ? 0 : now);
		return;
	}
	if (kind === "well") {
		const water = baseArt(WATER_ART);
		if (water !== null) drawTile(ctx, water, 1, x, y);
		stand(ctx, { id: SPRING_ROCKS_ART }, cx, (y + 1) * 16 - 1, still ? 0 : now);
		return;
	}
	const pointer = art(POINTER_ART);
	if (pointer === null) return;
	ctx.save();
	ctx.globalAlpha = still ? .9 : .65 + .35 * Math.sin(now / 300);
	drawFigure(ctx, pointer, {
		cx,
		bottom: (y + 1) * 16,
		now: 0
	});
	ctx.restore();
};
/** Things a storehouse shows at most: a pile, not every log. */
var STOREHOUSE_PILE = 3;
/** The storehouse: a marked cell with a pile of what was put down there. */
var storehouseLook = (ctx, scene, x, y, stored) => {
	const cx = x * 16 + 8;
	const pointer = art(POINTER_ART);
	if (pointer !== null) {
		ctx.save();
		ctx.globalAlpha = .8;
		drawFigure(ctx, pointer, {
			cx,
			bottom: (y + 1) * 16,
			now: 0
		});
		ctx.restore();
	}
	const look = ITEM_ART[scene.item ?? "crystal"];
	for (let i = 0; i < Math.min(stored, STOREHOUSE_PILE); i++) stand(ctx, look, cx + (i - 1) * 4, cellBottom(y) - i % 2 * 2, 0, { scale: .75 });
};
var LEVER_ON = "#3ccf6e";
var LEVER_OFF = "#e0483c";
var WOOD = "#8a5a2b";
var WOOD_DARK = "#5c3a1a";
/** A lever on a stone base: the handle leans right with a green knob when on, left with a red knob when off. */
var leverLook = (ctx, x, y, on) => {
	const cx = x * 16 + 8;
	const base = cellBottom(y);
	shadow(ctx, cx, base - 4);
	roundRect(ctx, cx - 4, base - 3, 8, 3, 1, "#6d6f78");
	const tipX = cx + (on ? 4 : -4);
	const tipY = base - 10;
	ctx.save();
	ctx.strokeStyle = WOOD_DARK;
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.moveTo(cx, base - 2);
	ctx.lineTo(tipX, tipY);
	ctx.stroke();
	ctx.restore();
	ellipse(ctx, tipX, tipY, 1.8, 1.8, on ? LEVER_ON : LEVER_OFF);
};
/** A wooden gate: planks across the cell while it is shut, only the two posts once it is open. */
var gateLook = (ctx, x, y, open) => {
	const left = x * 16;
	const top = y * 16;
	roundRect(ctx, left, top + 2, 2, 14, .5, WOOD_DARK);
	roundRect(ctx, left + 16 - 2, top + 2, 2, 14, .5, WOOD_DARK);
	if (open) return;
	for (let i = 0; i < 4; i++) roundRect(ctx, left + 2.5 + i * 2.8, top + 3, 2.2, 12, .6, WOOD);
	roundRect(ctx, left + 2, top + 6, 12, 1.5, .5, WOOD_DARK);
	roundRect(ctx, left + 2, top + 16 - 5, 12, 1.5, .5, WOOD_DARK);
};
/** What lies on a cell: its own item from `itemsAt`, or the level's item. */
var itemAt = (scene, x, y) => {
	const at = scene.itemsAt?.find((i) => i.x === Math.round(x) && i.y === Math.round(y));
	return at === void 0 ? {
		kind: scene.item ?? "crystal",
		own: scene.itemLook !== void 0
	} : {
		kind: at.item,
		own: false
	};
};
var ownItem = (scene, own) => !own || scene.itemLook === void 0 ? null : spriteOf(scene.itemLook);
var itemLook = (ctx, scene, x, y, lit, now, still) => {
	const cx = x * 16 + 8;
	const bottom = cellBottom(y);
	const { kind, own: hasOwn } = itemAt(scene, x, y);
	const own = ownItem(scene, hasOwn);
	const bob = kind === "crystal" && !still ? -1.2 * (.5 - .5 * Math.cos(Math.PI * (now / 1200 % 2))) : 0;
	if (own !== null) drawFigure(ctx, own, {
		cx,
		bottom: (y + 1) * 16,
		clip: null,
		now
	});
	else stand(ctx, ITEM_ART[kind], cx, bottom + 1 + bob, now);
	if (lit) flame(ctx, cx, bottom, now, still);
};
/** Hit points over a boss or a strong enemy. */
var hpBar = (ctx, cx, top, hp, maxHp) => {
	const w = Math.min(14, maxHp * 3 + 1);
	roundRect(ctx, cx - w / 2, top, w, 3, 1, "rgba(30, 20, 30, 0.75)");
	roundRect(ctx, cx - w / 2 + .5, top + .5, (w - 1) * hp / maxHp, 2, .5, "#e8434f");
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
	const swing = enemy.swinging && !still ? -1.2 * Math.abs(Math.sin(now / 350 * Math.PI)) : 0;
	const look = (enemy.look === void 0 ? null : spriteOf(enemy.look)) ?? art(ENEMY_ART[enemy.kind]);
	let top = cy - 8 - (scale - 1) * 12;
	const draw = () => {
		if (look === null) return;
		const side = look.sprite.layout === "side" && (hero.x === pose.x ? pose.face === "left" : hero.x < pose.x);
		const clip = still ? void 0 : enemy.swinging ? pickClip(look.sprite, [
			"attack",
			"throw",
			"explode"
		]) ?? walkClip(look.sprite) : walkClip(look.sprite);
		const own = enemy.look !== void 0;
		if (drawFigure(ctx, look, {
			cx,
			bottom: (own ? cy + 8 : cellBottom(pose.y + ly)) + swing,
			clip,
			dir: pose.face,
			now: still ? 0 : now + enemy.id * 150,
			flip: side,
			scale
		}) !== null) top = cellBottom(pose.y + ly) - HEAD * scale;
	};
	if (pose.flash > 0) withFilter(ctx, `brightness(${1 + 1.5 * pose.flash})`, draw);
	else if (enemy.swinging) withFilter(ctx, `drop-shadow(0 0 1.2px ${DANGER})`, draw);
	else draw();
	if (enemy.boss || enemy.maxHp > 1) hpBar(ctx, cx, top - 4, Math.max(0, enemy.hp), enemy.maxHp);
	ctx.restore();
};
/** The clip and its frame for what the hero does now. */
var heroClip = (found, spriteId, hero) => {
	const { sprite } = found;
	if (hero.act === "walk" || hero.act === "bump") return { clip: walkClip(sprite) };
	if (hero.act === "attack") return {
		clip: pickClip(sprite, [
			...attackClips(fighterOf(spriteId), hero.dir),
			"attack",
			"idle"
		]),
		progress: hero.progress
	};
	if (hero.act === "take") return { clip: pickClip(sprite, TAKE_CLIPS) };
	return { clip: pickClip(sprite, ["idle"]) };
};
/** The helper of a crew: a worker of the pack in a straw-yellow shirt, whatever hero the student plays. */
var HELPER_ART = "character/pawn-yellow";
var heroFigure = (ctx, hero, spriteId, now, still) => {
	const found = art(spriteId);
	const cx = hero.x * 16 + 8;
	const cy = hero.y * 16 + 8;
	const scale = 1 - .4 * hero.fallen;
	ctx.save();
	ctx.globalAlpha = 1 - .65 * hero.fallen;
	shadow(ctx, cx, cy, scale);
	const shake = hero.crashed ? Math.sin(now / 40) * 1.2 : 0;
	const draw = () => {
		if (found === null) return;
		const { clip, progress } = heroClip(found, spriteId, hero);
		drawFigure(ctx, found, {
			cx: cx + shake,
			bottom: cellBottom(hero.y) + 3 * hero.fallen,
			clip,
			flip: hero.dir === "left",
			now: still ? 0 : now,
			scale,
			...progress === void 0 ? {} : { progress }
		});
	};
	if (hero.act === "hurt") withFilter(ctx, `brightness(${1 + 1.2 * Math.sin(Math.PI * hero.progress)}) drop-shadow(0 0 1.5px ${DANGER})`, draw);
	else if (hero.crashed) withFilter(ctx, `drop-shadow(0 0 1.5px ${DANGER})`, draw);
	else draw();
	ctx.restore();
};
/** Where the facing mark of a hero stands, from the middle of the cell, and which way it points. */
var FACING = {
	right: {
		dx: 1,
		dy: 0
	},
	left: {
		dx: -1,
		dy: 0
	},
	down: {
		dx: 0,
		dy: 1
	},
	up: {
		dx: 0,
		dy: -1
	}
};
/** How far the mark stands from the hero's feet, and how big it is. Facing up, it floats over the head. */
var FACING_OFFSET = 7;
var FACING_OVER_HEAD = 19;
var FACING_SIZE = 2.6;
/**
* A small arrow on the ground in front of the hero. The pictures face only left or right, so without it a hero facing
* up or down looks the same as one facing sideways, and a student cannot tell where `move()` goes.
*/
var facingMark = (ctx, hero) => {
	if (hero.fallen > 0 || hero.act === "walk") return;
	const { dx, dy } = FACING[hero.dir];
	const x = hero.x * 16 + 8 + dx * FACING_OFFSET;
	const y = hero.y * 16 + 8 + 4 + dy * (dy < 0 ? FACING_OVER_HEAD : FACING_OFFSET);
	const s = FACING_SIZE;
	ctx.save();
	ctx.beginPath();
	ctx.moveTo(x + dx * s, y + dy * s);
	ctx.lineTo(x - dx * s + dy * s, y - dy * s + dx * s);
	ctx.lineTo(x - dx * s - dy * s, y - dy * s - dx * s);
	ctx.closePath();
	ctx.fillStyle = "#ffd447";
	ctx.strokeStyle = "rgba(40, 25, 10, 0.85)";
	ctx.lineWidth = .8;
	ctx.lineJoin = "round";
	ctx.stroke();
	ctx.fill();
	ctx.restore();
};
/** A building or a big tree, standing on the middle of the bottom row of its cells. */
var propFigure = (ctx, prop, now) => {
	const { width, height } = PROPS[prop.kind];
	stand(ctx, PROP_ART[prop.kind], (prop.x + width / 2) * 16, (prop.y + height) * 16 - 1, now);
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
/** A blow: a white arc over the enemy, thinning as it goes. */
var slash = (ctx, cx, cy, progress) => {
	ctx.save();
	ctx.globalAlpha = 1 - progress;
	ctx.beginPath();
	const start = -Math.PI * .9 + progress * 1.2;
	ctx.arc(cx, cy - 2, 6, start, start + Math.PI * .7);
	ctx.lineWidth = 1.6 * (1 - progress) + .4;
	ctx.lineCap = "round";
	ctx.strokeStyle = "#ffffff";
	ctx.stroke();
	ctx.restore();
};
/** An arrow on its way from (x0, y0) to (x1, y1), `progress` of the way: a shaft with a head along an arc. */
var arrowFlight = (ctx, x0, y0, x1, y1, progress) => {
	const at = (t) => ({
		x: x0 + (x1 - x0) * t,
		y: y0 + (y1 - y0) * t - Math.sin(Math.PI * t) * 16 * .6
	});
	const head = at(progress);
	const tail = at(Math.max(0, progress - .12));
	ctx.save();
	ctx.lineCap = "round";
	ctx.strokeStyle = "#5b3a1e";
	ctx.lineWidth = 1.6;
	ctx.beginPath();
	ctx.moveTo(tail.x, tail.y);
	ctx.lineTo(head.x, head.y);
	ctx.stroke();
	ctx.fillStyle = "#e9e2cf";
	ctx.beginPath();
	ctx.arc(head.x, head.y, 1.6, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
};
var effect = (ctx, fx, scene, now) => {
	const { kind: item, own: hasOwn } = itemAt(scene, fx.x, fx.y);
	const cx = fx.x * 16 + 8;
	const cy = fx.y * 16 + 8;
	if (fx.kind === "slash") {
		slash(ctx, cx, cy, fx.progress);
		return;
	}
	if (fx.kind === "arrow" && fx.from !== void 0) {
		arrowFlight(ctx, fx.from.x * 16 + 8, fx.from.y * 16 - 8, cx, cy - 4, fx.progress);
		return;
	}
	if (fx.kind === "smoke") {
		const dead = art(DEAD_ART);
		if (dead !== null) drawFigure(ctx, dead, {
			cx,
			bottom: cellBottom(fx.y),
			clip: "die",
			now,
			progress: fx.progress,
			scale: .8
		});
		return;
	}
	if (fx.kind === "lift") {
		if (item === "campfire") return;
		ctx.save();
		ctx.globalAlpha = 1 - Math.max(0, fx.progress - .6) / .4;
		const rise = 11 * Math.min(1, fx.progress * 2);
		const own = ownItem(scene, hasOwn);
		if (own !== null) drawFigure(ctx, own, {
			cx,
			bottom: cy + 4 - rise,
			clip: null,
			now,
			scale: .75
		});
		else stand(ctx, ITEM_ART[item], cx, cy - 2 - rise, now, { scale: .8 });
		ctx.restore();
		return;
	}
	bubble(ctx, fx.kind === "question" ? "?" : fx.kind === "alert" ? "!" : "z", cx, cy, fx.progress);
};
/** A heart of the HUD, full or empty. */
var heart = (ctx, x, y, full) => {
	const s = HEART / 9;
	ctx.beginPath();
	ctx.moveTo(x + 4.5 * s, y + 8);
	ctx.bezierCurveTo(x - 1, y + 4, x + .5 * s, y - .5 * s, x + 4.5 * s, y + 2.2 * s);
	ctx.bezierCurveTo(x + 8.5 * s, y - .5 * s, x + 10, y + 4, x + 4.5 * s, y + 8);
	ctx.closePath();
	ctx.fillStyle = full ? "#e8434f" : "rgba(255, 255, 255, 0.18)";
	ctx.fill();
	ctx.lineWidth = .8;
	ctx.strokeStyle = full ? "#7d1a24" : "rgba(255, 255, 255, 0.6)";
	ctx.stroke();
	if (full) ellipse(ctx, x + 2.6 * s, y + 3, .9 * s, .7 * s, "rgba(255, 255, 255, 0.7)");
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
/** The hero stands on a cell next to the villager, sideways or across a corner. */
var nextTo = (npc, hero) => Math.abs(Math.round(hero.x) - npc.x) <= 1 && Math.abs(Math.round(hero.y) - npc.y) <= 1;
/** The widest line of a speech bubble, in field pixels. */
var SPEECH_WIDTH = 80;
var SPEECH_LINE = 7;
/** Splits a line into lines no wider than the bubble. */
var wrapText = (ctx, text, width) => {
	const lines = [];
	let line = "";
	for (const word of text.trim().split(/\s+/)) {
		const next = line === "" ? word : `${line} ${word}`;
		if (line !== "" && ctx.measureText(next).width > width) {
			lines.push(line);
			line = word;
		} else line = next;
	}
	if (line !== "") lines.push(line);
	return lines;
};
/** What a villager says, in a bubble over their head. */
var speech = (ctx, npc, text) => {
	ctx.font = "600 6px system-ui, sans-serif";
	const lines = wrapText(ctx, text, SPEECH_WIDTH);
	const w = Math.ceil(Math.max(...lines.map((l) => ctx.measureText(l).width))) + 6;
	const h = lines.length * SPEECH_LINE + 4;
	const cx = npc.x * 16 + 8;
	const bottom = npc.y * 16 - 9.6;
	const left = Math.max(1, cx - w / 2);
	roundRect(ctx, left, bottom - h, w, h, 3, "rgba(255, 255, 255, 0.95)");
	ctx.beginPath();
	ctx.moveTo(cx - 2.5, bottom);
	ctx.lineTo(cx + 2.5, bottom);
	ctx.lineTo(cx, bottom + 3);
	ctx.closePath();
	ctx.fill();
	ctx.fillStyle = "#2b2118";
	ctx.textAlign = "left";
	lines.forEach((line, i) => ctx.fillText(line, left + 3, bottom - h + 2 + (i + 1) * SPEECH_LINE - 1.5));
};
var hud = (ctx, { pose, scene, scenery, counter }) => {
	const { world } = pose;
	const x = scenery.view.x * 16 + 3;
	let y = scenery.view.y * 16 + 3;
	if (world.enemies.length > 0) {
		roundRect(ctx, x - 1.5, y - 1.5, world.maxHearts * 10 + 2, 12, 3, HUD_BACK);
		for (let i = 0; i < world.maxHearts; i++) heart(ctx, x + i * 10, y, i < world.hearts);
		y += 13;
	}
	if (world.energy !== null) {
		plate(ctx, `кроків: ${world.energy}`, x, y);
		y += 13;
	}
	if (world.capacity !== null) {
		plate(ctx, `у руках: ${world.carrying}/${world.capacity}`, x, y);
		y += 13;
	}
	if (world.storehouse !== null) {
		plate(ctx, `${scene.storehouseName ?? "на складі"}: ${world.stored}`, x, y);
		y += 13;
	}
	if (world.gates.size > 0) {
		plate(ctx, `важелі: ${world.leversOn.size}/${world.levers.size}`, x, y);
		y += 13;
	}
	if (counter !== void 0) plate(ctx, `лічильник: ${counter}`, x, y);
};
/** Everything that moves or changes, over the ground. */
var drawActors = (ctx, input) => {
	const { pose, scene, season, scenery, now, still, skin } = input;
	const { world } = pose;
	const sprites = (scene.sprites ?? []).map((placed) => ({
		placed,
		found: spriteOf(placed.asset)
	}));
	for (const { placed, found } of sprites) if (found !== null && layerOf(placed, found) === "ground" && isAnimated(placed, found)) drawPlaced(ctx, placed, still ? 0 : now);
	for (const npc of scene.npcs ?? []) villager(ctx, npc, now, still);
	for (const key of world.traps) {
		const [tx = 0, ty = 0] = key.split(",").map(Number);
		trap(ctx, tx * 16 + 8, ty * 16 + 8, season.icy, world.fell && Math.round(pose.hero.x) === tx && Math.round(pose.hero.y) === ty);
	}
	if (world.finish !== null) finishLook(ctx, scene, world.finish.x, world.finish.y, now, still, pondBy(scenery.water, world.finish));
	if (world.storehouse !== null) storehouseLook(ctx, scene, world.storehouse.x, world.storehouse.y, world.stored);
	for (const key of world.gates) {
		const [gx = 0, gy = 0] = key.split(",").map(Number);
		gateLook(ctx, gx, gy, gateOpen(world, key));
	}
	for (const key of world.levers) {
		const [lx = 0, ly = 0] = key.split(",").map(Number);
		leverLook(ctx, lx, ly, world.leversOn.has(key));
	}
	for (const { x, y } of input.items) {
		const taken = !world.crystals.has(cellKey(x, y));
		if (taken && itemAt(scene, x, y).kind !== "campfire") continue;
		itemLook(ctx, scene, x, y, taken, now, still);
	}
	const map = scene.tilemap;
	const tileset = map === void 0 ? null : spriteOf(map.tileset);
	const figures = [
		...(scene.props ?? []).map((p) => ({
			y: p.y + PROPS[p.kind].height - 1 - .02,
			draw: () => propFigure(ctx, p, still ? 0 : now)
		})),
		...scenery.trees.flatMap((t) => {
			const tree = treeAt(t.x, t.y, scene.theme);
			if (tree === null) return [];
			return [{
				y: t.y + 1 - .02,
				draw: () => withFilter(ctx, tree.autumnal ? void 0 : season.plants, () => drawFigure(ctx, tree.art, {
					cx: (t.x + 1) * 16,
					bottom: (t.y + 2) * 16 - FEET,
					now: still ? 0 : now + cellHash(t.x, t.y, 6) % 1e3,
					scale: TREE_SCALE
				}))
			}];
		}),
		...scenery.obstacles.flatMap(({ x, y, kind }) => {
			const bush = swayingBush(kind, x, y);
			if (bush === null) return [];
			return [{
				y: y - .03,
				draw: () => withFilter(ctx, season.plants, () => drawFigure(ctx, bush, {
					cx: (x + .5) * 16,
					bottom: cellBottom(y) + 1,
					now: still ? 0 : now + cellHash(x, y, 13) % 1e3,
					scale: BUSH_SCALE
				}))
			}];
		}),
		...map === void 0 || tileset === null ? [] : tilesOfKind(map, "objects").map((t) => ({
			y: t.y - .02,
			draw: () => drawTile(ctx, tileset, t.tile, t.x, t.y)
		})),
		...sprites.filter(({ placed, found }) => found !== null && layerOf(placed, found) === "object").map(({ placed }) => ({
			y: placedDepth(placed) - .01,
			draw: () => drawPlaced(ctx, placed, still ? 0 : now)
		})),
		...scenery.sheep.map((home) => {
			const at = sheepAt(home, still ? 0 : now);
			return {
				y: home.y,
				draw: () => sheepFigure(ctx, at, still ? 0 : now)
			};
		}),
		...pose.enemies.map((e) => ({
			y: e.y,
			draw: () => enemyFigure(ctx, e, pose.hero, now, still)
		})),
		...pose.crew.map((h) => ({
			y: h.y + .005,
			draw: () => heroFigure(ctx, h, HELPER_ART, now, still)
		})),
		{
			y: pose.hero.y + .01,
			draw: () => heroFigure(ctx, pose.hero, HERO_ART[skin], now, still)
		}
	];
	for (const f of figures.sort((a, b) => a.y - b.y)) f.draw();
	for (const h of [...pose.crew, pose.hero]) facingMark(ctx, h);
	if (map !== void 0 && tileset !== null) for (const t of tilesOfKind(map, "above")) drawTile(ctx, tileset, t.tile, t.x, t.y);
	for (const npc of scene.npcs ?? []) if (npc.say !== void 0 && npc.say.trim() !== "" && nextTo(npc, pose.hero)) speech(ctx, npc, npc.say);
	for (const fx of pose.effects) effect(ctx, fx, scene, now);
	if (!still && season.weather !== null) drawWeather(ctx, season.weather, scenery.view, 16, now);
	hud(ctx, input);
};
// src/ui/stage/hover.ts
/**
* The cell of the level under a point of the field (`px`, `py` from the field's top left corner, in screen pixels),
* or null when the point is on the meadow around the level.
*/
var cellAt = (px, py, box, view, level) => {
	if (box.width <= 0 || box.height <= 0) return null;
	const x = view.x + Math.floor(px / box.width * view.width);
	const y = view.y + Math.floor(py / box.height * view.height);
	if (x < 0 || y < 0 || x >= level.width || y >= level.height) return null;
	return {
		x,
		y
	};
};
var HOVER_FILL = "rgba(255, 255, 255, 0.25)";
var HOVER_EDGE = "rgba(255, 255, 255, 0.8)";
/** A light square on the cell under the mouse: children count the steps with it. */
var drawHover = (ctx, cell) => {
	ctx.fillStyle = HOVER_FILL;
	ctx.fillRect(cell.x * 16, cell.y * 16, 16, 16);
	ctx.strokeStyle = HOVER_EDGE;
	ctx.lineWidth = 1;
	ctx.strokeRect(cell.x * 16 + .5, cell.y * 16 + .5, 15, 15);
};
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
	const goal = enemy.route[enemy.target % Math.max(1, enemy.route.length)];
	if (enemy.walk === "patrol" && goal !== void 0 && (goal.x !== enemy.x || goal.y !== enemy.y)) {
		const gx = goal.x - enemy.x;
		const gy = goal.y - enemy.y;
		return Math.abs(gx) >= Math.abs(gy) ? gx > 0 ? "right" : "left" : gy > 0 ? "down" : "up";
	}
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
/** Worker `k` of the crew, from 1, as a hero: `asWorker` puts it in the hero's place. A helper never shows a crash. */
var restingCrew = (world) => world.crew.map((_, i) => ({
	...restingHero(asWorker(world, i + 1)),
	crashed: false,
	fallen: 0
}));
var crewPoses = (before, after, frame, p) => before.crew.map((_, i) => {
	const events = frame.crew?.[i]?.events ?? [];
	return {
		...heroActionPose(asWorker(before, i + 1), asWorker({
			...after,
			crashed: false
		}, i + 1), events, p),
		crashed: false
	};
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
	if (has(events, "itemTaken") || has(events, "itemsStored") || has(events, "leverPulled")) return {
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
		const hit = events.some((ev) => (ev.type === "enemyHit" || ev.type === "towerShot") && ev.id === e.id);
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
		if (ev.type === "towerShot") {
			const enemy = before.enemies.find((e) => e.id === ev.id);
			const fly = after(.05, .4);
			if (enemy !== void 0 && fly > 0 && fly < 1) out.push({
				kind: "arrow",
				x: enemy.x,
				y: enemy.y,
				from: ev.from,
				progress: fly
			});
			if (enemy !== void 0 && ev.hp <= 0) {
				const smoke = after(.55, .45);
				if (smoke > 0 && smoke < 1) out.push({
					kind: "smoke",
					x: enemy.x,
					y: enemy.y,
					progress: smoke
				});
			}
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
		if (ev.type === "nothingToTake" || ev.type === "handsFull" || ev.type === "nothingToStore" || ev.type === "noLever" || ev.type === "cannotSow" || ev.type === "cannotFeed" || ev.type === "cannotWater" || ev.type === "cannotBuild") {
			const q = after(.1, .9);
			if (q > 0 && q < 1) out.push({
				kind: "question",
				x: ev.at.x,
				y: ev.at.y,
				progress: q
			});
		}
		if (ev.type === "enemyAlerted") {
			const enemy = before.enemies.find((e) => e.id === ev.id);
			const a = within(p, ENEMY_PART);
			if (enemy !== void 0 && a > 0 && a < 1) out.push({
				kind: "alert",
				x: enemy.x,
				y: enemy.y,
				progress: a
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
			crew: restingCrew(world),
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
	const world = {
		...before,
		crystals: hpart > .5 ? after.crystals : before.crystals,
		energy: hpart > .3 ? after.energy : before.energy,
		carrying: hpart > .5 ? after.carrying : before.carrying,
		stored: hpart > .5 ? after.stored : before.stored,
		hearts: epart > .5 ? after.hearts : before.hearts,
		fell: hero.fallen > .5 ? after.fell : before.fell
	};
	const crew = crewPoses(before, after, frame, p);
	const helperEffects = (frame.crew ?? []).flatMap((c, k) => c === null ? [] : effectsOf(asWorker(before, k + 1), c.events, p));
	return {
		world,
		hero,
		crew,
		enemies,
		effects: [...effectsOf(before, frame.events, p), ...helperEffects],
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
	if (world.capacity !== null) parts.push(`У руках: ${world.carrying} з ${world.capacity}.`);
	if (world.storehouse !== null) parts.push(`На складі: ${world.stored}.`);
	if (world.gates.size > 0) parts.push(`Увімкнено важелів: ${world.leversOn.size} з ${world.levers.size}. Ворота ${gatesOpen(world) ? "відчинені" : "зачинені"}.`);
	return `Поле гри. ${parts.join(" ")}`;
};
var NO_FRAMES = [];
var NO_SCENE = {};
/** The value of the program's counter after a frame, on levels with the «лічильник» block. */
var counterOf = (frame) => {
	const value = frame === null ? void 0 : frame.counter;
	return typeof value === "string" ? value : void 0;
};
/**
* The game field on a canvas. The ground is drawn once; the hero, the enemies and the effects are drawn on every
* animation frame from `poseAt(start, frames, time)`, so the timeline can stop or jump anywhere.
*/
var Stage = ({ start, frames = NO_FRAMES, time = 0, skin, scene = NO_SCENE }) => {
	const canvasRef = useRef(null);
	const still = useReducedMotion();
	const season = seasonOf(scene);
	const { width, height, walls, finish } = start;
	const props = scene.props;
	const npcs = scene.npcs;
	const sprites = scene.sprites;
	const ground = scene.ground ?? "path";
	const tilemap = scene.tilemap;
	const terrain = scene.terrain;
	const waterPaint = scene.water;
	const finishKind = scene.finish;
	const finishLook = scene.finishLook;
	const scenery = useMemo(() => {
		if (tilemap !== void 0) return {
			view: tilemapView(tilemap),
			trees: [],
			obstacles: [],
			decor: [],
			water: /* @__PURE__ */ new Set(),
			plateau: /* @__PURE__ */ new Set(),
			cliffs: /* @__PURE__ */ new Set(),
			sheep: []
		};
		const reserved = new Set(propCells(props ?? []));
		for (const n of npcs ?? []) reserved.add(cellKey(n.x, n.y));
		for (const s of sprites ?? []) for (const key of placedCells(s)) reserved.add(key);
		for (const key of terrain === void 0 ? [] : paintedCells(terrain)) reserved.add(key);
		const water = ground === "path" ? waterCells({
			width,
			height,
			walls,
			finish
		}, {
			water: waterPaint,
			finish: finishKind,
			finishLook
		}, reserved) : /* @__PURE__ */ new Set();
		return buildScenery({
			width,
			height,
			walls,
			finish
		}, {
			reserved,
			bareWalls: ground === "bridge",
			water
		});
	}, [
		width,
		height,
		walls,
		finish,
		props,
		npcs,
		sprites,
		ground,
		tilemap,
		terrain,
		waterPaint,
		finishKind,
		finishLook
	]);
	const items = useMemo(() => [.../* @__PURE__ */ new Set([
		...start.crystals,
		...start.growing.keys(),
		...start.beds,
		...start.troughs
	])].map((key) => {
		const [x = 0, y = 0] = key.split(",").map(Number);
		return {
			x,
			y
		};
	}), [
		start.crystals,
		start.growing,
		start.beds,
		start.troughs
	]);
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
	const hover = useRef(null);
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
		let paintedScene = null;
		let paintedStart = null;
		const paint = (now) => {
			fit();
			const s = live.current;
			if (s.scene !== paintedScene || s.start !== paintedStart) groundReady = false;
			if (!groundReady) {
				paintGround();
				paintedScene = s.scene;
				paintedStart = s.start;
			}
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.imageSmoothingEnabled = false;
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.setTransform(scale, 0, 0, scale, -view.x * 16 * scale, -view.y * 16 * scale);
			drawWater(ctx, {
				scenery: s.scenery,
				now,
				still: s.still
			});
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.drawImage(groundCanvas, 0, 0);
			ctx.setTransform(scale, 0, 0, scale, -view.x * 16 * scale, -view.y * 16 * scale);
			if (hover.current !== null) drawHover(ctx, hover.current);
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
		const onMove = (e) => {
			if (e.pointerType === "touch") return;
			const box = canvas.getBoundingClientRect();
			hover.current = cellAt(e.clientX - box.left, e.clientY - box.top, box, view, live.current.start);
		};
		const onLeave = () => {
			hover.current = null;
		};
		canvas.addEventListener("pointermove", onMove);
		canvas.addEventListener("pointerleave", onLeave);
		const stop = whenLoaded(() => {
			groundReady = false;
		});
		return () => {
			cancelAnimationFrame(frame);
			stop();
			canvas.removeEventListener("pointermove", onMove);
			canvas.removeEventListener("pointerleave", onLeave);
		};
	}, [scenery]);
	const { view } = scenery;
	const shape = view.width === view.height ? void 0 : {
		aspectRatio: `${view.width} / ${view.height}`,
		...view.width > view.height ? { height: "auto" } : { width: "auto" }
	};
	return /* @__PURE__ */ jsx("canvas", {
		ref: canvasRef,
		className: "eb-field",
		role: "img",
		"aria-label": label,
		style: shape
	});
};
// src/ui/Select.tsx
var LIST_MAX_HEIGHT_PX = 288;
var LIST_GAP_PX = 6;
var TYPE_AHEAD_RESET_MS = 600;
var listPlace = (rect) => {
	const below = window.innerHeight - rect.bottom;
	return below < LIST_MAX_HEIGHT_PX && rect.top > below ? {
		left: rect.left,
		width: rect.width,
		top: null,
		bottom: window.innerHeight - rect.top + LIST_GAP_PX
	} : {
		left: rect.left,
		width: rect.width,
		top: rect.bottom + LIST_GAP_PX,
		bottom: null
	};
};
/** Next enabled option index from `from` in `direction`; stays inside the list. */
var stepEnabled = (options, from, direction) => {
	for (let i = from + direction; i >= 0 && i < options.length; i += direction) if (options[i]?.disabled !== true) return i;
	return from;
};
function Select(props) {
	const { options } = props;
	const listId = `${useId()}-list`;
	const selectedIndex = options.findIndex((o) => o.value === props.value);
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(0);
	const [place, setPlace] = useState({
		left: 0,
		width: 0,
		top: 0,
		bottom: null
	});
	const rootRef = useRef(null);
	const buttonRef = useRef(null);
	const listRef = useRef(null);
	const typed = useRef({
		text: "",
		at: 0
	});
	const openList = (index) => {
		const rect = buttonRef.current?.getBoundingClientRect();
		if (rect !== void 0) setPlace(listPlace(rect));
		setActive(index < 0 ? stepEnabled(options, -1, 1) : index);
		setOpen(true);
	};
	const pick = (index) => {
		const option = options[index];
		setOpen(false);
		if (option === void 0 || option.disabled === true) return;
		if (option.value !== props.value) props.onChange(option.value);
	};
	useEffect(() => {
		if (!open) return;
		const onPointerDown = (event) => {
			if (event.target instanceof Node && rootRef.current?.contains(event.target) === true) return;
			setOpen(false);
		};
		const onScroll = (event) => {
			if (event.target instanceof Node && listRef.current?.contains(event.target) === true) return;
			setOpen(false);
		};
		const onResize = () => setOpen(false);
		document.addEventListener("pointerdown", onPointerDown);
		window.addEventListener("scroll", onScroll, true);
		window.addEventListener("resize", onResize);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
			window.removeEventListener("scroll", onScroll, true);
			window.removeEventListener("resize", onResize);
		};
	}, [open]);
	useEffect(() => {
		if (!open) return;
		listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
	}, [open, active]);
	/** Type-ahead: the next enabled option whose label starts with the typed text. */
	const findTyped = (key, now) => {
		const text = (now - typed.current.at > TYPE_AHEAD_RESET_MS ? key : typed.current.text + key).toLowerCase();
		typed.current = {
			text,
			at: now
		};
		const start = open ? active : Math.max(selectedIndex, 0);
		return [...options.keys()].map((i) => (start + 1 + i) % options.length).find((i) => {
			const option = options[i];
			return option !== void 0 && option.disabled !== true && option.label.toLowerCase().startsWith(text);
		}) ?? -1;
	};
	const onKeyDown = (event) => {
		const { key } = event;
		const printable = key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
		if (!open) {
			if (key === "ArrowDown" || key === "ArrowUp" || key === "Enter" || key === " ") {
				event.preventDefault();
				openList(selectedIndex);
			} else if (key === "Home" || key === "End") {
				event.preventDefault();
				openList(key === "Home" ? stepEnabled(options, -1, 1) : stepEnabled(options, options.length, -1));
			} else if (printable) {
				const found = findTyped(key, event.timeStamp);
				if (found >= 0) openList(found);
			}
			return;
		}
		switch (key) {
			case "ArrowDown":
			case "ArrowUp":
				event.preventDefault();
				if (event.altKey) return pick(active);
				return setActive(stepEnabled(options, active, key === "ArrowDown" ? 1 : -1));
			case "Home":
				event.preventDefault();
				return setActive(stepEnabled(options, -1, 1));
			case "End":
				event.preventDefault();
				return setActive(stepEnabled(options, options.length, -1));
			case "Enter":
			case " ":
				event.preventDefault();
				return pick(active);
			case "Escape":
				event.preventDefault();
				event.stopPropagation();
				return setOpen(false);
			case "Tab": return pick(active);
		}
		if (printable) {
			const found = findTyped(key, event.timeStamp);
			if (found >= 0) setActive(found);
		}
	};
	const shown = options[selectedIndex];
	return /* @__PURE__ */ jsxs("span", {
		ref: rootRef,
		className: ["edu-select", props.className].filter(Boolean).join(" "),
		children: [/* @__PURE__ */ jsxs("button", {
			ref: buttonRef,
			type: "button",
			role: "combobox",
			className: "edu-select-button",
			value: props.value,
			"aria-label": props.ariaLabel,
			"aria-haspopup": "listbox",
			"aria-expanded": open,
			"aria-controls": listId,
			"aria-activedescendant": open ? `${listId}-${active}` : void 0,
			onClick: () => open ? setOpen(false) : openList(selectedIndex),
			onKeyDown,
			children: [/* @__PURE__ */ jsxs("span", {
				className: "edu-select-labels",
				children: [options.map((o) => /* @__PURE__ */ jsx("span", {
					"aria-hidden": true,
					className: "edu-select-sizer",
					children: o.label
				}, o.value)), /* @__PURE__ */ jsx("span", {
					className: "edu-select-value",
					children: shown?.label ?? ""
				})]
			}), /* @__PURE__ */ jsx("svg", {
				className: "edu-select-chevron",
				viewBox: "0 0 24 24",
				"aria-hidden": true,
				children: /* @__PURE__ */ jsx("path", { d: "m6 9 6 6 6-6" })
			})]
		}), /* @__PURE__ */ jsx("ul", {
			ref: listRef,
			id: listId,
			role: "listbox",
			"aria-label": props.ariaLabel,
			className: "edu-select-list",
			hidden: !open,
			style: {
				left: place.left,
				minWidth: place.width,
				top: place.top ?? void 0,
				bottom: place.bottom ?? void 0
			},
			children: options.map((o, i) => /* @__PURE__ */ jsxs("li", {
				id: `${listId}-${i}`,
				"data-index": i,
				"data-value": o.value,
				role: "option",
				"aria-selected": i === selectedIndex,
				"aria-disabled": o.disabled === true || void 0,
				className: ["edu-select-option", i === active ? "is-active" : ""].filter(Boolean).join(" "),
				onPointerDown: (event) => event.preventDefault(),
				onPointerEnter: () => {
					if (o.disabled !== true) setActive(i);
				},
				onClick: (event) => {
					event.preventDefault();
					pick(i);
					buttonRef.current?.focus();
				},
				children: [/* @__PURE__ */ jsx("span", {
					className: "edu-select-text",
					children: o.label
				}), i === selectedIndex && /* @__PURE__ */ jsx("svg", {
					className: "edu-select-check",
					viewBox: "0 0 24 24",
					"aria-hidden": true,
					children: /* @__PURE__ */ jsx("path", { d: "M20 6 9 17l-5-5" })
				})]
			}, o.value))
		})]
	});
}
// src/ui/Timeline.tsx
/** Speeds of the playback, as a share of the normal pace. */
var RATES = [
	.5,
	1,
	2,
	4
];
var RATE_OPTIONS = RATES.map((r) => ({
	value: String(r),
	label: `×${r}`
}));
/**
* Plays a run: moves the time on each animation frame while playing. `onEnd` runs the first time a run reaches
* its last action; a later jump to the end does not run it again.
*/
var usePlayer = (msPerAction, onEnd) => {
	const [time, setTime] = useState(0);
	const [playing, setPlaying] = useState(false);
	const [rate, setRateState] = useState(() => loadRate(RATES, 1));
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
	const play = useCallback(() => {
		if (timeRef.current >= length.current) moveTo(0);
		setPlaying(true);
	}, [moveTo]);
	const pause = useCallback(() => setPlaying(false), []);
	const seek = useCallback((t) => {
		setPlaying(false);
		moveTo(t);
	}, [moveTo]);
	const step = useCallback((by) => {
		setPlaying(false);
		const t = timeRef.current;
		moveTo(by === 1 ? Math.floor(t) + 1 : Math.ceil(t) - 1);
	}, [moveTo]);
	const restart = useCallback((n) => {
		length.current = n;
		ended.current = false;
		moveTo(0);
		setPlaying(n > 0);
	}, [moveTo]);
	return {
		time,
		playing,
		rate,
		play,
		pause,
		seek,
		step,
		setRate: useCallback((r) => {
			setRateState(r);
			saveRate(r);
		}, []),
		restart
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
			/* @__PURE__ */ jsx(Select, {
				className: "eb-timeline-rate",
				ariaLabel: "Швидкість",
				value: String(player.rate),
				options: RATE_OPTIONS,
				onChange: (r) => player.setRate(Number(r))
			})
		]
	});
};
// src/ui/GameScreen.tsx
/**
* The game screen, the same for blocks and for Python: the bar of the chapter and the hero, the field with its time
* line and buttons, the task, and the editor that the caller gives. The result of a run shows over the field.
*/
var GameScreen = ({ rootRef, className, level, start, result, player, skin, running, editing, full, xpTotal, coinsTotal, navigation, editorTitle, fields, onRun, onReset, onFull, verdict, children }) => {
	const [picking, setPicking] = useState(false);
	const [tab, setTab] = useState("field");
	const runFromCode = () => {
		setTab("field");
		onRun();
	};
	const { onSkinChange, onMap, onLevel, ownedHeroes, onBuyHero } = navigation;
	const toMap = onMap === void 0 ? void 0 : () => {
		if (full) onFull();
		onMap();
	};
	const world = result === null ? start : result.frames[Math.floor(player.time) - 1]?.world ?? start;
	return /* @__PURE__ */ jsxs("div", {
		ref: rootRef,
		className: `${className} eb-tab-${tab}`,
		children: [
			/* @__PURE__ */ jsx(Hud, {
				level,
				skin,
				xpTotal,
				coinsTotal,
				progress: navigation.progress ?? {},
				onMap: toMap,
				onLevel,
				onPickHero: onSkinChange === void 0 ? void 0 : () => setPicking(true)
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "eb-tabs",
				role: "group",
				"aria-label": "Що показати",
				children: [
					/* @__PURE__ */ jsx("button", {
						type: "button",
						className: "eb-btn eb-tab",
						"aria-pressed": tab === "field",
						onClick: () => setTab("field"),
						children: "Гра"
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						className: "eb-btn eb-tab",
						"aria-pressed": tab === "code",
						onClick: () => setTab("code"),
						children: "Програма"
					}),
					tab === "code" && /* @__PURE__ */ jsxs("button", {
						type: "button",
						className: "eb-btn eb-btn-go eb-tab-run",
						onClick: runFromCode,
						disabled: running && player.playing,
						children: [/* @__PURE__ */ jsx("span", {
							"aria-hidden": "true",
							children: "▶"
						}), " Запустити"]
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: fields === null ? "eb-stage" : "eb-stage eb-stage-fields",
				role: "group",
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
						children: [
							fields !== null && /* @__PURE__ */ jsx(FieldTabs, { ...fields }),
							result !== null && /* @__PURE__ */ jsx(Timeline, {
								player,
								length: result.frames.length
							}),
							/* @__PURE__ */ jsxs("div", {
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
							})
						]
					}),
					verdict
				]
			}),
			/* @__PURE__ */ jsx(Quest, {
				level,
				start,
				world
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "eb-editor-pane eb-frame eb-slate",
				role: "group",
				"aria-label": editorTitle,
				children: [/* @__PURE__ */ jsx("h2", {
					className: "eb-editor-head",
					children: editorTitle
				}), children]
			}),
			picking && onSkinChange !== void 0 && /* @__PURE__ */ jsx(HeroPicker, {
				skin,
				heroLevel: heroLevelOf(xpTotal ?? 0).level,
				owned: ownedHeroes ?? [],
				shop: onBuyHero === void 0 ? null : {
					coins: coinsTotal ?? 0,
					onBuy: onBuyHero
				},
				onPick: onSkinChange,
				onClose: () => setPicking(false)
			})
		]
	});
};
// src/ui/pieces.tsx
/** Shown under a pass in more than one piece, when the pieces cost a star. */
var JOIN_TIP = "Склади все в одну програму, і буде 3 зірки.";
/**
* The done pieces of this try. `ref` changes at once, before React draws, so an editor that loads a new piece can
* tell that it is a piece. A new level starts with none.
*/
var usePieces = (level) => {
	const [done, setDoneState] = useState(null);
	const ref = useRef(null);
	const setDone = useCallback((next) => {
		ref.current = next;
		setDoneState(next);
	}, []);
	useEffect(() => setDone(null), [level, setDone]);
	return {
		done,
		ref,
		setDone
	};
};
/** How a run of the joined program shows and pays: the frames after the done pieces, the stars of all the pieces. */
var gradePieces = (level, full, done, large, language) => {
	const pieces = (done?.pieces.length ?? 0) + 1;
	const stars = piecesStars(full.stars, pieces, large);
	const graded = stars === full.stars ? full : {
		...full,
		stars
	};
	return {
		full: graded,
		shown: continuedResult(graded, done?.frames ?? 0),
		pieces,
		canGoOn: canContinue(level, graded, language, pieces),
		capped: graded.passed && stars < full.stars
	};
};
/** The pieces done, over the editor: what is behind the hero, and the ways back to one program. */
var PiecesBar = ({ done, unit, onJoin, onRestart }) => done === null ? null : /* @__PURE__ */ jsxs("div", {
	className: "eb-pieces",
	role: "status",
	children: [/* @__PURE__ */ jsxs("p", { children: [
		/* @__PURE__ */ jsx("strong", { children: "Вже зроблено:" }),
		" ",
		countOf(done.pieces.length, PIECE_FORMS),
		", ",
		countOf(done.blocks, unit),
		". Герой продовжить звідси."
	] }), /* @__PURE__ */ jsxs("div", {
		className: "eb-pieces-actions",
		children: [/* @__PURE__ */ jsx("button", {
			type: "button",
			className: "eb-btn eb-btn-small",
			onClick: onJoin,
			title: "Усі шматки стануть однією програмою, а герой повернеться на старт",
			children: "Зібрати в одну програму"
		}), /* @__PURE__ */ jsx("button", {
			type: "button",
			className: "eb-btn eb-btn-small",
			onClick: onRestart,
			children: "Почати спочатку"
		})]
	})]
});
var PIECE_FORMS = [
	"шматок",
	"шматки",
	"шматків"
];
/** «1 шматок», «2 шматки», «5 шматків». */
var countOf = (n, forms) => {
	const last = n % 10;
	const tens = n % 100;
	return `${n} ${last === 1 && tens !== 11 ? forms[0] : last >= 2 && last <= 4 && (tens < 12 || tens > 14) ? forms[1] : forms[2]}`;
};
// src/ui/Boxes.tsx
var KIND_WORDS = {
	int: "ціле число",
	float: "число з крапкою",
	str: "слова",
	bool: "так чи ні",
	list: "список"
};
/**
* «Змінні» under the code: the variables of the program at the moment the run shows, as boxes with a name. The kind
* gives each box its look, so 5 and "5" differ at once. A new value pops in, so the student sees the old one go.
*/
var Boxes = ({ boxes }) => boxes.length === 0 ? null : /* @__PURE__ */ jsxs("section", {
	className: "eb-boxes",
	"aria-label": "Змінні: що в них лежить",
	children: [/* @__PURE__ */ jsx("span", {
		className: "eb-boxes-title",
		"aria-hidden": "true",
		children: "Змінні"
	}), /* @__PURE__ */ jsx("ul", {
		className: "eb-boxes-list",
		children: boxes.map((b) => /* @__PURE__ */ jsxs("li", {
			className: `eb-box eb-box-${b.kind}`,
			children: [
				/* @__PURE__ */ jsx("span", {
					className: "eb-box-name",
					children: b.name
				}),
				/* @__PURE__ */ jsx("span", {
					className: "eb-box-value",
					children: b.value
				}, b.value),
				/* @__PURE__ */ jsx("span", {
					className: "eb-box-kind",
					children: KIND_WORDS[b.kind]
				})
			]
		}, b.name))
	})]
});
// src/ui/CrewTabs.tsx
/**
* Two programs over the editor: «Робітник · Тарас». Each worker runs its own program; a turn of the day goes to the
* worker first, then to the helper.
*/
var CrewTabs = ({ tab, helper, disabled, onPick }) => /* @__PURE__ */ jsxs("div", {
	className: "eb-crew",
	children: [/* @__PURE__ */ jsx("div", {
		className: "eb-crew-tabs",
		role: "tablist",
		"aria-label": "Чия програма в редакторі",
		children: ["worker", "helper"].map((t) => /* @__PURE__ */ jsx("button", {
			type: "button",
			role: "tab",
			className: "eb-btn eb-btn-small eb-crew-tab",
			"aria-selected": t === tab,
			disabled,
			onClick: () => onPick(t),
			children: t === "worker" ? "Робітник" : helper
		}, t))
	}), /* @__PURE__ */ jsxs("span", {
		className: "eb-crew-note",
		children: [
			"Щоходу спершу робітник, потім ",
			helper,
			". Кожен робить свою програму."
		]
	})]
});
export { programSource as $, joinSources as A, PROTOTYPE_OPCODE as At, counterBoxes as B, opcodeOf$1 as Bt, loadZoom as C, DEFAULT_PROCEDURE as Ct, useFields as D, HERO_EXTENSION_ID as Dt, useFullScreen as E, HERO_COLOR as Et, crewReport as F, collectText as Ft, pageOf as G, calledBlocks as H, procedureTitle as Ht, farmReport as I, heroBlockText as It, estateHarvest as J, tearPage as K, runFarmCrew as L, isItemKind as Lt, pieceBlockId as M, STOCK_KINDS as Mt, scriptCount as N, STOCK_NAMES as Nt, isPiece as O, ITEM_FIELD as Ot, HELPER_NAME_OF as P, VARIABLE_OPCODE as Pt, librarySource as Q, judgePythonFields as R, isStockKind as Rt, loadPeek as S, COUNTER_NAME as St, saveZoom as T, HERO_BLOCKS as Tt, definedBlocks as U, BOOK_ID_PREFIX as V, procedureName as Vt, pageInfo as W, brokenProgram as X, combineFields as Y, brokenSource as Z, setAssetBase as _, wallAhead as _t, gradePieces as a, heroCount as at, heroOpen as b, CHANGE_OPCODE as bt, usePlayer as c, startWorld as ct, farmRewardOf as d, cellKey as dt, HERO_NAME as et, harvestRewardOf as f, enemiesLeft as ft, loadPackList as g, leversOf as gt, loadPack as h, itemCount as ht, PiecesBar as i, heroAct as it, linesBefore as j, SET_OPCODE as jt, joinPrograms as k, ITEM_NAMES as kt, frameIndexAt as l, applyAction as lt, RichText as m, isClosedGate as mt, Boxes as n, HERO_ACTIONS as nt, usePieces as o, heroSense as ot, rewardOf as p, enemyAt as pt, writePage as q, JOIN_TIP as r, HERO_SENSORS as rt, GameScreen as s, programVariables as st, CrewTabs as t, pythonMethodsOf as tt, Verdict as u, cellAhead as ut, HEROES as v, buildProgram as vt, savePeek as w, DEFINITION_OPCODE as wt, heroesCost as x, COUNTER_ID as xt, canBuyHero as y, CALL_OPCODE as yt, judgeFields as z, itemMenu as zt };
