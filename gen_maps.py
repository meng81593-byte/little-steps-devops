import json, os, copy

# ── Coordinate system ──────────────────────────────────────────────────────────
# The tile map is W×H = 25×18 tiles.
# Each tile is SCALE=40 pixels wide/tall on screen.
#
# Conversion:  tile_col = round(pixel_x / 40)
#              tile_row = round(pixel_y / 40)
#
# Node positions (x, y) in the level .ts files ARE the pixel coordinates.
# They must match the (px, py) values in the nodes lists below — that is
# how the tile-map node blocks line up with the Phaser node circles.
#
# To move a node:
#   1. Change (x, y) in the level .ts file.
#   2. Change the matching (px, py) in the nodes list below.
#   3. Update every edge in the edges list that referenced the old coords.
#   4. Run `python gen_maps.py` to regenerate the .json map files.
#
# To add a new node:
#   1. Add it to the level .ts file with the desired (x, y).
#   2. Append (x, y) to the nodes list below.
#   3. Append edges to the edges list using the same pixel coords.

W, H = 25, 18
ASSETS = "src/little-steps-client/assets"
SCALE  = 40          # 1 tile = 40 px on screen (16 px sprite × 2.5 Phaser scale)

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
    """Pixel coords → (col, row) tile coords.
    Formula: col = round(px / 40),  row = round(py / 40)
    Example: pixel (480, 250) → tile col 12, row 6"""
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
    """2×2 dirt-block platform centered at the node pixel position.
    The center of the block is at tile (col, row) = tc(px, py).
    Tiles placed:
      top-left    (row-1, col-1) = 13
      top-right   (row-1, col  ) = 15
      bottom-left (row,   col-1) = 37
      bottom-right(row,   col  ) = 39  ← this is the exact node position"""
    c, r = tc(px, py)
    s(mid, r-1, c-1, 13)
    s(mid, r-1, c,   15)
    s(mid, r,   c-1, 37)
    s(mid, r,   c,   39)

def paint_graph(mid, nodes_px, edges_px):
    """Draw edges first (paths), then nodes on top (dirt blocks)."""
    for p0, p1 in edges_px:
        draw_path(mid, *p0, *p1)
    for p in nodes_px:
        draw_node(mid, *p)

