# Parses scripts/cookbook-source.md (a Google-Doc export of Junmac's cookbook)
# into  scripts/cookbook.sql  +  scripts/cookbook-report.md
#
#   python scripts/import-cookbook.py
#
# The SQL replaces every recipe in the "Flat 3 Kitchen" household.

import re, html, json, uuid, sys

HH = "11111111-1111-4111-8111-111111111111"
SRC = "scripts/cookbook-source.md"

TERRACOTTA, OLIVE, SAFFRON, CLAY = "#C0603E", "#6B7A3F", "#D89B2C", "#8A6F3F"
CAT_HUES = {
    "PROTEIN": (TERRACOTTA, CLAY),
    "VEGETABLES": (OLIVE, SAFFRON),
    "CARBOHYDRATES": (CLAY, SAFFRON),
    "SAUCES & DIPS": (OLIVE, TERRACOTTA),
    "SOUPS": (TERRACOTTA, OLIVE),
    "DESSERTS": (SAFFRON, CLAY),
    "COCKTAILS": (CLAY, OLIVE),
}
CAT_MINUTES = {
    "PROTEIN": 40, "VEGETABLES": 25, "CARBOHYDRATES": 30,
    "SAUCES & DIPS": 10, "SOUPS": 50, "DESSERTS": 45, "COCKTAILS": 5,
}
CAT_LABEL = {  # -> recipes.category (matches the migration's vocabulary)
    "PROTEIN": "Protein", "VEGETABLES": "Vegetable", "CARBOHYDRATES": "Carbohydrate",
    "SAUCES & DIPS": "Sauce & Dip", "SOUPS": "Soup", "DESSERTS": "Dessert", "COCKTAILS": "Cocktail",
}

raw = open(SRC, encoding="utf-8").read()
body = raw[re.search(r"\n\| \\# \\\*\\\*——— PROTEIN ———", raw).start():]
body = body[: body.find("——— LEGEND")]

# ---- ToC: heading anchor -> display title (for component-link resolution) ----
toc = {}
for m in re.finditer(r"\[([^\]]+?) \d+\]\([^)]*#heading=(h\.[a-z0-9]+)\)", raw[: raw.find("——— PROTEIN")]):
    toc[m.group(2)] = m.group(1)

def unesc(s):
    """Strip Google-Doc markdown backslash escapes but keep &#10; newline markers."""
    return (s.replace("\\&", "&").replace("\\*", "*").replace("\\[", "[").replace("\\]", "]")
             .replace("\\_", "_").replace("\\#", "#").replace("\\.", ".").replace("\\-", "-")
             .replace("\\(", "(").replace("\\)", ")"))

def clean(s):
    s = unesc(s)
    s = html.unescape(s)
    s = s.replace("\\", "")
    s = re.sub(r"\s+", " ", s).strip()
    return s

def strip_markers(title):
    fav = False
    tried = True
    t = title
    while t and t[0] in "\\*? ":
        if t[0] == "*":
            fav = True
        if t[0] == "?":
            tried = False
        t = t[1:]
    t = t.strip()
    if "incomplete" in t.lower():
        tried = False
    return t, fav, tried

UNIT = r"(?:lb|lbs|kg|g|gram|grams|oz|cup|cups|c|tbsp|tablespoons?|tsp|teaspoons?|ml|l|clove|cloves|can|cans|pinch|pinches|part|parts|stalk|stalks|bunch|bunches|package|packages|pack|slice|slices|head|heads|bar|bars|sprig|sprigs|piece|pieces|strip|strips|sheet|sheets|packet|packets|block|blocks|handful|dash|dashes|x)"
QTY_RE = re.compile(
    r"^\s*((?:\d+[\d\s./–-]*|[¼½¾⅓⅔⅛⅜⅝⅞]|\d*\s?[¼½¾⅓⅔⅛⅜⅝⅞])\s*" + UNIT + r"?\.?\s+)(.+)$",
    re.I,
)

