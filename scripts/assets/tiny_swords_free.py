"""Tiny Swords, Free Pack 2025: every picture, described like Update 010 and with the same ids where they match.

The files may not be shared (Pixel Frog licence), so this pack is written to a private folder. See tiny_swords.py.
"""

from __future__ import annotations

from pathlib import Path

from common import Pack
from tiny_swords import CELL, COLOR_IN, COLOR_IN_F, COLOR_OF, COLOR_UK, COLOR_WITH, Builder, Clip, block16, finish, parts_of, tile

META = {
    "id": "tiny-swords-free",
    "title": "Tiny Swords (Free Pack)",
    "author": "Pixel Frog",
    "source": "https://pixelfrog-assets.itch.io/tiny-swords",
    "license": {
        "name": "Pixel Frog licence",
        "url": "https://pixelfrog-assets.itch.io/tiny-swords",
        "redistribute": "no",
        "terms": "Personal and commercial projects, changes allowed, credit welcome but not required. The files must "
                 "not be redistributed, resold or repackaged, even changed.",
    },
    "cell": CELL,
    "view": "top-down with a slight tilt: characters and buildings are drawn from the side, the ground from above",
    "colors": ["blue", "red", "yellow", "purple", "black"],
    "sameIdsAs": "tiny-swords",
}

INTRO = (
    "Нова версія Tiny Swords від Pixel Frog (Free Pack, 2025). Файли не можна викладати публічно, тому пак лежить "
    "у приватному репозиторії й підключається через `EDU_BLOCKS_PRIVATE_ASSETS`. Id спрайтів і назви анімацій ті "
    "самі, що в публічному паку `tiny-swords` (Update 010), де вони показують те саме: `character/warrior-blue`, "
    "`item/gold`, `prop/house-red`, `decor/tree`, `tileset/ground`… Тут 5 кольорів (синій, червоний, жовтий, "
    "фіолетовий, чорний), нові бійці (списоносець, монах), 5 відтінків трави, хмари, кущі, що гойдаються, портрети й "
    "новий інтерфейс. Гоблінів тут немає (вони в платному Enemy Pack). Одна клітинка = 64×64; персонажі дивляться "
    "праворуч, ліворуч їх віддзеркалюють (`mirror`)."
)

COLORS = ("blue", "red", "yellow", "purple", "black")
UNIT = (192, 192)


def _units_dir(color: str) -> str:
    return f"Units/{color.capitalize()} Units"


