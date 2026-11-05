import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
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
		name: "itemIs",
		text: "тут [ITEM]?",
		boolean: true
	}
];
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
	egg: "взяти"
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
	egg: "ягня"
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
		if ("itemIs" in q) return add(opcodeOf("itemIs"), parent, { fields: { [ITEM_FIELD]: [q.itemIs, null] } });
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
	let start = null;
	let finish = null;
	let storehouse = null;
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
			else if (ch === "H") storehouse = {
				x,
				y
			};
			else if (ch === "L" || ch === "l") {
				levers.add(cellKey(x, y));
				if (ch === "l") leversOn.add(cellKey(x, y));
			} else if (ch === "G") gates.add(cellKey(x, y));
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
		itemKinds: /* @__PURE__ */ new Map()
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
/** Every lever is on, so the gates stand open. True on a map without levers. */
var gatesOpen = (world) => world.leversOn.size === world.levers.size;
/** A gate that is shut now. */
var isClosedGate = (world, x, y) => world.gates.has(cellKey(x, y)) && !gatesOpen(world);
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
var atStorehouse = (world) => world.storehouse !== null && world.hero.x === world.storehouse.x && world.hero.y === world.storehouse.y;
/** The hero carries as much as it can: «взяти» would take nothing now. Never true on a level without a limit. */
var handsFull = (world) => world.capacity !== null && world.carrying >= world.capacity;
/** The hero stands on a lever. */
var onLever = (world) => world.levers.has(cellKey(world.hero.x, world.hero.y));
/** The hero stands on a lever that is on. */
var leverOn = (world) => world.leversOn.has(cellKey(world.hero.x, world.hero.y));
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
	if (action === "store") return store(world);
	if (action === "wait") return {
		world,
		outcome: "waited",
		events: [{ type: "heroWaited" }]
	};
	if (action === "pull") return pull(world);
	const key = cellKey(world.hero.x, world.hero.y);
	if (!world.crystals.has(key)) return {
		world,
		outcome: "nothingToCollect",
		events: [{
			type: "nothingToTake",
			at: here
		}]
	};
	if (handsFull(world)) return {
		world,
		outcome: "handsFull",
		events: [{
			type: "handsFull",
			at: here
		}]
	};
	const crystals = new Set(world.crystals);
	crystals.delete(key);
	return {
		world: {
			...world,
			crystals,
			carrying: world.carrying + 1
		},
		outcome: "collected",
		events: [{
			type: "itemTaken",
			at: here
		}]
	};
};
/** «віднести на склад»: on the storehouse the hero puts down everything it carries. */
var store = (world) => {
	const here = at(world.hero);
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
			carrying: 0
		},
		outcome: "stored",
		events: [{
			type: "itemsStored",
			at: here,
			count: world.carrying
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
	const wasOpen = gatesOpen(world);
	const isOpen = gatesOpen(after);
	const gate = world.gates.size === 0 || wasOpen === isOpen ? [] : [isOpen ? { type: "gatesOpened" } : { type: "gatesClosed" }];
	return {
		world: after,
		outcome: "pulled",
		events: [{
			type: "leverPulled",
			at: here,
			on
		}, ...gate]
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
	const capacity = level.capacity === void 0 ? null : Math.max(1, Math.round(level.capacity));
	const itemKinds = itemKindsOf(world, level.scene ?? {});
	return {
		...world,
		enemies: (level.enemies ?? []).map(enemyOf),
		hearts,
		maxHearts: hearts,
		energy,
		capacity,
		itemKinds
	};
};
/** What lies on each `c` cell: its own kind from `itemsAt`, the level's `item` otherwise. */
var itemKindsOf = (world, scene) => {
	const own = new Map((scene.itemsAt ?? []).map((i) => [cellKey(i.x, i.y), i.item]));
	return new Map([...world.crystals].map((key) => [key, own.get(key) ?? scene.item ?? "crystal"]));
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
	egg: (n) => n === 1 ? "Забери ягня" : `Збери ягнят (${n})`
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
	egg: "Забери лише ягнят"
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
var isRecord$2 = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
var isProgramBlock = (value) => isRecord$2(value) && typeof value.opcode === "string";
/** A variable reporter as the editor keeps it: `[12, name, id]`, inside an input or alone on the canvas. */
var isVariablePrimitive = (value) => Array.isArray(value) && value[0] === 12;
/** Variable reporters kept inside the inputs of a block. Each is a block the student put, so it counts. */
var variablesIn = (block) => isRecord$2(block.inputs) ? Object.values(block.inputs).filter((input) => Array.isArray(input) && isVariablePrimitive(input[1])).length : 0;
/** A custom block «без оновлення екрана» runs on the clock in Scratch, so a run could differ: it is refused. */
var isWarp = (block) => isRecord$2(block.mutation) && (block.mutation.warp === true || block.mutation.warp === "true");
var proccodeOf = (block) => isRecord$2(block.mutation) ? block.mutation.proccode : void 0;
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
	"pull"
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
	leverOn
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
		...source.counter === void 0 ? {} : { counter: source.counter },
		...source.boxes === void 0 ? {} : { boxes: source.boxes }
	});
	const fatal = fatalReason(outcome);
	if (fatal !== null) return end(session, fatal);
	if (allGoalsMet(level, world)) return end(session, null);
	if (world.hearts === 0) return end(session, "defeated");
	if (session.frames.length >= 1e3) return end(session, "tooLong");
	return false;
};
/** The answer to a question about the world as it is now. */
var heroSense = (session, probe) => typeof probe === "string" ? HERO_SENSORS[probe](session.world) : itemIs(session.world, probe.itemIs);
var end = (session, reason) => {
	session.done = true;
	session.reason = reason;
	return true;
};
// src/core/read.ts
var isRecord$1 = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
/** Scratch reads a text that is not a number as 0; a count is rounded. */
var numberOf = (value) => {
	const n = Number(value);
	return Number.isFinite(n) ? n : 0;
};
var readProgram = (program) => {
	const blockAt = (id) => {
		if (typeof id !== "string" || !Object.hasOwn(program, id)) return null;
		const b = program[id];
		if (!isRecord$1(b) || typeof b.opcode !== "string") return null;
		return {
			opcode: b.opcode,
			next: b.next,
			inputs: isRecord$1(b.inputs) ? b.inputs : {},
			fields: isRecord$1(b.fields) ? b.fields : {},
			mutation: b.mutation,
			topLevel: b.topLevel
		};
	};
	const inputOf = (block, name) => {
		const input = block.inputs[name];
		return Array.isArray(input) ? input[1] : null;
	};
	const proccodeOf = (block) => block !== null && isRecord$1(block.mutation) && typeof block.mutation.proccode === "string" ? block.mutation.proccode : null;
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
		if (block.opcode === opcodeOf("itemIs")) return { itemIs: itemOfField(block.fields[ITEM_FIELD]) };
		if (block.opcode === "operator_not") return { not: slot(inputOf(block, "OPERAND")) };
		const pair = () => [slot(inputOf(block, "OPERAND1")), slot(inputOf(block, "OPERAND2"))];
		if (block.opcode === "operator_and") return { and: pair() };
		if (block.opcode === "operator_or") return { or: pair() };
		return null;
	};
	const amount = (ref) => {
		if (Array.isArray(ref)) return ref[0] === 12 ? "counter" : numberOf(ref[1]);
		const block = visit(ref);
		if (block === null) return 0;
		if (block.opcode === "data_variable") return "counter";
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
					repeat: times === "counter" ? times : Math.max(0, Math.round(times)),
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
			case SET_OPCODE: return { set: amount(inputOf(block, "VALUE")) };
			case CHANGE_OPCODE: return { change: amount(inputOf(block, "VALUE")) };
			case CALL_OPCODE: return { call: proccodeOf(block) ?? "" };
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
		const name = proccodeOf(blockAt(inputOf(t.block, "custom_block")));
		if (name === null || definitions.some((d) => d.name === name)) continue;
		seen.add(t.id);
		definitions.push({
			name,
			body: stack(t.block.next)
		});
	}
	return {
		scripts,
		definitions
	};
};
// src/core/python/api.ts
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
		name: "item_is",
		signature: "item_is(\"carrot\")",
		doc: `True, якщо тут лежить саме це: ${Object.keys(ITEM_NAMES).map((k) => `"${k}" (${ITEM_NAMES[k]})`).join(", ")}.`,
		block: "itemIs",
		probesItem: true
	}
];
/** The methods a level opens, in palette order. */
var pythonMethodsOf = (blocks) => PYTHON_METHODS.filter((m) => blocks.includes(m.block));
/** The name the hero has in a program. */
var HERO_NAME = "hero";
// src/core/python/convert.ts
/** Blocks programs as Python code, as a student would write them. */
var METHOD = new Map(PYTHON_METHODS.map((m) => [m.action ?? m.sensor, m.name]));
var identifier = (name) => name.replace(/[^\p{L}\p{N}_]+/gu, "_");
/** A condition. An empty slot is `False`, as Scratch reads it. */
var question = (q) => {
	if (q === null) return "False";
	if (typeof q === "string") return `hero.${METHOD.get(q)}()`;
	if ("itemIs" in q) return `hero.${ITEM_METHOD}("${q.itemIs}")`;
	if ("not" in q) return `not ${question(q.not)}`;
	const [a, b] = "and" in q ? q.and : q.or;
	return `(${question(a)} ${"and" in q ? "and" : "or"} ${question(b)})`;
};
/** A number slot: the counter or a number. Sets `uses` when it reads the counter. */
var amount = (value, uses) => {
	if (value !== "counter") return String(value);
	uses.counter = true;
	return COUNTER_NAME;
};
/** The blocks of a program as Python lines. `uses` is set when the program reads the counter. */
var lines = (steps, indent, procedure, uses) => {
	if (steps.length === 0) return [`${indent}pass`];
	const inner = `${indent}    `;
	return steps.flatMap((s) => {
		if (s === "call") return [`${indent}${procedure}()`];
		if (typeof s === "string") return [`${indent}hero.${METHOD.get(s)}()`];
		if ("call" in s) return [`${indent}${identifier(s.call)}()`];
		if ("set" in s) return [`${indent}${COUNTER_NAME} = ${amount(s.set, uses)}`];
		if ("change" in s) {
			uses.counter = true;
			return [`${indent}${COUNTER_NAME} += ${amount(s.change, uses)}`];
		}
		if ("repeat" in s) return [`${indent}for _ in range(${amount(s.repeat, uses)}):`, ...lines(s.body, inner, procedure, uses)];
		if ("forever" in s) return [`${indent}while True:`, ...lines(s.forever, inner, procedure, uses)];
		if ("until" in s) return [`${indent}while not ${question(s.until)}:`, ...lines(s.body, inner, procedure, uses)];
		const branch = [`${indent}if ${question(s.if)}:`, ...lines(s.then, inner, procedure, uses)];
		return s.else === void 0 ? branch : [
			...branch,
			`${indent}else:`,
			...lines(s.else, inner, procedure, uses)
		];
	});
};
/** A function changes the counter only on a level that has it: there it says `global`, elsewhere nothing. */
var globalsOf = (level) => level.blocks.includes("counter") ? [`    global ${COUNTER_NAME}`] : [];
/**
* The program in Python, and how many lines it has that the blocks do not (a start value of the counter). The code
* plays as the blocks do: `parity.test.ts` checks it on every level.
*/
var toPython = (level, steps, definition) => {
	const procedure = identifier(definition?.name ?? procedureName(level));
	const uses = { counter: false };
	const main = lines(steps, "", procedure, uses);
	const def = definition === void 0 ? [] : [
		`def ${procedure}():`,
		...globalsOf(level),
		...lines(definition.body, "    ", procedure, uses)
	];
	const start = uses.counter ? [`${COUNTER_NAME} = 0`] : [];
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
	const procedure = identifier(procedureName(level));
	const uses = { counter: false };
	const defs = definitions.flatMap((d) => [
		`def ${identifier(d.name)}():`,
		...globalsOf(level),
		...lines(d.body, "    ", procedure, uses),
		""
	]);
	const [first, ...others] = scripts;
	const main = first === void 0 ? ["# Немає блока «коли прапорець натиснуто»: програма не почнеться."] : first.length === 0 ? ["# Додай блоки під «коли прапорець натиснуто»."] : lines(first, "", procedure, uses);
	const note = others.length === 0 ? [] : ["", `# Ще скриптів «коли прапорець натиснуто»: ${others.length}. У Python програма одна, тут лише перший.`];
	return [
		...uses.counter ? [`${COUNTER_NAME} = 0`] : [],
		...defs,
		...main,
		...note
	].join("\n");
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
/** Palette blocks a piece cannot carry over: a custom block or the counter of an earlier piece. */
var KEPT_STATE = /* @__PURE__ */ new Set(["procedure", "counter"]);
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
	}
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
var FIRE_ART = "effect/fire";
var DEAD_ART = "effect/dead";
var TREE_ART = "decor/tree";
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
			harvest: null
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
			harvest
		}
	};
};
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
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs("p", {
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
			hint
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
var Verdict = ({ level, result, reward, advice, language, onClose, onNext, onContinue, hintStep = 0, onHint }) => {
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
					children: ["Підказка: ", level.hint]
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
* Together they tell one story, «Рік у селі», from autumn through winter and spring to summer: each level gives the
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
		hint: "Порахуй клітинки до дров: стільки разів потрібен блок «крок уперед».",
		hints: [
			"Скільки клітинок від героя до дров?",
			"Кожен «крок уперед» — це одна клітинка. Коли герой стоїть на дровах, постав «взяти».",
			"крок уперед\nкрок уперед\n_\n_\nвзяти"
		],
		gift: {
			name: "Чоботи мандрівника",
			skill: "«крок уперед» і «взяти»: герой ходить і бере речі."
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
			skill: "«поворот ліворуч» і «поворот праворуч»: герой повертає."
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
		task: ["Дідусь рубає дрова в лісі й поставив там дерев'яний вказівник.", "Дорога пряма, але довга. Скільки кроків? Поклади «крок уперед» у «повторити»."],
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
		hint: "Порахуй клітинки до вказівника і впиши це число в «повторити».",
		hints: [
			"Скільки клітинок до вказівника?",
			"Поклади один «крок уперед» у «повторити» і впиши туди кількість кроків.",
			"повторити _ разів\n   крок уперед"
		],
		gift: {
			name: "Барабан",
			skill: "«повторити»: герой робить те саме кілька разів."
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
		task: ["Бабуся пече пиріг із грибами. З кошика на дорогу висипались п'ять грибів — збери їх.", "Спробуй блок «повторити»: так програма буде коротшою."],
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
		hints: [
			"Що герой робить біля кожного гриба?",
			"Два кроки й «взяти» — це одна порція. Скільки грибів, стільки разів її і повтори.",
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
		hints: [
			"Скільки кроків праворуч до повороту і скільки вниз?",
			"Два «повторити»: один для кроків праворуч, другий для кроків униз. Між ними поворот.",
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
		hint: "Одна сходинка — це «крок, ліворуч, крок, праворуч». Скільки сходинок?",
		hints: [
			"Скільки сходинок до бабусиної хати?",
			"Одна сходинка: крок, ліворуч, крок, праворуч. Поклади її в «повторити».",
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
		hint: "Одна сходинка — «крок, праворуч, крок, ліворуч». Скільки їх до гірки?",
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
		task: ["Сутеніє, у лісі виють вовки.", "Обійди двір і розпали вогнища в його кутах блоком «розпалити». Використай цикл у циклі."],
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
		hint: "Одна сторона двору — це три кроки, «розпалити» і поворот. Повтори сторону кілька разів.",
		hints: [
			"Що герой робить на одній стороні двору?",
			"Одна сторона: три кроки, «розпалити», поворот праворуч. Сторін чотири, тож повтори сторону ще одним «повторити».",
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
		task: ["Мисливці лишили на замерзлому ставку запаси м'яса для бабусі, але не всюди.", "Пройди ставком і бери блоком «взяти» лише там, де лежить м'ясо."],
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
		hints: [
			"Що буде, якщо «взяти» там, де нічого немає? А на другому полі м'ясо лежить інакше.",
			"Після кожного кроку спитай «тут щось є?» і бери лише тоді. Так програма підійде обом полям.",
			"повторити _ разів\n   крок уперед\n   якщо <тут щось є?> то\n      _"
		],
		gift: {
			name: "Ліхтарик",
			skill: "«якщо … то» і «тут щось є?»: герой дивиться під ноги, перш ніж брати."
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
		hint: "У кожному «повторити»: крок, а потім «якщо тут щось є? то взяти».",
		hints: [
			"Стежка має поворот. Скільки кроків до нього і скільки після?",
			"Два «повторити», у кожному крок і «якщо тут щось є? то взяти». Між ними поворот праворуч.",
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
		hint: "Блок «якщо… то… інакше» сам вирішує, що робити: повернути чи йти. Залишилось порахувати, скільки разів повторити.",
		hints: [
			"Коли герой має повертати, а коли йти?",
			"Один блок «якщо попереду стіна? то поворот, інакше крок» у «повторити». Лишилося підібрати число.",
			"повторити _ разів\n   якщо <попереду стіна?> то\n      _\n   інакше\n      _"
		],
		gift: {
			name: "Підзорна труба",
			skill: "«якщо … то … інакше» і «попереду стіна?»: герой бачить, що попереду, і вибирає."
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
			"У «якщо попереду стіна?» гілки переплутані: біля стіни треба повертати, а без неї йти.",
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
		hint: "Блок «повторити до попереду стіна?» сам зупиниться в кінці мосту.",
		hints: [
			"Чи знаєш ти, скільки кроків на кожному полі?",
			"Мости різної довжини. «Повторити до попереду стіна?» сам зупинить героя в кінці мосту.",
			"повторити до <_>\n   крок уперед\n_"
		],
		gift: {
			name: "Пісочний годинник",
			skill: "«повторити до»: герой повторює, доки умова не стане правдою."
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
		task: ["Робот мав дійти до кінця стежки й узяти дрова. А він навіть не зрушив з місця.", "Програма вже в редакторі. Прочитай умову циклу «повторити до» уголос і знайди помилку."],
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
		hint: "«Повторити до» повторює, ДОКИ умова не стане правдою. Коли має зупинитися робот?",
		hints: [
			"Прочитай умову циклу вголос. Чи правда вона вже на старті?",
			"«Повторити до» зупиняється, щойно умова стане правдою. Робот має йти, доки попереду не стіна, тож «не» тут зайве.",
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
		hint: "Два блоки «повторити до попереду стіна?», а між ними поворот праворуч.",
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
		hint: "«Повторити до на меті?», а всередині: крок і «якщо тут щось є? то взяти».",
		hints: [
			"Коли герой має зупинитися? А коли брати дрова?",
			"Повторюй до «дійшов до мети?», а в циклі зроби крок і «якщо тут щось є? то взяти».",
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
			"Повторюй до «дійшов до мети?». Усередині: якщо попереду стіна, то поворот праворуч, інакше крок.",
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
		task: ["Бабуся меле зерно на млині за ставком. Стежка по льоду звертає праворуч, коли попереду стіна або ополонка.", "Склади одну умову з блоком «або»: «попереду стіна? або попереду пастка?»."],
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
			"Склади одну умову «попереду стіна? або попереду пастка?» і встав її в «якщо».",
			"повторити до <дійшов до мети?>\n   якщо <<_> або <_>> то\n      поворот праворуч\n   інакше\n      крок уперед"
		],
		gift: {
			name: "Терези",
			skill: "«або» і «попереду пастка?»: умова з двох частин, і герой бачить тонкий лід."
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
		task: ["Мисливці склали м'ясо вздовж берега, шматок за шматком. Збери все, а де воно скінчиться, поверни праворуч до бабусі.", "Тут немає «якщо». Повторюй, доки під тобою НЕ скінчиться м'ясо: для цього є блок «не»."],
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
		hint: "Крок до першого шматка, потім «повторити до (не тут щось є?)»: взяти й крок. Далі поверни й іди до бабусі.",
		hints: [
			"Де починається м'ясо і де закінчується?",
			"Зроби крок до першого шматка. Повторюй «взяти, крок», доки під тобою не скінчиться м'ясо, тоді йди до бабусі.",
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
		task: ["Хату замело, і додому лишився шлях замерзлим ставком між кучугурами й ополонками. Тут є лише «якщо… то», без «інакше».", "Іди, якщо попереду не стіна і не ополонка. Повертай праворуч, якщо попереду стіна або ополонка."],
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
		hint: "У «повторити до мети» два «якщо»: (не стіна і не пастка) — крок; (стіна або пастка) — поворот праворуч.",
		hints: [
			"Коли герою можна йти? А коли треба повернути?",
			"Два «якщо» в циклі: якщо не стіна і не пастка, то крок; якщо стіна або пастка, то поворот праворуч.",
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
		hint: "«Віднести на склад» працює лише тоді, коли герой стоїть на складі, тобто на останній клітинці.",
		hints: [
			"Де склад? Скільки кроків до кожного поліна і до складу?",
			"Збери обидва поліна дорогою, а «віднести на склад» постав, коли герой стоїть на складі.",
			"крок уперед\nкрок уперед\nвзяти\n_\n_\nвзяти\nкрок уперед\n_"
		],
		gift: {
			name: "Кошик",
			skill: "«віднести на склад»: герой носить речі на склад."
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
		hint: "«Завжди»: повторюй до «руки повні?» крок і «якщо тут щось є? — взяти». Потім розвернись, іди до складу, віднеси й розвернись знову.",
		hints: [
			"Чи знаєш ти, скільки ходок треба в кожному дворі?",
			"У «завжди»: іди й бери, доки руки не повні; розвернись, іди до складу, віднеси й розвернись знову.",
			"завжди\n   повторити до <руки повні?>\n      крок уперед\n      якщо <тут щось є?> то взяти\n   поворот праворуч\n   поворот праворуч\n   повторити до <_>\n      _\n   _\n   поворот праворуч\n   поворот праворуч"
		],
		gift: {
			name: "Ноші",
			skill: "«завжди» і «руки повні?»: герой ходить ходками без кінця."
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
		hint: "Повертайся на склад, коли руки повні АБО попереду стіна: «повторити до ‹руки повні?› або ‹попереду стіна?›».",
		hints: [
			"Що буде на останній ходці, коли хмизу лишилось менше двох?",
			"Вертайся на склад, коли руки повні АБО попереду стіна. Решта програми як у «Ходках до складу».",
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
		hint: "«Потягнути важіль» працює, коли герой стоїть на важелі. Червоний важіль вимкнений, зелений увімкнений.",
		hints: [
			"Де стоїть важіль? Скільки кроків до нього?",
			"Дійди до важеля, потягни його, а потім пройди крізь ворота.",
			"повторити _ разів\n   крок уперед\nпотягнути важіль\nповторити _ разів\n   _"
		],
		gift: {
			name: "Рукавиці",
			skill: "«потягнути важіль»: герой відчиняє ворота."
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
			"Тягни лише червоні. Зелений пройди мимо, бо від «потягнути» він вимкнеться.",
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
		hint: "Тягни, якщо «тут важіль?» І НЕ «важіль увімкнено?». Склади цю умову з блоків «і» та «не».",
		hints: [
			"На яких важелях треба тягнути, а на яких ні?",
			"Тягни, якщо «тут важіль?» і НЕ «важіль увімкнено?». Склади цю умову з «і» та «не».",
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
		task: ["На городі вперемішку гарбузи і ягнята, що вибігли з кошари.", "Збери лише гарбузи: перед «взяти» спитай «тут гарбуз?». Ягнят не чіпай."],
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
		hint: "Повтори: крок, а тоді «якщо тут гарбуз? — взяти». У блоці «тут …?» вибери гарбуз.",
		hints: [
			"Що лежить на городі, крім гарбузів?",
			"Після кожного кроку спитай «тут гарбуз?» і бери лише тоді. У блоці «тут …?» вибери гарбуз.",
			"повторити _ разів\n   крок уперед\n   якщо <тут _?> то\n      взяти"
		],
		gift: {
			name: "Лупа",
			skill: "«тут ‹…›?»: герой розрізняє, що лежить під ногами."
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
		hint: "Повторюй до «попереду стіна?»: крок, і «якщо тут ягня? — взяти».",
		hints: [
			"Чи однакові стежки на всіх полях?",
			"Іди, доки попереду не стіна, а дорогою питай «тут ягня?» і бери лише ягнят.",
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
		hint: "У кожному кроці циклу: спершу «якщо тут гарбуз? — взяти», потім «якщо попереду стіна? — поворот, інакше крок».",
		hints: [
			"Що герой має перевірити на кожній клітинці?",
			"Спершу «якщо тут гарбуз? то взяти», потім «якщо попереду стіна? то поворот праворуч, інакше крок».",
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
		task: ["Вечоріє: у кутах галявини треба розпалити три вогнища. Дійди до кожного й постав блок «розпалити».", "Сил вистачить на 15 кроків, а на галявині є замерзлі калюжі з тонким льодом. Вибери, з якого вогнища почати."],
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
		task: ["Рибалки зробили на річці дві ополонки.", "Обхід біля кожної однаковий: напиши його один раз у «якщо попереду пастка»."],
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
			"Обхід: ліворуч, крок, праворуч, два кроки, праворуч, крок, ліворуч. Постав його в «якщо попереду пастка?», а в «інакше» крок.",
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
		hint: "Зроби крок — гоблін підбіжить упритул. Тоді «вдарити», а далі йди до джерела.",
		hints: [
			"Що робить гоблін, коли герой підходить ближче?",
			"Зроби крок, і гоблін підбіжить упритул. Вдар його, а потім іди до джерела.",
			"крок уперед\n_\nповторити _ разів\n   крок уперед"
		],
		gift: {
			name: "Дерев'яний меч",
			skill: "«вдарити»: герой проганяє ворогів."
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
		hint: "Гоблін у бочці помічає героя лише впритул. Якщо він на шляху — «вдарити», інакше обійди його.",
		hints: [
			"Де лежать дрова і куди котиться гоблін?",
			"Збирай дрова по черзі. Якщо гоблін на шляху, то «вдарити», інакше обійди його.",
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
		task: ["Біля дровітні вештаються гобліни. Прожени всіх.", "Питай «попереду ворог?»: якщо так — бий, а ні — іди далі."],
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
			"Перед кожним ходом питай «попереду ворог?»: так — вдар, ні — крок.",
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
		hint: "«Завжди»: «якщо попереду ворог? — вдарити, інакше — зачекати». Гобліни самі прийдуть до тебе.",
		hints: [
			"Чи треба героєві кудись іти?",
			"Стій на місці й «завжди» питай «попереду ворог?»: так — вдар, ні — зачекай.",
			"завжди\n   якщо <попереду ворог?> то\n      _\n   інакше\n      _"
		],
		gift: {
			name: "Щит",
			skill: "«зачекати»: герой стоїть і чекає слушної миті."
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
		hint: "«Повторити до ‹дійшов до мети?›»: якщо ворог попереду — вдарити, інакше — крок і «якщо тут щось є? — взяти».",
		hints: [
			"Що має робити герой, коли попереду патрульний? А коли ні?",
			"Повторюй до мети: якщо ворог попереду, то вдар, інакше крок і «якщо тут щось є? то взяти».",
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
			skill: "«лічильник»: змінна, що пам'ятає число."
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
		task: ["Дідусь кличе на пасіку, а вона на пагорбі: стежка йде п'ятьма однаковими сходинками.", "Одна сходинка — це чотири команди. Склади їх один раз у свій блок «сходинка», а потім просто клич його."],
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
		hint: "Під «визначити сходинка»: крок, ліворуч, крок, праворуч. А головна програма — п'ять блоків «сходинка».",
		hints: [
			"Яка частина стежки повторюється?",
			"Сходинка: крок, ліворуч, крок, праворуч. Склади її під «визначити сходинка», а в програмі клич «сходинка».",
			"визначити сходинка\n   крок уперед\n   поворот ліворуч\n   _\n   _\n\nсходинка\nсходинка\n_"
		],
		gift: {
			name: "Записник",
			skill: "«визначити»: свій блок із кількох команд."
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
		task: ["Робот спускається з пагорба до джерела сходинками. Сходинку він знає як свій блок, але вже на другій спіткнувся.", "Головна програма правильна. Помилка у визначенні блока «сходинка»: знайди її."],
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
			"Помилка в останньому повороті «сходинки»: після нього робот має дивитися туди ж, куди на початку.",
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
		task: ["Під ялинками біля стежки виросли гриби, і бабуся просить їх принести.", "Сходити по гриб і повернутися на стежку — сім команд. Склади їх у блок «по гриб» і клич щоразу, як дійдеш до ялинки."],
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
		hint: "Під «визначити по гриб»: ліворуч, крок, взяти, праворуч, праворуч, крок, ліворуч. Головна програма: крок, по гриб, три кроки, по гриб, чотири кроки, по гриб, крок.",
		hints: [
			"Що однакове біля кожної ялинки?",
			"По гриб: ліворуч, крок, взяти, розвернутися, крок, ліворуч. Склади це в блок «по гриб» і клич біля ялинок.",
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
		task: ["Стежку до вказівника завалило: то пеньок, то кущ. Обійти завал — це вісім команд.", "Склади їх один раз у блоці «обійти», а далі просто клич його, коли попереду завал."],
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
		hints: [
			"Скільки команд займає один обхід завалу?",
			"Обхід: ліворуч, крок, праворуч, два кроки, праворуч, крок, ліворуч. Склади його в «обійти» і клич перед кожним завалом.",
			"визначити обійти\n   поворот ліворуч\n   крок уперед\n   поворот праворуч\n   _\n\nкрок уперед\nобійти\n_"
		],
		scene: { theme: "summer" }
	},
	{
		id: "f-bushes",
		tier: "practice",
		title: "Кущі на стежці",
		task: ["Після грози на стежці до джерела виросли кущі, і стоять вони де заманеться.", "Склади блок «обійти», а головна програма нехай сама вирішує: якщо попереду кущ — обійти, інакше крок."],
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
		hint: "Повторюй, доки не дійдеш до мети: якщо попереду стіна, то «обійти», інакше крок. Блок «обійти» — той самий, що на завалах.",
		hints: [
			"Чи знаєш ти, де кущі на кожному полі?",
			"Програма сама вирішує: якщо попереду кущ, то «обійти», інакше крок. «Обійти» той самий, що на завалах.",
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
		task: ["Остання прогулянка літа: між завалами все більше кроків, а за кожним завалом росте гриб.", "Поєднай лічильник і свій блок «обійти», щоб програма вийшла короткою."],
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
			"Обхід завжди однаковий: це твій блок «обійти». А кроків між завалами щоразу більше: це лічильник.",
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
					"hero.move() — один крок уперед. hero.collect() — взяти те, що лежить під ногами.",
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
			hint: "Три рядки hero.move() і один hero.collect().",
			hints: [
				"Скільки клітинок до дров? Стільки разів і треба зробити крок.",
				"Крок — hero.move(), взяти — hero.collect(). Кожна команда з нового рядка.",
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
				text: ["У дужки можна написати число: hero.move(6) — це 6 кроків.", "Так коротше: один рядок замість шести."],
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
			hint: "hero.move(6), а потім hero.collect().",
			hints: [
				"Скільки кроків до дров? Це число можна написати в дужках.",
				"hero.move(6) робить 6 кроків одним рядком. Потім візьми дрова.",
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
				text: ["hero.turn_right() — повернути праворуч. hero.turn_left() — повернути ліворуч.", "Герой повертається на місці, без кроку. Праворуч і ліворуч — це від героя, куди він дивиться."],
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
			hint: "hero.move(3), hero.turn_right(), hero.move(3), hero.collect().",
			hints: [
				"Куди треба повернути, коли дійдеш до рогу: праворуч чи ліворуч?",
				"Іди вправо, поверни праворуч командою hero.turn_right(), іди вниз і візьми.",
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
				text: ["print(\"…\") — ще одна команда: герой каже вголос те, що в дужках.", "Слова пиши в лапках: print(\"Привіт!\"). Сказане видно у віконці під кодом."],
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
			hint: "print(\"Добрий день!\"), а потім hero.move(5).",
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
					"Команди героя через крапку ще називають методами. Це просто «що вміє герой»."
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
			hint: "hero.move(), hero.move(2), print(\"Привіт\").",
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
			title: "Скринька з числом",
			task: ["Дрова лежать за 3 клітинки від хати.", "У скриньці steps зараз 0, тому герой стоїть. Поклади в неї 3."],
			lesson: {
				title: "Що таке скринька",
				text: [
					"Рядок steps = 0 — це скринька. Зліва її назва steps, а справа те, що в ній лежить.",
					"hero.move(steps) — герой іде стільки кроків, скільки лежить у скриньці steps. Нижні рядки вже готові.",
					"Заміни 0 на інше число й натисни «Запустити»."
				],
				example: "steps = 5   # у скриньці steps лежить 5\n"
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
			hint: "Перший рядок має бути steps = 3.",
			hints: [
				"Скільки клітинок до дров?",
				"Герой іде стільки кроків, скільки лежить у скриньці steps. Поклади туди це число.",
				"steps = _"
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
			title: "Одна скринька, два рази",
			task: ["Стежка йде вправо, а потім униз. Обидві частини однакові: по 4 клітинки.", "Поклади в скриньку steps одне число, і герой пройде обидві частини."],
			lesson: {
				title: "Одну скриньку можна брати багато разів",
				text: ["Герой бере число зі скриньки steps двічі: коли йде вправо і коли йде вниз.", "Тому число міняєш лише в одному місці, у рядку steps = …"],
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
			hint: "Перший рядок має бути steps = 4.",
			hints: [
				"Скільки клітинок у кожній частині стежки?",
				"Обидві частини однакові, тому одне число в скриньці підходить для обох.",
				"steps = _"
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
			title: "Нове число в скриньці",
			task: ["Тепер частини різні: вправо 2 клітинки, а вниз 4.", "Перед другою частиною поклади в скриньку steps нове число."],
			lesson: {
				title: "Нове число замінює старе",
				text: ["У скриньці лежить лише одне число. Коли кладеш нове, старе зникає.", "Python читає програму згори вниз. Тому герой бере те число, яке лежить у скриньці саме в цю мить."],
				example: "apples = 5   # у скриньці 5\napples = 7   # тепер у скриньці 7, а 5 зникло\n"
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
			title: "Дві скриньки",
			task: ["До гарбуза 5 клітинок управо і 2 вниз.", "Поклади ці числа у дві скриньки: forward і down."],
			lesson: {
				title: "У кожної скриньки своя назва",
				text: [
					"Скриньок може бути скільки завгодно. Їх розрізняють за назвою.",
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
			hint: "forward = 5 і down = 2.",
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
			title: "Зроби скриньку сам",
			task: ["Тепер скриньки немає. Зроби її сам: назва steps, а в ній 6.", "Пиши її в першому рядку, над командами героя."],
			lesson: {
				title: "Як зробити скриньку",
				text: [
					"Пишеш назву, знак = і число: steps = 6. Так ти робиш скриньку й кладеш у неї 6.",
					"Знак = тут означає «поклади». Зліва завжди назва, справа те, що кладеш.",
					"Таку скриньку в програмі називають змінною: число в ній можна змінити."
				],
				example: "coins = 10   # нова скринька coins, у ній 10\n"
			},
			starter: "# Зроби тут скриньку steps.\n\nhero.move(steps)\nhero.collect()\n",
			map: straight(6),
			blocks: ["move", "collect"],
			goals: [{ type: "crystals" }],
			uses: ["variable"],
			stars: {
				three: 4,
				two: 6
			},
			hint: "Перед hero.move(steps) додай рядок steps = 6.",
			hints: [
				"Чого бракує Python у рядку hero.move(steps)?",
				"Скриньки steps ще немає. Зроби її рядком над командами.",
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
			task: ["Робот зробив скриньку, але герой не йде. Запусти програму й прочитай, що каже Python.", "Знайди помилку й виправ її."],
			lesson: {
				title: "Steps і steps — різні скриньки",
				text: ["Для Python велика й мала літери різні. Steps і steps — дві різні назви.", "Тому назву скриньки пиши щоразу однаково, літера в літеру."],
				example: "score = 1\nScore = 5    # це вже інша скринька\nprint(score)  # 1\n"
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
				"Порівняй назву скриньки в першому і в другому рядку. Чи вони однакові?",
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
			title: "Команди і скринька",
			task: ["Стежка до джерела — три шматки по 3 клітинки: вправо, вниз, знову вправо.", "Скринька steps уже є. Напиши всю програму сам і пиши steps замість 3 у кожному hero.move."],
			lesson: {
				title: "Усе разом",
				text: ["Тепер ти пишеш сам і скриньку, і команди. hero.move(steps) бере число зі скриньки.", "Поворот праворуч — hero.turn_right(), ліворуч — hero.turn_left()."],
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
			hint: "hero.move(steps), поворот праворуч, hero.move(steps), поворот ліворуч, hero.move(steps).",
			hints: [
				"З яких частин складається стежка? Скільки в кожній клітинок?",
				"Три рази hero.move(steps), а між ними поворот праворуч і поворот ліворуч.",
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
			task: ["Стежка до дров — два шматки: first і second. Вони вже лежать у скриньках.", "Не рахуй сам. Нехай Python додасть їх просто в дужках hero.move."],
			lesson: {
				title: "Python уміє рахувати",
				text: ["Зі скриньками можна рахувати: + додати, - відняти, * помножити.", "hero.move(first + second): Python спершу додає, а потім герой іде стільки кроків."],
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
			hint: "hero.move(first + second), а потім hero.collect().",
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
			task: ["У скриньці n лежить 3, а дрова вдвічі далі: за n * 2 клітинок.", "Не рахуй сам. Напиши n * 2 просто в дужках hero.move."],
			lesson: {
				title: "Множимо",
				text: ["Зірочка * означає «помножити»: n * 2 — удвічі більше, ніж у скриньці n.", "Якщо n = 3, то n * 2 дає 6."],
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
			hint: "hero.move(n * 2), а потім hero.collect().",
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
			title: "Решта в скриньці",
			task: ["У героя 20 гривень, а хліб коштує 7. Порахуй решту в скриньку change.", "Потім скажи: Решта: і число зі скриньки. І дійди до продавчині."],
			lesson: {
				title: "Результат — у скриньку",
				text: [
					"Що порахував, можна покласти в скриньку: change = money - price.",
					"Python спершу рахує праву частину, а потім кладе результат у скриньку зліва.",
					"print може сказати слова і число разом. Пиши їх через кому: print(\"Решта:\", change)."
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
			hint: "change = money - price, потім print(\"Решта:\", change) і hero.move(4).",
			hints: [
				"Решта — це скільки було грошей мінус ціна.",
				"Зроби скриньку change, поклади в неї money - price і скажи її через print.",
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
			task: ["Бабуся просить порахувати гриби. Збери всі три, а після кожного додавай 1 у скриньку mushrooms.", "Наприкінці скажи: Грибів: 3. Число візьми зі скриньки."],
			lesson: {
				title: "Скринька-лічильник",
				text: ["mushrooms = mushrooms + 1 — це не задачка з математики. Це команда.", "Вона означає: візьми число зі скриньки, додай 1 і поклади назад. Було 0, стало 1."],
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
			hint: "Тричі: hero.move(), hero.collect(), mushrooms = mushrooms + 1. Потім print(\"Грибів:\", mushrooms).",
			hints: [
				"Що треба зробити біля кожного гриба, крім того, щоб узяти його?",
				"Після кожного hero.collect() додай 1 у скриньку: mushrooms = mushrooms + 1.",
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
			title: "Скринька зі словами",
			task: ["Дід біля вказівника хоче почути: Добрий день!", "Поклади ці слова в скриньку greeting. Герой скаже їх і піде до вказівника."],
			lesson: {
				title: "У скриньку можна покласти слова",
				text: ["У скриньці може лежати не лише число, а й слова. Слова, як і в print, беруть у лапки: \"Привіт\".", "print(greeting) без лапок каже не слово greeting, а те, що лежить у скриньці."],
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
			hint: "greeting = \"Добрий день!\" — з лапками і знаком оклику.",
			hints: [
				"Що хоче почути дід?",
				"Поклади в скриньку greeting саме ці слова, у лапках.",
				"greeting = \"_____ ____!\""
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
			task: ["Бабуся записує, хто скільки приніс. Героя звати Тарас, і він приніс 3 яблука.", "Поклади ім'я в скриньку name, а число в скриньку apples."],
			lesson: {
				title: "Слова в лапках, число без лапок",
				text: [
					"Слова кладуть у скриньку в лапках: name = \"Оля\".",
					"Число пишуть без лапок: apples = 5.",
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
			hint: "name = \"Тарас\" і apples = 3.",
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
					"Подивись на скриньку steps під кодом: там видно, що в ній лежить, число чи слова."
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
			hint: "Прибери лапки: steps = 5.",
			hints: [
				"Подивись на перший рядок. Що в ньому не так з числом 5?",
				"\"5\" у лапках — це слова. Герой ходить числом без лапок.",
				"steps = _"
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
			task: ["Кошик моркви важить два з половиною кілограми.", "Поклади вагу в скриньку weight, щоб герой сказав: Кошик важить 2.5 кг."],
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
			hint: "weight = 2.5 — з крапкою, без лапок.",
			hints: [
				"Як записати два з половиною в Python?",
				"Дробову частину відділяють крапкою, і число пишуть без лапок.",
				"weight = _._"
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
			task: ["Хвіртка біля хати зачинена. Відчини її: поклади в скриньку door_open слово True.", "Герой скаже: Хвіртка відчинена: True."],
			lesson: {
				title: "True і False",
				text: [
					"Буває, що треба зберегти лише «так» чи «ні». Для цього в Python є True і False.",
					"True означає «так», False означає «ні». Пишуть їх з великої літери і без лапок.",
					"Тепер ти знаєш чотири речі, які лежать у скриньці: ціле число, число з крапкою, слова і True або False."
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
			hint: "door_open = True — з великої літери, без лапок.",
			hints: [
				"Яке слово означає «так» у Python?",
				"True пишуть з великої літери і без лапок.",
				"door_open = ____"
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
				"input(\"Як вас звати?\") ставить питання й чекає відповіді. Тут відповідає дід.",
				"Відповідь кладуть у скриньку: name = input(\"Як вас звати?\").",
				"Ти не знаєш наперед, що скаже дід. Але скринька name запам'ятає відповідь."
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
		hint: "name = input(\"Як вас звати?\"), а потім print(\"Добрий день,\", name).",
		hints: [
			"Що треба дізнатися в діда? Куди покласти відповідь?",
			"name = input(\"Як вас звати?\") питає й кладе відповідь у скриньку. Потім скажи її через print.",
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
			title: "Два питання — дві скриньки",
			text: ["Питати можна кілька разів. Перший input() отримує першу відповідь, другий — другу.", "Кожну відповідь клади в окрему скриньку з назвою, яка підказує, що там."],
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
		hint: "name = input(\"Як тебе звати?\"), village = input(\"Звідки ти?\"), print(name, village).",
		hints: [
			"Скільки питань треба поставити?",
			"Два input(), кожен у свою скриньку. Потім print з обома скриньками через кому.",
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
				text: ["Що б не сказав дід, input() дає слова. \"3\" + \"4\" склеюються в \"34\", як два написи.", "Зробити з напису число вміє int(): int(\"3\") дає 3. Тоді 3 + 4 дасть 7."],
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
			hint: "a = int(input(\"Перше число?\")) і так само b.",
			hints: [
				"Чому вийшло 34, а не 7? Що дає input(): число чи слова?",
				"Загорни кожен input() в int(), щоб відповідь стала числом.",
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
					"Що б не сказав дід, input() дає слова. Навіть \"3\" для Python — це напис, а не число.",
					"Зробити з напису число вміє int(): int(\"3\") дає 3.",
					"Тому відповідь загортають в int(): steps = int(input(\"Скільки кроків?\"))."
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
			hint: "steps = int(input(\"Скільки кроків?\")), потім hero.move(steps) і hero.collect().",
			hints: [
				"Що дає input(): число чи слова? А чим ходить герой?",
				"Загорни відповідь в int(), поклади в скриньку і йди стільки кроків.",
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
			task: ["Мисливець підкаже дорогу до гарбуза: скільки йти прямо і скільки вниз після повороту праворуч.", "Спитай двічі. Кожну відповідь зроби числом і поклади в свою скриньку."],
			lesson: {
				title: "Два числа від мисливця",
				text: ["Тут усе як раніше: два питання, дві скриньки.", "Тільки кожну відповідь загортаєш в int(), бо герой ходить числами, а не словами."],
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
			hint: "Дві скриньки з int(input(…)), потім hero.move(перша), hero.turn_right(), hero.move(друга), hero.collect().",
			hints: [
				"Скільки питань треба поставити мисливцю?",
				"Дві скриньки, кожна з int(input(…)). Потім вправо, поворот праворуч, униз.",
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
				text: ["int() робить лише цілі числа. Напис \"2.5\" він не зрозуміє.", "Для чисел з крапкою є float(): float(\"2.5\") дає 2.5."],
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
			hint: "weight = float(input(\"Скільки важить?\")), потім print(\"Кошик важить\", weight, \"кг\").",
			hints: [
				"Вага з крапкою. Чи впорається з нею int()?",
				"Для чисел з крапкою є float(). Загорни в нього input().",
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
				text: ["Знак + склеює слова зі словами: \"Добрий\" + \" день\". А слова з числом не склеює.", "str() робить із числа слова: str(3) дає \"3\". Тепер їх можна склеїти."],
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
			hint: "print(\"Яблук: \" + str(apples)).",
			hints: [
				"Python каже, що не може додати слова і число. Що з них треба змінити?",
				"str(apples) робить із числа слова, і тоді їх можна склеїти.",
				"print(\"Яблук: \" + ___(apples))"
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
				text: ["Решта — це скільки грошей було мінус ціна. У Python це 20 - price.", "Ціну дає input(), тому не забудь загорнути її в int()."],
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
			hint: "price = int(input(\"Скільки коштує хліб?\")), потім print(\"Решта:\", 20 - price).",
			hints: [
				"Решта — це скільки було мінус ціна. А ціну дізнаєшся в продавчині.",
				"Спитай ціну через int(input(…)), а потім скажи 20 - price.",
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
				text: ["Ціна буває з копійками: 12.5. Тому відповідь загортай у float().", "Три кілограми коштують утричі більше: price * 3. Зірочка * — це «помножити»."],
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
			hint: "price = float(input(\"Скільки коштує кілограм?\")), потім total = price * 3 і print(\"Разом:\", total).",
			hints: [
				"Ціна з копійками. Яким перетворенням зробити з неї число?",
				"float(input(…)) дає ціну, а price * 3 — ціну трьох кілограмів.",
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
				text: ["hero.move(n * 2) — удвічі більше кроків, ніж лежить у скриньці n.", "Якщо n = 3, герой пройде 6 кроків."],
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
			hint: "n = int(input(…)); вправо n, поворот праворуч, вниз n, поворот ліворуч, і hero.move(n * 2).",
			hints: [
				"Скільки разів треба спитати діда?",
				"Один int(input(…)) у скриньку n. Перші два шматки — n, останній — n * 2.",
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
		title: "Скринька для числа",
		skill: "Зрозуміти, що змінна — це скринька з назвою, і класти в неї числа."
	},
	pyMath: {
		title: "Рахуємо",
		skill: "Додавати, віднімати й множити числа зі скриньок і класти результат у скриньку."
	},
	pyTypes: {
		title: "Що лежить у скриньці",
		skill: "Класти в скриньку ціле число, число з крапкою, слова в лапках і True або False."
	},
	pyAsk: {
		title: "Питаємо",
		skill: "Спитати через input() і покласти відповідь у скриньку."
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
					children: chapter !== void 0 ? `${chapterLabel(chapter)} · ${chapter.title}` : isEstateLevel(level.id) ? level.title : "Завдання"
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
/** Grass, the ground or the ice under the path, flowers, bushes and stones; or the flat layers of a tile map. */
var drawGround = (ctx, { world, scene, season, scenery }) => {
	if (scene.tilemap !== void 0) tilemapGround(ctx, scene.tilemap);
	else naturalGround(ctx, {
		world,
		scene,
		season,
		scenery
	});
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
		for (const { x, y, kind } of scenery.obstacles) stand(ctx, OBSTACLE_ART[kind], (x + .5) * 16, cellBottom(y) + 1, 0);
	});
};
/**
* The field's own ground. Under everything lies sand (or water for ice and a bridge); grass covers every cell where
* the hero does not walk, with soft edges toward the path, as the islands of Tiny Swords lie on the sand.
*/
var naturalGround = (ctx, { world, scene, scenery }) => {
	const ground = baseArt(GROUND_ART);
	const water = baseArt(WATER_ART);
	if (ground === null || water === null) return;
	const { view } = scenery;
	const kind = scene.ground ?? "path";
	const { width, height, walls } = world;
	const inside = (x, y) => x >= 0 && y >= 0 && x < width && y < height;
	const open = (x, y) => inside(x, y) && !walls.has(cellKey(x, y));
	const low = kind === "bridge" ? inside : open;
	const sand = groundTile(ground.sprite, "sand", 0);
	for (let y = view.y; y < view.y + view.height; y++) for (let x = view.x; x < view.x + view.width; x++) if (kind === "path" && sand !== null) drawTile(ctx, ground, sand, x, y);
	else drawTile(ctx, water, 1, x, y);
	if (kind === "ice") {
		ctx.fillStyle = ICE;
		ctx.fillRect(view.x * 16, view.y * 16, view.width * 16, view.height * 16);
	}
	for (let y = view.y; y < view.y + view.height; y++) for (let x = view.x; x < view.x + view.width; x++) {
		if (low(x, y)) continue;
		const mask = (low(x, y - 1) ? 1 : 0) | (low(x + 1, y) ? 2 : 0) | (low(x, y + 1) ? 4 : 0) | (low(x - 1, y) ? 8 : 0);
		const tile = groundTile(ground.sprite, "grass", mask);
		if (tile !== null) drawTile(ctx, ground, tile, x, y);
	}
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
/** The goal. A well is a spring in the grass: water with stones. At home the house is the goal: the cell is marked. */
var finishLook = (ctx, scene, x, y, now, still) => {
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
var heroFigure = (ctx, hero, skin, now, still) => {
	const spriteId = HERO_ART[skin];
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
var effect = (ctx, fx, scene, now) => {
	const { kind: item, own: hasOwn } = itemAt(scene, fx.x, fx.y);
	const cx = fx.x * 16 + 8;
	const cy = fx.y * 16 + 8;
	if (fx.kind === "slash") {
		slash(ctx, cx, cy, fx.progress);
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
var hud = (ctx, { pose, scenery, counter }) => {
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
		plate(ctx, `на складі: ${world.stored}`, x, y);
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
	if (world.finish !== null) finishLook(ctx, scene, world.finish.x, world.finish.y, now, still);
	if (world.storehouse !== null) storehouseLook(ctx, scene, world.storehouse.x, world.storehouse.y, world.stored);
	const open = gatesOpen(world);
	for (const key of world.gates) {
		const [gx = 0, gy = 0] = key.split(",").map(Number);
		gateLook(ctx, gx, gy, open);
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
	const tree = art(TREE_ART);
	const figures = [
		...(scene.props ?? []).map((p) => ({
			y: p.y + PROPS[p.kind].height - 1 - .02,
			draw: () => propFigure(ctx, p, still ? 0 : now)
		})),
		...tree === null ? [] : scenery.trees.map((t) => ({
			y: t.y + 1 - .02,
			draw: () => withFilter(ctx, season.plants, () => drawFigure(ctx, tree, {
				cx: (t.x + 1) * 16,
				bottom: (t.y + 2) * 16 - FEET,
				now: still ? 0 : now + cellHash(t.x, t.y, 6) % 1e3,
				scale: TREE_SCALE
			}))
		})),
		...map === void 0 || tileset === null ? [] : tilesOfKind(map, "objects").map((t) => ({
			y: t.y - .02,
			draw: () => drawTile(ctx, tileset, t.tile, t.x, t.y)
		})),
		...sprites.filter(({ placed, found }) => found !== null && layerOf(placed, found) === "object").map(({ placed }) => ({
			y: placedDepth(placed) - .01,
			draw: () => drawPlaced(ctx, placed, still ? 0 : now)
		})),
		...pose.enemies.map((e) => ({
			y: e.y,
			draw: () => enemyFigure(ctx, e, pose.hero, now, still)
		})),
		{
			y: pose.hero.y + .01,
			draw: () => heroFigure(ctx, pose.hero, skin, now, still)
		}
	];
	for (const f of figures.sort((a, b) => a.y - b.y)) f.draw();
	if (map !== void 0 && tileset !== null) for (const t of tilesOfKind(map, "above")) drawTile(ctx, tileset, t.tile, t.x, t.y);
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
		if (ev.type === "nothingToTake" || ev.type === "handsFull" || ev.type === "nothingToStore" || ev.type === "noLever") {
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
			carrying: hpart > .5 ? after.carrying : before.carrying,
			stored: hpart > .5 ? after.stored : before.stored,
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
	if (world.capacity !== null) parts.push(`У руках: ${world.carrying} з ${world.capacity}.`);
	if (world.storehouse !== null) parts.push(`На складі: ${world.stored}.`);
	if (world.gates.size > 0) parts.push(`Увімкнено важелів: ${world.leversOn.size} з ${world.levers.size}. Ворота ${world.leversOn.size === world.levers.size ? "відчинені" : "зачинені"}.`);
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
	const scenery = useMemo(() => {
		if (tilemap !== void 0) return {
			view: tilemapView(tilemap),
			trees: [],
			obstacles: [],
			decor: []
		};
		const reserved = new Set(propCells(props ?? []));
		for (const n of npcs ?? []) reserved.add(cellKey(n.x, n.y));
		for (const s of sprites ?? []) for (const key of placedCells(s)) reserved.add(key);
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
		sprites,
		ground,
		tilemap
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
* «Скриньки» under the code: the variables of the program at the moment the run shows, as boxes with a name. The kind
* gives each box its look, so 5 and "5" differ at once. A new value pops in, so the student sees the old one go.
*/
var Boxes = ({ boxes }) => boxes.length === 0 ? null : /* @__PURE__ */ jsxs("section", {
	className: "eb-boxes",
	"aria-label": "Скриньки: що лежить у змінних",
	children: [/* @__PURE__ */ jsx("span", {
		className: "eb-boxes-title",
		"aria-hidden": "true",
		children: "Скриньки"
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
* «Скриньки» of a block program: its one variable, «лічильник», as Scratch keeps it (`Frame.counter`). A number is a
* whole number or a number with a dot; anything else the student typed into «задати лічильник» is words.
*/
var counterBoxes = (counter) => {
	if (counter === void 0) return [];
	if (/^-?\d+$/.test(counter)) return [{
		name: COUNTER_NAME,
		value: counter,
		kind: "int"
	}];
	if (/^-?\d*\.\d+$/.test(counter)) return [{
		name: COUNTER_NAME,
		value: counter,
		kind: "float"
	}];
	return [{
		name: COUNTER_NAME,
		value: `"${counter}"`,
		kind: "str"
	}];
};
export { programSource as $, loadPackList as A, DEFINITION_OPCODE as At, useFullScreen as B, collectText as Bt, GameScreen as C, wallAhead as Ct, harvestRewardOf as D, COUNTER_ID as Dt, Verdict as E, CHANGE_OPCODE as Et, heroesCost as F, ITEM_NAMES as Ft, linesBefore as G, opcodeOf as Gt, isPiece as H, isItemKind as Ht, loadPeek as I, PROTOTYPE_OPCODE as It, estateHarvest as J, pieceBlockId as K, procedureName as Kt, loadZoom as L, SET_OPCODE as Lt, HEROES as M, HERO_COLOR as Mt, canBuyHero as N, HERO_EXTENSION_ID as Nt, rewardOf as O, COUNTER_NAME as Ot, heroOpen as P, ITEM_FIELD as Pt, brokenSource as Q, savePeek as R, START_OPCODE as Rt, usePieces as S, itemCount as St, frameIndexAt as T, CALL_OPCODE as Tt, joinPrograms as U, itemMenu as Ut, useFields as V, heroBlockText as Vt, joinSources as W, itemOfField as Wt, levelFields as X, combineFields as Y, brokenProgram as Z, closest as _, cellAhead as _t, binary as a, actionOfOpcode as at, PiecesBar as b, enemyAt as bt, isList as c, newSession as ct, repr as d, MAX_FRAMES as dt, HERO_NAME as et, str as f, checkProgram as ft, PyError as g, applyAction as gt, typeName as h, startWorld as ht, TEXT_METHODS as i, HERO_SENSORS as it, setAssetBase as j, HERO_BLOCKS as jt, loadPack as k, DEFAULT_PROCEDURE as kt, list as l, sensorOfOpcode as lt, truthy as m, allGoalsMet as mt, counterBoxes as n, pythonMethodsOf as nt, compare as o, heroAct as ot, toInt as p, resultOf as pt, scriptCount as q, MAX_ITEMS as r, HERO_ACTIONS as rt, isCallable as s, heroSense as st, boxesOf as t, PYTHON_METHODS as tt, pythonType as u, MAX_ACTIONS as ut, Boxes as v, cellKey as vt, usePlayer as w, buildProgram as wt, gradePieces as x, isClosedGate as xt, JOIN_TIP as y, enemiesLeft as yt, saveZoom as z, VARIABLE_OPCODE as zt };