DOC_RE = re.compile(r"\[([^\]]+)\]\(https://docs\.google\.com/document/d/1A9Di8[^)]*#heading=(h\.[a-z0-9]+)\)")

def parse_ingredients(cell):
    cell = unesc(cell)
    # cell looks like: **Yield**<yield>**Ingredients**<rest>
    m = re.search(r"\*\*Ingredients\*\*(.*)$", cell, re.S)
    ing_txt = m.group(1) if m else ""
    ym = re.search(r"\*\*Yield\*\*(.*?)\*\*Ingredients\*\*", cell, re.S)
    yield_txt = clean(ym.group(1)) if ym else ""

    # split off inline group headers  **Something:**
    ing_txt = re.sub(r"\*\*([A-Z][^*:]{1,40}):\*\*", r"&#10;@@GROUP@@\1&#10;", ing_txt)
    # break items that ran together without a newline
    ing_txt = re.sub(r"(?<=\S)(  - )", r"&#10;\1", ing_txt)
    ing_txt = re.sub(r"(?<=[a-z)])(Optional:|Alternatives?:)", r"&#10;      - \1", ing_txt)
    lines = ing_txt.split("&#10;")
    items, group = [], None
    for ln in lines:
        for piece in ln.split("\n"):
            p = piece.strip()
            if not p:
                continue
            if p.startswith("@@GROUP@@"):
                group = clean(p[len("@@GROUP@@"):])
                continue
            # component link?
            comp = None
            dm = DOC_RE.search(piece)
            if dm:
                comp = (dm.group(1), dm.group(2))
            p = re.sub(r"^\s*[-•]\s*", "", p)          # bullet
            p = re.sub(r"^\s*-\s*", "", p)
            p = clean(re.sub(DOC_RE, r"\1", p))
            if not p or p.lower().startswith(("alternative", "alternatives", "optional:")) and len(p) > 120:
                pass
            if not p:
                continue
            sub = p.lower().startswith(("alternative", "alternatives", "optional", "note:", "for "))
            qty = ""
            name = p
            qm = QTY_RE.match(p)
            if qm and not sub:
                qty, name = qm.group(1).strip(), qm.group(2).strip()
            items.append({"name": name, "qty": qty, "group": group, "comp": comp, "sub": sub})
    return yield_txt, items

def parse_directions(cell):
    cell = unesc(cell)
    m = re.search(r"\*\*Directions\*\*(.*)$", cell, re.S)
    txt = m.group(1) if m else ""
    nm = re.search(r"\*\*Notes\*\*(.*)$", txt, re.S)
    notes = clean(re.sub(DOC_RE, r"\1", nm.group(1))) if nm else ""
    if nm:
        txt = txt[: nm.start()]
    steps = []
    for chunk in txt.split("&#10;"):
        s = clean(re.sub(DOC_RE, r"\1", chunk))
        s = re.sub(r"^\d+\s*[.)]\s*", "", s)
        s = re.sub(r"^\d+\\?\.\s*", "", s)
        if s:
            steps.append(s)
    return steps, notes

# ---- walk the body ----
recipes = []
cat = subcat = subsub = None
lines = body.split("\n")
i = 0
CAT_RE = re.compile(r"\\# \\\*\\\*——— ([A-Z& ]+?) ———")
SUB_RE = re.compile(r"^\| \\# \\\*\\\*(?!———)(.+?)\\\*\\\*")
SUBSUB_RE = re.compile(r"^\| \\#\\# \\\*\\\*(.+?)\\\*\\\*")
HDR_RE = re.compile(r"^\| \\#\\#\\#\\# \\\*\\\*(.+?)\\\*\\\*\s*(By [^\n|]*)?")

