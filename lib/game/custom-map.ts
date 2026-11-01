import { BLUE_Z, FORT_HALF, RED_Z, TOWER_H, WALL_H } from './constants'
import { MAP_IDS, type MapId } from './world'

export const GRID_COLS = 15
export const GRID_ROWS = 25
export const CELL_SIZE_X = 8
export const CELL_SIZE_Z = 15
export const REQUIRED_CROSSBOWS = 8

export type CellKind = 'empty' | 'wall' | 'blue_spawn' | 'town_square' | 'crossbow'

export interface GridCoord {
  col: number
  row: number
}

export interface CrossbowPlacement extends GridCoord {
  dirX: number
  dirZ: number
}

export interface CustomMapLayout {
  version: 1
  name: string
  cityName: string
  biome: MapId
  gridCols: number
  gridRows: number
  blueSpawn: GridCoord
  townSquare: GridCoord
  crossbows: CrossbowPlacement[]
  walls: GridCoord[]
}

const STORAGE_KEY = 'triterra_siege_custom_map_v1'

export function gridToWorld(col: number, row: number): { x: number; z: number } {
  return {
    x: (col - Math.floor(GRID_COLS / 2)) * CELL_SIZE_X,
    z: (row - Math.floor(GRID_ROWS / 2)) * CELL_SIZE_Z,
  }
}

/**
 * Computes the outward-facing unit direction vector away from the Red Fort center (0, RED_Z).
 * Ensures crossbows mounted on or near fort walls strictly face outward and never inward.
 */
export function computeOutwardCrossbowDir(col: number, row: number): { dirX: number; dirZ: number } {
  // Exact canonical angles for Red Fort wall & corner tower cells
  if (row === 3 && col === 4) return normalize2D(-0.65, 1)
  if (row === 3 && col === 10) return normalize2D(0.65, 1)
  if (row === 3 && col > 4 && col < 10) {
    const offset = (col - 7) * 0.08
    return normalize2D(offset, 1)
  }
  if (row === 0 && col === 4) return normalize2D(-0.65, -1)
  if (row === 0 && col === 10) return normalize2D(0.65, -1)
  if (row === 0 && col > 4 && col < 10) return normalize2D((col - 7) * 0.08, -1)
  if (col === 4 && row > 0 && row < 3) return { dirX: -1, dirZ: 0 }
  if (col === 10 && row > 0 && row < 3) return { dirX: 1, dirZ: 0 }

  const { x, z } = gridToWorld(col, row)
  const dx = x - 0
  const dz = z - RED_Z
  if (Math.hypot(dx, dz) < 1e-3) return { dirX: 0, dirZ: 1 }
  return normalize2D(dx, dz)
}

function normalize2D(dx: number, dz: number): { dirX: number; dirZ: number } {
  const len = Math.hypot(dx, dz) || 1
  return {
    dirX: Number((dx / len).toFixed(4)),
    dirZ: Number((dz / len).toFixed(4)),
  }
}

/**
 * Resolves exact 3D mount coordinates [x, y, z, dirX, dirZ] for a crossbow cell.
 * Snaps Red Fort wall/tower cells directly onto the battlements and elevates custom rampart cells.
 */
export function crossbowCellToWorldDef(c: CrossbowPlacement): [number, number, number, number, number] {
  const frontWallZ = RED_Z + FORT_HALF
  const backWallZ = RED_Z - FORT_HALF
  const { x: rawX, z: rawZ } = gridToWorld(c.col, c.row)

  let x = rawX
  let z = rawZ
  let y = 4.6

  const onWestWall = c.col === 4 && c.row >= 0 && c.row <= 3
  const onEastWall = c.col === 10 && c.row >= 0 && c.row <= 3
  const onFrontWall = c.row === 3 && c.col >= 4 && c.col <= 10
  const onBackWall = c.row === 0 && c.col >= 4 && c.col <= 10

  if (onWestWall) x = -FORT_HALF
  if (onEastWall) x = FORT_HALF
  if (onFrontWall) z = frontWallZ
  if (onBackWall) z = backWallZ

  const isCornerTower = (onWestWall || onEastWall) && (onFrontWall || onBackWall)
  if (isCornerTower) {
    y = TOWER_H + 0.65
  } else if (onWestWall || onEastWall || onFrontWall || onBackWall) {
    y = WALL_H + 0.1
    if (!onFrontWall && !onBackWall) {
      z = RED_Z + (c.row === 2 ? 12 : -12)
    }
  }

  // Re-verify outward orientation relative to Red Fort center (0, RED_Z)
  const outDx = x - 0
  const outDz = z - RED_Z
  const dot = c.dirX * outDx + c.dirZ * outDz
  const finalDir = dot >= -0.01 ? { dirX: c.dirX, dirZ: c.dirZ } : computeOutwardCrossbowDir(c.col, c.row)

  return [x, y, z, finalDir.dirX, finalDir.dirZ]
}

