"""
The Bazaar — Battle Simulator
==============================
Версия: 0.1 (сырая, механики в разработке)

Реализовано:
  - Cooldown с Haste/Slow пулами (per-item)
  - Freeze (таргетинг, суммирование, Haste/Slow тратятся во время заморозки)
  - Charge (мгновенный CD прогресс, без переноса остатка)
  - Activate (принудительная активация без изменения CD)
  - Multicast (очередь кастов, snapshot, параллельный CD)
  - Урон, крит (x2, честный RNG)
  - Щит (один пул, 1:1, после урона в батче)
  - Burn (пул, затухание 3%/тик, 2 тика/сек, x0.5 против щита)
  - Poison (пул, бессрочно, 1 тик/сек, сквозь щит)
  - Батч одновременных событий (heal→damage→shield, триггеры после)

Не реализовано: Ammo/Reload, Regen, Rage/Enrage, Destroy, Flying, Heat, Value, Adjacent, Immune

Предпосылки:
  - Тай-брейк игрок vs враг — неизвестен
  - Триггеры не влияют на другие предметы внутри батча
  - Burn/Poison таймер от момента наложения
  - Округление ceil для Burn/Poison
  - Heal идёт до Damage в батче
"""

from __future__ import annotations
import heapq
import math
import random
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Callable, Optional

Ms = int
CAST_INTERVAL_MS: Ms = 200
BURN_TICK_MS:     Ms = 500
POISON_TICK_MS:   Ms = 1_000
BURN_DECAY:       float = 0.97
MAX_BATTLE_MS:    Ms = 120_000


# ===========================================================================
# Enums
# ===========================================================================

class Side(Enum):
    PLAYER = 0
    ENEMY  = 1

    def opponent(self) -> Side:
        return Side.ENEMY if self == Side.PLAYER else Side.PLAYER


class TriggerType(Enum):
    ON_ACTIVATE       = auto()
    ON_HIT            = auto()
    ON_CRIT           = auto()
    ON_HEAL           = auto()
    WHEN_FRIEND_FIRES = auto()
    WHEN_ENEMY_FIRES  = auto()
    START_OF_FIGHT    = auto()
    ON_BURN_APPLIED   = auto()
    ON_FREEZE_APPLIED = auto()
    ON_POISON_APPLIED = auto()
    ON_PLAYER_DAMAGED = auto()


# ===========================================================================
# CooldownState
# ===========================================================================

def _real_ms_until_activation(remaining_cd: Ms, haste: Ms, slow: Ms) -> Ms:
    r = remaining_cd
    if r <= 0:
        return 0
    real = 0

    if haste > 0 and slow > 0:
        overlap = min(haste, slow)
        if overlap >= r:
            return real + r
        r -= overlap
        real += overlap
        haste -= overlap
        slow  -= overlap

    if haste > 0:
        real_needed = (r + 1) // 2
        used = min(haste, real_needed)
        gained = used * 2
        if gained >= r:
            return real + (r + 1) // 2
        r    -= gained
        real += used

    elif slow > 0:
        real_needed = r * 2
        used = min(slow, real_needed)
        gained = used // 2
        if gained >= r:
            return real + r * 2
        r    -= gained
        real += used

    return real + r


