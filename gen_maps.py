import json, os, copy

W, H = 25, 18
ASSETS = "src/little-steps-client/assets"
SCALE  = 40          # tile size on screen = 16px × 2.5x Phaser scale

# Tile IDs — swap these if they look wrong in-game
TILE_PATH = 44       # gray stone slab  → 石板路
TILE_NODE = 33       # brownish earth   → 方块土

with open(os.path.join(ASSETS, "map.json")) as f:
    _template = json.load(f)

def grid(default=0):
    return [[default]*W for _ in range(H)]

def s(g, r, c, v):
    if 0 <= r < H and 0 <= c < W:
        g[r][c] = v

def flat(g):
    return [v for row in g for v in row]

def make_json(bg, mid, fg, name):
    m = copy.deepcopy(_template)
    m["editorsettings"]["export"]["target"] = f"{name}.tmj"
    layer_data = {"background": flat(bg), "midground": flat(mid), "foreground": flat(fg)}
    for layer in m["layers"]:
        layer["data"] = layer_data[layer["name"]]
    return m

# ── Terrain helpers ────────────────────────────────────────────────────────────

def mountain(mid, specs):
    for row, cols, edge, corner_only in specs:
        if corner_only:
            s(mid, row, 0, 32)
        else:
            for c in range(cols):
                s(mid, row, c, 20)
            if edge:
                s(mid, row, cols, 21)

def platform(mid, r, c, w):
    s(mid, r,   c,   13); s(mid, r,   c+1, 15)
    s(mid, r+1, c,   37); s(mid, r+1, c+1, 39)
    for i in range(2, w):
        s(mid, r,   c+i, 44)
        s(mid, r+1, c+i, 44)

def house(mid, r, c):
    s(mid, r-1, c-2, 5)                                                            # tree crown above porch-left (level 1 style)
    s(mid, r,   c-2, 17); s(mid, r,   c-1, 5)
    s(mid, r+1, c-2, 18); s(mid, r+1, c-1, 17)
    s(mid, r+2, c-2, 81); s(mid, r+2, c-1, 82)
    s(mid, r,   c,   49); s(mid, r,   c+1, 50); s(mid, r,   c+2, 50); s(mid, r,   c+3, 51)
    s(mid, r+1, c,   61); s(mid, r+1, c+1, 62); s(mid, r+1, c+2, 64); s(mid, r+1, c+3, 63)
    s(mid, r+2, c,   73); s(mid, r+2, c+1, 74); s(mid, r+2, c+2, 86); s(mid, r+2, c+3, 76)

def trees(mid, pts):
    """Place complete 2-tall trees: crown on row r, trunk on row r+1.
    Pairs confirmed from house porch structure: (6,18)=green, (7,19)=yellow, (5,17)=orange."""
    pairs = [(6, 18), (5, 17)]
    for i, (r, c) in enumerate(pts):
        crown, trunk = pairs[i % len(pairs)]
        s(mid, r,     c, crown)
        s(mid, r + 1, c, trunk)

def shrooms(fg, pts):
    """Scatter mushroom/plant decorations (tile 30) in foreground."""
    for r, c in pts:
        s(fg, r, c, 30)

def deco(bg, pts):
    t = [2, 3]
    for i, (r, c) in enumerate(pts):
        s(bg, r, c, t[i % 2])

# ── Graph → tile helpers ───────────────────────────────────────────────────────

def tc(px, py):
    """Pixel coords → (col, row) tile coords."""
    return round(px / SCALE), round(py / SCALE)

def draw_path(mid, px0, py0, px1, py1):
    """Bresenham-style stone path between two pixel positions."""
    c0, r0 = tc(px0, py0)
    c1, r1 = tc(px1, py1)
    steps = max(abs(c1 - c0), abs(r1 - r0))
    if steps == 0:
        s(mid, r0, c0, TILE_PATH)
        return
    for i in range(steps + 1):
        r = round(r0 + (r1 - r0) * i / steps)
        c = round(c0 + (c1 - c0) * i / steps)
        s(mid, r, c, TILE_PATH)

def draw_node(mid, px, py):
    """2×2 platform at node position (mirrors level 1 style: 13/15 top, 37/39 bottom)."""
    c, r = tc(px, py)
    s(mid, r-1, c-1, 13)   # top-left
    s(mid, r-1, c,   15)   # top-right
    s(mid, r,   c-1, 37)   # bottom-left
    s(mid, r,   c,   39)   # bottom-right = node position

def paint_graph(mid, nodes_px, edges_px):
    """Draw edges first (paths), then nodes on top (dirt blocks)."""
    for p0, p1 in edges_px:
        draw_path(mid, *p0, *p1)
    for p in nodes_px:
        draw_node(mid, *p)

# ── MAP 0: Tutorial ────────────────────────────────────────────────────────────
# Node positions from level0.ts
nodes0 = [
    (100, 400),   # 0 START
    (300, 400),   # 1
    (480, 250),   # 2 bone
    (480, 540),   # 3 DEFENDER
    (660, 360),   # 4
    (660, 530),   # 5
    (830, 420),   # 6 GOAL
]
edges0 = [
    ((100,400),(300,400)),
    ((300,400),(480,250)),
    ((300,400),(480,540)),
    ((480,250),(660,360)),
    ((480,540),(660,360)),
    ((480,540),(660,530)),
    ((660,360),(830,420)),
    ((660,530),(830,420)),
]

bg0 = grid(1)