export function isInsideRedCourtyardInterior(col: number, row: number): boolean {
  return col >= 5 && col <= 9 && row >= 1 && row <= 2
}

export function isValidCrossbowCell(col: number, row: number): { ok: boolean; reason?: string } {
  if (row > 8) {
    return { ok: false, reason: 'Crossbows belong to the Red Fort defense zone (top rows 1–9).' }
  }
  if (isInsideRedCourtyardInterior(col, row)) {
    return { ok: false, reason: 'Crossbows must sit on or outside the Red Fort walls so they face outward.' }
  }
  if (col === 7 && row === 3) {
    return { ok: false, reason: 'Keep the main Red Fort gatehouse arch clear for siege entry.' }
  }
  return { ok: true }
}

export function isValidBlueSpawnCell(col: number, row: number): { ok: boolean; reason?: string } {
  if (row < 19 || row > 23) {
    return { ok: false, reason: 'Blue Ring Spawn must be placed in the southern Blue spawn zone (rows 20–24).' }
  }
  if (col < 3 || col > 11) {
    return { ok: false, reason: 'Place the Blue Ring Spawn within the central southern staging area (cols 4–12).' }
  }
  if ((col === 4 || col === 10) && row >= 21 && row <= 24) {
    return { ok: false, reason: 'Cannot place Blue Ring Spawn directly on top of a Blue Fort side wall.' }
  }
  if (col === 7 && row === 21) {
    return { ok: false, reason: 'Keep the Blue Fort front gate clear.' }
  }
  return { ok: true }
}

/**
 * Enforces that the Central City Town Square Circle sits directly between
 * the Red spawn area (col 7, row 2) and the Blue Ring Spawn (blueSpawn.col, blueSpawn.row).
 */
export function getValidTownSquareBounds(blueSpawn: GridCoord) {
  const redAnchorCol = 7
  const redAnchorRow = 2
  const midCol = Math.round((redAnchorCol + blueSpawn.col) / 2)
  const midRow = Math.round((redAnchorRow + blueSpawn.row) / 2)
  return {
    minCol: Math.max(4, midCol - 1),
    maxCol: Math.min(10, midCol + 1),
    minRow: Math.max(9, midRow - 2),
    maxRow: Math.min(15, midRow + 2),
    idealCol: midCol,
    idealRow: midRow,
  }
}

export function isTownSquareBetweenSpawns(townSquare: GridCoord, blueSpawn: GridCoord): { ok: boolean; reason?: string } {
  const bounds = getValidTownSquareBounds(blueSpawn)
  if (
    townSquare.col < bounds.minCol ||
    townSquare.col > bounds.maxCol ||
    townSquare.row < bounds.minRow ||
    townSquare.row > bounds.maxRow
  ) {
    return {
      ok: false,
      reason: `Town Square Circle must sit directly between the Red and Blue spawn areas (cols ${bounds.minCol + 1}–${bounds.maxCol + 1}, rows ${bounds.minRow + 1}–${bounds.maxRow + 1}).`,
    }
  }
  return { ok: true }
}