@dataclass
class CooldownState:
    cooldown_ms:         Ms
    cd_progress_ms:      Ms  = 0
    progress_updated_at: Ms  = 0
    haste_pool_ms:       Ms  = 0
    slow_pool_ms:        Ms  = 0
    event_gen:           int = 0

    @property
    def remaining_cd_ms(self) -> Ms:
        return max(0, self.cooldown_ms - self.cd_progress_ms)

    def flush_progress(self, now: Ms):
        elapsed = now - self.progress_updated_at
        if elapsed <= 0:
            return
        rem = elapsed

        if self.haste_pool_ms > 0 and self.slow_pool_ms > 0:
            overlap = min(self.haste_pool_ms, self.slow_pool_ms, rem)
            self.cd_progress_ms += overlap
            self.haste_pool_ms  -= overlap
            self.slow_pool_ms   -= overlap
            rem -= overlap

        if rem > 0 and self.haste_pool_ms > 0:
            used = min(self.haste_pool_ms, rem)
            self.cd_progress_ms += used * 2
            self.haste_pool_ms  -= used
            rem -= used
        elif rem > 0 and self.slow_pool_ms > 0:
            used = min(self.slow_pool_ms, rem)
            self.cd_progress_ms += used // 2
            self.slow_pool_ms   -= used
            rem -= used

        if rem > 0:
            self.cd_progress_ms += rem

        self.cd_progress_ms = min(self.cd_progress_ms, self.cooldown_ms)
        self.progress_updated_at = now

    def add_haste(self, ms: Ms, now: Ms):
        self.flush_progress(now)
        self.haste_pool_ms += ms
        self.event_gen += 1

    def add_slow(self, ms: Ms, now: Ms):
        self.flush_progress(now)
        self.slow_pool_ms += ms
        self.event_gen += 1

    def apply_charge(self, ms: Ms, now: Ms) -> bool:
        self.flush_progress(now)
        self.cd_progress_ms = min(self.cd_progress_ms + ms, self.cooldown_ms)
        self.event_gen += 1
        return self.cd_progress_ms >= self.cooldown_ms

    def on_freeze_applied(self, now: Ms):
        self.flush_progress(now)
        self.event_gen += 1

    def on_unfreeze(self, frozen_duration_ms: Ms):
        rem = frozen_duration_ms
        if self.haste_pool_ms > 0 and self.slow_pool_ms > 0:
            overlap = min(self.haste_pool_ms, self.slow_pool_ms, rem)
            self.haste_pool_ms -= overlap
            self.slow_pool_ms  -= overlap
            rem -= overlap
        if rem > 0 and self.haste_pool_ms > 0:
            self.haste_pool_ms -= min(self.haste_pool_ms, rem)
        elif rem > 0 and self.slow_pool_ms > 0:
            self.slow_pool_ms -= min(self.slow_pool_ms, rem)
        self.progress_updated_at += frozen_duration_ms
        self.event_gen += 1

    def on_activated(self, now: Ms):
        self.flush_progress(now)
        self.cd_progress_ms = 0
        self.progress_updated_at = now
        self.event_gen += 1

    def next_activation_real_ms(self, now: Ms) -> Ms:
        self.flush_progress(now)
        delta = _real_ms_until_activation(
            self.remaining_cd_ms, self.haste_pool_ms, self.slow_pool_ms
        )
        return now + delta


# ===========================================================================
# BurnState / PoisonState
# ===========================================================================

@dataclass
class BurnState:
    pool:         float = 0.0
    next_tick_at: Ms    = -1

    def is_active(self) -> bool:
        return self.pool > 0.0 and self.next_tick_at >= 0

    def apply(self, value: float, now: Ms):
        was_empty = self.pool <= 0.0
        self.pool += value
        if was_empty:
            self.next_tick_at = now + BURN_TICK_MS

    def tick(self, shield: float) -> tuple[float, float]:
        if self.pool <= 0.0:
            self.next_tick_at = -1
            return 0.0, 0.0
        shield_consumed = min(shield, math.ceil(self.pool / 2))
        hp_damage = max(0.0, self.pool - shield_consumed * 2)
        self.pool *= BURN_DECAY
        if self.pool < 0.5:
            self.pool = 0.0
            self.next_tick_at = -1
        else:
            self.next_tick_at += BURN_TICK_MS
        return hp_damage, shield_consumed


@dataclass
class PoisonState:
    stacks:       float = 0.0
    next_tick_at: Ms    = -1

    def is_active(self) -> bool:
        return self.stacks > 0.0 and self.next_tick_at >= 0

    def apply(self, stacks: float, now: Ms):
        was_empty = self.stacks <= 0.0
        self.stacks += stacks
        if was_empty:
            self.next_tick_at = now + POISON_TICK_MS

    def tick(self) -> float:
        if self.stacks <= 0.0:
            self.next_tick_at = -1
            return 0.0
        dmg = float(math.ceil(self.stacks))
        self.next_tick_at += POISON_TICK_MS
        return dmg


# ===========================================================================
# Item
# ===========================================================================