def units(b: Builder) -> None:
    for color in COLORS:
        uk = COLOR_UK[color]
        d = _units_dir(color)
        f = lambda rel: b.root / f"{d}/{rel}"  # noqa: E731
        b.add(f"character/warrior-{color}", f"{d}/Warrior/Warrior_Idle.png", f"units/warrior/{color}-idle.png",
              "character", f"Warrior {color}", f"Воїн ({uk})",
              f"Лицар у великому шоломі з {COLOR_WITH[color]} пером, з мечем і щитом. Головний герой або охоронець: стоїть, біжить, два удари мечем, "
              "закривається щитом.",
              ["knight", "warrior", "sword", "shield", "human", color], ["hero", "npc"], frame=UNIT, layout="side",
              faces="right", mirror=True, group="warrior", color=color, clips=[
                  Clip("idle", "стоїть", file=f("Warrior/Warrior_Idle.png")),
                  Clip("run", "біжить", file=f("Warrior/Warrior_Run.png")),
                  Clip("attack", "удар мечем уперед", loop=False, file=f("Warrior/Warrior_Attack1.png")),
                  Clip("attack-2", "другий удар, зворотний замах", loop=False, file=f("Warrior/Warrior_Attack2.png")),
                  Clip("guard", "закривається щитом", file=f("Warrior/Warrior_Guard.png"))])
        b.add(f"character/archer-{color}", f"{d}/Archer/Archer_Idle.png", f"units/archer/{color}-idle.png",
              "character", f"Archer {color}", f"Лучник ({uk})",
              f"Лучник у гостроверхому шоломі з {COLOR_WITH[color]} пером, з луком і сагайдаком: стоїть, біжить, стріляє вперед.",
              ["archer", "bow", "ranged", "human", color], ["hero", "npc"], frame=UNIT, layout="side",
              faces="right", mirror=True, group="archer", color=color, clips=[
                  Clip("idle", "стоїть", file=f("Archer/Archer_Idle.png")),
                  Clip("run", "біжить", file=f("Archer/Archer_Run.png")),
                  Clip("shoot", "натягує лук і стріляє", loop=False, file=f("Archer/Archer_Shoot.png"))])
        b.add(f"weapon/arrow-{color}", f"{d}/Archer/Arrow.png", f"units/arrow-{color}.png", "weapon",
              f"Arrow {color}", f"Стріла ({uk})", "Стріла, летить праворуч; обертати за напрямком польоту.",
              ["arrow", "projectile", color], ["projectile"], faces="right", color=color)
        lancer = [Clip("idle", "стоїть зі списом", file=f("Lancer/Lancer_Idle.png"), frame=(320, 320)),
                  Clip("run", "біжить", file=f("Lancer/Lancer_Run.png"), frame=(320, 320))]
        for side, name, side_uk in (("Right", "", "уперед"), ("Up", "-up", "угору"), ("Down", "-down", "униз"),
                                    ("UpRight", "-up-side", "навскіс угору"), ("DownRight", "-down-side", "навскіс униз")):
            lancer.append(Clip(f"attack{name}", f"коле списом {side_uk}", loop=False,
                               file=f(f"Lancer/Lancer_{side}_Attack.png"), frame=(320, 320)))
            lancer.append(Clip(f"defence{name}", f"закривається, спис {side_uk}",
                               file=f(f"Lancer/Lancer_{side}_Defence.png"), frame=(320, 320)))
        b.add(f"character/lancer-{color}", f"{d}/Lancer/Lancer_Idle.png", f"units/lancer/{color}-idle.png",
              "character", f"Lancer {color}", f"Списоносець ({uk})",
              f"Воїн у {COLOR_IN[color]} шоломі з довгим списом: коле й тримає оборону в п'яти напрямках. Кадр більший, 320×320.",
              ["lancer", "spear", "pike", "knight", "human", color], ["hero", "npc"], frame=(320, 320),
              layout="side", faces="right", mirror=True, group="lancer", color=color, clips=lancer)
        b.add(f"character/monk-{color}", f"{d}/Monk/Idle.png", f"units/monk/{color}-idle.png", "character",
              f"Monk {color}", f"Монах ({uk})",
              f"Монах-цілитель з тонзурою в {COLOR_IN_F[color]} рясі: лікує інших (`heal`), над тим, кого лікують, грає `heal-effect`.",
              ["monk", "healer", "priest", "magic", "human", color], ["hero", "npc"], frame=UNIT, layout="side",
              faces="right", mirror=True, group="monk", color=color, clips=[
                  Clip("idle", "стоїть", file=f("Monk/Idle.png")), Clip("run", "біжить", file=f("Monk/Run.png")),
                  Clip("heal", "здіймає руки, лікує", loop=False, file=f("Monk/Heal.png")),
                  Clip("heal-effect", "сяйво зцілення над тим, кого лікують", loop=False, file=f("Monk/Heal_Effect.png"))])
        pawn = [Clip("idle", "стоїть", file=f("Pawn/Pawn_Idle.png")), Clip("run", "біжить", file=f("Pawn/Pawn_Run.png"))]
        for thing, thing_uk in (("Wood", "колоду"), ("Gold", "золото"), ("Meat", "м'ясо"), ("Axe", "сокиру"),
                                ("Hammer", "молот"), ("Knife", "ніж"), ("Pickaxe", "кайло")):
            key = thing.lower()
            pawn.append(Clip(f"idle-{key}", f"стоїть, тримає {thing_uk}", file=f(f"Pawn/Pawn_Idle {thing}.png")))
            pawn.append(Clip(f"run-{key}", f"біжить, тримає {thing_uk}", file=f(f"Pawn/Pawn_Run {thing}.png")))
        for thing, name, about in (("Axe", "chop", "рубає сокирою"), ("Hammer", "build", "б'є молотом, будує"),
                                   ("Knife", "cut", "ріже ножем"), ("Pickaxe", "mine", "б'є кайлом, видобуває")):
            pawn.append(Clip(name, about, loop=False, file=f(f"Pawn/Pawn_Interact {thing}.png")))
        b.add(f"character/pawn-{color}", f"{d}/Pawn/Pawn_Idle.png", f"units/pawn/{color}-idle.png", "character",
              f"Pawn {color}", f"Трудівник ({uk})",
              f"Селянин-робітник з кошлатим каштановим волоссям у {COLOR_IN[color]} одязі: носить колоду, золото чи м'ясо, ходить з інструментами, рубає, будує, "
              "ріже, видобуває. Мирний герой або мешканець села.",
              ["pawn", "worker", "peasant", "villager", "builder", "miner", "lumberjack", "human", color],
              ["hero", "npc"], frame=UNIT, layout="side", faces="right", mirror=True, group="pawn", color=color,
              clips=pawn)


