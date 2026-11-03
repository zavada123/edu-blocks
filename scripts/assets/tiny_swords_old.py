"""Tiny Swords, Update 010 (CC0): every picture of the pack, described for people and for AI. See tiny_swords.py."""

from __future__ import annotations

from pathlib import Path

from common import Pack
from tiny_swords import CELL, COLOR_IN, COLOR_UK, COLOR_WITH, Builder, Clip, block16, finish, parts_of, tile

META = {
    "id": "tiny-swords",
    "title": "Tiny Swords (Update 010)",
    "author": "Pixel Frog",
    "source": "https://pixelfrog-assets.itch.io/tiny-swords",
    "license": {
        "name": "CC0 1.0",
        "url": "https://creativecommons.org/publicdomain/zero/1.0/",
        "redistribute": "yes",
        "terms": "The old version of Tiny Swords, published by Pixel Frog as \"TS_old version_CC0 Licensed\": public "
                 "domain, no conditions. Credit to Pixel Frog is welcome.",
    },
    "cell": CELL,
    "view": "top-down with a slight tilt: characters and buildings are drawn from the side, the ground from above",
    "colors": ["blue", "purple", "red", "yellow"],
}

INTRO = (
    "Стара версія Tiny Swords від Pixel Frog (Update 010), ліцензія CC0: можна викладати й змінювати без умов. "
    "Вигляд згори з легким нахилом: земля намальована згори, люди й будівлі збоку. Одна клітинка поля = 64×64. "
    "Лицарі (синій, фіолетовий, червоний, жовтий) і гобліни тих самих кольорів; персонажі дивляться праворуч, "
    "ліворуч їх віддзеркалюють (`mirror`). Порядок шарів карти: вода → піна → плоска земля → тінь скелі → "
    "плато → стіни скель → об'єкти за `anchor` згори вниз. `anchor` — точка, якою спрайт стоїть на землі "
    "(в пікселях кадру), `bounds` — видима частина кадру."
)

COLORS = ("blue", "purple", "red", "yellow")
# The files spell purple as "Purlple" once.
ARCHER_FILE = {"blue": "Blue/Archer_Blue.png", "purple": "Purple/Archer_Purlple.png", "red": "Red/Archer_Red.png",
               "yellow": "Yellow/Archer_Yellow.png"}

KNIGHTS = "Factions/Knights"
GOBLINS = "Factions/Goblins"
UNIT = (192, 192)


