"use client";

import { useState, useEffect, useRef } from "react";
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

export default function PredictPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"screenshot" | "manual">("screenshot");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SimResult | null>(null);
  const [parsed, setParsed] = useState<ParsedScreenshot | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Manual mode state
  const [catalog, setCatalog] = useState<any[]>([]);
  const [monsters, setMonsters] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedMonster, setSelectedMonster] = useState("");
  const [playerHp, setPlayerHp] = useState(500);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth");
      return;
    }
    api.getCatalog().then((d) => setCatalog(d.items)).catch(() => {});
    api.getMonsters().then((d) => setMonsters(d.monsters)).catch(() => {});
  }, [isAuthenticated, router]);

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
      setError("Select at least one item and a monster");
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
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const tierColors: Record<string, string> = {
    bronze: "border-amber-700",
    silver: "border-gray-400",
    gold: "border-yellow-400",
    diamond: "border-cyan-400",
    legendary: "border-purple-500",
  };

  return (
    <div className="min-h-screen max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-bazaar-warm">Предсказание боя</h1>

      {/* Mode tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode("screenshot")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            mode === "screenshot"
              ? "bg-bazaar-accent text-bazaar-bg"
              : "bg-bazaar-card text-bazaar-muted border border-bazaar-accent/20"
          }`}
        >
          Загрузить скриншот
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            mode === "manual"
              ? "bg-bazaar-accent text-bazaar-bg"
              : "bg-bazaar-card text-bazaar-muted border border-bazaar-accent/20"
          }`}
        >
          Собрать билд
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input panel */}
        <div>
          {mode === "screenshot" ? (
            <div className="bg-card-gradient rounded-xl border border-bazaar-accent/15 p-6">
              <h2 className="text-lg font-semibold mb-4 text-bazaar-warm">Загрузить скриншот</h2>
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
                    <div className="text-4xl mb-2">&#128247;</div>
                    <p className="text-bazaar-muted">
                      Нажми для загрузки
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
            <div className="bg-card-gradient rounded-xl border border-bazaar-accent/15 p-6">
              <h2 className="text-lg font-semibold mb-4 text-bazaar-warm">Собери свою доску</h2>

              <div className="mb-4">
                <label className="text-sm text-bazaar-muted">
                  Твои HP: {playerHp}
                </label>
                <input
                  type="range"
                  min={100}
                  max={1000}
                  step={50}
                  value={playerHp}
                  onChange={(e) => setPlayerHp(Number(e.target.value))}
                  className="w-full mt-1"
                />
              </div>

              <p className="text-sm text-bazaar-muted mb-2">
                Выбери предметы ({selectedItems.length} выбрано):
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto mb-4">
                {catalog.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={`text-left text-xs p-2 rounded-lg border transition ${
                      selectedItems.includes(item.id)
                        ? "bg-bazaar-accent/20 border-bazaar-accent"
                        : `bg-bazaar-bg border-bazaar-accent/20 ${tierColors[item.tier] || ""}`
                    }`}
                  >
                    <span className="font-medium">{item.name}</span>
                    <span className="text-bazaar-muted block">
                      CD:{item.cooldown_ms}ms MC:{item.multicast}
                    </span>
                  </button>
                ))}
              </div>

              <p className="text-sm text-bazaar-muted mb-2">Выбери монстра:</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {monsters.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMonster(m.id)}
                    className={`text-left text-xs p-2 rounded-lg border transition ${
                      selectedMonster === m.id
                        ? "bg-bazaar-red/20 border-bazaar-red"
                        : "bg-bazaar-bg border-bazaar-accent/20"
                    }`}
                  >
                    <span className="font-medium">{m.name}</span>
                    <span className="text-bazaar-muted block">
                      HP: {m.hp}
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={handleManual}
                disabled={loading || !selectedItems.length || !selectedMonster}
                className="w-full bg-bazaar-accent hover:bg-bazaar-accent/80 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition"
              >
                {loading ? "Симуляция..." : "Предсказать бой"}
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-bazaar-red/10 border border-bazaar-red/30 rounded-lg p-3 text-sm text-bazaar-red">
              {error}
            </div>
          )}
        </div>

        {/* Result panel */}
        <div>
          {loading && (
            <div className="bg-bazaar-card rounded-xl border border-bazaar-accent/20 p-12 text-center">
              <div className="text-4xl mb-4 animate-pulse">&#9876;</div>
              <p className="text-bazaar-muted">
                Симулируем бой...
              </p>
            </div>
          )}

          {result && !loading && (
            <div className="bg-card-gradient rounded-xl border border-bazaar-accent/15 p-6">
              {/* Win/Lose banner */}
              <div
                className={`text-center py-4 rounded-xl mb-6 ${
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
              <div className="space-y-4 mb-6">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Игрок</span>
                    <span>
                      {result.player_hp_remaining} / {result.player_hp_max}
                    </span>
                  </div>
                  <div className="h-4 bg-bazaar-bg rounded-full overflow-hidden">
                    <div
                      className="h-full bg-bazaar-green rounded-full transition-all duration-1000"
                      style={{
                        width: `${
                          (result.player_hp_remaining / result.player_hp_max) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{result.monster_name}</span>
                    <span>
                      {result.monster_hp_remaining} / {result.monster_hp_max}
                    </span>
                  </div>
                  <div className="h-4 bg-bazaar-bg rounded-full overflow-hidden">
                    <div
                      className="h-full bg-bazaar-red rounded-full transition-all duration-1000"
                      style={{
                        width: `${
                          (result.monster_hp_remaining /
                            result.monster_hp_max) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="bg-bazaar-bg rounded-lg p-3 text-center">
                  <div className="text-lg font-bold">{result.total_casts}</div>
                  <div className="text-xs text-bazaar-muted">Всего кастов</div>
                </div>
                <div className="bg-bazaar-bg rounded-lg p-3 text-center">
                  <div className="text-lg font-bold">
                    {(result.battle_time_ms / 1000).toFixed(1)}s
                  </div>
                  <div className="text-xs text-bazaar-muted">Время боя</div>
                </div>
                {(result.monster_burn > 0 || result.monster_poison > 0) && (
                  <div className="bg-bazaar-bg rounded-lg p-3 text-center">
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
                  <div className="bg-bazaar-bg rounded-lg p-3 text-center">
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
                  <h3 className="text-sm font-semibold mb-2 text-bazaar-warm">Лог боя</h3>
                  <div className="bg-bazaar-bg rounded-lg p-3 max-h-64 overflow-y-auto text-xs space-y-0.5 font-mono">
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