@dataclass
class Item:
    id:           str
    name:         str
    board_pos:    int
    cooldown_ms:  Ms

    damage:          float = 0.0
    healing:         float = 0.0
    shield_amount:   float = 0.0
    crit_chance:     float = 0.0
    crit_multiplier: float = 2.0
    multicast:       int   = 1

    applies_burn:   float = 0.0
    applies_freeze: Ms    = 0
    applies_poison: float = 0.0
    applies_haste:  Ms    = 0
    applies_slow:   Ms    = 0
    applies_charge: Ms    = 0

    cooldown:        CooldownState = field(init=False)
    frozen_until_ms: Ms            = field(default=0, init=False)
    pending_casts:   int           = field(default=0, init=False)
    is_casting:      bool          = field(default=False, init=False)
    active:          bool          = field(default=True, init=False)

    _triggers: dict = field(default_factory=dict, init=False, repr=False)

    def __post_init__(self):
        self.cooldown = CooldownState(cooldown_ms=self.cooldown_ms)
        if self.cooldown_ms == 0:
            self.multicast = 0

    def has_cd(self) -> bool:
        return self.cooldown_ms > 0

    def is_frozen(self, now: Ms) -> bool:
        return self.frozen_until_ms > now

    def register_trigger(self, trigger: TriggerType,
                         fn: Callable[[Item, BattleState, dict], None]):
        self._triggers.setdefault(trigger, []).append(fn)

    def fire_trigger(self, trigger: TriggerType, state: BattleState, ctx: dict):
        for fn in self._triggers.get(trigger, []):
            fn(self, state, ctx)


# ===========================================================================
# PlayerState
# ===========================================================================

@dataclass
class PlayerState:
    side:    Side
    name:    str
    max_hp:  float
    hp:      float       = field(init=False)
    items:   list[Item]  = field(default_factory=list)
    shield:  float       = 0.0
    burn:    BurnState   = field(default_factory=BurnState)
    poison:  PoisonState = field(default_factory=PoisonState)

    def __post_init__(self):
        self.hp = self.max_hp

    def is_alive(self) -> bool:
        return self.hp > 0

    def take_damage(self, amount: float) -> float:
        absorbed = min(self.shield, amount)
        self.shield -= absorbed
        actual = amount - absorbed
        self.hp -= actual
        return actual

    def take_poison_damage(self, amount: float) -> float:
        self.hp -= amount
        return amount

    def heal(self, amount: float):
        self.hp = min(self.max_hp, self.hp + amount)

    def add_shield(self, amount: float):
        self.shield += amount

    def items_with_cd(self) -> list[Item]:
        return [i for i in self.items if i.has_cd() and i.active]

    def unfrozen_items_with_cd(self, now: Ms) -> list[Item]:
        return [i for i in self.items_with_cd() if not i.is_frozen(now)]


# ===========================================================================
# Events
# ===========================================================================

@dataclass(order=True)
class Event:
    time:      Ms
    board_pos: int
    kind:      str  = field(compare=False)
    side:      Side = field(compare=False)
    item_id:   str  = field(compare=False, default="")
    gen:       int  = field(compare=False, default=0)
    payload:   dict = field(compare=False, default_factory=dict)


# ===========================================================================
# BattleState
# ===========================================================================

@dataclass
class BattleState:
    player: PlayerState
    enemy:  PlayerState
    now:    Ms          = 0
    log:    list[str]   = field(default_factory=list)

    def side(self, s: Side) -> PlayerState:
        return self.player if s == Side.PLAYER else self.enemy

    def record(self, msg: str):
        self.log.append(f"[{self.now:>7}ms] {msg}")

    def winner(self) -> Optional[Side]:
        p = self.player.is_alive()
        e = self.enemy.is_alive()
        if not p and not e:
            return None
        if not e:
            return Side.PLAYER
        if not p:
            return Side.ENEMY
        return ...


# ===========================================================================
# BattleSimulator
# ===========================================================================

