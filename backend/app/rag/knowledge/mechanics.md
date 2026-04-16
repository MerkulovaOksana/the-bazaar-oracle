# The Bazaar — Game Mechanics Reference

## Core Battle Loop

The Bazaar is an auto-battler where two boards of items fight simultaneously. Each item has a cooldown (CD) and activates automatically when its CD reaches zero. Battles continue until one hero reaches 0 HP.

## Cooldown (CD)

Every active item has a cooldown measured in milliseconds. When the battle starts, all items begin their CD countdown simultaneously. When an item's CD reaches zero, it activates — applying its effects. After activation, the CD resets and starts ticking again.

## Multicast

Multicast determines how many times an item applies its effects per activation:
- multicast=1: standard — one cast per activation
- multicast=N (N>1): the item casts N times with 200ms intervals between each cast
- Each cast takes exactly 200ms (CAST_INTERVAL), regardless of haste/slow
- CD resets 200ms after the first cast and starts ticking in parallel with remaining casts
- The multicast count is "snapshotted" at the moment of activation — changes during the sequence don't affect it

### Multicast timing example (multicast=3, CD=5000ms):
- t=5000: CD ready → CAST #1 (apply effects)
- t=5200: CD RESET + CAST #2 (CD starts ticking from here)
- t=5400: CAST #3 (last cast)
- t=10200: Next CD ready (5200 + 5000)

### Cast Queue
If CD completes while a previous multicast sequence is still ongoing, the new casts are added to the queue. Example: multicast=20, CD=1000ms — CD finishes during the sequence, adding 20 more pending casts.

## Freeze

Freeze prevents items from activating:
- If an item is frozen before its CD completes, activation is delayed until unfreeze
- If an item is already mid-sequence (casting), freeze does NOT interrupt the casts
- CD progress is preserved during freeze — the item activates immediately after unfreeze
- Freeze duration is measured in milliseconds

## Haste and Slow

- Haste: reduces CD tick time, making items activate faster
- Slow: increases CD tick time, making items activate slower
- Neither haste nor slow affects the 200ms cast interval — that's always fixed

## Damage Types

### Direct Damage
Reduces enemy hero HP. Blocked by shields first.

### Shield
Adds a shield buffer to the hero. Incoming damage is absorbed by shield before HP.

### Poison
Stacks on the enemy hero. Deals damage equal to current stacks every 1000ms. Stacks persist for the entire fight.

### Burn
Similar to poison but stacks decay by 1 each tick. Deals damage equal to current stacks every 1000ms.

### Lifesteal
Deals damage to enemy and heals the owner for the damage dealt.

### Heal
Restores hero HP up to maximum.

## Item Tiers

Items come in tiers that determine their power level:
- **Bronze**: Basic items, low stats
- **Silver**: Improved items, moderate stats, may have secondary effects
- **Gold**: Powerful items, high stats, often with synergy effects
- **Diamond**: Very powerful, rare items
- **Legendary**: The strongest items in the game

## Battle Strategy Tips

1. **DPS vs Sustain**: Fast low-CD items deal consistent damage; high-CD items hit harder but less often
2. **Multicast items** are extremely powerful — they multiply all effects
3. **Freeze** is strong against slow high-CD items but weak against fast items
4. **Poison builds** stack over time — better in long fights
5. **Shield timing** matters — shields applied before big hits are most efficient
6. **Board composition** matters more than individual item quality