def units(b: Builder) -> None:
    for color in COLORS:
        cap = color.capitalize()
        uk = COLOR_UK[color]
        b.add(f"character/warrior-{color}", f"{KNIGHTS}/Troops/Warrior/{cap}/Warrior_{cap}.png",
              f"units/warrior/{color}.png", "character", f"Warrior {color}", f"Воїн ({uk})",
              f"Лицар у шоломі з {COLOR_WITH[color]} пером, з мечем і щитом. Головний герой або охоронець: стоїть, біжить, б'є мечем "
              "праворуч, униз і вгору (по два різні удари).",
              ["knight", "warrior", "sword", "shield", "human", color], ["hero", "npc"], frame=UNIT, layout="side",
              faces="right", mirror=True, group="warrior", color=color, clips=[
                  Clip("idle", "стоїть і дихає", row=0), Clip("run", "біжить", row=1),
                  Clip("attack", "удар мечем уперед (праворуч)", loop=False, row=2),
                  Clip("attack-2", "другий удар уперед, зворотний замах", loop=False, row=3),
                  Clip("attack-down", "удар униз", loop=False, row=4),
                  Clip("attack-down-2", "другий удар униз", loop=False, row=5),
                  Clip("attack-up", "удар угору", loop=False, row=6),
                  Clip("attack-up-2", "другий удар угору", loop=False, row=7)])
        b.add(f"character/pawn-{color}", f"{KNIGHTS}/Troops/Pawn/{cap}/Pawn_{cap}.png", f"units/pawn/{color}.png",
              "character", f"Pawn {color}", f"Трудівник ({uk})",
              f"Білявий селянин-робітник у {COLOR_IN[color]} одязі: будує молотом, рубає дерево сокирою, носить ресурс над головою. "
              "Мирний герой або мешканець села.",
              ["pawn", "worker", "peasant", "villager", "builder", "lumberjack", "human", color], ["hero", "npc"],
              frame=UNIT, layout="side", faces="right", mirror=True, group="pawn", color=color, clips=[
                  Clip("idle", "стоїть", row=0), Clip("run", "біжить", row=1),
                  Clip("build", "б'є молотом, будує", loop=False, row=2),
                  Clip("chop", "рубає сокирою", loop=False, row=3),
                  Clip("carry-idle", "стоїть, тримаючи ресурс над головою", row=4),
                  Clip("carry-run", "біжить, тримаючи ресурс над головою", row=5)])
        b.add(f"character/archer-{color}", f"{KNIGHTS}/Troops/Archer/{ARCHER_FILE[color]}",
              f"units/archer/{color}.png", "character", f"Archer {color}", f"Лучник ({uk})",
              f"Лучник у світлому шоломі з {COLOR_WITH[color]} пером і з луком: стріляє вгору, навскіс угору, вперед, навскіс униз і вниз.",
              ["archer", "bow", "ranged", "human", color], ["hero", "npc"], frame=UNIT, layout="side",
              faces="right", mirror=True, group="archer", color=color, clips=[
                  Clip("idle", "стоїть", row=0), Clip("run", "біжить", row=1),
                  Clip("shoot-up", "стріляє вгору", loop=False, row=2),
                  Clip("shoot-up-side", "стріляє навскіс угору", loop=False, row=3),
                  Clip("shoot", "стріляє вперед", loop=False, row=4),
                  Clip("shoot-down-side", "стріляє навскіс униз", loop=False, row=5),
                  Clip("shoot-down", "стріляє вниз", loop=False, row=6)])
        parts = f"{KNIGHTS}/Troops/Archer/Archer + Bow"
        b.add(f"character/archer-body-{color}", f"{parts}/Archer_{cap}_(NoArms).png",
              f"units/archer-parts/body-{color}.png", "character", f"Archer body {color}", f"Тіло лучника ({uk})",
              "Лучник без рук і лука, шар під `character/archer-bow`: так лук можна повернути на будь-який кут.",
              ["archer", "layer", "body", color], ["hero", "npc"], frame=UNIT, layout="side", faces="right",
              mirror=True, group="archer", color=color, layer="body", clips=[
                  Clip("idle", "стоїть", row=0), Clip("shoot", "напинає лук", loop=False, row=1)])
        b.add(f"character/archer-bow-{color}", f"{parts}/Archer_Bow_{cap}.png", f"units/archer-parts/bow-{color}.png",
              "character", f"Archer bow {color}", f"Лук і руки лучника ({uk})",
              "Руки з луком, шар над `character/archer-body`; повертати навколо плеча лучника.",
              ["archer", "layer", "bow", color], ["hero", "npc"], frame=UNIT, layout="side", faces="right",
              mirror=True, group="archer", color=color, layer="tool", clips=[
                  Clip("idle", "лук опущено", row=0, frames=[0]), Clip("shoot", "натягує й пускає стрілу", loop=False, row=1)])
        b.add(f"enemy/goblin-torch-{color}", f"{GOBLINS}/Troops/Torch/{cap}/Torch_{cap}.png",
              f"units/goblin-torch/{color}.png", "enemy", f"Goblin torch {color}", f"Гоблін зі смолоскипом ({uk})",
              f"Зелений гоблін у {COLOR_IN[color]} гостроверхому каптурі з палаючим смолоскипом: ближній бій, б'є вперед, униз і вгору.",
              ["goblin", "torch", "fire", "melee", "monster", color], ["enemy"], frame=UNIT, layout="side",
              faces="right", mirror=True, group="goblin-torch", color=color, clips=[
                  Clip("idle", "стоїть, смолоскип горить", row=0), Clip("run", "біжить", row=1),
                  Clip("attack", "б'є смолоскипом уперед", loop=False, row=2),
                  Clip("attack-down", "б'є вниз", loop=False, row=3),
                  Clip("attack-up", "б'є вгору", loop=False, row=4)])
        b.add(f"enemy/goblin-tnt-{color}", f"{GOBLINS}/Troops/TNT/{cap}/TNT_{cap}.png",
              f"units/goblin-tnt/{color}.png", "enemy", f"Goblin TNT {color}", f"Гоблін-підривник ({uk})",
              "Гоблін у льотних окулярах з кольоровим рюкзаком, повним динаміту: кидає динаміт (`weapon/dynamite`), той вибухає (`effect/explosion`).",
              ["goblin", "dynamite", "bomber", "ranged", "monster", color], ["enemy"], frame=UNIT, layout="side",
              faces="right", mirror=True, group="goblin-tnt", color=color, clips=[
                  Clip("idle", "стоїть", row=0), Clip("run", "біжить", row=1),
                  Clip("throw", "кидає динаміт", loop=False, row=2)])
        b.add(f"enemy/goblin-barrel-{color}", f"{GOBLINS}/Troops/Barrel/{cap}/Barrel_{cap}.png",
              f"units/goblin-barrel/{color}.png", "enemy", f"Goblin barrel {color}", f"Гоблін у бочці ({uk})",
              "Кольорова бочка з написом TNT і ґнотом, у якій ховається гоблін: визирає, біжить і вибухає. Пастка, що прикидається бочкою.",
              ["goblin", "barrel", "trap", "explosive", "hidden", "monster", color], ["enemy", "obstacle"],
              frame=(128, 128), layout="side", faces="right", mirror=True, group="goblin-barrel", color=color, clips=[
                  Clip("hidden", "звичайна бочка, гобліна не видно", row=0),
                  Clip("peek", "кришка піднімається, гоблін вилазить", loop=False, row=1),
                  Clip("out", "гоблін визирає з бочки", row=2),
                  Clip("hide", "ховається назад", loop=False, row=3),
                  Clip("run", "біжить у бочці", row=4),
                  Clip("explode", "запалений, ось-ось вибухне", loop=False, row=5)])
    b.add("effect/dead", f"{KNIGHTS}/Troops/Dead/Dead.png", "units/dead.png", "effect", "Dead",
          "Череп переможеного", "Спалах і череп, що лишається на місці переможеного персонажа, потім іде в землю.",
          ["death", "skull", "defeat", "grave"], ["effect"], frame=(128, 128), clips=[
              Clip("die", "спалах і череп падає", loop=False, row=0),
              Clip("fade", "череп іде в землю", loop=False, row=1)])
    b.add("weapon/arrow", f"{KNIGHTS}/Troops/Archer/Arrow/Arrow.png", "units/arrow.png", "weapon", "Arrow", "Стріла",
          "Стріла лучника: перший кадр летить праворуч, другий застрягла (коротша). Обертати за напрямком польоту.",
          ["arrow", "projectile"], ["projectile"], frame=(64, 64), layout="grid", faces="right")
    b.add("weapon/dynamite", f"{GOBLINS}/Troops/TNT/Dynamite/Dynamite.png", "units/dynamite.png", "weapon",
          "Dynamite", "Динаміт", "Шашка динаміту з ґнотом, що горить; кидає гоблін-підривник.",
          ["dynamite", "tnt", "projectile", "explosive"], ["projectile"], frame=(64, 64),
          clips=[Clip("play", "ґніт горить, шашка крутиться", frames=list(range(6)), fps=12)])


