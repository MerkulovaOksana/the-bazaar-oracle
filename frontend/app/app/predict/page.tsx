"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

interface SimResult {
  winner: string;
  player_wins: boolean;
  player_hp_remaining: number;
  player_hp_max: number;
  player_shield: number;
  monster_hp_remaining: number;
  monster_hp_max: number;
  monster_shield: number;
  monster_name: string;
  battle_time_ms: number;
  total_casts: number;
  player_items: string[];
  monster_items: string[];
  player_burn: number;
  player_poison: number;
  monster_burn: number;
  monster_poison: number;
  battle_log: string[];
  key_moments: any[];
}

interface ParsedScreenshot {
  player: { hero_name: string | null; hp: number | null; items: string[] };
  monster: { name: string | null; hp: number | null; items: string[] };
  confidence: string;
  notes: string;
}

interface CatalogItem {
  id: string;
  name: string;
  desc: string;
  /** Bazaar DB tooltip-style summary when enrichment has been run */
  bazaar_desc?: string;
  image_url?: string;
  category: string;
  tier: string;
  size: string;
  cooldown_ms: number;
  multicast: number;
  damage?: number;
  healing?: number;
  shield_amount?: number;
  crit_chance?: number;
  applies_burn?: number;
  applies_freeze?: number;
  applies_poison?: number;
  applies_haste?: number;
  applies_slow?: number;
}

interface Monster {
  id: string;
  name: string;
  hp: number;
  day: number;
  tier: string;
  image: string;
  bazaar_desc?: string;
  item_count: number;
}

const TIER_STYLES: Record<string, { border: string; bg: string; badge: string; text: string }> = {
  bronze: {
    border: "border-amber-700/60",
    bg: "bg-gradient-to-b from-amber-900/30 to-amber-950/20",
    badge: "bg-amber-700 text-amber-100",
    text: "text-amber-500",
  },
  silver: {
    border: "border-gray-400/50",
    bg: "bg-gradient-to-b from-gray-600/20 to-gray-800/20",
    badge: "bg-gray-500 text-gray-100",
    text: "text-gray-400",
  },
  gold: {
    border: "border-yellow-500/50",
    bg: "bg-gradient-to-b from-yellow-700/20 to-yellow-900/20",
    badge: "bg-yellow-600 text-yellow-100",
    text: "text-yellow-500",
  },
  diamond: {
    border: "border-cyan-400/50",
    bg: "bg-gradient-to-b from-cyan-700/20 to-cyan-900/20",
    badge: "bg-cyan-600 text-cyan-100",
    text: "text-cyan-400",
  },
  legendary: {
    border: "border-purple-500/60",
    bg: "bg-gradient-to-b from-purple-700/25 to-purple-900/20",
    badge: "bg-purple-600 text-purple-100",
    text: "text-purple-400",
  },
};

const CATEGORY_ICONS: Record<string, string> = {
  weapon: "\u2694\ufe0f",
  potion: "\ud83e\uddea",
  apparel: "\ud83d\udee1\ufe0f",
  property: "\ud83c\udff0",
  tool: "\ud83d\udd27",
  skill: "\ud83d\udcdc",
};

/** Every whitespace-separated token must appear somewhere in the joined fields (case-insensitive). */
function matchesCatalogSearch(query: string, parts: (string | number | undefined)[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = parts
    .filter((p) => p !== undefined && p !== "")
    .map((p) => String(p).toLowerCase())
    .join(" ");
  return q
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => hay.includes(word));
}

/**
 * Plain text for cards — Cargo/wikitext often has [[File:...]], '''bold''', {{templates}}.
 * Runs on every render so old cached API responses still look OK after deploy.
 */