mid0 = grid(0)
paint_graph(mid0, nodes0, edges0)
mountain(mid0, [
    (0, 3, True,  False),
    (1, 5, True,  False),
    (2, 4, True,  False),
    (3, 3, True,  False),
    (4, 2, True,  False),
    (5, 1, True,  False),
    (6, 0, False, True),
])
trees(mid0, [(2,15),(3,22),(4,10),(5,18),(7,14),(13,6),(14,18),(15,3),(15,22),(16,11)])
house(mid0, 8, 21)    # house near GOAL node (830,420) → tile (20,10)

fg0 = grid(0)
shrooms(fg0, [(8,7),(11,15),(13,3),(14,21),(16,9)])

# ── MAP 1: Level 1 — original map.json ────────────────────────────────────────
map1 = copy.deepcopy(_template)
map1["editorsettings"]["export"]["target"] = "map1.tmj"

# ── MAP 2: Level 2 ────────────────────────────────────────────────────────────
# Node positions from level2.ts
nodes2 = [
    (80,  370),   # 0 START
    (220, 200),   # 1
    (220, 370),   # 2
    (220, 530),   # 3
    (390, 205),   # 4 bone
    (390, 310),   # 5
    (510, 370),   # 6 DEFENDER
    (360, 540),   # 7 stamina
    (430, 460),   # 8
    (630, 200),   # 9
    (630, 370),   # 10
    (630, 490),   # 11
    (770, 220),   # 12
    (770, 430),   # 13 bone
    (900, 320),   # 14 GOAL
]
edges2 = [
    ((80,370),(220,200)),
    ((80,370),(220,370)),
    ((80,370),(220,530)),
    ((220,200),(390,205)),
    ((220,200),(390,310)),
    ((220,370),(390,310)),
    ((220,370),(510,370)),
    ((220,530),(360,540)),
    ((220,530),(430,460)),
    ((390,205),(630,200)),
    ((390,310),(510,370)),
    ((390,310),(630,200)),
    ((360,540),(630,490)),
    ((430,460),(510,370)),
    ((430,460),(630,490)),
    ((510,370),(630,370)),
    ((630,200),(770,220)),
    ((630,200),(630,370)),
    ((630,370),(770,430)),
    ((630,490),(770,430)),
    ((770,220),(900,320)),
    ((770,430),(900,320)),
]

bg2 = grid(1)
for r in range(15, 18):
    for c in range(8):
        bg2[r][c] = 26
for c in range(7): s(bg2, 14, c, 14)
s(bg2, 14, 7, 15)

mid2 = grid(0)
paint_graph(mid2, nodes2, edges2)
mountain(mid2, [
    (0, 5, True,  False),
    (1, 8, True,  False),
    (2, 7, True,  False),
    (3, 6, True,  False),
    (4, 4, True,  False),
    (5, 3, True,  False),
    (6, 2, True,  False),
    (7, 1, True,  False),
    (8, 0, False, True),
])
s(mid2, 1, 8, 9)
trees(mid2, [(1,17),(2,22),(3,12),(4,20),(10,3),(11,10),(12,17),(13,22),(15,6),(16,14)])
house(mid2, 6, 21)    # house near GOAL node (900,320) → tile (22,8)

fg2 = grid(0)
shrooms(fg2, [(5,4),(7,7),(9,10),(12,22),(13,17),(15,5),(7,14)])

# ── MAP 3: Level 3 ────────────────────────────────────────────────────────────
# Node positions from level3.ts
nodes3 = [
    (100, 400),   # 1 START
    (250, 400),   # 2
    (250, 240),   # 3 stamina
    (450, 520),   # 4
    (450, 240),   # 5 bone
    (600, 380),   # 6
    (600, 520),   # 7 cat start
    (750, 380),   # 8
    (820, 280),   # 9 GOAL
]
edges3 = [
    ((100,400),(250,400)),
    ((250,400),(250,240)),
    ((250,400),(450,520)),
    ((250,240),(450,240)),
    ((450,240),(600,380)),
    ((450,520),(600,380)),
    ((450,520),(600,520)),
    ((600,380),(600,520)),
    ((600,380),(750,380)),
    ((600,520),(750,380)),
    ((750,380),(820,280)),
]

bg3 = grid(1)
for r in range(14, 18):
    for c in range(25):
        bg3[r][c] = 26
for c in range(24): s(bg3, 13, c, 14)
s(bg3, 13, 24, 15)

mid3 = grid(0)
paint_graph(mid3, nodes3, edges3)
mountain(mid3, [
    (0, 6, True,  False),
    (1, 10, True, False),
    (2, 8, True,  False),
    (3, 7, True,  False),
    (4, 6, True,  False),
    (5, 4, True,  False),
    (6, 3, True,  False),
    (7, 2, True,  False),
    (8, 1, True,  False),
    (9, 0, False, True),
])
s(mid3, 1, 10, 9)
trees(mid3, [(1,18),(2,22),(3,14),(4,22),(10,4),(11,10),(12,18),(10,22),(15,7),(16,16)])
house(mid3, 5, 21)    # house near GOAL node (820,280) → tile (20,7)

fg3 = grid(0)
shrooms(fg3, [(6,6),(8,8),(9,12),(10,20),(11,9),(12,3),(8,16),(15,14)])

# ── Write ──────────────────────────────────────────────────────────────────────
maps = [
    ("map0", make_json(bg0, mid0, fg0, "map0")),
    ("map1", map1),
    ("map2", make_json(bg2, mid2, fg2, "map2")),
    ("map3", make_json(bg3, mid3, fg3, "map3")),
]
for name, data in maps:
    path = os.path.join(ASSETS, f"{name}.json")
    with open(path, "w") as f:
        json.dump(data, f, separators=(",", ":"))
    print(f"Written {path}")