while i < len(lines):
    ln = lines[i]
    if CAT_RE.search(ln):
        cat = CAT_RE.search(ln).group(1)
        subcat = subsub = None
        i += 1
        continue
    if SUBSUB_RE.match(ln):
        subsub = clean(SUBSUB_RE.match(ln).group(1))
        i += 1
        continue
    if SUB_RE.match(ln):
        subcat = clean(SUB_RE.match(ln).group(1))
        subsub = None
        i += 1
        continue
    hm = HDR_RE.match(ln)
    if hm:
        rawtitle, byline = hm.group(1), (hm.group(2) or "")
        title, fav, tried = strip_markers(clean(rawtitle))
        author = src_url = ""
        if byline:
            b = byline[3:].strip()
            am = re.match(r"\\?\[([^\]]+)\\?\]\(([^)]+)\)", b)
            if am:
                author, src_url = clean(am.group(1)), am.group(2).replace("\\", "")
            else:
                author = clean(b)
        # find the data row (next line containing Ingredients / Directions)
        data = None
        for j in range(i + 1, min(i + 10, len(lines))):
            if "Ingredients" in lines[j] or "Directions" in lines[j]:
                data = lines[j]
                i = j
                break
        yield_txt, items, steps, notes = "", [], [], ""
        if data:
            cells = data.strip().strip("|").split("|")
            ing_cell = next((c for c in cells if "Ingredients" in c), "")
            dir_cell = next((c for c in cells if "Directions" in c), "")
            yield_txt, items = parse_ingredients(ing_cell)
            steps, notes = parse_directions(dir_cell)
        recipes.append(dict(
            id=str(uuid.uuid4()), title=title, category=CAT_LABEL.get(cat, cat),
            raw_cat=cat, subcategory=subsub or subcat, subgroup=subcat,
            author=author, src_url=src_url, fav=fav, tried=tried,
            servings=yield_txt, notes=notes, items=items, steps=steps,
        ))
    i += 1

# ---- resolve component links by title ----
by_title = {}
for r in recipes:
    by_title.setdefault(r["title"].lower(), r)

def norm(s):
    return re.sub(r"[^a-z0-9]+", "", s.lower())

by_norm = {}
for r in recipes:
    by_norm.setdefault(norm(r["title"]), r)

flags = []
TIER = {}  # title -> worst tier (1 worst .. 3)
def flag(title, msg, tier):
    flags.append((title, msg))
    TIER[title] = min(tier, TIER.get(title, 9))

for r in recipes:
    for it in r["items"]:
        if it["comp"]:
            linktext, anchor = it["comp"]
            cand = [clean(linktext)]
            if anchor in toc:
                cand.append(re.sub(r"^[?*\\ ]+", "", toc[anchor]))
            tgt = None
            for c in cand:
                tgt = by_title.get(c.lower()) or by_norm.get(norm(c))
                if tgt:
                    break
            if not tgt:  # fuzzy: unique recipe whose title contains / is contained by the link
                for c in cand:
                    nc = norm(c)
                    hits = [x for k, x in by_norm.items() if nc and (nc in k or k in nc)]
                    if len(hits) == 1:
                        tgt = hits[0]
                        break
            it["comp_id"] = tgt["id"] if tgt else None
            if not tgt:
                flag(r["title"], f"ingredient links to '{clean(linktext)}' — no matching recipe, kept as plain text", 3)
        else:
            it["comp_id"] = None

# ---- quality flags ----
seen = {}
for r in recipes:
    key = r["title"].lower()
    seen.setdefault(key, []).append(r)

for title, group in seen.items():
    if len(group) > 1:
        locs = "; ".join(f"{r['raw_cat']} › {r['subcategory']}" + (f" (by {r['author']})" if r['author'] else "") for r in group)
        for r in group:
            flag(r["title"], f"appears {len(group)}× in the source — {locs}. Both imported.", 2)

for r in recipes:
    real_items = [it for it in r["items"] if not it["sub"]]
    if "incomplete" in r["title"].lower():
        flag(r["title"], "title says 'incomplete' — partial recipe in the source", 1)
    if not real_items and not r["steps"]:
        flag(r["title"], "empty — no ingredients and no directions (a technique note, not a recipe)", 1)
    elif not real_items:
        flag(r["title"], "no ingredients parsed from the source", 1)
    elif not r["steps"]:
        flag(r["title"], "no directions parsed from the source", 1)
    elif len(r["steps"]) == 1 and (r["steps"][0].strip("* ") == "" or len(r["steps"][0]) < 6):
        flag(r["title"], f"directions are a placeholder ({r['steps'][0]!r})", 1)
    if real_items and r["steps"]:
        unquant = sum(1 for it in real_items if not it["qty"])
        if unquant / len(real_items) > 0.7 and len(real_items) >= 3:
            flag(r["title"], f"{unquant}/{len(real_items)} ingredients have no amount in the source — imported without quantities", 3)