# ── MAP 0: Tutorial ────────────────────────────────────────────────────────────
# Node positions must match (x, y) in level0.ts exactly.
# Tile position = (round(x/40), round(y/40)) = (col, row)
nodes0 = [
    (100, 400),   # node 0 — START         → tile col 2,  row 10
    (300, 400),   # node 1 — crossroads    → tile col 8,  row 10
    (480, 250),   # node 2 — BONE          → tile col 12, row 6
    (480, 540),   # node 3 — SQUIRREL      → tile col 12, row 14
    (660, 360),   # node 4 — upper exit    → tile col 17, row 9
    (660, 530),   # node 5 — lower exit    → tile col 17, row 13
    (830, 420),   # node 6 — GOAL          → tile col 21, row 11
]
# Each edge is ((px_from, py_from), (px_to, py_to)).
# Both coords must appear in nodes0 above (or be intermediate waypoints).
edges0 = [
    ((100,400),(300,400)),   # 0 → 1
    ((300,400),(480,250)),   # 1 → 2 (upper fork)
    ((300,400),(480,540)),   # 1 → 3 (lower fork)
    ((480,250),(660,360)),   # 2 → 4
    ((480,540),(660,360)),   # 3 → 4
    ((480,540),(660,530)),   # 3 → 5
    ((660,360),(830,420)),   # 4 → 6 GOAL
    ((660,530),(830,420)),   # 5 → 6 GOAL
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
# Level 1 uses a hand-authored map (map.json) as-is.
# Node and path layout are baked into that file; to change them edit map.json
# directly in Tiled and export, or replace this with a generated map like map0.
map1 = copy.deepcopy(_template)
map1["editorsettings"]["export"]["target"] = "map1.tmj"

# ── MAP 2: Level 2 ────────────────────────────────────────────────────────────
# Node positions must match (x, y) in level2.ts exactly.
# Tile position = (round(x/40), round(y/40)) = (col, row)
nodes2 = [
    (80,  370),   # node 0  — START           → tile col 2,  row 9
    (220, 200),   # node 1  — upper fork      → tile col 6,  row 5
    (220, 370),   # node 2  — middle fork     → tile col 6,  row 9
    (220, 530),   # node 3  — lower fork      → tile col 6,  row 13
    (390, 205),   # node 4  — BONE            → tile col 10, row 5
    (390, 310),   # node 5  — middle junction → tile col 10, row 8
    (510, 370),   # node 6  — SQUIRREL        → tile col 13, row 9
    (360, 540),   # node 7  — STAMINA BOOST   → tile col 9,  row 14
    (430, 460),   # node 8  — lower junction  → tile col 11, row 12
    (630, 200),   # node 9  — upper right     → tile col 16, row 5
    (630, 370),   # node 10 — center right    → tile col 16, row 9
    (630, 490),   # node 11 — lower right     → tile col 16, row 12
    (770, 220),   # node 12 — upper goal path → tile col 19, row 6
    (770, 430),   # node 13 — BONE            → tile col 19, row 11
    (900, 320),   # node 14 — GOAL            → tile col 23, row 8
]
edges2 = [
    ((80,370),(220,200)),    # 0 → 1
    ((80,370),(220,370)),    # 0 → 2
    ((80,370),(220,530)),    # 0 → 3
    ((220,200),(390,205)),   # 1 → 4
    ((220,200),(390,310)),   # 1 → 5
    ((220,370),(390,310)),   # 2 → 5
    ((220,370),(510,370)),   # 2 → 6 (SQUIRREL)
    ((220,530),(360,540)),   # 3 → 7
    ((220,530),(430,460)),   # 3 → 8
    ((390,205),(630,200)),   # 4 → 9
    ((390,310),(510,370)),   # 5 → 6 (SQUIRREL)
    ((390,310),(630,200)),   # 5 → 9
    ((360,540),(630,490)),   # 7 → 11
    ((430,460),(510,370)),   # 8 → 6 (SQUIRREL)
    ((430,460),(630,490)),   # 8 → 11
    ((510,370),(630,370)),   # 6 → 10 (squirrel's forced exit)
    ((630,200),(770,220)),   # 9 → 12
    ((630,200),(630,370)),   # 9 → 10
    ((630,370),(770,430)),   # 10 → 13
    ((630,490),(770,430)),   # 11 → 13
    ((770,220),(900,320)),   # 12 → 14 GOAL
    ((770,430),(900,320)),   # 13 → 14 GOAL
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
# Node positions must match (x, y) in level3.ts exactly.
# Tile position = (round(x/40), round(y/40)) = (col, row)
nodes3 = [
    (100, 400),   # node 1 — START          → tile col 3,  row 10
    (250, 400),   # node 2 — first split    → tile col 6,  row 10
    (250, 240),   # node 3 — STAMINA BOOST  → tile col 6,  row 6
    (450, 520),   # node 4 — risky path     → tile col 11, row 13
    (450, 240),   # node 5 — split          → tile col 11, row 6
    (450, 380),   # node 0 — BONE (dead-end below node 5) → tile col 11, row 10
    (600, 380),   # node 6 — DEFENDER       → tile col 15, row 10
    (600, 520),   # node 7 — lower node     → tile col 15, row 13
    (750, 380),   # node 8 — CAT START      → tile col 19, row 10
    (820, 280),   # node 9 — GOAL           → tile col 21, row 7
]
edges3 = [
    ((100,400),(250,400)),   # 1 → 2
    ((250,400),(250,240)),   # 2 → 3 (upper, toward stamina)
    ((250,400),(450,520)),   # 2 → 4 (lower, risky)
    ((250,240),(450,240)),   # 3 → 5
    ((450,240),(450,380)),   # 5 → 0 (bone dead-end, straight down)
    ((450,240),(600,380)),   # 5 → 6 (DEFENDER)
    ((450,520),(600,380)),   # 4 → 6
    ((450,520),(600,520)),   # 4 → 7
    ((600,380),(600,520)),   # 6 ↔ 7
    ((600,380),(750,380)),   # 6 → 8
    ((600,520),(750,380)),   # 7 → 8
    ((750,380),(820,280)),   # 8 → 9 GOAL
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