export function isValidWallCell(col: number, row: number, layout: CustomMapLayout): { ok: boolean; reason?: string } {
  if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) {
    return { ok: false, reason: 'Cell is outside the battlefield grid.' }
  }
  // Keep fort courtyards, gates, and spawn points passable
  if (col >= 4 && col <= 10 && row >= 0 && row <= 3) {
    return { ok: false, reason: 'Cannot overwrite Red Fort perimeter or courtyard with custom wall blocks.' }
  }
  if (col >= 4 && col <= 10 && row >= 21 && row <= 24) {
    return { ok: false, reason: 'Cannot overwrite Blue Fort perimeter or courtyard with custom wall blocks.' }
  }
  if (col === 7 && (row === 4 || row === 20)) {
    return { ok: false, reason: 'Keep Fort gate approaches clear so armies can march out.' }
  }
  if (layout.blueSpawn.col === col && layout.blueSpawn.row === row) {
    return { ok: false, reason: 'Cell is occupied by the Blue Ring Spawn.' }
  }
  if (layout.townSquare.col === col && layout.townSquare.row === row) {
    return { ok: false, reason: 'Cell is occupied by the Town Square Circle.' }
  }
  if (layout.crossbows.some((c) => c.col === col && c.row === row)) {
    return { ok: false, reason: 'Cell is occupied by an Outward-Facing Crossbow.' }
  }
  return { ok: true }
}

export function createStarterCustomMap(): CustomMapLayout {
  const defaultCrossbowCoords: GridCoord[] = [
    { col: 4, row: 3 },
    { col: 5, row: 3 },
    { col: 6, row: 3 },
    { col: 8, row: 3 },
    { col: 9, row: 3 },
    { col: 10, row: 3 },
    { col: 4, row: 2 },
    { col: 10, row: 2 },
  ]
  const crossbows: CrossbowPlacement[] = defaultCrossbowCoords.map(({ col, row }) => ({
    col,
    row,
    ...computeOutwardCrossbowDir(col, row),
  }))

  // Balanced central city street walls leaving 3 clear north-south avenues
  const walls: GridCoord[] = [
    { col: 5, row: 10 },
    { col: 9, row: 10 },
    { col: 5, row: 11 },
    { col: 9, row: 11 },
    { col: 3, row: 12 },
    { col: 11, row: 12 },
    { col: 5, row: 13 },
    { col: 9, row: 13 },
    { col: 5, row: 14 },
    { col: 9, row: 14 },
  ]

  return {
    version: 1,
    name: 'Citadel Crossroads',
    cityName: 'Bastion Ward',
    biome: 'valley',
    gridCols: GRID_COLS,
    gridRows: GRID_ROWS,
    blueSpawn: { col: 8, row: 22 },
    townSquare: { col: 7, row: 12 },
    crossbows,
    walls,
  }
}

export function validateCustomMap(layout: CustomMapLayout): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!layout.name || !layout.name.trim()) {
    errors.push('Map name cannot be empty.')
  }
  if (!MAP_IDS.includes(layout.biome)) {
    errors.push('Invalid biome selection.')
  }

  const blueOk = isValidBlueSpawnCell(layout.blueSpawn.col, layout.blueSpawn.row)
  if (!blueOk.ok && blueOk.reason) errors.push(blueOk.reason)

  const townOk = isTownSquareBetweenSpawns(layout.townSquare, layout.blueSpawn)
  if (!townOk.ok && townOk.reason) errors.push(townOk.reason)

  if (layout.crossbows.length !== REQUIRED_CROSSBOWS) {
    errors.push(`Exactly ${REQUIRED_CROSSBOWS} outward-facing crossbows are required (currently ${layout.crossbows.length}).`)
  }

  const seenCrossbows = new Set<string>()
  for (const c of layout.crossbows) {
    const key = `${c.col},${c.row}`
    if (seenCrossbows.has(key)) {
      errors.push(`Duplicate crossbow at (${c.col + 1}, ${c.row + 1}).`)
    }
    seenCrossbows.add(key)
    const cOk = isValidCrossbowCell(c.col, c.row)
    if (!cOk.ok && cOk.reason) errors.push(cOk.reason)

    // Verify outward direction vector points away from Red Fort center
    const { x, z } = gridToWorld(c.col, c.row)
    const dot = c.dirX * x + c.dirZ * (z - RED_Z)
    if (dot < -0.05) {
      errors.push(`Crossbow at (${c.col + 1}, ${c.row + 1}) must face outward away from the fort walls.`)
    }
  }

  return { valid: errors.length === 0, errors }
}