BUILDINGS = {
    "Archery": ("archery", "Стрільниця", "Будівля лучників з мішенями й навісом.", ["archery", "range"], [3, 1]),
    "Barracks": ("barracks", "Казарма", "Кам'яна казарма з дерев'яним дахом, де живуть воїни.", ["barracks", "military"], [3, 1]),
    "Castle": ("castle", "Замок", "Великий замок з вежами й брамою: головна будівля, мета або база.", ["castle", "fortress", "base"], [5, 2]),
    "House1": ("house", "Будинок", "Дерев'яна хата з черепичним дахом і дверима спереду.", ["house", "home", "cottage"], [2, 1]),
    "House2": ("house-2", "Будинок з ґанком", "Хата, повернута боком, з дверима збоку.", ["house", "home", "cottage"], [2, 1]),
    "House3": ("house-3", "Широкий будинок", "Широка хата з вікном спереду.", ["house", "home", "cottage"], [2, 1]),
    "Monastery": ("monastery", "Монастир", "Висока церква з дзвіницею й вітражем: дім монахів.", ["monastery", "church", "temple"], [3, 1]),
    "Tower": ("tower", "Вежа", "Кругла кам'яна вартова вежа.", ["tower", "watchtower", "defense"], [2, 1]),
}


def buildings(b: Builder) -> None:
    for color in COLORS:
        for file, (sid, uk, about, tags, footprint) in BUILDINGS.items():
            b.add(f"prop/{sid}-{color}", f"Buildings/{color.capitalize()} Buildings/{file}.png",
                  f"buildings/{sid}-{color}.png", "prop", f"{file} {color}", f"{uk} ({COLOR_UK[color]})",
                  f"{about} Дах і стіни {COLOR_OF[color]} кольору.", [*tags, "building", color],
                  ["building", "goal", "obstacle"], group=sid, color=color, footprint=footprint)


