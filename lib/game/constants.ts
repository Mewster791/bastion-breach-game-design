export const FORT_HALF = 25
export const WALL_H = 9
export const WALL_T = 2
export const GATE_HALF = 4
export const TOWER_R = 3.5
export const TOWER_H = 13

export const BLUE_Z = 155
export const RED_Z = -155

export const CITY_Z = 0
export const CITY_HALF_Z = 47
export const CITY_HALF_X = 44
export const CITY_CAPTURE_RADIUS = 6.5
export const CITY_CAPTURE_TIME = 16

export const CAPTURE_RADIUS = 6
export const CAPTURE_TIME = 26

export const PLAYER_STATS = {
  hp: 120,
  bullets: 36,
  arrows: 32,
  medkits: 3,
  walkSpeed: 7,
  runSpeed: 11.8,
  blockSpeed: 3.6,
  jumpVelocity: 7.5,
  gravity: 22,
  healAmount: 65,
  healDuration: 2,
}

export const WEAPON_DAMAGE = { sword: 34, gun: 40, bow: 45 }
export const BLOCKING_SWORD_MULTIPLIER = 0.75
export const SHIELD_BLOCK_REDUCTION = 0.8

export const RED_STATS = {
  count: 34,
  hp: 62,
  bullets: 10,
  arrows: 12,
  damageMultiplier: 0.27,
  speed: 4.5,
  swordCooldown: 1.45,
  gunCooldown: 1.65,
  bowCooldown: 2.2,
  gunAccuracy: 0.44,
  aggroRange: 44,
  reinforce: 2,
  reinforceInterval: 26,
  reinforceCap: 24,
}

export const BLUE_STATS = {
  start: 14,
  reinforce: 2,
  interval: 18,
  max: 24,
  hp: 85,
  bullets: 16,
  arrows: 16,
  damageMultiplier: 0.5,
  speed: 5,
  swordCooldown: 1.0,
  gunCooldown: 1.15,
  bowCooldown: 1.6,
  gunAccuracy: 0.6,
  aggroRange: 44,
}

export const CROSSBOW_STATS = {
  hp: 145,
  damage: 26,
  range: 92,
  cooldown: 3.1,
  boltSpeed: 72,
  coneCos: Math.cos((65 * Math.PI) / 180),
}

export const WORLD_LIMIT_X = 145
export const WORLD_LIMIT_Z = 210

export function isInsideFort(x: number, z: number, fortZ: number) {
  const inner = FORT_HALF - WALL_T / 2
  return Math.abs(x) < inner && Math.abs(z - fortZ) < inner
}
