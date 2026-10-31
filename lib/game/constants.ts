export const FORT_HALF = 25
export const WALL_H = 9
export const WALL_T = 2
export const GATE_HALF = 4
export const TOWER_R = 3.5
export const TOWER_H = 13

export const BLUE_Z = 120
export const RED_Z = -120

export const CAPTURE_RADIUS = 6
export const CAPTURE_TIME = 18

export const PLAYER_STATS = {
  hp: 100,
  bullets: 30,
  arrows: 30,
  medkits: 3,
  walkSpeed: 7,
  runSpeed: 12,
  blockSpeed: 3.6,
  jumpVelocity: 7.5,
  gravity: 22,
  healAmount: 55,
  healDuration: 2,
}

export const WEAPON_DAMAGE = { sword: 34, gun: 40, bow: 45 }
export const BLOCKING_SWORD_MULTIPLIER = 0.75
export const SHIELD_BLOCK_REDUCTION = 0.8

export const RED_STATS = {
  count: 22,
  hp: 45,
  bullets: 6,
  arrows: 8,
  damageMultiplier: 0.26,
  speed: 4.4,
  swordCooldown: 1.5,
  gunCooldown: 1.7,
  bowCooldown: 2.3,
  gunAccuracy: 0.42,
  aggroRange: 40,
}

export const BLUE_STATS = {
  start: 12,
  reinforce: 2,
  interval: 18,
  max: 24,
  hp: 80,
  bullets: 14,
  arrows: 14,
  damageMultiplier: 0.5,
  speed: 5,
  swordCooldown: 1.0,
  gunCooldown: 1.15,
  bowCooldown: 1.6,
  gunAccuracy: 0.6,
  aggroRange: 42,
}

export const CROSSBOW_STATS = {
  hp: 120,
  damage: 26,
  range: 85,
  cooldown: 3.2,
  boltSpeed: 70,
  coneCos: Math.cos((65 * Math.PI) / 180),
}

export const WORLD_LIMIT_X = 130
export const WORLD_LIMIT_Z = 175

export function isInsideFort(x: number, z: number, fortZ: number) {
  const inner = FORT_HALF - WALL_T / 2
  return Math.abs(x) < inner && Math.abs(z - fortZ) < inner
}