def resources(b: Builder) -> None:
    res = "Terrain/Resources"
    b.add("item/gold", f"{res}/Gold/Gold Resource/Gold_Resource.png", "resources/gold.png", "item", "Gold", "Золото",
          "Купка золотих самородків на землі: скарб, те, що збирають. `highlight` — блищить.",
          ["gold", "nugget", "treasure", "money"], ["collectible"], clips=[
              Clip("still", "лежить", frames=[0], file=b.root / f"{res}/Gold/Gold Resource/Gold_Resource.png", frame=(128, 128)),
              Clip("highlight", "блищить", file=b.root / f"{res}/Gold/Gold Resource/Gold_Resource_Highlight.png", frame=(128, 128))])
    for n in range(1, 7):
        size = ("маленька", "маленька", "середня", "середня", "велика", "найбільша")[n - 1]
        b.add(f"item/gold-stone-{n}", f"{res}/Gold/Gold Stones/Gold Stone {n}.png", f"resources/gold-stone-{n}.png",
              "item", f"Gold stone {n}", f"Золота брила {n}",
              f"Золота руда, {size} брила: її видобувають кайлом; більші брили — перешкода.",
              ["gold", "ore", "rock", "mining", "treasure"], ["collectible", "obstacle"], clips=[
                  Clip("still", "лежить", frames=[0], file=b.root / f"{res}/Gold/Gold Stones/Gold Stone {n}.png", frame=(128, 128)),
                  Clip("highlight", "блищить", file=b.root / f"{res}/Gold/Gold Stones/Gold Stone {n}_Highlight.png", frame=(128, 128))])
    b.add("item/meat", f"{res}/Meat/Meat Resource/Meat Resource.png", "resources/meat.png", "item", "Meat", "М'ясо",
          "Шматок м'яса з кісткою: їжа, ресурс.", ["meat", "food", "ham"], ["collectible"])
    b.add("item/wood", f"{res}/Wood/Wood Resource/Wood Resource.png", "resources/wood.png", "item", "Wood", "Колода",
          "Колода дров: ресурс, який збирають або несуть додому.", ["wood", "log", "firewood"], ["collectible"])
    for n, (sid, uk, tags) in enumerate((("hammer", "Молот", ["hammer", "build"]), ("axe", "Сокира", ["axe", "chop"]),
                                         ("knife", "Ніж", ["knife", "cut"]), ("pickaxe", "Кайло", ["pickaxe", "mine"])), 1):
        b.add(f"item/tool-{sid}", f"{res}/Tools/Tool_0{n}.png", f"resources/tool-{sid}.png", "item", f"Tool {sid}", uk,
              f"{uk}: інструмент трудівника, можна взяти й нести.", ["tool", *tags], ["collectible", "ui-icon"])
    sheep = f"{res}/Meat/Sheep"
    b.add("animal/sheep", f"{sheep}/Sheep_Idle.png", "resources/sheep.png", "animal", "Sheep", "Вівця",
          "Біла пухнаста вівця: стоїть, щипає траву, ходить. Мешканець ферми, джерело м'яса.",
          ["sheep", "lamb", "farm", "animal"], ["animal", "npc", "collectible"], frame=(128, 128), layout="side",
          faces="right", mirror=True, clips=[Clip("idle", "стоїть", file=b.root / f"{sheep}/Sheep_Idle.png"),
                                              Clip("graze", "щипає траву", file=b.root / f"{sheep}/Sheep_Grass.png"),
                                              Clip("run", "іде", file=b.root / f"{sheep}/Sheep_Move.png")])
    trees = f"{res}/Wood/Trees"
    for n, (sid, uk, about) in enumerate((("tree", "Ялина", "Висока темна ялина"), ("tree-2", "Світла ялина", "Висока світло-зелена ялина"),
                                          ("tree-3", "Берізка", "Берізка з білим стовбуром і жовто-зеленою кроною"),
                                          ("tree-4", "Осіння берізка", "Берізка з білим стовбуром і жовто-помаранчевою осінньою кроною")), 1):
        frame = (192, 256) if n <= 2 else (192, 192)
        b.add(f"decor/{sid}", f"{trees}/Tree{n}.png", f"resources/{sid}.png", "decor", f"Tree {n}", uk,
              f"{about}, гойдається на вітрі; `stump` — пеньок після рубки. Стоїть на одній клітинці, крона вище.",
              ["tree", "forest", "wood", "stump"], ["obstacle", "decor"], frame=frame, footprint=[1, 1], clips=[
                  Clip("idle", "гойдається", file=b.root / f"{trees}/Tree{n}.png"),
                  Clip("stump", "пеньок після рубки", file=b.root / f"{trees}/Stump {n}.png", frame=(192, 256))])