def buildings(b: Builder) -> None:
    kinds = {
        "castle": ("Castle", "Замок", "Великий замок: кольорові кам'яні мури з зубцями навколо дерев'яного двору, ворота посередині. Головна будівля королівства, мета або база.",
                   ["castle", "fortress", "base"], (320, 256), [5, 2]),
        "house": ("House", "Будинок", "Хата з солом'яним дахом і кольоровими стінами, двері й вікно спереду: дім героя чи селян.",
                  ["house", "home", "cottage"], (128, 192), [2, 1]),
        "tower": ("Tower", "Вежа", "Кругла вартова вежа з кольорового каменю з зубцями й дверима.", ["tower", "watchtower", "defense"], (128, 256), [2, 1]),
    }
    folder = {"castle": "Castle", "house": "House", "tower": "Tower"}
    for kind, (en, uk, about, tags, _size, footprint) in kinds.items():
        base = f"{KNIGHTS}/Buildings/{folder[kind]}/{folder[kind]}"
        for color in COLORS:
            b.add(f"prop/{kind}-{color}", f"{base}_{color.capitalize()}.png", f"buildings/{kind}-{color}.png", "prop",
                  f"{en} {color}", f"{uk} ({COLOR_UK[color]})", f"{about} Колір: {COLOR_UK[color]}.",
                  [*tags, "building", "knights", color], ["building", "goal", "obstacle"], group=kind, color=color,
                  footprint=footprint)
        b.add(f"prop/{kind}-construction", f"{base}_Construction.png", f"buildings/{kind}-construction.png", "prop",
              f"{en} construction", f"{uk}: будується", f"{uk}: лише дерев'яний фундамент і дошки, ще будується.",
              [*tags, "building", "construction", "scaffold"], ["building", "obstacle"], group=kind,
              footprint=footprint)
        b.add(f"prop/{kind}-destroyed", f"{base}_Destroyed.png", f"buildings/{kind}-destroyed.png", "prop",
              f"{en} destroyed", f"{uk}: зруйновано", f"Руїни: {uk.lower()} після пожежі чи нападу.",
              [*tags, "building", "ruins", "destroyed"], ["building", "obstacle", "decor"], group=kind,
              footprint=footprint)
    tower = f"{GOBLINS}/Buildings/Wood_Tower"
    for color in COLORS:
        b.add(f"prop/wood-tower-{color}", f"{tower}/Wood_Tower_{color.capitalize()}.png",
              f"buildings/wood-tower-{color}.png", "prop", f"Goblin wood tower {color}",
              f"Дерев'яна вежа гоблінів ({COLOR_UK[color]})", "Хистка вежа гоблінів на дерев'яних ногах з кольоровою тканиною й прапорцями, що майорять.",
              ["goblin", "tower", "wood", "building", color], ["building", "obstacle", "goal"], frame=(256, 192),
              group="wood-tower", color=color, footprint=[2, 1],
              clips=[Clip("idle", "прапорці майорять", row=0)], fps=8)
    for state, uk in (("InConstruction", "будується"), ("Destroyed", "зруйновано")):
        sid = "construction" if state == "InConstruction" else "destroyed"
        b.add(f"prop/wood-tower-{sid}", f"{tower}/Wood_Tower_{state}.png", f"buildings/wood-tower-{sid}.png", "prop",
              f"Goblin wood tower {sid}", f"Вежа гоблінів: {uk}", f"Дерев'яна вежа гоблінів: {uk}.",
              ["goblin", "tower", "wood", "building", sid], ["building", "obstacle"], group="wood-tower",
              footprint=[2, 1])
    house = f"{GOBLINS}/Buildings/Wood_House"
    b.add("prop/goblin-house", f"{house}/Goblin_House.png", "buildings/goblin-house.png", "prop", "Goblin house",
          "Хатина гоблінів", "Кругла хатина гоблінів з колод під червоним латаним дахом із кістками.", ["goblin", "hut", "house", "building"],
          ["building", "obstacle", "goal"], group="goblin-house", footprint=[2, 1])
    b.add("prop/goblin-house-destroyed", f"{house}/Goblin_House_Destroyed.png", "buildings/goblin-house-destroyed.png",
          "prop", "Goblin house destroyed", "Хатина гоблінів: зруйновано", "Розвалена хатина гоблінів.",
          ["goblin", "hut", "ruins", "building"], ["building", "obstacle", "decor"], group="goblin-house",
          footprint=[2, 1])
    mine = "Resources/Gold Mine/GoldMine"
    for state, uk, about in (("Inactive", "Золота копальня", "Купол із каменів із золотими вкрапленнями й темним входом у копальню."),
                             ("Active", "Золота копальня: працює", "Копальня зі світлом у вході: тут видобувають золото."),
                             ("Destroyed", "Золота копальня: обвалилась", "Завалений вхід у копальню.")):
        sid = "" if state == "Inactive" else f"-{state.lower()}"
        b.add(f"prop/gold-mine{sid}", f"{mine}_{state}.png", f"resources/gold-mine{sid}.png", "prop",
              f"Gold mine {state.lower()}", uk, about, ["gold", "mine", "cave", "rock", "resource"],
              ["building", "goal", "obstacle"], group="gold-mine", footprint=[3, 1])