# Ingredients keep their source order here. `scripts/reorder-ingredients.mjs`
# (an LLM pass) does the real "order by first use in the steps" afterwards —
# keyword matching was too unreliable on 200 hand-written recipes.

# ---- emit SQL ----
def q(v):
    if v is None or v == "":
        return "null"
    return "'" + str(v).replace("'", "''") + "'"

def arr(xs):
    xs = [x for x in xs if x]
    return "ARRAY[" + ", ".join(q(x) for x in xs) + "]::text[]" if xs else "ARRAY[]::text[]"

rec_sql, ing_sql = [], []
for r in recipes:
    hue_a, hue_b = CAT_HUES.get(r["raw_cat"], (TERRACOTTA, SAFFRON))
    mins = CAT_MINUTES.get(r["raw_cat"], 30)
    sm = re.search(r"\b(\d+)\b", r["servings"])
    serves = int(sm.group(1)) if sm and "cup" not in r["servings"].lower() and int(sm.group(1)) <= 20 else 2
    tags = arr([r["category"], r["subgroup"], (r["subcategory"] if r["subcategory"] != r["subgroup"] else None)])
    instructions = "\n".join(r["steps"])  # bare — the app numbers steps itself
    rec_sql.append(
        "insert into public.recipes (id, household_id, title, tags, is_favorite, is_tried, minutes, serves, "
        "servings, hue_a, hue_b, instructions, category, subcategory, author, source_url, notes) values ("
        f"{q(r['id'])}, '{HH}', {q(r['title'])}, {tags}, {str(r['fav']).lower()}, {str(r['tried']).lower()}, "
        f"{mins}, {serves}, {q(r['servings'])}, {q(hue_a)}, {q(hue_b)}, {q(instructions)}, {q(r['category'])}, "
        f"{q(r['subcategory'])}, {q(r['author'])}, {q(r['src_url'])}, {q(r['notes'])});"
    )
    for so, it in enumerate(r["items"]):
        grp = it["group"] or ("Alternatives" if it["sub"] else None)
        ing_sql.append(
            "insert into public.recipe_ingredients (recipe_id, group_name, name_text, quantity_text, "
            f"component_recipe_id, sort_order) values ({q(r['id'])}, {q(grp)}, {q(it['name'])}, "
            f"{q(it['qty'])}, {q(it['comp_id'])}, {so});"
        )

# recipes first (component_recipe_id FKs need every recipe to exist), then ingredients
out = [f"delete from public.recipes where household_id = '{HH}';", ""] + rec_sql + [""] + ing_sql
open("scripts/cookbook.sql", "w", encoding="utf-8").write("\n".join(out) + "\n")

# ---- JSON for the node applier (avoids giant SQL payloads) ----
CAT_HUES_J = {k: list(v) for k, v in CAT_HUES.items()}
json_recipes = []
for r in recipes:
    hue_a, hue_b = CAT_HUES.get(r["raw_cat"], (TERRACOTTA, SAFFRON))
    mins = CAT_MINUTES.get(r["raw_cat"], 30)
    sm = re.search(r"\b(\d+)\b", r["servings"])
    serves = int(sm.group(1)) if sm and "cup" not in r["servings"].lower() and int(sm.group(1)) <= 20 else 2
    tags = [x for x in [r["category"], r["subgroup"],
                        (r["subcategory"] if r["subcategory"] != r["subgroup"] else None)] if x]
    json_recipes.append(dict(
        id=r["id"], title=r["title"], tags=tags, is_favorite=r["fav"], is_tried=r["tried"],
        minutes=mins, serves=serves, servings=r["servings"] or None, hue_a=hue_a, hue_b=hue_b,
        instructions="\n".join(r["steps"]) or None,
        category=r["category"], subcategory=r["subcategory"], author=r["author"] or None,
        source_url=r["src_url"] or None, notes=r["notes"] or None,
        ingredients=[dict(
            group_name=(it["group"] or ("Alternatives" if it["sub"] else None)),
            name_text=it["name"], quantity_text=it["qty"] or None,
            component_recipe_id=it["comp_id"], sort_order=so,
        ) for so, it in enumerate(r["items"])],
    ))