def decor(b: Builder) -> None:
    dec = "Terrain/Decorations"
    for n, (uk, about) in enumerate((("Кущ", "Круглий жовто-зелений кущ"), ("Кущик", "Маленький зелений кущ"),
                                     ("Високий кущ", "Високий кущ із тонким листям"), ("Кущик з листям", "Маленький кущ із тонким листям")), 1):
        b.add(f"decor/bush-{n}", f"{dec}/Bushes/Bushe{n}.png", f"deco/bush-{n}.png", "decor", f"Bush {n}", uk,
              f"{about}, гойдається на вітрі.", ["bush", "shrub", "plant"], ["decor", "obstacle"], frame=(128, 128),
              footprint=[1, 1], clips=[Clip("idle", "гойдається", file=b.root / f"{dec}/Bushes/Bushe{n}.png")])
    for n, size in enumerate(("маленький", "середній", "плаский", "великий"), 1):
        b.add(f"decor/rock-{n}", f"{dec}/Rocks/Rock{n}.png", f"deco/rock-{n}.png", "decor", f"Rock {n}", f"Камінь {n}",
              f"Сіро-блакитний камінь, {size}.", ["rock", "stone"], ["decor", "obstacle"], footprint=[1, 1])
    for n in range(1, 5):
        b.add(f"terrain/water-rocks-{n}", f"{dec}/Rocks in the Water/Water Rocks_0{n}.png", f"terrain/water-rocks-{n}.png",
              "terrain", f"Water rocks {n}", f"Камені у воді {n}", "Камені у воді з піною, що хлюпає навколо.",
              ["rock", "water", "sea", "foam"], ["obstacle", "decor", "water"], frame=(CELL, CELL),
              clips=[Clip("play", "піна хлюпає", file=b.root / f"{dec}/Rocks in the Water/Water Rocks_0{n}.png")])
    for n in range(1, 9):
        b.add(f"decor/cloud-{n}", f"{dec}/Clouds/Clouds_0{n}.png", f"deco/cloud-{n}.png", "decor", f"Cloud {n}",
              f"Хмара {n}", f"Біла хмара з тінню ({('велика', 'середня', 'мала', 'крихітна')[(n - 1) % 4]}): пливе над картою, малювати поверх усього.",
              ["cloud", "sky", "weather", "shadow"], ["weather", "decor"])
    b.add("animal/rubber-duck", f"{dec}/Rubber Duck/Rubber duck.png", "deco/rubber-duck.png", "animal", "Rubber duck",
          "Гумова качечка", "Жовта гумова качечка, що гойдається на воді: жартівливий декор.", ["duck", "toy", "water"],
          ["decor", "animal", "collectible"], frame=(32, 32), clips=[Clip("idle", "гойдається", file=b.root / f"{dec}/Rubber Duck/Rubber duck.png", frame=(32, 32))])