class BattleSimulator:

    def __init__(self, state: BattleState):
        self.state = state
        self._heap: list[Event] = []

    def run(self) -> Optional[Side]:
        self._init()
        while self._heap:
            batch = self._pop_batch()
            if not batch:
                break
            t = batch[0].time
            if t > MAX_BATTLE_MS:
                self.state.record("Timeout")
                return None
            self.state.now = t
            self._process_batch(batch)
            result = self.state.winner()
            if result is not ...:
                return result
        return self.state.winner() if self.state.winner() is not ... else None

    # -----------------------------------------------------------------------
    # Init
    # -----------------------------------------------------------------------

    def _init(self):
        self.state.record("Battle started")
        for s in (Side.PLAYER, Side.ENEMY):
            ps = self.state.side(s)
            for item in ps.items:
                item.fire_trigger(TriggerType.START_OF_FIGHT,
                                  self.state, {"side": s})
                if item.has_cd():
                    self._schedule_cd_ready(item, s, 0)

    # -----------------------------------------------------------------------
    # Batch processing
    # -----------------------------------------------------------------------

    def _pop_batch(self) -> list[Event]:
        if not self._heap:
            return []
        batch = [heapq.heappop(self._heap)]
        t = batch[0].time
        while self._heap and self._heap[0].time == t:
            batch.append(heapq.heappop(self._heap))
        return batch

    def _process_batch(self, batch: list[Event]):
        pending: list[dict] = []

        for ev in batch:
            if ev.kind in ("CD_READY", "CD_RESET", "CAST"):
                item = self._find_item(ev.side, ev.item_id)
                if item is None:
                    continue
                if ev.kind in ("CD_READY", "CD_RESET") and ev.gen != item.cooldown.event_gen:
                    continue

            if ev.kind == "CD_READY":
                self._on_cd_ready(ev, pending)
            elif ev.kind == "CD_RESET":
                self._on_cd_reset(ev)
            elif ev.kind == "CAST":
                self._on_cast(ev, pending)
            elif ev.kind == "UNFREEZE":
                self._on_unfreeze(ev)
            elif ev.kind == "BURN_TICK":
                self._on_burn_tick(ev, pending)
            elif ev.kind == "POISON_TICK":
                self._on_poison_tick(ev, pending)

        for kind in ("heal", "damage", "poison_damage", "shield"):
            for fx in pending:
                if fx["kind"] == kind:
                    self._apply_effect(fx)

        for ev in batch:
            if ev.kind == "CAST":
                item = self._find_item(ev.side, ev.item_id)
                if item:
                    self._fire_cast_triggers(item, ev.side)

    # -----------------------------------------------------------------------
    # Event handlers
    # -----------------------------------------------------------------------

    def _on_cd_ready(self, ev: Event, pending: list):
        item = self._find_item(ev.side, ev.item_id)
        if not item or not item.active:
            return
        if item.is_frozen(ev.time):
            self._push(Event(
                time=item.frozen_until_ms,
                board_pos=item.board_pos,
                kind="CD_READY",
                side=ev.side,
                item_id=item.id,
                gen=item.cooldown.event_gen,
            ))
            return
        item.pending_casts += item.multicast
        self._schedule_cd_reset(item, ev.side, ev.time + CAST_INTERVAL_MS)
        if not item.is_casting:
            item.is_casting = True
            self._schedule_cast(item, ev.side, ev.time, cast_num=1)

    def _on_cd_reset(self, ev: Event):
        item = self._find_item(ev.side, ev.item_id)
        if not item:
            return
        item.cooldown.on_activated(ev.time)
        self.state.record(f"  CD reset: {item.name} ({ev.side.name})")
        self._schedule_cd_ready(item, ev.side, ev.time)

    def _on_cast(self, ev: Event, pending: list):
        item = self._find_item(ev.side, ev.item_id)
        if not item or item.pending_casts <= 0:
            if item:
                item.is_casting = False
            return

        cast_num = ev.payload.get("cast_num", 1)
        self.state.record(f"CAST {item.name} ({ev.side.name}) #{cast_num}")
        item.pending_casts -= 1

        opponent_ps = self.state.side(ev.side.opponent())
        own_ps      = self.state.side(ev.side)

        if item.damage > 0:
            is_crit = random.random() < item.crit_chance
            dmg = item.damage * (item.crit_multiplier if is_crit else 1.0)
            pending.append({
                "kind": "damage",
                "target": opponent_ps,
                "amount": dmg,
                "is_crit": is_crit,
                "source": item.name,
                "side": ev.side,
            })

        if item.healing > 0:
            pending.append({
                "kind": "heal",
                "target": own_ps,
                "amount": item.healing,
                "source": item.name,
            })

        if item.shield_amount > 0:
            pending.append({
                "kind": "shield",
                "target": own_ps,
                "amount": item.shield_amount,
                "source": item.name,
            })

        if item.applies_burn > 0:
            opponent_ps.burn.apply(item.applies_burn, ev.time)
            self.state.record(f"  Burn +{item.applies_burn:.1f} on {opponent_ps.name}")
            if opponent_ps.burn.is_active():
                self._schedule_burn_tick(ev.side.opponent(),
                                         opponent_ps.burn.next_tick_at)

        if item.applies_freeze > 0:
            self._apply_freeze(item, ev.side, ev.time)

        if item.applies_poison > 0:
            was_active = opponent_ps.poison.is_active()
            opponent_ps.poison.apply(item.applies_poison, ev.time)
            self.state.record(f"  Poison +{item.applies_poison:.1f} on {opponent_ps.name}")
            if not was_active and opponent_ps.poison.is_active():
                self._schedule_poison_tick(ev.side.opponent(),
                                           opponent_ps.poison.next_tick_at)

        if item.applies_haste > 0:
            targets = [i for i in own_ps.items if i.has_cd() and i.id != item.id]
            if targets:
                t = random.choice(targets)
                t.cooldown.add_haste(item.applies_haste, ev.time)
                self._reschedule_item(t, ev.side, ev.time)
                self.state.record(f"  Haste {item.applies_haste}ms on {t.name}")

        if item.applies_slow > 0:
            targets = [i for i in opponent_ps.items if i.has_cd()]
            if targets:
                t = random.choice(targets)
                t.cooldown.add_slow(item.applies_slow, ev.time)
                self._reschedule_item(t, ev.side.opponent(), ev.time)
                self.state.record(f"  Slow {item.applies_slow}ms on {t.name}")

        if item.pending_casts > 0:
            self._schedule_cast(item, ev.side, ev.time + CAST_INTERVAL_MS,
                                cast_num=cast_num + 1)
        else:
            item.is_casting = False

    def _on_burn_tick(self, ev: Event, pending: list):
        ps = self.state.side(ev.side)
        if not ps.burn.is_active():
            return
        hp_dmg, sh_consumed = ps.burn.tick(ps.shield)
        if sh_consumed > 0:
            ps.shield -= sh_consumed
            self.state.record(f"  Burn tick: {sh_consumed:.1f} to shield ({ps.name})")
        if hp_dmg > 0:
            pending.append({
                "kind": "damage",
                "target": ps,
                "amount": hp_dmg,
                "is_crit": False,
                "source": "Burn",
                "side": ev.side,
                "bypass_shield": True,
            })
        if ps.burn.is_active():
            self._schedule_burn_tick(ev.side, ps.burn.next_tick_at)

    def _on_poison_tick(self, ev: Event, pending: list):
        ps = self.state.side(ev.side)
        if not ps.poison.is_active():
            return
        dmg = ps.poison.tick()
        if dmg > 0:
            pending.append({
                "kind": "poison_damage",
                "target": ps,
                "amount": dmg,
                "source": "Poison",
            })
            self.state.record(f"  Poison tick: {dmg:.1f} HP damage on {ps.name}")
        if ps.poison.is_active():
            self._schedule_poison_tick(ev.side, ps.poison.next_tick_at)

    def _on_unfreeze(self, ev: Event):
        item = self._find_item(ev.side, ev.item_id)
        if not item:
            return
        frozen_duration = ev.payload.get("frozen_duration", 0)
        item.cooldown.on_unfreeze(frozen_duration)
        self.state.record(f"  Unfreeze: {item.name} ({ev.side.name})")
        self._reschedule_item(item, ev.side, ev.time)

    # -----------------------------------------------------------------------
    # Apply effects
    # -----------------------------------------------------------------------

    def _apply_effect(self, fx: dict):
        kind   = fx["kind"]
        target = fx["target"]
        amount = fx["amount"]

        if kind == "heal":
            target.heal(amount)
            self.state.record(f"  Heal {fx['source']}: +{amount:.1f} HP ({target.name} HP: {target.hp:.1f})")

        elif kind == "damage":
            if fx.get("bypass_shield"):
                target.hp -= amount
                actual = amount
            else:
                actual = target.take_damage(amount)
            tag = "CRIT" if fx.get("is_crit") else "DMG"
            self.state.record(
                f"  {tag} {fx['source']}: {actual:.1f} ({target.name} HP: {target.hp:.1f}, shield: {target.shield:.1f})"
            )

        elif kind == "poison_damage":
            target.take_poison_damage(amount)

        elif kind == "shield":
            target.add_shield(amount)
            self.state.record(f"  Shield {fx['source']}: +{amount:.1f} ({target.name} shield: {target.shield:.1f})")

    # -----------------------------------------------------------------------
    # Triggers
    # -----------------------------------------------------------------------

    def _fire_cast_triggers(self, item: Item, side: Side):
        state = self.state
        ctx = {"side": side, "item": item}
        item.fire_trigger(TriggerType.ON_ACTIVATE, state, ctx)
        if item.damage > 0:
            item.fire_trigger(TriggerType.ON_HIT, state, ctx)
        if item.healing > 0:
            item.fire_trigger(TriggerType.ON_HEAL, state, ctx)
        ps = state.side(side)
        for friend in ps.items:
            if friend.id != item.id:
                friend.fire_trigger(TriggerType.WHEN_FRIEND_FIRES, state,
                                    {**ctx, "activator": item})
        opp_ps = state.side(side.opponent())
        for enemy_item in opp_ps.items:
            enemy_item.fire_trigger(TriggerType.WHEN_ENEMY_FIRES, state,
                                    {**ctx, "activator": item})

    # -----------------------------------------------------------------------
    # Freeze targeting
    # -----------------------------------------------------------------------

    def _apply_freeze(self, source_item: Item, source_side: Side, now: Ms):
        opponent_ps = self.state.side(source_side.opponent())
        duration = source_item.applies_freeze

        with_cd    = list(opponent_ps.items_with_cd())
        unfrozen   = [i for i in with_cd if not i.is_frozen(now)]
        if not unfrozen:
            all_items  = [i for i in opponent_ps.items if i.active]
            unfrozen   = [i for i in all_items if not i.is_frozen(now)]
        if not unfrozen:
            return

        target = random.choice(unfrozen)
        freeze_start = max(target.frozen_until_ms, now)
        target.frozen_until_ms = freeze_start + duration
        frozen_duration = target.frozen_until_ms - now

        target.cooldown.on_freeze_applied(now)
        self.state.record(
            f"  Freeze: {source_item.name} -> {target.name} ({source_side.opponent().name})"
            f" for {duration}ms (until {target.frozen_until_ms}ms)"
        )
        target.fire_trigger(TriggerType.ON_FREEZE_APPLIED, self.state,
                            {"side": source_side.opponent(), "item": target})
        self._push(Event(
            time=target.frozen_until_ms,
            board_pos=target.board_pos,
            kind="UNFREEZE",
            side=source_side.opponent(),
            item_id=target.id,
            payload={"frozen_duration": frozen_duration},
        ))

    # -----------------------------------------------------------------------
    # Scheduling
    # -----------------------------------------------------------------------

    def _schedule_cd_ready(self, item: Item, side: Side, now: Ms):
        at = item.cooldown.next_activation_real_ms(now)
        self._push(Event(
            time=at, board_pos=item.board_pos, kind="CD_READY",
            side=side, item_id=item.id, gen=item.cooldown.event_gen,
        ))

    def _schedule_cd_reset(self, item: Item, side: Side, at: Ms):
        self._push(Event(
            time=at, board_pos=item.board_pos, kind="CD_RESET",
            side=side, item_id=item.id, gen=item.cooldown.event_gen,
        ))

    def _schedule_cast(self, item: Item, side: Side, at: Ms, cast_num: int):
        self._push(Event(
            time=at, board_pos=item.board_pos, kind="CAST",
            side=side, item_id=item.id, payload={"cast_num": cast_num},
        ))

    def _schedule_burn_tick(self, side: Side, at: Ms):
        self._push(Event(time=at, board_pos=998, kind="BURN_TICK", side=side))

    def _schedule_poison_tick(self, side: Side, at: Ms):
        self._push(Event(time=at, board_pos=999, kind="POISON_TICK", side=side))

    def _reschedule_item(self, item: Item, side: Side, now: Ms):
        item.cooldown.event_gen += 1
        self._schedule_cd_ready(item, side, now)

    def _push(self, ev: Event):
        heapq.heappush(self._heap, ev)

    def _find_item(self, side: Side, item_id: str) -> Optional[Item]:
        ps = self.state.side(side)
        return next((i for i in ps.items if i.id == item_id), None)