json.dump({"household_id": HH, "recipes": json_recipes},
          open("scripts/cookbook.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# ---- report ----
rep = ["# Junmac cookbook import — report", ""]
rep.append(f"**{len(recipes)} recipes** parsed across {len(set(r['raw_cat'] for r in recipes))} categories.")
rep.append(f"- favourites (starred `*`): {sum(1 for r in recipes if r['fav'])}")
rep.append(f"- untested (`?` / incomplete): {sum(1 for r in recipes if not r['tried'])}")
tot_ing = sum(len(r['items']) for r in recipes)
tot_steps = sum(len(r['steps']) for r in recipes)
rep.append(f"- {tot_ing} ingredient rows, {tot_steps} direction steps")
comp_ok = sum(1 for r in recipes for it in r['items'] if it.get('comp_id'))
rep.append(f"- {comp_ok} cross-recipe ingredient links resolved")
rep.append("")
byr = {}
for t, msg in flags:
    byr.setdefault(t, []).append(msg)

TIER_HDR = {
    1: "### Tier 1 — needs a human pass (imported, but broken or partial in the source)",
    2: "### Tier 2 — duplicate titles (both copies imported; decide which to keep)",
    3: "### Tier 3 — imported fine, just imprecise (missing amounts, or an unmatched cross-link)",
}
rep.append(f"## Recipes that were difficult to import  ({len(byr)} of {len(recipes)})")
rep.append("")
for tier in (1, 2, 3):
    titles = sorted(t for t in byr if TIER.get(t) == tier)
    if not titles:
        continue
    rep.append(TIER_HDR[tier])
    rep.append("")
    for t in titles:
        rep.append(f"- **{t}** — " + "; ".join(sorted(set(byr[t]))))
    rep.append("")
rep.append("## Notes on the mapping")
rep.append("- The source has **no cook times** — `minutes` is a per-category estimate "
           "(Protein 40, Veg 25, Carb 30, Sauce 10, Soup 50, Dessert 45, Cocktail 5).")
rep.append("- The source has **no serving counts** — `servings` keeps the raw \"Yield\" text; "
           "`serves` is parsed when a plain number was present, else 2.")
rep.append("- `hue_a`/`hue_b` (circle-mark colours) assigned by category.")
rep.append("- Ingredient quantity/name split is heuristic; when it was ambiguous the whole line is the name.")
rep.append("- `*` → `is_favorite`, `?` / \"incomplete\" → `is_tried = false`.")
rep.append("- Author names are kept verbatim from the source, so near-duplicates exist "
           "(\"Kenji Lopez\" / \"Kenji Lopez-Alt\", \"Maangchi\" / \"Maanchi\"). Not normalised.")
rep.append("- Cross-recipe links only resolve when the ingredient is a Google-Doc link to "
           "another recipe heading; \"serve with X\" mentions in prose stay as text.")
rep.append("")
rep.append("## Side effects of the import")
rep.append("- The 10 fixture recipes were **deleted** — the meal plan and the two seed "
           "sequences referenced them, so those were cleared too. Re-plan from the new cookbook.")
open("scripts/cookbook-report.md", "w", encoding="utf-8").write("\n".join(rep) + "\n")

print(f"{len(recipes)} recipes -> scripts/cookbook.sql")
print(f"{len(byr)} recipes flagged -> scripts/cookbook-report.md")
print("statements:", len(out))