def resources(b: Builder) -> None:
    res = "Resources/Resources"
    for key, sid, uk, about, tags in (
        ("G", "gold", "Мішечок золота", "Мішечок із золотими монетами: скарб, нагорода, те, що збирають.",
         ["gold", "coins", "money", "treasure", "bag"]),
        ("W", "wood", "Колода", "Колода дров: ресурс, який збирають або несуть додому.", ["wood", "log", "firewood"]),
        ("M", "meat", "М'ясо", "Шматок м'яса: їжа, ресурс.", ["meat", "food", "ham"]),
    ):
        b.add(f"item/{sid}", f"{res}/{key}_Idle.png", f"resources/{sid}.png", "item", sid.capitalize(), uk,
              f"{about} Лежить на землі з тінню; `spawn` — поява з білого спалаху.", tags, ["collectible"],
              variants={"no-shadow": b.pack.file(b.root / f"{res}/{key}_Idle_(NoShadow).png",
                                                 f"resources/{sid}-no-shadow.png")},
              clips=[Clip("spawn", "з'являється: спалах, кільце, предмет", loop=False, file=b.root / f"{res}/{key}_Spawn.png",
                          frame=(128, 128))])
    b.add("animal/sheep", "Resources/Sheep/HappySheep_All.png", "resources/sheep.png", "animal", "Sheep", "Вівця",
          "Біла пухнаста вівця: пасеться, підстрибує від радості. Мешканець ферми, джерело м'яса.",
          ["sheep", "lamb", "farm", "animal"], ["animal", "npc", "collectible"], frame=(128, 128), layout="side",
          faces="right", mirror=True, fps=8, clips=[Clip("idle", "стоїть, кліпає", row=0),
                                                     Clip("bounce", "підстрибує", row=1)])
    b.add("decor/tree", "Resources/Trees/Tree.png", "resources/tree.png", "decor", "Tree", "Ялина",
          "Висока ялина, що гойдається на вітрі; від удару сокирою тремтить, потім лишається пеньок. "
          "Стоїть на одній клітинці, крона закриває клітинку вище.",
          ["tree", "pine", "fir", "forest", "wood", "stump"], ["obstacle", "decor"], frame=(192, 192), fps=8,
          footprint=[1, 1], clips=[Clip("idle", "гойдається", row=0), Clip("hit", "тремтить від удару", loop=False, row=1),
                                   Clip("stump", "пеньок після рубки", row=2)])