def terrain(b: Builder) -> None:
    shades = ("жовто-зелена", "оливкова", "зелена", "суха, осіння", "холодна бірюзова")
    tiles_cols = 9
    for n, shade in enumerate(shades, 1):
        tiles = [*block16(0, 0, tiles_cols, "ground", f"Плоска земля, трава {shade}"),
                 *block16(5, 0, tiles_cols, "plateau", f"Плато (верх скелі), трава {shade}")]
        walls = ("лівий край", "середина", "правий край", "одна клітинка")
        tiles += [tile(5 + x, 4, tiles_cols, "cliff", "wall", f"Стіна скелі на землі: {w}") for x, w in enumerate(walls)]
        tiles += [tile(5 + x, 5, tiles_cols, "cliff", "wall-water", f"Стіна скелі, що стоїть у воді (піна внизу): {w}")
                  for x, w in enumerate(walls)]
        tiles += [tile(0, 4, tiles_cols, "slope", "slope-left-top", "Трав'яний схил з лівого боку плато: верх", verify=True),
                  tile(0, 5, tiles_cols, "slope", "slope-left-bottom", "Трав'яний схил з лівого боку плато: низ", verify=True),
                  tile(3, 4, tiles_cols, "slope", "slope-right-top", "Трав'яний схил з правого боку плато: верх", verify=True),
                  tile(3, 5, tiles_cols, "slope", "slope-right-bottom", "Трав'яний схил з правого боку плато: низ", verify=True)]
        sid = "tileset/ground" if n == 1 else f"tileset/ground-{n}"
        b.add(sid, f"Terrain/Tileset/Tilemap_color{n}.png", f"terrain/ground-{n}.png", "tileset", f"Ground {n}",
              f"Земля й скелі: трава {shade}",
              "Тайлсет землі на воді: плоска трава (стовпці 0–3, рядки 0–3) і плато (5–8, 0–3) блоками 4×4, де кожна "
              "плитка має `edges` і `mask` (N=1, E=2, S=4, W=8, боки, де ґрунт закінчується); під плато — стіни скелі "
              "(рядки 4–5), збоку — схили. Під плато кладуть тінь `terrain/shadow`, під край землі на воді — "
              f"`terrain/foam`. Відтінок трави: {shade}.",
              ["tileset", "ground", "grass", "cliff", "plateau", "island", "autotile"], ["ground", "cliff"],
              frame=(CELL, CELL), layout="grid", tiles=tiles, verify=n != 1 or None)
    b.add("tileset/water", "Terrain/Tileset/Water Background color.png", "terrain/water.png", "tileset", "Water", "Вода",
          "Плитка води: фон під усією картою. Через воду не пройти.", ["water", "sea", "lake", "background"],
          ["water", "obstacle"], frame=(CELL, CELL), layout="grid", tiles=[tile(0, 0, 1, "water", "fill", "Вода")])
    b.add("terrain/foam", "Terrain/Tileset/Water Foam.png", "terrain/foam.png", "terrain", "Foam", "Піна прибою",
          "Біла піна навколо землі на воді, 3×3 клітинки: центр кадру на клітинку землі біля води, малювати під землею.",
          ["foam", "shore", "surf", "water", "beach"], ["water", "decor"], frame=(192, 192),
          clips=[Clip("play", "хвилі набігають", file=b.root / "Terrain/Tileset/Water Foam.png", frame=(192, 192))])
    b.add("terrain/shadow", "Terrain/Tileset/Shadow.png", "terrain/shadow.png", "terrain", "Shadow", "Тінь скелі",
          "Напівпрозора тінь 3×3 клітинки: класти під кожну плитку плато, щоб скеля відкидала тінь.", ["shadow", "cliff"],
          ["shadow"])
    fx = "Particle FX"
    for file, sid, uk, about, tags, frame, loop in (
        ("Dust_01", "dust", "Пил", "Хмарка пилу з-під ніг чи після удару.", ["dust", "smoke", "puff"], (64, 64), False),
        ("Dust_02", "dust-2", "Великий пил", "Велика хмара пилу: падіння, приземлення, обвал.", ["dust", "smoke", "puff"], (64, 64), False),
        ("Explosion_01", "explosion", "Вибух", "Вибух: спалах і вогонь.", ["explosion", "blast", "boom"], (192, 192), False),
        ("Explosion_02", "explosion-2", "Великий вибух", "Більший вибух із димом.", ["explosion", "blast", "boom"], (192, 192), False),
        ("Fire_01", "fire", "Вогник", "Маленьке полум'я, що горить на місці: вогнище, свічка.", ["fire", "flame", "campfire"], (64, 64), True),
        ("Fire_02", "fire-2", "Вогонь", "Полум'я середнього розміру.", ["fire", "flame"], (64, 64), True),
        ("Fire_03", "fire-3", "Великий вогонь", "Велике полум'я: пожежа.", ["fire", "flame", "burning"], (64, 64), True),
        ("Water Splash", "water-splash", "Сплеск води", "Бризки, коли щось падає у воду.", ["water", "splash"], (192, 192), False),
    ):
        b.add(f"effect/{sid}", f"{fx}/{file}.png", f"effects/{sid}.png", "effect", sid.replace("-", " ").capitalize(), uk,
              about, tags, ["effect"], frame=frame, clips=[Clip("play", about.split(":")[0].rstrip("."), loop=loop, file=b.root / f"{fx}/{file}.png", frame=frame)])


ICONS = [("hammer", "Молот", ["hammer", "build"]), ("wood", "Колода", ["wood", "log"]), ("gold", "Монета", ["gold", "coin"]),
         ("meat", "М'ясо", ["meat", "food"]), ("sword", "Меч", ["sword", "attack"]), ("shield", "Щит", ["shield", "defense"]),
         ("arrow-up", "Зелена стрілка", ["arrow", "up", "level-up"]), ("arrow-back", "Помаранчева стрілка назад", ["arrow", "back"]),
         ("close", "Червоний хрестик", ["close", "x", "cancel"]), ("settings", "Шестірня", ["settings", "gear"]),
         ("info", "Інформація", ["info", "help"]), ("music", "Нота", ["music", "sound"])]