function stripWikiMarkupForUi(s: string): string {
  if (!s) return "";
  let t = s;
  // `[[File:...]]` must match through final `]]` (params may contain `]` before that).
  t = t.replace(/\[\[File:\s*[\s\S]*?\]\]/gi, " ");
  t = t.replace(/\[\[(?:[^\]|]*\|)*([^\]|]+)\]\]/g, "$1");
  t = t.replace(/\[\[[^\]]+\]\]/g, " ");
  t = t.replace(/\{\{[^}]+\}\}/g, " ");
  t = t.replace(/'''([^']*)'''/g, "$1");
  t = t.replace(/''([^']*)''/g, "$1");
  t = t.replace(/"{2,}(\d+)"{2,}/g, "$1");
  t = t.replace(/"{2,}/g, " ");
  t = t.replace(/'{2,}(\d+)'{2,}/g, "$1");
  t = t.replace(/<[^>]+>/g, " ");
  t = t.replace(/\s+/g, " ").trim();
  // Truncated API strings sometimes end with a cut-off `[[File:...` (no closing ]])
  t = t.replace(/\s*\{\{[^}]*$/g, "");
  t = t.replace(/\s*\[\[[^\]]*$/g, "");
  return t.replace(/\s+/g, " ").trim();
}

function ItemCard({
  item,
  selected,
  onClick,
}: {
  item: CatalogItem;
  selected: boolean;
  onClick: () => void;
}) {
  const tier = TIER_STYLES[item.tier] || TIER_STYLES.bronze;
  const icon = CATEGORY_ICONS[item.category] || "\u2728";
  const blurb = stripWikiMarkupForUi(item.bazaar_desc || item.desc);

  return (
    <button
      onClick={onClick}
      className={`relative text-left rounded-lg border-2 p-3 transition-all hover:scale-[1.02] active:scale-[0.98] ${
        selected
          ? "border-bazaar-accent shadow-lg shadow-bazaar-accent/20 ring-1 ring-bazaar-accent/50"
          : `${tier.border} hover:border-bazaar-accent/40`
      } ${tier.bg}`}
    >
      {selected && (
        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-bazaar-accent rounded-full flex items-center justify-center text-xs text-bazaar-bg font-bold">
          ✓
        </div>
      )}

      <div className="flex items-start gap-2">
        {item.image_url ? (
          <div className="w-11 h-11 rounded-md overflow-hidden border border-white/10 bg-bazaar-bg shrink-0 mt-0.5">
            <img
              src={item.image_url}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        ) : (
          <span className="text-xl mt-0.5 shrink-0">{icon}</span>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm text-bazaar-warm truncate">
              {item.name}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase ${tier.badge}`}>
              {item.tier}
            </span>
          </div>
          <p className="text-xs text-bazaar-muted mt-0.5 leading-snug line-clamp-4">{blurb}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-[11px] text-bazaar-accent font-mono">
              {(item.cooldown_ms / 1000).toFixed(1)}s
            </span>
            {item.multicast > 1 && (
              <span className="text-[11px] text-purple-400 font-mono">
                x{item.multicast}
              </span>
            )}
            {item.damage && item.damage > 0 && (
              <span className="text-[11px] text-red-400 font-mono">
                {item.damage} dmg
              </span>
            )}
            {item.healing && item.healing > 0 && (
              <span className="text-[11px] text-green-400 font-mono">
                +{item.healing} hp
              </span>
            )}
            {item.shield_amount && item.shield_amount > 0 && (
              <span className="text-[11px] text-cyan-400 font-mono">
                {item.shield_amount} shd
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function MonsterCard({
  monster,
  selected,
  onClick,
}: {
  monster: Monster;
  selected: boolean;
  onClick: () => void;
}) {
  const tier = TIER_STYLES[monster.tier] || TIER_STYLES.bronze;

  return (
    <button
      onClick={onClick}
      className={`relative text-left rounded-xl border-2 p-3 transition-all hover:scale-[1.02] active:scale-[0.98] ${
        selected
          ? "border-bazaar-red shadow-lg shadow-bazaar-red/20 ring-1 ring-bazaar-red/40"
          : `${tier.border} hover:border-bazaar-red/40`
      } ${tier.bg}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 bg-bazaar-bg shrink-0">
          <img
            src={monster.image}
            alt={monster.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "";
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm text-bazaar-warm">{monster.name}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase ${tier.badge}`}>
              {monster.tier}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-red-400 font-mono">{monster.hp} HP</span>
            <span className="text-xs text-bazaar-muted">Day {monster.day}</span>
            <span className="text-xs text-bazaar-muted">{monster.item_count} items</span>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function PredictPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"screenshot" | "manual">("manual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SimResult | null>(null);
  const [parsed, setParsed] = useState<ParsedScreenshot | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedMonster, setSelectedMonster] = useState("");
  const [playerHp, setPlayerHp] = useState(500);
  const [itemFilter, setItemFilter] = useState<string>("all");
  const [itemSearch, setItemSearch] = useState("");
  const [monsterSearch, setMonsterSearch] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push("/auth");
      return;
    }
    api.getCatalog().then((d) => setCatalog(d.items)).catch(() => {});
    api.getMonsters().then((d) => setMonsters(d.monsters)).catch(() => {});
  }, [isAuthenticated, authLoading, router]);

  const handleScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setError("");
    setResult(null);
    setParsed(null);
    setLoading(true);

    try {
      const data = await api.predictScreenshot(file);
      setResult(data.simulation);
      setParsed(data.parsed_screenshot);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManual = async () => {
    if (!selectedItems.length || !selectedMonster) {
      setError("Выбери хотя бы один предмет и монстра");
      return;
    }

    setError("");
    setResult(null);
    setLoading(true);

    try {
      const data = await api.predictPreset({
        player_items: selectedItems,
        player_hp: playerHp,
        monster_id: selectedMonster,
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : prev.length < 10 ? [...prev, id] : prev
    );
  };

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(catalog.map((i) => i.category)))],
    [catalog]
  );

  const filteredItems = useMemo(() => {
    const byCat =
      itemFilter === "all"
        ? catalog
        : catalog.filter((i) => i.category === itemFilter);
    if (!itemSearch.trim()) return byCat;
    return byCat.filter((i) =>
      matchesCatalogSearch(itemSearch, [
        i.id,
        i.name,
        i.desc,
        i.bazaar_desc,
        i.category,
        i.tier,
        i.size,
      ])
    );
  }, [catalog, itemFilter, itemSearch]);

  const filteredMonsters = useMemo(() => {
    if (!monsterSearch.trim()) return monsters;
    return monsters.filter((m) =>
      matchesCatalogSearch(monsterSearch, [
        m.id,
        m.name,
        m.tier,
        m.hp,
        m.day,
        m.bazaar_desc,
      ])
    );
  }, [monsters, monsterSearch]);

  const selectedMonsterData = monsters.find((m) => m.id === selectedMonster);

  if (authLoading) {
    return (
      <div className="min-h-screen max-w-7xl mx-auto px-4 py-24 flex flex-col items-center justify-center text-center">
        <div className="text-4xl mb-4 animate-pulse" aria-hidden>
          🔮
        </div>
        <p className="text-bazaar-muted text-sm">Проверяем сессию…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen max-w-7xl mx-auto px-4 py-24 flex flex-col items-center justify-center text-center">
        <p className="text-bazaar-muted text-sm">Перенаправление на страницу входа…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-bazaar-warm">
          Предсказание боя
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setMode("manual")}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition ${
              mode === "manual"
                ? "bg-bazaar-accent text-bazaar-bg shadow-lg shadow-bazaar-accent/20"
                : "bg-bazaar-card text-bazaar-muted border border-bazaar-accent/20 hover:border-bazaar-accent/40"
            }`}
          >
            Собрать билд
          </button>
          <button
            onClick={() => setMode("screenshot")}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition ${
              mode === "screenshot"
                ? "bg-bazaar-accent text-bazaar-bg shadow-lg shadow-bazaar-accent/20"
                : "bg-bazaar-card text-bazaar-muted border border-bazaar-accent/20 hover:border-bazaar-accent/40"
            }`}
          >
            Загрузить скриншот
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Input panel - takes 3 cols */}
        <div className="lg:col-span-3">
          {mode === "screenshot" ? (
            <div className="bg-card-gradient rounded-xl border border-bazaar-accent/15 p-6">
              <h2 className="text-lg font-semibold mb-4 text-bazaar-warm">
                Загрузить скриншот боя
              </h2>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-bazaar-accent/25 rounded-xl p-8 text-center cursor-pointer hover:border-bazaar-accent/50 transition"
              >
                {preview ? (
                  <img
                    src={preview}
                    alt="Screenshot"
                    className="max-h-64 mx-auto rounded-lg"
                  />
                ) : (
                  <>
                    <div className="text-5xl mb-3 opacity-60">📸</div>
                    <p className="text-bazaar-muted font-medium">
                      Нажми для загрузки скриншота
                    </p>
                    <p className="text-xs text-bazaar-muted mt-1">
                      PNG, JPG до 10МБ
                    </p>
                  </>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleScreenshot}
                className="hidden"
              />

              {parsed && (
                <div className="mt-4 bg-bazaar-bg rounded-lg p-4 text-sm">
                  <p className="text-bazaar-muted mb-2">
                    Распознано (точность: {parsed.confidence})
                  </p>
                  <p>
                    <span className="text-bazaar-muted">Твои предметы:</span>{" "}
                    {parsed.player.items.join(", ") || "не найдены"}
                  </p>
                  <p>
                    <span className="text-bazaar-muted">Монстр:</span>{" "}
                    {parsed.monster.name} ({parsed.monster.items.join(", ")})
                  </p>
                  {parsed.notes && (
                    <p className="text-bazaar-muted mt-1">{parsed.notes}</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Player HP */}
              <div className="bg-card-gradient rounded-xl border border-bazaar-accent/15 p-5">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-semibold text-bazaar-warm">
                    Твой билд
                  </h2>
                  <span className="text-sm font-mono text-bazaar-green">
                    HP: {playerHp}
                  </span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={1500}
                  step={50}
                  value={playerHp}
                  onChange={(e) => setPlayerHp(Number(e.target.value))}
                  className="w-full accent-bazaar-accent"
                />
                <div className="flex justify-between text-[11px] text-bazaar-muted mt-1">
                  <span>100</span>
                  <span>1500</span>
                </div>
              </div>

              {/* Selected items board */}
              {selectedItems.length > 0 && (
                <div className="bg-card-gradient rounded-xl border border-bazaar-accent/15 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-bazaar-warm">
                      Твоя доска ({selectedItems.length}/10)
                    </span>
                    <button
                      onClick={() => setSelectedItems([])}
                      className="text-xs text-bazaar-muted hover:text-bazaar-red transition"
                    >
                      Очистить
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedItems.map((id) => {
                      const item = catalog.find((i) => i.id === id);
                      if (!item) return null;
                      const tier = TIER_STYLES[item.tier] || TIER_STYLES.bronze;
                      return (
                        <button
                          key={id}
                          onClick={() => toggleItem(id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition hover:opacity-80 ${tier.border} ${tier.bg}`}
                        >
                          <span>{CATEGORY_ICONS[item.category] || "\u2728"}</span>
                          <span className="text-bazaar-warm">{item.name}</span>
                          <span className="text-bazaar-muted ml-1">×</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Item catalog */}
              <div className="bg-card-gradient rounded-xl border border-bazaar-accent/15 p-5">
                <div className="flex items-center justify-between mb-3 gap-2">
                  <h3 className="text-base font-semibold text-bazaar-warm">
                    Выбери предметы
                  </h3>
                  <span className="text-xs text-bazaar-muted shrink-0">
                    {selectedItems.length}/10 выбрано
                  </span>
                </div>

                <div className="relative mb-3">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-bazaar-muted pointer-events-none text-sm"
                    aria-hidden
                  >
                    🔍
                  </span>
                  <input
                    type="search"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    placeholder="Поиск: название, id, описание…"
                    autoComplete="off"
                    className="w-full rounded-lg border border-bazaar-accent/20 bg-bazaar-bg py-2 pl-9 pr-9 text-sm text-bazaar-warm placeholder:text-bazaar-muted/55 focus:outline-none focus:ring-1 focus:ring-bazaar-accent/40"
                  />
                  {itemSearch ? (
                    <button
                      type="button"
                      onClick={() => setItemSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-bazaar-muted hover:text-bazaar-warm text-lg leading-none px-1"
                      aria-label="Очистить поиск"
                    >
                      ×
                    </button>
                  ) : null}
                </div>
                {itemSearch.trim() ? (
                  <p className="text-[11px] text-bazaar-muted mb-2">
                    Найдено: {filteredItems.length}
                  </p>
                ) : null}

                {/* Category filter */}
                <div className="flex gap-1.5 mb-4 flex-wrap">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setItemFilter(cat)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                        itemFilter === cat
                          ? "bg-bazaar-accent text-bazaar-bg"
                          : "bg-bazaar-bg text-bazaar-muted hover:text-bazaar-warm border border-bazaar-accent/15"
                      }`}
                    >
                      {cat === "all" ? "Все" : `${CATEGORY_ICONS[cat] || ""} ${cat}`}
                    </button>
                  ))}
                </div>

                {/* Items grid */}
                <div className="grid sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                  {filteredItems.length === 0 ? (
                    <p className="col-span-full text-center text-sm text-bazaar-muted py-10">
                      Ничего не найдено — измени запрос или фильтр категории
                    </p>
                  ) : (
                    filteredItems.map((item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        selected={selectedItems.includes(item.id)}
                        onClick={() => toggleItem(item.id)}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Monster selection */}
              <div className="bg-card-gradient rounded-xl border border-bazaar-accent/15 p-5">
                <h3 className="text-base font-semibold text-bazaar-warm mb-3">
                  Выбери монстра
                </h3>
                <label className="block text-xs font-medium text-bazaar-muted mb-1.5">
                  Поиск монстров
                </label>
                <div className="relative mb-3">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-bazaar-accent pointer-events-none text-sm"
                    aria-hidden
                  >
                    🔍
                  </span>
                  <input
                    type="search"
                    value={monsterSearch}
                    onChange={(e) => setMonsterSearch(e.target.value)}
                    placeholder="Имя, id или номер дня…"
                    autoComplete="off"
                    aria-label="Поиск монстров"
                    className="w-full min-h-[44px] rounded-lg border-2 border-bazaar-accent/35 bg-bazaar-surface py-2.5 pl-10 pr-10 text-sm text-bazaar-warm placeholder:text-bazaar-muted/70 shadow-inner shadow-black/20 focus:outline-none focus:border-bazaar-accent focus:ring-2 focus:ring-bazaar-accent/25"
                  />
                  {monsterSearch ? (
                    <button
                      type="button"
                      onClick={() => setMonsterSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-bazaar-muted hover:text-bazaar-warm text-lg leading-none px-1"
                      aria-label="Очистить поиск"
                    >
                      ×
                    </button>
                  ) : null}
                </div>
                {monsterSearch.trim() ? (
                  <p className="text-[11px] text-bazaar-muted mb-2">
                    Найдено: {filteredMonsters.length}
                  </p>
                ) : null}
                <div className="grid sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {filteredMonsters.length === 0 ? (
                    <p className="col-span-full text-center text-sm text-bazaar-muted py-8">
                      Ничего не найдено — измени запрос
                    </p>
                  ) : (
                    filteredMonsters.map((m) => (
                      <MonsterCard
                        key={m.id}
                        monster={m}
                        selected={selectedMonster === m.id}
                        onClick={() => setSelectedMonster(m.id)}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Fight button */}
              <button
                onClick={handleManual}
                disabled={loading || !selectedItems.length || !selectedMonster}
                className="w-full bg-gold-gradient hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100 text-bazaar-bg font-bold py-4 rounded-xl text-lg transition shadow-lg shadow-bazaar-accent/20 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin">⚔</span>
                    Симулируем бой...
                  </>
                ) : (
                  <>
                    ⚔ Предсказать бой
                    {selectedMonsterData && (
                      <span className="font-normal text-sm opacity-80">
                        vs {selectedMonsterData.name}
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-bazaar-red/10 border border-bazaar-red/30 rounded-lg p-3 text-sm text-bazaar-red">
              {error}
            </div>
          )}
        </div>

        {/* Result panel - takes 2 cols */}
        <div className="lg:col-span-2">
          {!loading && !result && (
            <div className="bg-card-gradient rounded-xl border border-bazaar-accent/10 p-8 text-center sticky top-8">
              <div className="text-5xl mb-4 opacity-40">⚔</div>
              <p className="text-bazaar-muted text-sm">
                Выбери предметы и монстра, <br />чтобы начать симуляцию
              </p>
            </div>
          )}

          {loading && (
            <div className="bg-card-gradient rounded-xl border border-bazaar-accent/20 p-12 text-center sticky top-8">
              <div className="text-5xl mb-4 animate-pulse">⚔</div>
              <p className="text-bazaar-muted">
                Симулируем бой...
              </p>
            </div>
          )}

          {result && !loading && (
            <div className="bg-card-gradient rounded-xl border border-bazaar-accent/15 p-5 sticky top-8 space-y-5">
              {/* Win/Lose banner */}
              <div
                className={`text-center py-5 rounded-xl ${
                  result.player_wins
                    ? "bg-bazaar-green/10 border border-bazaar-green/30"
                    : "bg-bazaar-red/10 border border-bazaar-red/30"
                }`}
              >
                <div className="text-3xl font-extrabold mb-1">
                  {result.player_wins ? (
                    <span className="text-bazaar-green">ПОБЕДА</span>
                  ) : (
                    <span className="text-bazaar-red">ПОРАЖЕНИЕ</span>
                  )}
                </div>
                <p className="text-sm text-bazaar-muted">
                  vs {result.monster_name} &mdash;{" "}
                  {(result.battle_time_ms / 1000).toFixed(1)}s
                </p>
              </div>

              {/* HP Bars */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-bazaar-warm font-medium">Игрок</span>
                    <span className="font-mono text-bazaar-green">
                      {result.player_hp_remaining} / {result.player_hp_max}
                    </span>
                  </div>
                  <div className="h-5 bg-bazaar-bg rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-bazaar-green/80 to-bazaar-green rounded-full transition-all duration-1000"
                      style={{
                        width: `${Math.max(0, (result.player_hp_remaining / result.player_hp_max) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-bazaar-warm font-medium">{result.monster_name}</span>
                    <span className="font-mono text-bazaar-red">
                      {result.monster_hp_remaining} / {result.monster_hp_max}
                    </span>
                  </div>
                  <div className="h-5 bg-bazaar-bg rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-bazaar-red/80 to-bazaar-red rounded-full transition-all duration-1000"
                      style={{
                        width: `${Math.max(0, (result.monster_hp_remaining / result.monster_hp_max) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-bazaar-bg rounded-lg p-3 text-center border border-white/5">
                  <div className="text-lg font-bold text-bazaar-warm">{result.total_casts}</div>
                  <div className="text-xs text-bazaar-muted">Всего кастов</div>
                </div>
                <div className="bg-bazaar-bg rounded-lg p-3 text-center border border-white/5">
                  <div className="text-lg font-bold text-bazaar-warm">
                    {(result.battle_time_ms / 1000).toFixed(1)}s
                  </div>
                  <div className="text-xs text-bazaar-muted">Время боя</div>
                </div>
                {(result.monster_burn > 0 || result.monster_poison > 0) && (
                  <div className="bg-bazaar-bg rounded-lg p-3 text-center border border-white/5">
                    <div className="text-lg font-bold text-orange-400">
                      {result.monster_burn > 0 ? `${result.monster_burn}` : ""}
                      {result.monster_burn > 0 && result.monster_poison > 0 ? " / " : ""}
                      {result.monster_poison > 0 ? `${result.monster_poison}` : ""}
                    </div>
                    <div className="text-xs text-bazaar-muted">
                      {result.monster_burn > 0 ? "Burn" : ""}
                      {result.monster_burn > 0 && result.monster_poison > 0 ? " / " : ""}
                      {result.monster_poison > 0 ? "Poison" : ""}
                    </div>
                  </div>
                )}
                {(result.player_shield > 0 || result.monster_shield > 0) && (
                  <div className="bg-bazaar-bg rounded-lg p-3 text-center border border-white/5">
                    <div className="text-lg font-bold text-cyan-400">
                      {result.player_shield} / {result.monster_shield}
                    </div>
                    <div className="text-xs text-bazaar-muted">Щит (Ты/Враг)</div>
                  </div>
                )}
              </div>

              {/* Battle Log */}
              {result.battle_log && result.battle_log.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-bazaar-warm">
                    Лог боя
                  </h3>
                  <div className="bg-bazaar-bg rounded-lg p-3 max-h-64 overflow-y-auto text-xs space-y-0.5 font-mono border border-white/5">
                    {result.battle_log.map((line, i) => (
                      <div
                        key={i}
                        className={
                          line.includes("PLAYER")
                            ? "text-bazaar-green"
                            : line.includes("ENEMY")
                            ? "text-bazaar-red"
                            : line.includes("Burn") || line.includes("Poison")
                            ? "text-orange-400"
                            : line.includes("Freeze")
                            ? "text-cyan-400"
                            : "text-bazaar-muted"
                        }
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