DECO = [
    ("mushroom-small", "Маленький гриб", "Крихітний червоний мухомор.", ["mushroom", "small", "forest"], ["decor"]),
    ("mushroom-medium", "Гриб", "Червоний мухомор.", ["mushroom", "forest"], ["decor"]),
    ("mushroom-large", "Великий гриб", "Великий червоний мухомор із білими цятками.", ["mushroom", "large"], ["decor", "obstacle"]),
    ("rock-small", "Камінчик", "Маленький сіро-блакитний камінь.", ["rock", "stone", "pebble"], ["decor"]),
    ("rock-medium", "Камінь", "Середній камінь.", ["rock", "stone"], ["decor", "obstacle"]),
    ("rock-large", "Великий камінь", "Великий валун, через нього не пройти.", ["rock", "boulder"], ["obstacle"]),
    ("bush-small", "Кущик", "Маленький зелений кущ.", ["bush", "shrub", "small"], ["decor"]),
    ("bush-medium", "Кущ", "Зелений кущ.", ["bush", "shrub"], ["decor", "obstacle"]),
    ("bush-large", "Великий кущ", "Великий густий кущ, через нього не пройти.", ["bush", "shrub", "large"], ["obstacle"]),
    ("grass-small", "Травичка", "Невеликий пучок трави.", ["grass", "tuft", "plant"], ["decor"]),
    ("grass-large", "Трава", "Високий пучок трави.", ["grass", "tuft", "plant"], ["decor"]),
    ("pumpkin-small", "Гарбузик", "Маленький помаранчевий гарбуз на грядці.", ["pumpkin", "vegetable", "farm", "harvest"], ["decor", "collectible"]),
    ("pumpkin-large", "Гарбуз", "Великий помаранчевий гарбуз.", ["pumpkin", "vegetable", "farm", "harvest"], ["decor", "collectible", "obstacle"]),
    ("bone-large", "Кістка", "Велика кістка на землі.", ["bone", "remains"], ["decor"]),
    ("bone-small", "Кісточка", "Маленька кістка.", ["bone", "remains"], ["decor"]),
    ("sign-danger", "Знак небезпеки", "Дерев'яний знак: хрест із дощок і череп. Попереджає про небезпеку. Дві клітинки заввишки.",
     ["sign", "warning", "danger", "skull"], ["decor", "obstacle", "goal"]),
    ("sign-arrow", "Дороговказ", "Дерев'яний стовп зі стрілкою: дороговказ. Дві клітинки заввишки.",
     ["sign", "signpost", "arrow", "direction"], ["decor", "goal"]),
    ("scarecrow", "Опудало", "Опудало в капелюсі на полі. Займає 3×3 клітинки малюнка, стоїть на одній.",
     ["scarecrow", "farm", "field"], ["decor", "obstacle", "npc"]),
]


def deco(b: Builder) -> None:
    for n, (sid, uk, about, tags, roles) in enumerate(DECO, 1):
        b.add(f"decor/{sid}", f"Deco/{n:02d}.png", f"deco/{sid}.png", "decor", sid.replace("-", " ").capitalize(), uk,
              about, tags, roles, footprint=[1, 1])