AVATAR_KIND = [("warrior", "воїн у великому шоломі з пером"), ("lancer", "списоносець у круглому шоломі"),
               ("archer", "лучник у гостроверхому шоломі"), ("monk", "монах з тонзурою"), ("pawn", "трудівник з кошлатим волоссям")]
AVATAR_COLORS = ("blue", "red", "yellow", "purple", "black")


def ui(b: Builder) -> None:
    base = "UI Elements/UI Elements"
    for n, (sid, uk, tags) in enumerate(ICONS, 1):
        b.add(f"ui/icon-{sid}", f"{base}/Icons/Icon_{n:02d}.png", f"ui/icons/{sid}.png", "ui", f"Icon {sid}", uk,
              f"Іконка «{uk.lower()}».", ["icon", *tags], ["ui-icon"])
    for n in range(1, 26):
        kind, kind_uk = AVATAR_KIND[(n - 1) % 5]
        color = AVATAR_COLORS[(n - 1) // 5]
        b.add(f"portrait/{kind}-{color}", f"{base}/Human Avatars/Avatars_{n:02d}.png", f"ui/avatars/{kind}-{color}.png",
              "portrait", f"Avatar {kind} {color}", f"Портрет: {kind_uk} ({COLOR_UK[color]})",
              f"Портрет-аватар: {kind_uk} на {COLOR_IN[color]} щиті. Для вибору героя, діалогів, рахунку.",
              ["avatar", "portrait", "face", kind, color], ["portrait"], group=kind, color=color)
    cursors = [("arrow", "Курсор-стрілка"), ("hand", "Курсор-рука"), ("forbidden", "Курсор «не можна»"),
               ("select", "Рамка вибору з чотирьох кутів")]
    for n, (sid, uk) in enumerate(cursors, 1):
        b.add(f"ui/pointer-{sid}", f"{base}/Cursors/Cursor_0{n}.png", f"ui/pointers/{sid}.png", "ui", f"Cursor {sid}", uk,
              f"{uk}.", ["cursor", "pointer"], ["cursor"])
    for color, c_uk in (("Blue", "синя"), ("Red", "червона")):
        for shape, sh_uk in (("Round", "кругла"), ("Square", "квадратна")):
            file = f"{base}/Buttons/Tiny{shape}{color}Button.png"
            sid = f"button-{color.lower()}-{shape.lower()}-tiny"
            b.add(f"ui/{sid}", file, f"ui/buttons/{sid}.png", "ui", sid, f"Крихітна кнопка {c_uk} {sh_uk}",
                  f"Крихітна {sh_uk} {c_uk} кнопка.", ["button", "tiny", shape.lower(), color.lower()], ["ui-button"])
    for size in ("Big", "Small"):
        for color, c_uk in (("Blue", "синя"), ("Red", "червона")):
            for state, s_uk in (("Regular", ""), ("Pressed", ", натиснута")):
                if size == "Big":
                    file = f"{base}/Buttons/Big{color}Button_{state}.png"
                    sid = f"button-{color.lower()}-9slice" + ("-pressed" if state == "Pressed" else "")
                    b.add(f"ui/{sid}", file, f"ui/buttons/{sid}.png", "ui", sid, f"Кнопка {c_uk}, розтяжна{s_uk}",
                          f"Велика {c_uk} кнопка з 9 частин (`parts`) для розтягування{s_uk}.",
                          ["button", "slice", color.lower()], ["ui-button", "ui-panel"], parts=parts_of(b.root / file))
                    continue
                for shape, sh_uk in (("Round", "кругла"), ("Square", "квадратна")):
                    file = f"{base}/Buttons/Small{color}{shape}Button_{state}.png"
                    sid = f"button-{color.lower()}-{shape.lower()}" + ("-pressed" if state == "Pressed" else "")
                    b.add(f"ui/{sid}", file, f"ui/buttons/{sid}.png", "ui", sid, f"Кнопка {c_uk} {sh_uk}{s_uk}",
                          f"Мала {sh_uk} {c_uk} кнопка під іконку{s_uk}.", ["button", shape.lower(), color.lower()], ["ui-button"])
    panels = [("Banners/Banner", "banner", "Сувій-панель", "Пергаментний сувій з 9 частин для вікна з текстом.", ["banner", "scroll", "parchment"]),
              ("Banners/Banner_Slots", "banner-slots", "Пергамент для слотів", "Пергаментне тло, на якому лежать слоти.", ["parchment", "slots"]),
              ("Papers/RegularPaper", "paper", "Аркуш паперу", "Світлий аркуш з 9 частин: панель для тексту.", ["paper", "panel"]),
              ("Papers/SpecialPaper", "paper-special", "Темний аркуш", "Темна панель із золотими кутами, 9 частин: особливе вікно.", ["paper", "panel", "dark"]),
              ("Wood Table/WoodTable", "wood-table", "Дерев'яна дошка", "Дерев'яна панель з металевими кутами, 9 частин.", ["wood", "panel", "table"]),
              ("Wood Table/WoodTable_Slots", "wood-table-slots", "Дерев'яне тло слотів", "Дерев'яне тло під слоти.", ["wood", "slots"]),
              ("Bars/BigBar_Base", "bar-big", "Велика смужка", "Рамка великої смужки (здоров'я, прогрес): ліва, середня, права частини.", ["bar", "health", "progress"]),
              ("Bars/BigBar_Fill", "bar-big-fill", "Заповнення великої смужки", "Червоне заповнення, розтягувати всередині `ui/bar-big`.", ["bar", "fill"]),
              ("Bars/SmallBar_Base", "bar-small", "Мала смужка", "Рамка малої смужки: ліва, середня, права частини.", ["bar", "health", "progress"]),
              ("Bars/SmallBar_Fill", "bar-small-fill", "Заповнення малої смужки", "Червоне заповнення малої смужки.", ["bar", "fill"]),
              ("Ribbons/BigRibbons", "ribbons-big", "Великі стрічки", "Стрічки-заголовки 5 кольорів (рядки: синя, червона, жовта, фіолетова, чорна), кожна з 3 частин.", ["ribbon", "title", "header"]),
              ("Ribbons/SmallRibbons", "ribbons-small", "Малі стрічки", "Малі стрічки 5 кольорів, кожна з 3 частин.", ["ribbon", "title", "header"]),
              ("Swords/Swords", "swords", "Мечі-вказівники", "Мечі 5 кольорів як рамки-вказівники: руків'я, лезо, вістря (рядок на колір).", ["sword", "pointer", "slider"])]
    for file, sid, uk, about, tags in panels:
        roles = ["ui-bar"] if sid.startswith("bar") else ["ui-panel"]
        b.add(f"ui/{sid}", f"{base}/{file}.png", f"ui/{sid}.png", "ui", sid.replace("-", " ").capitalize(), uk, about,
              tags, roles, parts=parts_of(b.root / f"{base}/{file}.png"))
    store = "UI Elements/UI Banners from the store page"
    b.add("ui/store-banner", f"{store}/Banner/Banner.png", "ui/store/banner.png", "ui", "Store banner", "Великий сувій",
          "Великий сувій зі сторінки пака: тло для заставки.", ["banner", "scroll", "title"], ["ui-panel"])
    b.add("ui/store-slots", f"{store}/Banner/Slots.png", "ui/store/slots.png", "ui", "Store slots", "Слоти сувою",
          "Слоти до великого сувою.", ["slots", "parchment"], ["ui-panel"])
    for color in COLORS:
        file = f"{store}/Ribbons/Ribbon_{color.capitalize()}.png"
        b.add(f"ui/store-ribbon-{color}", file, f"ui/store/ribbon-{color}.png", "ui", f"Store ribbon {color}",
              f"Велика стрічка ({COLOR_UK[color]})", "Набір великих стрічок-заголовків зі сторінки пака.",
              ["ribbon", "title", color], ["ui-panel"], color=color)


def build(root: Path, out: Path) -> None:
    builder = Builder(Pack(meta=dict(META), out=out), root)
    units(builder)
    buildings(builder)
    resources(builder)
    decor(builder)
    terrain(builder)
    ui(builder)
    finish(builder, out, INTRO)