export function serializeCustomMap(layout: CustomMapLayout): string {
  const normalized: CustomMapLayout = {
    version: 1,
    name: layout.name.trim() || 'Custom Siege',
    cityName: layout.cityName.trim() || 'Custom Plaza',
    biome: MAP_IDS.includes(layout.biome) ? layout.biome : 'valley',
    gridCols: GRID_COLS,
    gridRows: GRID_ROWS,
    blueSpawn: { col: layout.blueSpawn.col, row: layout.blueSpawn.row },
    townSquare: { col: layout.townSquare.col, row: layout.townSquare.row },
    crossbows: layout.crossbows.map((c) => ({
      col: c.col,
      row: c.row,
      ...computeOutwardCrossbowDir(c.col, c.row),
    })),
    walls: layout.walls.map((w) => ({ col: w.col, row: w.row })),
  }
  return JSON.stringify(normalized, null, 2)
}

export function parseCustomMap(jsonText: string): { layout: CustomMapLayout | null; error?: string } {
  try {
    const raw = JSON.parse(jsonText) as Partial<CustomMapLayout>
    if (!raw || typeof raw !== 'object') {
      return { layout: null, error: 'JSON must represent a CustomMapLayout object.' }
    }
    if (!raw.blueSpawn || typeof raw.blueSpawn.col !== 'number' || typeof raw.blueSpawn.row !== 'number') {
      return { layout: null, error: 'Missing or invalid "blueSpawn" coordinates.' }
    }
    if (!raw.townSquare || typeof raw.townSquare.col !== 'number' || typeof raw.townSquare.row !== 'number') {
      return { layout: null, error: 'Missing or invalid "townSquare" coordinates.' }
    }
    if (!Array.isArray(raw.crossbows)) {
      return { layout: null, error: 'Missing "crossbows" array.' }
    }
    if (!Array.isArray(raw.walls)) {
      return { layout: null, error: 'Missing "walls" array.' }
    }

    const candidate: CustomMapLayout = {
      version: 1,
      name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Custom Siege',
      cityName: typeof raw.cityName === 'string' && raw.cityName.trim() ? raw.cityName.trim() : 'Central Ward',
      biome: typeof raw.biome === 'string' && MAP_IDS.includes(raw.biome as MapId) ? (raw.biome as MapId) : 'valley',
      gridCols: GRID_COLS,
      gridRows: GRID_ROWS,
      blueSpawn: { col: Math.round(raw.blueSpawn.col), row: Math.round(raw.blueSpawn.row) },
      townSquare: { col: Math.round(raw.townSquare.col), row: Math.round(raw.townSquare.row) },
      crossbows: raw.crossbows.map((c) => {
        const col = Math.round(Number(c.col))
        const row = Math.round(Number(c.row))
        const outward = computeOutwardCrossbowDir(col, row)
        return {
          col,
          row,
          dirX: typeof c.dirX === 'number' ? c.dirX : outward.dirX,
          dirZ: typeof c.dirZ === 'number' ? c.dirZ : outward.dirZ,
        }
      }),
      walls: raw.walls
        .filter((w) => w && typeof w.col === 'number' && typeof w.row === 'number')
        .map((w) => ({ col: Math.round(w.col), row: Math.round(w.row) })),
    }

    // Enforce outward crossbow directions
    candidate.crossbows = candidate.crossbows.map((c) => ({
      col: c.col,
      row: c.row,
      ...computeOutwardCrossbowDir(c.col, c.row),
    }))

    const check = validateCustomMap(candidate)
    if (!check.valid) {
      return { layout: null, error: check.errors[0] }
    }
    return { layout: candidate }
  } catch (err) {
    return { layout: null, error: err instanceof Error ? err.message : 'Invalid JSON syntax.' }
  }
}

export function loadSavedCustomMap(): CustomMapLayout | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = parseCustomMap(raw)
    return parsed.layout
  } catch {
    return null
  }
}

export function saveCustomMapToStorage(layout: CustomMapLayout): string {
  const json = serializeCustomMap(layout)
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, json)
    } catch {
      // Ignore storage quota errors
    }
  }
  return json
}

export function clearSavedCustomMap(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore
  }
}

export function blueSpawnWorldPos(layout: CustomMapLayout): { x: number; z: number } {
  const { x, z } = gridToWorld(layout.blueSpawn.col, layout.blueSpawn.row)
  // Keep inside Blue Fort courtyard if placed in row 22
  if (layout.blueSpawn.row === 22 && Math.abs(x) <= 18) {
    return { x, z: BLUE_Z }
  }
  return { x, z }
}