def terrain(b: Builder) -> None:
    flat_cols = 10
    tiles = [*block16(0, 0, flat_cols, "grass", "Трава"), *block16(5, 0, flat_cols, "sand", "Пісок"),
             tile(4, 0, flat_cols, "grass", "detail", "Кущики трави внизу плитки: класти під нижній край трави, "
                  "щоб край виглядав живим", verify=True),
             tile(9, 0, flat_cols, "sand", "detail", "Камінці піску внизу плитки, як і для трави", verify=True)]
    b.add("tileset/ground", "Terrain/Ground/Tilemap_Flat.png", "terrain/ground.png", "tileset", "Flat ground",
          "Плоска земля: трава й пісок",
          "Тайлсет плоскої землі на воді: блок 4×4 трави (стовпці 0–3) і піску (5–8). Кожна плитка має `edges` "
          "(боки, де ґрунт закінчується) і `mask` (N=1, E=2, S=4, W=8): для клітинки рахують, з яких боків сусід не "
          "той ґрунт, і беруть плитку з таким `mask`. Пісок на траві дає стежку, трава на воді дає острів.",
          ["tileset", "ground", "grass", "sand", "path", "island", "autotile"], ["ground", "path"],
          frame=(CELL, CELL), layout="grid", tiles=tiles)
    elev_cols = 4
    walls = ("лівий край", "середина", "правий край", "одна клітинка")
    elev = [t for t in block16(0, 0, elev_cols, "plateau", "Плато (верх скелі)") if t["row"] < 3]
    elev += [tile(x, 4, elev_cols, "plateau", "edge", f"Плато в одну клітинку заввишки: {w}",
                  edges=e, mask=sum({"N": 1, "E": 2, "S": 4, "W": 8}[c] for c in e))
             for x, (w, e) in enumerate(zip(walls, ("NSW", "NS", "NES", "NESW")))]
    elev += [tile(x, 3, elev_cols, "cliff", "wall", f"Стіна скелі під нижнім рядом плато: {w}") for x, w in enumerate(walls)]
    elev += [tile(x, 5, elev_cols, "cliff", "wall", f"Стіна скелі під плато в одну клітинку: {w}") for x, w in enumerate(walls)]
    elev += [tile(x, 7, elev_cols, "stairs", "stairs", f"Сходи з плато вниз: {w}") for x, w in enumerate(walls)]
    b.add("tileset/elevation", "Terrain/Ground/Tilemap_Elevation.png", "terrain/elevation.png", "tileset",
          "Elevation", "Скелі й плато",
          "Підняту землю малюють так: верх плато (рядки 0–2, стовпець 3, рядок 4) — як траву, за `mask`; під "
          "нижнім краєм плато ставлять стіну скелі (рядки 3 і 5); сходи (рядок 7) з'єднують плато з низом. "
          "Під плато кладуть тінь `terrain/shadow`.",
          ["tileset", "cliff", "plateau", "elevation", "stairs", "autotile"], ["ground", "cliff", "obstacle"],
          frame=(CELL, CELL), layout="grid", tiles=elev)
    bridge_cols = 3
    bridge = [
        tile(0, 0, bridge_cols, "bridge", "horizontal-left", "Горизонтальний міст: лівий кінець зі стовпчиками"),
        tile(1, 0, bridge_cols, "bridge", "horizontal-middle", "Горизонтальний міст: середина, дошки"),
        tile(2, 0, bridge_cols, "bridge", "horizontal-right", "Горизонтальний міст: правий кінець"),
        tile(0, 1, bridge_cols, "bridge", "vertical-top", "Вертикальний міст: верхній кінець"),
        tile(0, 2, bridge_cols, "bridge", "vertical-middle", "Вертикальний міст: середина"),
        tile(0, 3, bridge_cols, "bridge", "vertical-bottom", "Вертикальний міст: нижній кінець"),
        tile(1, 1, bridge_cols, "bridge", "broken", "Зламаний міст: стовпці й одна дошка"),
        tile(2, 1, bridge_cols, "bridge", "broken", "Зламаний міст: стовпці й дошка навскіс"),
        tile(1, 2, bridge_cols, "bridge", "broken", "Розкидані колоди зламаного мосту"),
        tile(2, 3, bridge_cols, "bridge", "shadow", "Тінь мосту на воді"),
    ]
    b.add("tileset/bridge", "Terrain/Bridge/Bridge_All.png", "terrain/bridge.png", "tileset", "Bridge", "Міст",
          "Дерев'яний міст через воду: горизонтальний і вертикальний, цілий і зламаний.",
          ["tileset", "bridge", "wood", "water", "crossing"], ["bridge", "ground", "path"], frame=(CELL, CELL),
          layout="grid", tiles=bridge)
    b.add("tileset/water", "Terrain/Water/Water.png", "terrain/water.png", "tileset", "Water", "Вода",
          "Плитка води: фон під усією картою. Через воду не пройти; береги дає `terrain/foam`.",
          ["water", "sea", "lake", "background"], ["water", "obstacle"], frame=(CELL, CELL), layout="grid",
          tiles=[tile(0, 0, 1, "water", "fill", "Вода")])
    b.add("terrain/foam", "Terrain/Water/Foam/Foam.png", "terrain/foam.png", "terrain", "Foam", "Піна прибою",
          "Біла піна навколо землі на воді, 3×3 клітинки: центр кадру ставити на клітинку землі, що межує з водою "
          "(малюється під землею).",
          ["foam", "shore", "surf", "water", "beach"], ["water", "decor"], frame=(192, 192), fps=8,
          clips=[Clip("play", "хвилі набігають", row=0)])
    for n, (size, about) in enumerate((("small", "Маленькі камені"), ("medium", "Камені"), ("large", "Скеля з трьох каменів"),
                                       ("huge", "Великі камені")), 1):
        b.add(f"terrain/water-rocks-{n}", f"Terrain/Water/Rocks/Rocks_0{n}.png", f"terrain/water-rocks-{n}.png",
              "terrain", f"Water rocks {size}", f"Камені у воді {n}", f"{about} у воді з піною навколо.",
              ["rock", "water", "sea", "foam"], ["obstacle", "decor", "water"], frame=(128, 128), fps=8,
              clips=[Clip("play", "піна хлюпає", row=0)])
    b.add("terrain/shadow", "Terrain/Ground/Shadows.png", "terrain/shadow.png", "terrain", "Shadow", "Тінь скелі",
          "Напівпрозора тінь 3×3 клітинки: класти під кожну плитку плато (центр на ній), щоб скеля відкидала тінь.",
          ["shadow", "cliff"], ["shadow"])
    b.add("effect/explosion", "Effects/Explosion/Explosions.png", "effects/explosion.png", "effect", "Explosion",
          "Вибух", "Вибух динаміту чи бочки: вогонь і дим.", ["explosion", "blast", "fire", "boom"], ["effect"],
          frame=(192, 192), fps=12, clips=[Clip("play", "вибух", loop=False, row=0)])
    b.add("effect/fire", "Effects/Fire/Fire.png", "effects/fire.png", "effect", "Fire", "Вогонь",
          "Полум'я, що горить на місці: вогнище, пожежа будинку.", ["fire", "flame", "campfire", "burning"],
          ["effect", "obstacle"], frame=(128, 128), clips=[Clip("play", "горить", row=0)])


UI_ICONS = [("close", "Закрити", ["close", "x", "cancel"]), ("settings", "Налаштування", ["settings", "gear"]),
            ("sound-off", "Звук вимкнено", ["sound", "mute", "audio"]), ("one", "Цифра 1", ["number", "1"]),
            ("two", "Цифра 2", ["number", "2"]), ("three", "Цифра 3", ["number", "3"]),
            ("shop", "Крамниця", ["shop", "cart", "store"]), ("plus", "Плюс", ["plus", "add"]),
            ("minus", "Мінус", ["minus", "remove"]), ("lock", "Замок", ["lock", "locked"])]


def ui(b: Builder) -> None:
    for n, (sid, uk, tags) in enumerate(UI_ICONS, 1):
        b.add(f"ui/icon-{sid}", f"UI/Icons/Regular_{n:02d}.png", f"ui/icons/{sid}.png", "ui", f"Icon {sid}", uk,
              f"Іконка «{uk.lower()}» для кнопки; є стани `pressed` і `disabled`.", ["icon", *tags], ["ui-icon"],
              variants={"pressed": b.pack.file(b.root / f"UI/Icons/Pressed_{n:02d}.png", f"ui/icons/{sid}-pressed.png"),
                        "disabled": b.pack.file(b.root / f"UI/Icons/Disable_{n:02d}.png", f"ui/icons/{sid}-disabled.png")})
    pointers = [("arrow", "Курсор-стрілка"), ("select", "Рамка вибору з чотирьох кутів"), ("corner-top-left", "Кут рамки зліва вгорі"),
                ("corner-top-right", "Кут рамки справа вгорі"), ("corner-bottom-left", "Кут рамки зліва внизу"),
                ("corner-bottom-right", "Кут рамки справа внизу")]
    for n, (sid, uk) in enumerate(pointers, 1):
        b.add(f"ui/pointer-{sid}", f"UI/Pointers/0{n}.png", f"ui/pointers/{sid}.png", "ui", f"Pointer {sid}", uk,
              f"{uk}: показує клітинку чи вибраний об'єкт.", ["pointer", "cursor", "select"], ["cursor"])
    for color, uk in (("blue", "синя"), ("red", "червона")):
        cap = color.capitalize()
        b.add(f"ui/button-{color}", f"UI/Buttons/Button_{cap}.png", f"ui/buttons/{color}.png", "ui", f"Button {color}",
              f"Кнопка {uk}", f"Квадратна {uk} кнопка; `pressed` — натиснута.", ["button", color], ["ui-button"],
              variants={"pressed": b.pack.file(b.root / f"UI/Buttons/Button_{cap}_Pressed.png", f"ui/buttons/{color}-pressed.png")})
        for kind, grid in (("3", 64), ("9", 64)):
            name = f"Button_{cap}_{kind}Slides"
            b.add(f"ui/button-{color}-{kind}slice", f"UI/Buttons/{name}.png", f"ui/buttons/{color}-{kind}slice.png",
                  "ui", f"Button {color} {kind}-slice", f"Кнопка {uk}, розтяжна",
                  f"{uk.capitalize()} кнопка, нарізана на {kind} частини по 64 пікселі для розтягування (`parts`).",
                  ["button", "slice", color], ["ui-button", "ui-panel"], parts=parts_of(b.root / f"UI/Buttons/{name}.png", grid),
                  variants={"pressed": b.pack.file(b.root / f"UI/Buttons/{name}_Pressed.png", f"ui/buttons/{color}-{kind}slice-pressed.png")})
    for state, uk in (("Hover", "під курсором"), ("Disable", "вимкнена")):
        sid = state.lower()
        b.add(f"ui/button-{sid}", f"UI/Buttons/Button_{state}.png", f"ui/buttons/{sid}.png", "ui", f"Button {sid}",
              f"Кнопка: {uk}", f"Квадратна кнопка в стані «{uk}».", ["button", sid], ["ui-button"])
        for kind in ("3", "9"):
            b.add(f"ui/button-{sid}-{kind}slice", f"UI/Buttons/Button_{state}_{kind}Slides.png",
                  f"ui/buttons/{sid}-{kind}slice.png", "ui", f"Button {sid} {kind}-slice", f"Кнопка {uk}, розтяжна",
                  f"Розтяжна кнопка в стані «{uk}», {kind} частини.", ["button", "slice", sid], ["ui-button", "ui-panel"],
                  parts=parts_of(b.root / f"UI/Buttons/Button_{state}_{kind}Slides.png", 64))
    banners = [("Banner_Horizontal", "banner-horizontal", "Сувій, розгорнутий горизонтально: панель для тексту"),
               ("Banner_Vertical", "banner-vertical", "Сувій, розгорнутий вертикально: панель для тексту"),
               ("Banner_Connection_Down", "banner-connection-down", "Сувій зі звивом знизу: з'єднання панелей"),
               ("Banner_Connection_Up", "banner-connection-up", "Сувій зі звивом зверху"),
               ("Banner_Connection_Left", "banner-connection-left", "Сувій зі звивом зліва"),
               ("Banner_Connection_Right", "banner-connection-right", "Сувій зі звивом справа")]
    for file, sid, about in banners:
        b.add(f"ui/{sid}", f"UI/Banners/{file}.png", f"ui/banners/{sid}.png", "ui", sid.replace("-", " ").capitalize(),
              "Сувій-панель", f"{about}. 9 частин по 64 пікселі (`parts`).", ["banner", "scroll", "parchment", "panel"],
              ["ui-panel"], parts=parts_of(b.root / f"UI/Banners/{file}.png", 64))
    for file, sid, uk, grid in (("Carved_Regular", "carved", "Різьблена дошка", None),
                                ("Carved_3Slides", "carved-3slice", "Різьблена дошка на 3 частини", 64),
                                ("Carved_9Slides", "carved-9slice", "Різьблена панель на 9 частин", 64)):
        b.add(f"ui/{sid}", f"UI/Banners/{file}.png", f"ui/banners/{sid}.png", "ui", sid.replace("-", " ").capitalize(), uk,
              f"{uk}: тло для тексту чи слоту.", ["panel", "wood", "carved"], ["ui-panel"],
              **({"parts": parts_of(b.root / f"UI/Banners/{file}.png", grid)} if grid else {}))
    for color, uk in (("blue", "синя"), ("red", "червона"), ("yellow", "жовта")):
        cap = color.capitalize()
        b.add(f"ui/ribbon-{color}", f"UI/Ribbons/Ribbon_{cap}_3Slides.png", f"ui/ribbons/{color}.png", "ui",
              f"Ribbon {color}", f"Стрічка {uk}", f"Стрічка-заголовок, {uk}: ліва, середня, права частини (`parts`).",
              ["ribbon", "title", "header", color], ["ui-panel"], parts=parts_of(b.root / f"UI/Ribbons/Ribbon_{cap}_3Slides.png", 64))
        for side, side_uk in (("Down", "униз"), ("Up", "угору"), ("Left", "ліворуч"), ("Right", "праворуч")):
            sid = f"ribbon-{color}-{side.lower()}"
            src = f"UI/Ribbons/Ribbon_{cap}_Connection_{side}"
            b.add(f"ui/{sid}", f"{src}.png", f"ui/ribbons/{color}-{side.lower()}.png", "ui", sid.replace("-", " ").capitalize(),
                  f"Стрічка {uk}: кінчик {side_uk}", f"Кінчик стрічки, що показує {side_uk}: вкладка або стрілка.",
                  ["ribbon", "tab", "arrow", color], ["ui-button"],
                  variants={"pressed": b.pack.file(b.root / f"{src}_Pressed.png", f"ui/ribbons/{color}-{side.lower()}-pressed.png")})


def build(root: Path, out: Path) -> None:
    builder = Builder(Pack(meta=dict(META), out=out), root)
    units(builder)
    buildings(builder)
    resources(builder)
    deco(builder)
    terrain(builder)
    ui(builder)
    finish(builder, out, INTRO)
