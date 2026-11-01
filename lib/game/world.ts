import * as THREE from 'three'
import {
  BLUE_Z,
  CAPTURE_RADIUS,
  CITY_CAPTURE_RADIUS,
  CITY_HALF_X,
  CITY_HALF_Z,
  CITY_Z,
  FORT_HALF,
  GATE_HALF,
  RED_Z,
  TOWER_H,
  TOWER_R,
  WALL_H,
  WALL_T,
} from './constants'
import {
  CELL_SIZE_X,
  CELL_SIZE_Z,
  blueSpawnWorldPos,
  crossbowCellToWorldDef,
  gridToWorld,
  type CustomMapLayout,
} from './custom-map'
import {
  createDirtTexture,
  createGroundTexture,
  createLiquidTexture,
  createMasonryTexture,
  createWoodTexture,
  scaleBoxUVs,
  type GroundTheme,
  type MasonryTheme,
} from './textures'

export const MAP_IDS = [
  'valley',
  'frost',
  'canyon',
  'desert',
  'autumn',
  'marsh',
  'cherry',
  'moonlit',
  'marble',
  'tundra',
] as const

export type MapId = (typeof MAP_IDS)[number]

export type CityStyle =
  | 'tudor'
  | 'nordic'
  | 'volcanic'
  | 'desert'
  | 'autumn'
  | 'marsh'
  | 'sakura'
  | 'nocturne'
  | 'marble'
  | 'highland'

export interface MapSpec {
  id: MapId
  name: string
  cityName: string
  subtitle: string
  groundTheme: GroundTheme
  masonryTheme: MasonryTheme
  cityStyle: CityStyle
  stoneTint: string
  plasterColor: string
  roofPrimary: string
  roofSecondary: string
  roadTint: string
  hillColor: string
  skyTop: string
  skyMid: string
  skyHorizon: string
  skyBottom: string
  sunDiscColor: string
  fogColor: string
  fogNear: number
  fogFar: number
  hemiSky: string
  hemiGround: string
  hemiIntensity: number
  sunColor: string
  sunIntensity: number
  sunDir: [number, number, number]
  foliagePalette: string[]
  treeStyle: 'broadleaf' | 'pine' | 'palm' | 'cypress' | 'snag'
  hazardKind?: 'ice' | 'magma' | 'bog'
}

export const MAP_SPECS: Record<MapId, MapSpec> = {
  valley: {
    id: 'valley',
    name: 'Verdant Valley',
    cityName: 'Oakhaven Market',
    subtitle: 'Sunlit green valley and half-timbered market town',
    groundTheme: 'grass',
    masonryTheme: 'limestone',
    cityStyle: 'tudor',
    stoneTint: '#e9e4d8',
    plasterColor: '#efe6d5',
    roofPrimary: '#94432e',
    roofSecondary: '#475569',
    roadTint: '#c9b79c',
    hillColor: '#4f7a3a',
    skyTop: '#2f6fd0',
    skyMid: '#8fbbe8',
    skyHorizon: '#f2d6ad',
    skyBottom: '#b9c7a8',
    sunDiscColor: '#fff3d6',
    fogColor: '#e6d6bb',
    fogNear: 130,
    fogFar: 490,
    hemiSky: '#bcd8ff',
    hemiGround: '#5b6b3a',
    hemiIntensity: 0.85,
    sunColor: '#fff0d6',
    sunIntensity: 2.6,
    sunDir: [-0.6, 0.45, 0.66],
    foliagePalette: ['#3f6f2c', '#4c7d33', '#2f5e26', '#5a8a3c'],
    treeStyle: 'broadleaf',
  },
  frost: {
    id: 'frost',
    name: 'Frostspire Crossing',
    cityName: 'Winterhold Keep',
    subtitle: 'Frozen alpine canals, arched bridges, and snow-slate halls',
    groundTheme: 'snow',
    masonryTheme: 'frost',
    cityStyle: 'nordic',
    stoneTint: '#dde6f0',
    plasterColor: '#cbd8e6',
    roofPrimary: '#334659',
    roofSecondary: '#475d73',
    roadTint: '#9aaaba',
    hillColor: '#6b7f96',
    skyTop: '#1d4378',
    skyMid: '#76a7d4',
    skyHorizon: '#dae9f7',
    skyBottom: '#9db4c9',
    sunDiscColor: '#f5fbff',
    fogColor: '#d0e2f2',
    fogNear: 115,
    fogFar: 470,
    hemiSky: '#d4ebff',
    hemiGround: '#6b7f94',
    hemiIntensity: 0.95,
    sunColor: '#fff8ec',
    sunIntensity: 2.45,
    sunDir: [0.56, 0.48, 0.67],
    foliagePalette: ['#234236', '#2c4f40', '#1d382d', '#355c4b'],
    treeStyle: 'pine',
    hazardKind: 'ice',
  },
  canyon: {
    id: 'canyon',
    name: 'Scorched Basalt',
    cityName: 'Ashenforge Bastion',
    subtitle: 'Volcanic dusk ashlands, forge-halls, and magma fissures',
    groundTheme: 'ash',
    masonryTheme: 'basalt',
    cityStyle: 'volcanic',
    stoneTint: '#d4c4bc',
    plasterColor: '#6e5850',
    roofPrimary: '#3b2824',
    roofSecondary: '#7a3b26',
    roadTint: '#7d665a',
    hillColor: '#5c3628',
    skyTop: '#22162b',
    skyMid: '#7a3328',
    skyHorizon: '#e38246',
    skyBottom: '#42251d',
    sunDiscColor: '#ffd194',
    fogColor: '#b36b4c',
    fogNear: 115,
    fogFar: 460,
    hemiSky: '#ffb085',
    hemiGround: '#3d2822',
    hemiIntensity: 0.9,
    sunColor: '#ffca8a',
    sunIntensity: 2.75,
    sunDir: [-0.65, 0.38, 0.65],
    foliagePalette: ['#3d2b24', '#4d352c'],
    treeStyle: 'snag',
    hazardKind: 'magma',
  },
  desert: {
    id: 'desert',
    name: 'Golden Mirage',
    cityName: 'Sunstone Bazaar',
    subtitle: 'Sun-bleached dunes, sandstone minarets, and domed bazaar',
    groundTheme: 'sand',
    masonryTheme: 'sandstone',
    cityStyle: 'desert',
    stoneTint: '#f2dec0',
    plasterColor: '#ebd2ad',
    roofPrimary: '#d49b38',
    roofSecondary: '#2d8a8a',
    roadTint: '#c9a978',
    hillColor: '#c29255',
    skyTop: '#1e62b5',
    skyMid: '#7ab8e6',
    skyHorizon: '#fae0b4',
    skyBottom: '#d4ae72',
    sunDiscColor: '#fff7db',
    fogColor: '#ebd0a4',
    fogNear: 125,
    fogFar: 480,
    hemiSky: '#ffecc7',
    hemiGround: '#997445',
    hemiIntensity: 0.92,
    sunColor: '#fff0cc',
    sunIntensity: 2.8,
    sunDir: [0.62, 0.52, -0.58],
    foliagePalette: ['#4c7a34', '#5c8c3d', '#3e6929'],
    treeStyle: 'palm',
  },
  autumn: {
    id: 'autumn',
    name: 'Amberwood Harvest',
    cityName: 'Goldleaf Burgh',
    subtitle: 'Crimson-gold autumn woods and red-brick guildhall burgh',
    groundTheme: 'autumn',
    masonryTheme: 'brick',
    cityStyle: 'autumn',
    stoneTint: '#ebd8cc',
    plasterColor: '#f0dfc8',
    roofPrimary: '#3c6e5e',
    roofSecondary: '#7d3228',
    roadTint: '#b59d82',
    hillColor: '#8c5828',
    skyTop: '#2b5ca8',
    skyMid: '#8aaad9',
    skyHorizon: '#f5be82',
    skyBottom: '#997045',
    sunDiscColor: '#ffe0a3',
    fogColor: '#e6be94',
    fogNear: 125,
    fogFar: 480,
    hemiSky: '#ffd9b3',
    hemiGround: '#664a2e',
    hemiIntensity: 0.88,
    sunColor: '#ffdfab',
    sunIntensity: 2.65,
    sunDir: [-0.64, 0.38, -0.66],
    foliagePalette: ['#c94a24', '#de8321', '#e6ad29', '#992e20', '#706e2b'],
    treeStyle: 'broadleaf',
  },
  marsh: {
    id: 'marsh',
    name: 'Whispering Fenlands',
    cityName: 'Mistwater Town',
    subtitle: 'Misty emerald wetlands, bog pools, and mossy guildhouses',
    groundTheme: 'marsh',
    masonryTheme: 'moss',
    cityStyle: 'marsh',
    stoneTint: '#cfd6c9',
    plasterColor: '#bfc9b8',
    roofPrimary: '#36453b',
    roofSecondary: '#4d4638',
    roadTint: '#878c7d',
    hillColor: '#3b4f39',
    skyTop: '#385c59',
    skyMid: '#7fa199',
    skyHorizon: '#c5d6cc',
    skyBottom: '#6a7d70',
    sunDiscColor: '#e8f5ec',
    fogColor: '#b8ccc2',
    fogNear: 100,
    fogFar: 430,
    hemiSky: '#c7e0d6',
    hemiGround: '#3d4d3a',
    hemiIntensity: 0.92,
    sunColor: '#e8f2e6',
    sunIntensity: 2.2,
    sunDir: [0.5, 0.46, 0.73],
    foliagePalette: ['#355236', '#466341', '#2c4530', '#587349'],
    treeStyle: 'broadleaf',
    hazardKind: 'bog',
  },
  cherry: {
    id: 'cherry',
    name: 'Blossom Highlands',
    cityName: 'Sakura Castle-Town',
    subtitle: 'Spring cherry-blossom groves, vermilion gates, and tiled eaves',
    groundTheme: 'blossom',
    masonryTheme: 'limestone',
    cityStyle: 'sakura',
    stoneTint: '#ece8e1',
    plasterColor: '#faf6f0',
    roofPrimary: '#2c333d',
    roofSecondary: '#3f4754',
    roadTint: '#cfc5b8',
    hillColor: '#567d46',
    skyTop: '#3b73c9',
    skyMid: '#9bc0ed',
    skyHorizon: '#fce1e8',
    skyBottom: '#b4c9a9',
    sunDiscColor: '#fff7f2',
    fogColor: '#f2dce4',
    fogNear: 130,
    fogFar: 485,
    hemiSky: '#ffdbe8',
    hemiGround: '#597349',
    hemiIntensity: 0.9,
    sunColor: '#fff2eb',
    sunIntensity: 2.55,
    sunDir: [-0.55, 0.48, 0.68],
    foliagePalette: ['#f29bb8', '#f7bfd2', '#ffffff', '#e67da1', '#588746'],
    treeStyle: 'broadleaf',
  },
  moonlit: {
    id: 'moonlit',
    name: 'Starfall Nocturne',
    cityName: 'Silverkeep Watch',
    subtitle: 'Moonlit gothic citadel-town with warm lantern-lit streets',
    groundTheme: 'night',
    masonryTheme: 'granite',
    cityStyle: 'nocturne',
    stoneTint: '#b8c4d4',
    plasterColor: '#9aa9bd',
    roofPrimary: '#1f2c42',
    roofSecondary: '#2d3d59',
    roadTint: '#6f7c8c',
    hillColor: '#243633',
    skyTop: '#0b132b',
    skyMid: '#1c2e54',
    skyHorizon: '#3f5b87',
    skyBottom: '#182436',
    sunDiscColor: '#e3eeff',
    fogColor: '#32496e',
    fogNear: 115,
    fogFar: 460,
    hemiSky: '#8cb4eb',
    hemiGround: '#2c3b47',
    hemiIntensity: 1.05,
    sunColor: '#c4dcff',
    sunIntensity: 2.35,
    sunDir: [0.52, 0.55, -0.65],
    foliagePalette: ['#1f3b38', '#294a46', '#1a3030', '#315752'],
    treeStyle: 'pine',
  },
  marble: {
    id: 'marble',
    name: 'Aegean Suncoast',
    cityName: 'Helios Agora',
    subtitle: 'Classical white-marble villas, colonnades, and cypress hills',
    groundTheme: 'aegean',
    masonryTheme: 'marble',
    cityStyle: 'marble',
    stoneTint: '#f7f4ed',
    plasterColor: '#fcfaf5',
    roofPrimary: '#c45b33',
    roofSecondary: '#d47448',
    roadTint: '#ded6c5',
    hillColor: '#768042',
    skyTop: '#1663c7',
    skyMid: '#68b2ed',
    skyHorizon: '#e8f4fc',
    skyBottom: '#b8bfa0',
    sunDiscColor: '#fffbe6',
    fogColor: '#dcecf7',
    fogNear: 135,
    fogFar: 500,
    hemiSky: '#c7e6ff',
    hemiGround: '#7a784c',
    hemiIntensity: 0.92,
    sunColor: '#fff6de',
    sunIntensity: 2.7,
    sunDir: [-0.58, 0.52, 0.62],
    foliagePalette: ['#34572c', '#3f6635', '#2a4723', '#527542'],
    treeStyle: 'cypress',
  },
  tundra: {
    id: 'tundra',
    name: 'Crimson Moor',
    cityName: 'Ironcrag Keep-Town',
    subtitle: 'Storm-lit heather moorland and fortified granite keep-houses',
    groundTheme: 'moor',
    masonryTheme: 'granite',
    cityStyle: 'highland',
    stoneTint: '#c2c5cc',
    plasterColor: '#a8acb5',
    roofPrimary: '#363a42',
    roofSecondary: '#543d46',
    roadTint: '#8d888c',
    hillColor: '#56434d',
    skyTop: '#2a2d45',
    skyMid: '#695c78',
    skyHorizon: '#d99b78',
    skyBottom: '#4a3d45',
    sunDiscColor: '#ffd7b5',
    fogColor: '#b58b7d',
    fogNear: 115,
    fogFar: 465,
    hemiSky: '#d9c2d1',
    hemiGround: '#4a3f42',
    hemiIntensity: 0.9,
    sunColor: '#ffd4ad',
    sunIntensity: 2.5,
    sunDir: [0.64, 0.4, 0.65],
    foliagePalette: ['#3d4f35', '#5e3d52', '#4c593c', '#734962'],
    treeStyle: 'pine',
  },
}

/** Uniformly selects 1 of the 10 default maps with an exact 1/10 (10%) probability. */
export function pickRandomMap(): MapId {
  return MAP_IDS[Math.floor(Math.random() * MAP_IDS.length)]
}

/**
 * Selects the next battlefield across the 10 default battlefields plus the saved custom JSON layout (if present).
 */
export function pickNextBattlefield(hasCustomMap: boolean): { mapId: MapId; useCustom: boolean } {
  if (hasCustomMap) {
    const roll = Math.floor(Math.random() * (MAP_IDS.length + 1))
    if (roll === MAP_IDS.length) {
      return { mapId: 'valley', useCustom: true }
    }
    return { mapId: MAP_IDS[roll], useCustom: false }
  }
  return { mapId: pickRandomMap(), useCustom: false }
}

export interface Collider {
  box: THREE.Box3
  low: boolean
  movementOnly?: boolean
}

export interface RedPostDef {
  pos: THREE.Vector3
  leash: number
}

class WavingFlag {
  private base: Float32Array
  constructor(
    public mesh: THREE.Mesh,
    private phase: number,
  ) {
    this.base = Float32Array.from((mesh.geometry.attributes.position as THREE.BufferAttribute).array)
  }
  update(t: number) {
    const pos = this.mesh.geometry.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      const x = this.base[i * 3]
      const y = this.base[i * 3 + 1]
      const amt = x / 3
      pos.setZ(i, Math.sin(x * 2.1 - t * 5 + this.phase + y * 0.6) * 0.22 * amt)
      pos.setY(i, y - amt * amt * 0.15)
    }
    pos.needsUpdate = true
    this.mesh.geometry.computeVertexNormals()
  }
}

export interface WorldRefs {
  map: MapSpec
  isCustom: boolean
  root: THREE.Group
  sky: THREE.Mesh
  colliders: Collider[]
  cityAvenues: number[]
  redPosts: RedPostDef[]
  playerSpawnPos: THREE.Vector3
  blueSpawnOffsets: [number, number][]
  crossbowDefs: [number, number, number, number, number][]
  redFlag: THREE.Object3D
  blueCaptureFlag: THREE.Object3D
  captureRing: THREE.Mesh
  captureDisc: THREE.Mesh
  cityRedFlag: THREE.Object3D
  cityBlueFlag: THREE.Object3D
  cityRing: THREE.Mesh
  cityDisc: THREE.Mesh
  resupplyRing: THREE.Mesh
  resupplyPosition: THREE.Vector3
  cityCenter: THREE.Vector3
  flagTopY: number
  flagBottomY: number
  cityFlagTopY: number
  cityFlagBottomY: number
  update: (t: number) => void
  dispose: () => void
}

const teamColors = {
  blue: { cloth: '#1f5fc4', emissive: '#2678ff', roof: '#28467a', trim: '#e3b448' },
  red: { cloth: '#b4232a', emissive: '#ff2b36', roof: '#7a2525', trim: '#2b2b2b' },
}

export function buildWorld(
  scene: THREE.Scene,
  mapId: MapId = 'valley',
  customLayout: CustomMapLayout | null = null,
): WorldRefs {
  const baseMap = MAP_SPECS[customLayout ? customLayout.biome : mapId]
  const map: MapSpec = customLayout
    ? {
        ...baseMap,
        name: customLayout.name,
        cityName: customLayout.cityName,
        subtitle: `Custom siege layout · ${baseMap.name} biome`,
      }
    : baseMap
  const root = new THREE.Group()
  root.name = customLayout ? `world-custom-${customLayout.biome}` : `world-${mapId}`
  scene.add(root)

  const colliders: Collider[] = []
  const flags: WavingFlag[] = []
  const flameMeshes: THREE.Mesh[] = []

  const groundTex = createGroundTexture(map.groundTheme)
  const dirtTex = createDirtTexture()
  const woodTex = createWoodTexture()
  const stoneTex = createMasonryTexture(map.masonryTheme)

  const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.88, color: map.stoneTint })
  const plasterMat = new THREE.MeshStandardMaterial({ color: map.plasterColor, roughness: 0.9 })
  const roofMatA = new THREE.MeshStandardMaterial({ color: map.roofPrimary, roughness: 0.72 })
  const roofMatB = new THREE.MeshStandardMaterial({ color: map.roofSecondary, roughness: 0.72 })
  const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.85 })
  const darkWoodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.85, color: '#5c3e28' })
  const ironMat = new THREE.MeshStandardMaterial({ color: '#2f3236', metalness: 0.75, roughness: 0.42 })
  const goldMat = new THREE.MeshStandardMaterial({ color: '#d4a53c', metalness: 0.78, roughness: 0.3 })
  const vermilionMat = new THREE.MeshStandardMaterial({ color: '#c9382b', roughness: 0.65 })
  const windowMat =
    map.cityStyle === 'nocturne'
      ? new THREE.MeshStandardMaterial({ color: '#ffd080', emissive: '#ff9d2e', emissiveIntensity: 1.2, roughness: 0.3 })
      : new THREE.MeshStandardMaterial({ color: '#283645', metalness: 0.4, roughness: 0.35 })
  const emberMat = new THREE.MeshStandardMaterial({
    color: map.cityStyle === 'marsh' ? '#7affd4' : '#ff9d3b',
    emissive: map.cityStyle === 'marsh' ? '#1fbf8f' : '#ff5d0a',
    emissiveIntensity: 1.45,
    roughness: 0.4,
  })

  const addCollider = (x: number, z: number, w: number, d: number, h: number, movementOnly = false) => {
    colliders.push({
      box: new THREE.Box3(new THREE.Vector3(x - w / 2, 0, z - d / 2), new THREE.Vector3(x + w / 2, h, z + d / 2)),
      low: !movementOnly && h <= 1.15,
      movementOnly,
    })
  }

  const addBlock = (
    parent: THREE.Object3D,
    mat: THREE.Material,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    unit = 4,
    collide = true,
  ) => {
    const geo = scaleBoxUVs(new THREE.BoxGeometry(w, h, d), w, h, d, unit)
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    parent.add(mesh)
    if (collide) addCollider(x, z, w, d, y + h / 2)
    return mesh
  }

  const addBrazier = (parent: THREE.Object3D, x: number, y: number, z: number) => {
    const stand = new THREE.Group()
    stand.position.set(x, y, z)
    const poleH = y === 0 ? 2.1 : 0.9
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, poleH, 8), ironMat)
    pedestal.position.y = poleH / 2
    pedestal.castShadow = true
    stand.add(pedestal)
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.2, 0.32, 8), ironMat)
    bowl.position.y = poleH + 0.1
    stand.add(bowl)
    const flame = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), emberMat)
    flame.position.y = poleH + 0.34
    stand.add(flame)
    flameMeshes.push(flame)
    parent.add(stand)
  }

  const makeFlag = (team: 'blue' | 'red', phase: number) => {
    const tc = teamColors[team]
    const geo = new THREE.PlaneGeometry(3.2, 2, 16, 8)
    geo.translate(1.6, 0, 0)
    const mat = new THREE.MeshStandardMaterial({
      color: tc.cloth,
      emissive: tc.emissive,
      emissiveIntensity: 1.38,
      side: THREE.DoubleSide,
      roughness: 0.72,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.castShadow = true
    const wf = new WavingFlag(mesh, phase)
    flags.push(wf)
    return mesh
  }

  // Sky dome
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(map.skyTop) },
      mid: { value: new THREE.Color(map.skyMid) },
      horizon: { value: new THREE.Color(map.skyHorizon) },
      bottom: { value: new THREE.Color(map.skyBottom) },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; uniform vec3 bottom; varying vec3 vDir;
      void main(){
        float h = vDir.y;
        vec3 c;
        if (h > 0.0) {
          c = mix(horizon, mid, smoothstep(0.0, 0.18, h));
          c = mix(c, top, smoothstep(0.18, 0.75, h));
        } else {
          c = mix(horizon, bottom, smoothstep(0.0, -0.15, h));
        }
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  })
  const sky = new THREE.Mesh(new THREE.SphereGeometry(850, 32, 16), skyMat)
  sky.renderOrder = -1
  sky.name = 'sky'
  root.add(sky)

  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(19, 16, 8),
    new THREE.MeshBasicMaterial({ color: map.sunDiscColor, fog: false }),
  )
  sun.position.copy(new THREE.Vector3(...map.sunDir).normalize().multiplyScalar(650))
  sky.add(sun)

  // Ground plane
  groundTex.repeat.set(96, 96)
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(820, 820),
    new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.96 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  root.add(ground)

  // Main siege highway from Blue Fort through Central City to Red Fort + West/East avenues
  const roadTex = dirtTex.clone()
  roadTex.needsUpdate = true
  roadTex.repeat.set(1.6, 44)
  const roadMat = new THREE.MeshStandardMaterial({
    map: roadTex,
    roughness: 0.98,
    color: map.roadTint,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  })
  const mainRoad = new THREE.Mesh(new THREE.PlaneGeometry(10, 262), roadMat)
  mainRoad.rotation.x = -Math.PI / 2
  mainRoad.position.y = 0.02
  mainRoad.receiveShadow = true
  root.add(mainRoad)

  // =========================================================================
  // BLUE & RED FORTS (at z = +155 and z = -155)
  // =========================================================================
  const redFlagGroup = new THREE.Group()
  const blueCaptureGroup = new THREE.Group()
  const flagTopY = 12.8
  const flagBottomY = 2.2

  const buildFort = (cz: number, team: 'blue' | 'red') => {
    const fort = new THREE.Group()
    root.add(fort)
    const colors = teamColors[team]
    const s = cz > 0 ? -1 : 1
    const frontZ = cz + s * FORT_HALF
    const backZ = cz - s * FORT_HALF
    const fullW = FORT_HALF * 2 + WALL_T

    addBlock(fort, stoneMat, fullW, WALL_H, WALL_T, 0, WALL_H / 2, backZ)
    addBlock(fort, stoneMat, WALL_T, WALL_H, FORT_HALF * 2, -FORT_HALF, WALL_H / 2, cz)
    addBlock(fort, stoneMat, WALL_T, WALL_H, FORT_HALF * 2, FORT_HALF, WALL_H / 2, cz)
    const segLen = FORT_HALF - GATE_HALF + WALL_T / 2
    for (const side of [-1, 1]) {
      addBlock(fort, stoneMat, segLen, WALL_H, WALL_T, side * (GATE_HALF + segLen / 2), WALL_H / 2, frontZ)
    }
    addBlock(fort, stoneMat, GATE_HALF * 2, 2.6, WALL_T, 0, WALL_H - 1.3, frontZ, 4, false)

    // Merlons
    const merlonPositions: THREE.Vector3[] = []
    const merlonY = WALL_H + 0.55
    for (let x = -FORT_HALF + 2; x <= FORT_HALF - 2; x += 2.2) merlonPositions.push(new THREE.Vector3(x, merlonY, backZ))
    for (let z = cz - FORT_HALF + 2; z <= cz + FORT_HALF - 2; z += 2.2) {
      merlonPositions.push(new THREE.Vector3(-FORT_HALF, merlonY, z))
      merlonPositions.push(new THREE.Vector3(FORT_HALF, merlonY, z))
    }
    for (let x = -FORT_HALF + 2; x <= FORT_HALF - 2; x += 2.2) {
      if (Math.abs(x) < GATE_HALF + 0.6) continue
      merlonPositions.push(new THREE.Vector3(x, merlonY, frontZ))
    }
    const merlonGeo = scaleBoxUVs(new THREE.BoxGeometry(1.1, 1.1, WALL_T + 0.2), 1.1, 1.1, WALL_T + 0.2, 4)
    const merlons = new THREE.InstancedMesh(merlonGeo, stoneMat, merlonPositions.length)
    const m = new THREE.Matrix4()
    merlonPositions.forEach((p, i) => {
      const alongZ = Math.abs(Math.abs(p.x) - FORT_HALF) < 0.01
      m.makeRotationY(alongZ ? Math.PI / 2 : 0)
      m.setPosition(p)
      merlons.setMatrixAt(i, m)
    })
    merlons.computeBoundingSphere()
    merlons.castShadow = true
    merlons.receiveShadow = true
    fort.add(merlons)

    // Towers
    const fortRoofMat = new THREE.MeshStandardMaterial({ color: colors.roof, roughness: 0.7 })
    for (const tx of [-FORT_HALF, FORT_HALF]) {
      for (const tz of [frontZ, backZ]) {
        const geo = new THREE.CylinderGeometry(TOWER_R, TOWER_R + 0.35, TOWER_H, 20)
        const uv = geo.attributes.uv as THREE.BufferAttribute
        for (let i = 0; i < uv.count; i++) {
          uv.setXY(i, (uv.getX(i) * Math.PI * 2 * TOWER_R) / 4, (uv.getY(i) * TOWER_H) / 4)
        }
        const tower = new THREE.Mesh(geo, stoneMat)
        tower.position.set(tx, TOWER_H / 2, tz)
        tower.castShadow = true
        tower.receiveShadow = true
        fort.add(tower)
        addCollider(tx, tz, TOWER_R * 2, TOWER_R * 2, TOWER_H)
        const crown = new THREE.Mesh(new THREE.CylinderGeometry(TOWER_R + 0.55, TOWER_R + 0.3, 1.1, 20), stoneMat)
        crown.position.set(tx, TOWER_H + 0.1, tz)
        crown.castShadow = true
        fort.add(crown)
        const isFront = tz === frontZ
        if (!isFront || team === 'blue') {
          const roof = new THREE.Mesh(new THREE.ConeGeometry(TOWER_R + 0.9, 5, 20), fortRoofMat)
          roof.position.set(tx, TOWER_H + 3.1, tz)
          roof.castShadow = true
          roof.receiveShadow = true
          fort.add(roof)
          const pennantPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4), ironMat)
          pennantPole.position.set(tx, TOWER_H + 6.6, tz)
          fort.add(pennantPole)
          const pennant = makeFlag(team, tx + tz)
          pennant.scale.set(0.4, 0.35, 0.4)
          pennant.position.set(tx, TOWER_H + 7.4, tz)
          fort.add(pennant)
        }
      }
    }

    // Gate portcullis & gate braziers
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.7, 6.6, 0.9), darkWoodMat)
      post.position.set(side * (GATE_HALF - 0.3), 3.3, frontZ + s * (WALL_T / 2 + 0.3))
      post.castShadow = true
      post.receiveShadow = true
      fort.add(post)
      addBrazier(fort, side * (GATE_HALF + 1.8), 0, frontZ + s * (WALL_T / 2 + 1.3))
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(GATE_HALF * 2 + 0.6, 0.7, 0.9), darkWoodMat)
    beam.position.set(0, 6.6, frontZ + s * (WALL_T / 2 + 0.3))
    beam.castShadow = true
    beam.receiveShadow = true
    fort.add(beam)
    for (let bx = -GATE_HALF + 0.7; bx <= GATE_HALF - 0.6; bx += 0.75) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.6, 0.12), ironMat)
      bar.position.set(bx, 5.75, frontZ + s * (WALL_T / 2 + 0.1))
      fort.add(bar)
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.35, 6), ironMat)
      spike.rotation.x = Math.PI
      spike.position.set(bx, 4.8, frontZ + s * (WALL_T / 2 + 0.1))
      fort.add(spike)
    }
    for (const by of [5.3, 6.2]) {
      const hbar = new THREE.Mesh(new THREE.BoxGeometry(GATE_HALF * 2 - 0.8, 0.12, 0.14), ironMat)
      hbar.position.set(0, by, frontZ + s * (WALL_T / 2 + 0.1))
      fort.add(hbar)
    }

    // Keep
    const keepZ = backZ + s * 7
    addBlock(fort, stoneMat, 18, 11, 9, 0, 5.5, keepZ)
    const keepRoof = new THREE.Mesh(new THREE.ConeGeometry(11, 5, 4), fortRoofMat)
    keepRoof.rotation.y = Math.PI / 4
    keepRoof.scale.set(1, 1, 0.55)
    keepRoof.position.set(0, 13.5, keepZ)
    keepRoof.castShadow = true
    keepRoof.receiveShadow = true
    fort.add(keepRoof)
    const door = new THREE.Mesh(new THREE.BoxGeometry(3, 4.5, 0.3), darkWoodMat)
    door.position.set(0, 2.25, keepZ + s * 4.6)
    fort.add(door)
    const bannerMat = new THREE.MeshStandardMaterial({
      color: colors.cloth,
      emissive: colors.emissive,
      emissiveIntensity: 1.32,
      roughness: 0.75,
      side: THREE.DoubleSide,
    })
    const trimMat = new THREE.MeshStandardMaterial({ color: colors.trim, roughness: 0.6 })
    for (const bx of [-6, 6]) {
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 5.5), bannerMat)
      banner.position.set(bx, 6.5, keepZ + s * 4.56)
      if (s < 0) banner.rotation.y = Math.PI
      fort.add(banner)
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.35), trimMat)
      stripe.position.set(bx, 4.2, keepZ + s * 4.58)
      if (s < 0) stripe.rotation.y = Math.PI
      fort.add(stripe)
    }

    // Courtyard floor
    const yardTex = dirtTex.clone()
    yardTex.needsUpdate = true
    yardTex.repeat.set(6, 6)
    const yard = new THREE.Mesh(
      new THREE.PlaneGeometry(FORT_HALF * 2, FORT_HALF * 2),
      new THREE.MeshStandardMaterial({ map: yardTex, roughness: 1, color: map.roadTint }),
    )
    yard.rotation.x = -Math.PI / 2
    yard.position.set(0, 0.03, cz)
    yard.receiveShadow = true
    fort.add(yard)

    // Courtyard crates
    const crateSpots = [
      [-18, 10],
      [18, 10],
      [-19, -6],
      [19, -4],
      [-14, -12],
      [14, 14],
    ]
    for (const [cx, oz] of crateSpots) {
      addBlock(fort, woodMat, 1.8, 1.8, 1.8, cx, 0.9, cz + oz * s, 1.8)
      if (Math.abs(cx) > 15) addBlock(fort, woodMat, 1.4, 1.4, 1.4, cx + 0.1, 2.5, cz + oz * s, 1.4, false)
    }

    // Main flag pole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 14, 10), ironMat)
    pole.position.set(0, 7, cz)
    pole.castShadow = true
    fort.add(pole)
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), goldMat)
    finial.position.set(0, 14.1, cz)
    fort.add(finial)
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 0.6, 16), stoneMat)
    base.position.set(0, 0.3, cz)
    base.receiveShadow = true
    fort.add(base)

    if (team === 'blue') {
      const flag = makeFlag('blue', 0)
      flag.position.set(0.12, flagTopY, cz)
      fort.add(flag)
    } else {
      const red = makeFlag('red', 1.3)
      redFlagGroup.add(red)
      redFlagGroup.position.set(0.12, flagTopY, cz)
      fort.add(redFlagGroup)
      const blue = makeFlag('blue', 2.1)
      blueCaptureGroup.add(blue)
      blueCaptureGroup.position.set(0.12, flagBottomY, cz)
      blueCaptureGroup.visible = false
      fort.add(blueCaptureGroup)
    }
  }

  buildFort(BLUE_Z, 'blue')
  buildFort(RED_Z, 'red')

  // =========================================================================
  // CONTESTED CENTRAL CITY (in the middle of EVERY map between the forts!)
  // =========================================================================
  const cityGroup = new THREE.Group()
  cityGroup.name = 'central-city'
  root.add(cityGroup)

  const cityAvenues = [-22, 0, 22]

  // Paved cobblestone town slab & cross-streets
  const cityPaveTex = stoneTex.clone()
  cityPaveTex.needsUpdate = true
  cityPaveTex.repeat.set(16, 16)
  const cityPaveMat = new THREE.MeshStandardMaterial({
    map: cityPaveTex,
    roughness: 0.94,
    color: map.roadTint,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  })
  const citySlab = new THREE.Mesh(new THREE.PlaneGeometry(CITY_HALF_X * 2, (CITY_HALF_Z - 1) * 2), cityPaveMat)
  citySlab.rotation.x = -Math.PI / 2
  citySlab.position.set(0, 0.025, CITY_Z)
  citySlab.receiveShadow = true
  cityGroup.add(citySlab)

  // Outer approach roads connecting the West & East City Gates toward the forts
  for (const ax of [-22, 22]) {
    for (const dirZ of [-1, 1]) {
      const spur = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 58), roadMat)
      spur.rotation.x = -Math.PI / 2
      spur.rotation.z = ax < 0 ? dirZ * -0.26 : dirZ * 0.26
      spur.position.set(ax * 0.62, 0.02, dirZ * 75)
      spur.receiveShadow = true
      root.add(spur)
    }
  }

  // City perimeter curtain walls with 3 wide fortified gates on North (z=-46) & South (z=+46)
  const cityWallH = 5.4
  const cityWallT = 1.6
  const northSouthSegments: [number, number][] = [
    [-35.25, 17.5],
    [-11.5, 12.0],
    [11.5, 12.0],
    [35.25, 17.5],
  ]
  for (const wz of [-46, 46]) {
    for (const [sx, sw] of northSouthSegments) {
      addBlock(cityGroup, stoneMat, sw, cityWallH, cityWallT, sx, cityWallH / 2, wz)
    }
    // Gatehouse arches over the 3 avenues (-22, 0, +22)
    for (const gx of cityAvenues) {
      const gateW = gx === 0 ? 11 : 9
      const lintelMat = map.cityStyle === 'sakura' ? vermilionMat : stoneMat
      addBlock(cityGroup, lintelMat, gateW + 1.2, 1.4, cityWallT + 0.5, gx, cityWallH + 0.5, wz, 3, false)
      // Flanking gate turrets
      for (const side of [-1, 1]) {
        const px = gx + side * (gateW / 2 + 0.65)
        addBlock(cityGroup, stoneMat, 1.7, cityWallH + 2.0, 2.2, px, (cityWallH + 2.0) / 2, wz, 3, true)
      }
    }
    // Corner watchtowers of the city wall
    for (const cx of [-CITY_HALF_X, CITY_HALF_X]) {
      const cTower = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.7, cityWallH + 3.2, 14), stoneMat)
      cTower.position.set(cx, (cityWallH + 3.2) / 2, wz)
      cTower.castShadow = true
      cTower.receiveShadow = true
      cityGroup.add(cTower)
      addCollider(cx, wz, 4.8, 4.8, cityWallH + 3.2)

      const cRoof = new THREE.Mesh(
        map.cityStyle === 'desert'
          ? new THREE.SphereGeometry(2.5, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2)
          : new THREE.ConeGeometry(2.9, 3.2, 14),
        roofMatA,
      )
      cRoof.position.set(cx, cityWallH + (map.cityStyle === 'desert' ? 3.1 : 4.8), wz)
      cRoof.castShadow = true
      cityGroup.add(cRoof)
    }
  }
  // East & West city walls with central side postern openings
  for (const wx of [-CITY_HALF_X, CITY_HALF_X]) {
    addBlock(cityGroup, stoneMat, cityWallT, cityWallH, 36, wx, cityWallH / 2, -26)
    addBlock(cityGroup, stoneMat, cityWallT, cityWallH, 36, wx, cityWallH / 2, 26)
  }

  // Composite Multi-Part City Building Generator (tailored to each map's architectural style!)
  const buildCityHouse = (cx: number, cz: number, w: number, d: number, stories: number, variant: number) => {
    const house = new THREE.Group()
    cityGroup.add(house)

    const h1 = 3.4
    const h2 = stories > 1 ? 3.1 : 0
    const totalWallH = h1 + h2
    const roofMat = variant % 2 === 0 ? roofMatA : roofMatB

    // Ground floor masonry base
    addBlock(house, stoneMat, w, h1, d, cx, h1 / 2, cz, 3.5, true)

    // Upper story (if 2-story)
    if (stories > 1) {
      const overhang = map.cityStyle === 'tudor' || map.cityStyle === 'autumn' ? 0.45 : 0
      const upperMat =
        map.cityStyle === 'tudor' || map.cityStyle === 'sakura' || map.cityStyle === 'autumn' || map.cityStyle === 'desert'
          ? plasterMat
          : stoneMat
      addBlock(house, upperMat, w + overhang, h2, d + overhang, cx, h1 + h2 / 2, cz, 3.5, false)

      // Half-timbered dark wood framing beams for Tudor / Sakura / Autumn styles
      if (map.cityStyle === 'tudor' || map.cityStyle === 'sakura' || map.cityStyle === 'autumn') {
        const beamX = w + overhang + 0.08
        const beamZ = d + overhang + 0.08
        const band = new THREE.Mesh(new THREE.BoxGeometry(beamX, 0.22, beamZ), darkWoodMat)
        band.position.set(cx, h1 + 0.05, cz)
        house.add(band)
        const topBand = new THREE.Mesh(new THREE.BoxGeometry(beamX, 0.2, beamZ), darkWoodMat)
        topBand.position.set(cx, totalWallH - 0.1, cz)
        house.add(topBand)
      }
    }

    //Collider covers full height of the building so projectiles & camera respect upper stories
    addCollider(cx, cz, w, d, totalWallH + 1.5)

    // Doorway facing nearest avenue & windows on façades
    const faceSignZ = cz >= 0 ? -1 : 1
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.2, 0.16), darkWoodMat)
    door.position.set(cx, 1.1, cz + faceSignZ * (d / 2 + 0.05))
    house.add(door)

    const winY = stories > 1 ? h1 + h2 * 0.52 : h1 * 0.58
    for (const wxOff of [-w * 0.26, w * 0.26]) {
      for (const sZ of [-1, 1]) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.1, 0.12), windowMat)
        win.position.set(cx + wxOff, winY, cz + sZ * ((stories > 1 && (map.cityStyle === 'tudor' || map.cityStyle === 'autumn') ? d + 0.45 : d) / 2 + 0.04))
        house.add(win)
      }
    }

    // Style-specific roof silhouettes
    if (map.cityStyle === 'desert') {
      // Parapet terrace + golden/turquoise dome
      addBlock(house, plasterMat, w + 0.3, 0.55, d + 0.3, cx, totalWallH + 0.27, cz, 3, false)
      const domeR = Math.min(w, d) * 0.36
      const dome = new THREE.Mesh(new THREE.SphereGeometry(domeR, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), roofMat)
      dome.position.set(cx, totalWallH + 0.5, cz)
      dome.castShadow = true
      house.add(dome)
      const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, 1.1, 8), goldMat)
      spire.position.set(cx, totalWallH + 0.5 + domeR + 0.45, cz)
      house.add(spire)
    } else if (map.cityStyle === 'highland' || map.cityStyle === 'volcanic') {
      // Fortified battlement roof + tall forge/keep chimney + pitched inner roof
      addBlock(house, stoneMat, w + 0.35, 0.7, d + 0.35, cx, totalWallH + 0.35, cz, 3, false)
      const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.62, 2.4, 4), roofMat)
      roof.rotation.y = Math.PI / 4
      roof.position.set(cx, totalWallH + 1.5, cz)
      roof.castShadow = true
      house.add(roof)
      const chim = addBlock(house, stoneMat, 1.0, 2.4, 1.0, cx + w * 0.3, totalWallH + 1.2, cz - d * 0.25, 2, false)
      chim.castShadow = true
    } else if (map.cityStyle === 'marble') {
      // Classical low terracotta roof + white marble columned front portico
      const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.76, 2.0, 4), roofMat)
      roof.rotation.y = Math.PI / 4
      roof.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d))
      roof.position.set(cx, totalWallH + 1.0, cz)
      roof.castShadow = true
      house.add(roof)
      for (const colX of [-w * 0.32, 0, w * 0.32]) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, h1, 10), plasterMat)
        col.position.set(cx + colX, h1 / 2, cz + faceSignZ * (d / 2 + 0.42))
        col.castShadow = true
        house.add(col)
      }
    } else if (map.cityStyle === 'sakura') {
      // Tiered wide-eave dark tile hipped roof + vermilion eave trim
      const eave = new THREE.Mesh(new THREE.BoxGeometry(w + 1.3, 0.24, d + 1.3), vermilionMat)
      eave.position.set(cx, totalWallH + 0.12, cz)
      house.add(eave)
      const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.82, 2.5, 4), roofMat)
      roof.rotation.y = Math.PI / 4
      roof.position.set(cx, totalWallH + 1.45, cz)
      roof.castShadow = true
      house.add(roof)
    } else {
      // Steep pitched roof (Tudor, Nordic snow-dusted, Autumn, Marsh, Nocturne)
      const roofH = map.cityStyle === 'nordic' || map.cityStyle === 'nocturne' || map.cityStyle === 'marsh' ? 3.2 : 2.6
      const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, roofH, 4), roofMat)
      roof.rotation.y = Math.PI / 4
      roof.scale.set((w + 0.7) / Math.max(w, d), 1, (d + 0.7) / Math.max(w, d))
      roof.position.set(cx, totalWallH + roofH / 2, cz)
      roof.castShadow = true
      house.add(roof)

      if (map.cityStyle === 'nordic') {
        const snowCap = new THREE.Mesh(
          new THREE.ConeGeometry(Math.max(w, d) * 0.52, roofH * 0.55, 4),
          new THREE.MeshStandardMaterial({ color: '#eef6ff', roughness: 0.85 }),
        )
        snowCap.rotation.y = Math.PI / 4
        snowCap.position.set(cx, totalWallH + roofH * 0.76, cz)
        house.add(snowCap)
      }

      if (variant % 2 === 0) {
        addBlock(house, stoneMat, 0.85, roofH + 0.6, 0.85, cx - w * 0.28, totalWallH + (roofH + 0.6) / 2, cz, 2, false)
      }
    }
  }

  const townWorld = customLayout ? gridToWorld(customLayout.townSquare.col, customLayout.townSquare.row) : { x: 0, z: CITY_Z }
  const cityCenter = new THREE.Vector3(townWorld.x, 0, townWorld.z)

  if (customLayout) {
    // Render custom grid-placed fortified walls with crenelated stone caps & full colliders
    const wallW = CELL_SIZE_X - 0.55
    const wallD = CELL_SIZE_Z - 0.65
    const wallH = 5.8
    for (const wCell of customLayout.walls) {
      const { x: wx, z: wz } = gridToWorld(wCell.col, wCell.row)
      addBlock(cityGroup, stoneMat, wallW, wallH, wallD, wx, wallH / 2, wz, 3.5, true)
      addBlock(cityGroup, stoneMat, wallW + 0.35, 0.65, wallD + 0.35, wx, wallH + 0.32, wz, 3.5, false)
    }
  } else {
    // Place 16 multi-part buildings cleanly inside the 8 City Districts (leaving all 3 avenues & 3 cross-streets clear!)
    const innerBlocks: [number, number, number, number, number][] = [
      [-11.5, -20.0, 6.8, 6.4, 2],
      [-11.5, -29.5, 6.6, 6.2, 1],
      [11.5, -20.0, 6.8, 6.4, 2],
      [11.5, -29.5, 6.6, 6.2, 1],
      [-11.5, 20.0, 6.8, 6.4, 2],
      [-11.5, 29.5, 6.6, 6.2, 1],
      [11.5, 20.0, 6.8, 6.4, 2],
      [11.5, 29.5, 6.6, 6.2, 1],
    ]
    innerBlocks.forEach(([bx, bz, bw, bd, st], idx) => buildCityHouse(bx, bz, bw, bd, st, idx))

    const outerBlocks: [number, number, number, number, number][] = [
      [-34.5, -12.5, 8.2, 7.4, 2],
      [-34.5, -26.5, 8.0, 7.2, 2],
      [34.5, -12.5, 8.2, 7.4, 2],
      [34.5, -26.5, 8.0, 7.2, 2],
      [-34.5, 12.5, 8.2, 7.4, 2],
      [-34.5, 26.5, 8.0, 7.2, 2],
      [34.5, 12.5, 8.2, 7.4, 2],
      [34.5, 26.5, 8.0, 7.2, 2],
    ]
    outerBlocks.forEach(([bx, bz, bw, bd, st], idx) => buildCityHouse(bx, bz, bw, bd, st, idx + 1))

    // Market stalls framing the Central Town Plaza
    const awningColors = ['#c94038', '#2d6bc4', '#d99b26', '#2e856e']
    const stallCorners: [number, number][] = [
      [-10.5, -10.5],
      [10.5, -10.5],
      [-10.5, 10.5],
      [10.5, 10.5],
    ]
    stallCorners.forEach(([sx, sz], idx) => {
      const stall = new THREE.Group()
      stall.position.set(sx, 0, sz)
      cityGroup.add(stall)
      addBlock(stall, woodMat, 2.4, 0.95, 1.6, 0, 0.475, 0, 1.6, false)
      addCollider(sx, sz, 2.4, 1.6, 0.95)
      for (const px of [-1.05, 1.05]) {
        for (const pz of [-0.65, 0.65]) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), darkWoodMat)
          post.position.set(px, 1.2, pz)
          stall.add(post)
        }
      }
      const canopy = new THREE.Mesh(
        new THREE.BoxGeometry(2.7, 0.14, 2.0),
        new THREE.MeshStandardMaterial({ color: awningColors[idx % awningColors.length], roughness: 0.8 }),
      )
      canopy.position.set(0, 2.42, 0)
      canopy.rotation.x = sz > 0 ? 0.12 : -0.12
      canopy.castShadow = true
      canopy.receiveShadow = true
      stall.add(canopy)
    })

    // Signature Sakura Torii Gates or Marble Triumphal Arches on Main Avenue
    if (map.cityStyle === 'sakura' || map.cityStyle === 'marble') {
      const archMat = map.cityStyle === 'sakura' ? vermilionMat : plasterMat
      for (const az of [-15, 15]) {
        for (const side of [-1, 1]) {
          const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 5.2, 12), archMat)
          pillar.position.set(side * 4.4, 2.6, az)
          pillar.castShadow = true
          pillar.receiveShadow = true
          cityGroup.add(pillar)
          addCollider(side * 4.4, az, 0.8, 0.8, 5.2)
        }
        const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.45, 0.65), archMat)
        crossBeam.position.set(0, 5.1, az)
        crossBeam.castShadow = true
        crossBeam.receiveShadow = true
        cityGroup.add(crossBeam)
      }
    }

    // Low tactical street crates along avenues
    for (const [bx, bz] of [
      [-24.2, -8],
      [24.2, 8],
      [-19.8, 14],
      [19.8, -14],
    ]) {
      addBlock(cityGroup, woodMat, 1.5, 1.0, 1.5, bx, 0.5, bz, 1.5, true)
    }
  }

  // Street braziers / lanterns illuminating the Central Plaza & Avenues
  for (const [lx, lz] of [
    [cityCenter.x - 6.8, cityCenter.z - 8.5],
    [cityCenter.x + 6.8, cityCenter.z - 8.5],
    [cityCenter.x - 6.8, cityCenter.z + 8.5],
    [cityCenter.x + 6.8, cityCenter.z + 8.5],
    [-17.2, 0],
    [17.2, 0],
    [-26.8, -22],
    [26.8, -22],
    [-26.8, 22],
    [26.8, 22],
  ]) {
    if (!colliders.some((c) => c.box.containsPoint(new THREE.Vector3(lx, 0.5, lz)))) {
      addBrazier(cityGroup, lx, 0, lz)
    }
  }

  // Central City Town Plaza Flagpole & Stage-1 Capture / Forward Resupply Circle
  const cityFlagTopY = 11.2
  const cityFlagBottomY = 2.0
  const cityPole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 12.4, 10), ironMat)
  cityPole.position.set(cityCenter.x, 6.2, cityCenter.z)
  cityPole.castShadow = true
  cityGroup.add(cityPole)
  const cityFinial = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8), goldMat)
  cityFinial.position.set(cityCenter.x, 12.5, cityCenter.z)
  cityGroup.add(cityFinial)
  const cityPedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.35, 0.55, 16), stoneMat)
  cityPedestal.position.set(cityCenter.x, 0.275, cityCenter.z)
  cityPedestal.receiveShadow = true
  cityGroup.add(cityPedestal)
  addCollider(cityCenter.x, cityCenter.z, 2.2, 2.2, 0.55)

  const cityRedFlag = new THREE.Group()
  cityRedFlag.add(makeFlag('red', 0.7))
  cityRedFlag.position.set(cityCenter.x + 0.12, cityFlagTopY, cityCenter.z)
  cityGroup.add(cityRedFlag)

  const cityBlueFlag = new THREE.Group()
  cityBlueFlag.add(makeFlag('blue', 1.9))
  cityBlueFlag.position.set(cityCenter.x + 0.12, cityFlagBottomY, cityCenter.z)
  cityBlueFlag.visible = false
  cityGroup.add(cityBlueFlag)

  const cityRing = new THREE.Mesh(
    new THREE.RingGeometry(CITY_CAPTURE_RADIUS - 0.35, CITY_CAPTURE_RADIUS, 72),
    new THREE.MeshBasicMaterial({ color: '#f2c14e', transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
  )
  cityRing.rotation.x = -Math.PI / 2
  cityRing.position.set(cityCenter.x, 0.07, cityCenter.z)
  cityGroup.add(cityRing)

  const cityDisc = new THREE.Mesh(
    new THREE.CircleGeometry(CITY_CAPTURE_RADIUS - 0.35, 64),
    new THREE.MeshBasicMaterial({ color: '#f2c14e', transparent: true, opacity: 0.14, depthWrite: false }),
  )
  cityDisc.rotation.x = -Math.PI / 2
  cityDisc.position.set(cityCenter.x, 0.06, cityCenter.z)
  cityGroup.add(cityDisc)

  // Red Fort Final Conquest Capture Circle
  const captureRing = new THREE.Mesh(
    new THREE.RingGeometry(CAPTURE_RADIUS - 0.35, CAPTURE_RADIUS, 72),
    new THREE.MeshBasicMaterial({ color: '#f2c14e', transparent: true, opacity: 0.45, side: THREE.DoubleSide }),
  )
  captureRing.rotation.x = -Math.PI / 2
  captureRing.position.set(0, 0.07, RED_Z)
  root.add(captureRing)
  const captureDisc = new THREE.Mesh(
    new THREE.CircleGeometry(CAPTURE_RADIUS - 0.35, 64),
    new THREE.MeshBasicMaterial({ color: '#f2c14e', transparent: true, opacity: 0.08, depthWrite: false }),
  )
  captureDisc.rotation.x = -Math.PI / 2
  captureDisc.position.set(0, 0.06, RED_Z)
  root.add(captureDisc)

  // Blue Ring Spawn & Resupply Ring
  const customBluePos = customLayout ? blueSpawnWorldPos(customLayout) : { x: 12, z: BLUE_Z }
  const resupplyPosition = new THREE.Vector3(customBluePos.x, 0, customBluePos.z)
  const resupplyRing = new THREE.Mesh(
    new THREE.RingGeometry(3.6, 4, 56),
    new THREE.MeshBasicMaterial({ color: '#58a6ff', transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
  )
  resupplyRing.rotation.x = -Math.PI / 2
  resupplyRing.position.set(resupplyPosition.x, 0.07, resupplyPosition.z)
  root.add(resupplyRing)
  addBlock(root, woodMat, 1.2, 1, 1.2, resupplyPosition.x + 1.4, 0.5, resupplyPosition.z + 1.2, 1.2, false)
  addBlock(root, woodMat, 1.2, 1, 1.2, resupplyPosition.x - 1.3, 0.5, resupplyPosition.z + 1.4, 1.2, false)

  // =========================================================================
  // BIOME HAZARDS (Ice Canals + Triple Bridges, Magma Fissures, or Fen Pools)
  // =========================================================================
  if (map.hazardKind === 'ice') {
    const iceTex = createLiquidTexture('ice')
    iceTex.repeat.set(32, 1.5)
    const iceMat = new THREE.MeshStandardMaterial({ map: iceTex, roughness: 0.2, metalness: 0.18, color: '#a8daf7' })
    for (const cz of [-64, 64]) {
      const canal = new THREE.Mesh(new THREE.PlaneGeometry(760, 14), iceMat)
      canal.rotation.x = -Math.PI / 2
      canal.position.set(0, 0.022, cz)
      canal.receiveShadow = true
      root.add(canal)

      // Block walking onto deep canal ice except across the 3 Stone Bridges aligned with cityAvenues (-22, 0, +22)
      for (const [segX, segW] of [
        [-88, 122],
        [-11, 12],
        [11, 12],
        [88, 122],
      ]) {
        addCollider(segX, cz, segW, 13.5, 4, true)
      }

      for (const bx of cityAvenues) {
        const bw = bx === 0 ? 10 : 8.5
        const deck = new THREE.Mesh(scaleBoxUVs(new THREE.BoxGeometry(bw, 0.4, 16), bw, 0.4, 16, 3), stoneMat)
        deck.position.set(bx, -0.14, cz)
        deck.receiveShadow = true
        root.add(deck)
        for (const side of [-1, 1]) {
          addBlock(root, stoneMat, 0.6, 1.0, 15.5, bx + side * (bw / 2 - 0.3), 0.5, cz, 2.5, true)
        }
      }
    }
  } else if (map.hazardKind === 'magma' || map.hazardKind === 'bog') {
    const liqTex = createLiquidTexture(map.hazardKind)
    liqTex.repeat.set(6, 3)
    const liqMat =
      map.hazardKind === 'magma'
        ? new THREE.MeshStandardMaterial({ map: liqTex, emissive: '#ff4800', emissiveIntensity: 1.15, roughness: 0.55 })
        : new THREE.MeshStandardMaterial({ map: liqTex, roughness: 0.25, metalness: 0.15, color: '#436954' })
    for (const side of [-1, 1]) {
      for (const pz of [-78, 0, 78]) {
        const px = side * (pz === 0 ? 64 : 44)
        const pool = new THREE.Mesh(new THREE.PlaneGeometry(26, 20), liqMat)
        pool.rotation.x = -Math.PI / 2
        pool.position.set(px, 0.025, pz)
        root.add(pool)
        addCollider(px, pz, 26, 20, 4, true)
      }
    }
  }

  // =========================================================================
  // OUTSKIRTS SIEGE BARRICADES (North & South Glacis between Forts and City)
  // =========================================================================
  const logMat = new THREE.MeshStandardMaterial({ color: '#6b4e35', roughness: 0.9 })
  const outskirtLogs: [number, number, number][] = [
    [-14, 102, 0.18],
    [15, 92, -0.16],
    [-26, 78, 0.12],
    [26, 76, -0.14],
    [-14, -76, -0.15],
    [15, -84, 0.16],
    [-25, -96, 0.2],
    [25, -102, -0.2],
    [-9, -112, 0.08],
    [9, -112, -0.08],
  ]
  for (const [lx, lz, rot] of outskirtLogs) {
    const group = new THREE.Group()
    group.position.set(lx, 0, lz)
    group.rotation.y = rot
    for (let i = 0; i < 2; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 5, 10), logMat)
      log.rotation.z = Math.PI / 2
      log.position.y = 0.3 + i * 0.5
      log.castShadow = true
      log.receiveShadow = true
      group.add(log)
    }
    for (let sx = -2; sx <= 2; sx += 1) {
      const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 1.6, 6), logMat)
      stake.position.set(sx, 0.7, 0.35)
      stake.rotation.x = 0.6
      group.add(stake)
    }
    root.add(group)
    colliders.push({
      box: new THREE.Box3(new THREE.Vector3(lx - 2.5, 0, lz - 0.55), new THREE.Vector3(lx + 2.5, 1.0, lz + 0.55)),
      low: true,
    })
  }

  // =========================================================================
  // HORIZON MOUNTAINS / MESAS / HILLS & BIOME FORESTS
  // =========================================================================
  const hillMat = new THREE.MeshStandardMaterial({ color: map.hillColor, roughness: 0.96, flatShading: true })
  const snowPeakMat = new THREE.MeshStandardMaterial({ color: '#edf5fc', roughness: 0.85, flatShading: true })
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2 + Math.random() * 0.18
    const r = 385 + Math.random() * 65
    const hx = Math.cos(a) * r
    const hz = Math.sin(a) * r
    if (map.id === 'frost' || map.id === 'moonlit' || map.id === 'tundra') {
      const h = 72 + Math.random() * 55
      const rad = 52 + Math.random() * 34
      const cone = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 7), hillMat)
      cone.position.set(hx, h / 2 - 5, hz)
      root.add(cone)
      if (map.id === 'frost') {
        const cap = new THREE.Mesh(new THREE.ConeGeometry(rad * 0.45, h * 0.44, 7), snowPeakMat)
        cap.position.set(hx, h * 0.79 - 5, hz)
        root.add(cap)
      }
    } else if (map.id === 'canyon' || map.id === 'desert') {
      const h = 45 + Math.random() * 44
      const rad = 46 + Math.random() * 35
      const mesa = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.64, rad, h, 8), hillMat)
      mesa.position.set(hx, h / 2 - 5, hz)
      root.add(mesa)
    } else {
      const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 10), hillMat)
      hill.scale.set(75 + Math.random() * 60, 26 + Math.random() * 32, 75 + Math.random() * 55)
      hill.position.set(hx, -6, hz)
      root.add(hill)
    }
  }

  const inProtectedZone = (x: number, z: number, margin: number) =>
    (Math.abs(x) < FORT_HALF + margin && Math.abs(z - BLUE_Z) < FORT_HALF + margin) ||
    (Math.abs(x) < FORT_HALF + margin && Math.abs(z - RED_Z) < FORT_HALF + margin) ||
    (Math.abs(x) < CITY_HALF_X + margin && Math.abs(z - CITY_Z) < CITY_HALF_Z + margin) ||
    (map.hazardKind === 'ice' && (Math.abs(z - 64) < 10 || Math.abs(z + 64) < 10))

  const nearCollider = (x: number, z: number, margin: number) =>
    colliders.some(
      (c) => x > c.box.min.x - margin && x < c.box.max.x + margin && z > c.box.min.z - margin && z < c.box.max.z + margin,
    )

  const scatter = (count: number, minAbsX: number, maxAbsX: number, margin: number) => {
    const out: [number, number][] = []
    let guard = 0
    while (out.length < count && guard++ < count * 35) {
      const x = (Math.random() < 0.5 ? -1 : 1) * (minAbsX + Math.random() * (maxAbsX - minAbsX))
      const z = (Math.random() - 0.5) * 430
      if (inProtectedZone(x, z, margin)) continue
      if (nearCollider(x, z, 2.5)) continue
      out.push([x, z])
    }
    return out
  }

  const dummy = new THREE.Object3D()
  const colorTmp = new THREE.Color()
  const treeSpots = scatter(120, 32, 175, 7)

  if (map.treeStyle === 'pine' || map.treeStyle === 'cypress') {
    const isCypress = map.treeStyle === 'cypress'
    const trunkMesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.2, 0.35, 3.0, 6),
      new THREE.MeshStandardMaterial({ color: '#4a3525', roughness: 1 }),
      treeSpots.length,
    )
    const coneMesh = new THREE.InstancedMesh(
      new THREE.ConeGeometry(isCypress ? 1.15 : 2.2, isCypress ? 6.2 : 3.8, 7),
      new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92, flatShading: true }),
      treeSpots.length * (isCypress ? 1 : 2),
    )
    treeSpots.forEach(([x, z], i) => {
      const s = 0.85 + Math.random() * 0.7
      dummy.position.set(x, 1.4 * s, z)
      dummy.scale.set(s, s, s)
      dummy.rotation.set(0, Math.random() * 6, 0)
      dummy.updateMatrix()
      trunkMesh.setMatrixAt(i, dummy.matrix)
      if (isCypress) {
        dummy.position.set(x, 4.6 * s, z)
        dummy.scale.set(s, s, s)
        dummy.updateMatrix()
        coneMesh.setMatrixAt(i, dummy.matrix)
        coneMesh.setColorAt(i, colorTmp.set(map.foliagePalette[i % map.foliagePalette.length]))
      } else {
        for (let t = 0; t < 2; t++) {
          const ts = s * (1.05 - t * 0.25)
          dummy.position.set(x, (3.2 + t * 2.0) * s, z)
          dummy.scale.set(ts, ts, ts)
          dummy.updateMatrix()
          coneMesh.setMatrixAt(i * 2 + t, dummy.matrix)
          coneMesh.setColorAt(i * 2 + t, colorTmp.set(map.foliagePalette[(i + t) % map.foliagePalette.length]))
        }
      }
    })
    trunkMesh.computeBoundingSphere()
    coneMesh.computeBoundingSphere()
    trunkMesh.castShadow = true
    coneMesh.castShadow = true
    coneMesh.receiveShadow = true
    root.add(trunkMesh, coneMesh)
  } else if (map.treeStyle === 'palm') {
    const trunkMesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.18, 0.34, 5.2, 7),
      new THREE.MeshStandardMaterial({ color: '#7a593b', roughness: 0.95 }),
      treeSpots.length,
    )
    const frondMesh = new THREE.InstancedMesh(
      new THREE.ConeGeometry(2.4, 1.3, 6),
      new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.88, flatShading: true }),
      treeSpots.length,
    )
    treeSpots.forEach(([x, z], i) => {
      const s = 0.85 + Math.random() * 0.65
      dummy.position.set(x, 2.5 * s, z)
      dummy.scale.set(s, s, s)
      dummy.rotation.set((Math.random() - 0.5) * 0.14, Math.random() * 6, (Math.random() - 0.5) * 0.14)
      dummy.updateMatrix()
      trunkMesh.setMatrixAt(i, dummy.matrix)
      dummy.position.set(x, 5.2 * s, z)
      dummy.scale.set(s * 1.15, s * 0.75, s * 1.15)
      dummy.rotation.set(0, Math.random() * 6, 0)
      dummy.updateMatrix()
      frondMesh.setMatrixAt(i, dummy.matrix)
      frondMesh.setColorAt(i, colorTmp.set(map.foliagePalette[i % map.foliagePalette.length]))
    })
    trunkMesh.computeBoundingSphere()
    frondMesh.computeBoundingSphere()
    trunkMesh.castShadow = true
    frondMesh.castShadow = true
    root.add(trunkMesh, frondMesh)
  } else if (map.treeStyle === 'snag') {
    const snagMesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.14, 0.36, 4.2, 6),
      new THREE.MeshStandardMaterial({ color: '#2b1e19', roughness: 1 }),
      treeSpots.length,
    )
    treeSpots.forEach(([x, z], i) => {
      const s = 0.8 + Math.random() * 0.8
      dummy.position.set(x, 2.0 * s, z)
      dummy.scale.set(s, s, s)
      dummy.rotation.set((Math.random() - 0.5) * 0.2, Math.random() * 6, (Math.random() - 0.5) * 0.2)
      dummy.updateMatrix()
      snagMesh.setMatrixAt(i, dummy.matrix)
    })
    snagMesh.computeBoundingSphere()
    snagMesh.castShadow = true
    root.add(snagMesh)
  } else {
    const trunkMesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.28, 0.42, 3.4, 7),
      new THREE.MeshStandardMaterial({ color: '#5b3f28', roughness: 1 }),
      treeSpots.length,
    )
    const foliageMesh = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(2.3, 1),
      new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, flatShading: true }),
      treeSpots.length * 2,
    )
    treeSpots.forEach(([x, z], i) => {
      const s = 0.8 + Math.random() * 0.7
      dummy.position.set(x, 1.7 * s, z)
      dummy.scale.set(s, s, s)
      dummy.rotation.set(0, Math.random() * 6, 0)
      dummy.updateMatrix()
      trunkMesh.setMatrixAt(i, dummy.matrix)
      for (let k = 0; k < 2; k++) {
        dummy.position.set(x + (Math.random() - 0.5) * 0.6, (3.8 + k * 1.7) * s, z + (Math.random() - 0.5) * 0.6)
        const fs = s * (1.15 - k * 0.3)
        dummy.scale.set(fs, fs * 1.05, fs)
        dummy.updateMatrix()
        foliageMesh.setMatrixAt(i * 2 + k, dummy.matrix)
        foliageMesh.setColorAt(i * 2 + k, colorTmp.set(map.foliagePalette[Math.floor(Math.random() * map.foliagePalette.length)]))
      }
    })
    trunkMesh.computeBoundingSphere()
    foliageMesh.computeBoundingSphere()
    trunkMesh.castShadow = true
    foliageMesh.castShadow = true
    foliageMesh.receiveShadow = true
    root.add(trunkMesh, foliageMesh)
  }

  // Scattered rocks
  const rockSpots = scatter(120, 12, 155, 3)
  const rockMesh = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.7, 0),
    new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.94, flatShading: true }),
    rockSpots.length,
  )
  rockSpots.forEach(([x, z], i) => {
    const s = 0.45 + Math.random() * 1.15
    dummy.position.set(x, 0.18 * s, z)
    dummy.scale.set(s * (0.85 + Math.random() * 0.5), s * 0.65, s)
    dummy.rotation.set(Math.random(), Math.random() * 6, Math.random())
    dummy.updateMatrix()
    rockMesh.setMatrixAt(i, dummy.matrix)
    const g = map.id === 'canyon' ? 0.28 + Math.random() * 0.16 : 0.48 + Math.random() * 0.22
    rockMesh.setColorAt(i, colorTmp.setRGB(g, g * 0.97, g * 0.94))
  })
  rockMesh.computeBoundingSphere()
  rockMesh.castShadow = true
  rockMesh.receiveShadow = true
  root.add(rockMesh)

  // =========================================================================
  // GARRISON POSTS (34 Red Defenders: 12 City + 8 North Glacis + 14 Red Fort)
  // =========================================================================
  const redPosts: RedPostDef[] = []
  // 14 Red Fort defenders
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    redPosts.push({ pos: new THREE.Vector3(Math.cos(a) * 9, 0, RED_Z + Math.sin(a) * 9), leash: 22 })
  }
  redPosts.push(
    { pos: new THREE.Vector3(-5, 0, RED_Z - 10), leash: 22 },
    { pos: new THREE.Vector3(5, 0, RED_Z - 10), leash: 22 },
    { pos: new THREE.Vector3(-3, 0, RED_Z + 20), leash: 22 },
    { pos: new THREE.Vector3(3, 0, RED_Z + 20), leash: 22 },
    { pos: new THREE.Vector3(-9, 0, RED_Z + 19), leash: 22 },
    { pos: new THREE.Vector3(9, 0, RED_Z + 19), leash: 22 },
  )
  // 8 Northern Glacis defenders between City North Gate and Red Fort
  const glacisSpots: [number, number][] = [
    [-18, -74],
    [0, -72],
    [18, -74],
    [-10, -92],
    [10, -92],
    [-20, -106],
    [0, -110],
    [20, -106],
  ]
  for (const [gx, gz] of glacisSpots) {
    redPosts.push({ pos: new THREE.Vector3(gx, 0, gz), leash: 30 })
  }
  // 12 Central City Garrison defenders (anchored around cityCenter + 3 Avenues + South Gates)
  const cityGarrisonSpots: [number, number, number][] = [
    [cityCenter.x - 4.5, cityCenter.z - 4.5, 24],
    [cityCenter.x + 4.5, cityCenter.z - 4.5, 24],
    [cityCenter.x - 4.5, cityCenter.z + 4.5, 24],
    [cityCenter.x + 4.5, cityCenter.z + 4.5, 24],
    [-22, 36, 26],
    [0, 36, 26],
    [22, 36, 26],
    [-22, -16, 28],
    [22, -16, 28],
    [-15, 0, 26],
    [15, 0, 26],
    [0, -34, 28],
  ]
  for (const [cx, cz, leash] of cityGarrisonSpots) {
    if (!colliders.some((c) => c.box.containsPoint(new THREE.Vector3(cx, 0.5, cz)))) {
      redPosts.push({ pos: new THREE.Vector3(cx, 0, cz), leash })
    }
  }

  const playerSpawnPos = customLayout
    ? new THREE.Vector3(resupplyPosition.x, 0, Math.min(BLUE_Z + 18, resupplyPosition.z - 4))
    : new THREE.Vector3(0, 0, BLUE_Z - 10)

  const blueSpawnOffsets: [number, number][] = []
  for (let i = 0; i < 14; i++) {
    blueSpawnOffsets.push([-12 + (i % 7) * 4, -14 - Math.floor(i / 7) * 3.5])
  }

  // 8 Outward-facing Red Fort crossbows (default battlements or custom layout)
  const frontWallZ = RED_Z + FORT_HALF
  const crossbowDefs: [number, number, number, number, number][] = customLayout
    ? customLayout.crossbows.map((c) => {
        const def = crossbowCellToWorldDef(c)
        const [bx, by, bz] = def
        // If mounted outside the main Red Fort walls, build a fortified stone turret pedestal underneath
        if (by < WALL_H - 0.5) {
          const bastion = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.5, by, 14), stoneMat)
          bastion.position.set(bx, by / 2, bz)
          bastion.castShadow = true
          bastion.receiveShadow = true
          root.add(bastion)
          const rim = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.15, 0.55, 14), stoneMat)
          rim.position.set(bx, by - 0.1, bz)
          rim.castShadow = true
          rim.receiveShadow = true
          root.add(rim)
          addCollider(bx, bz, 4.4, 4.4, by)
        }
        return def
      })
    : [
        [-FORT_HALF, TOWER_H + 0.65, frontWallZ, -0.65, 1],
        [FORT_HALF, TOWER_H + 0.65, frontWallZ, 0.65, 1],
        [-16, WALL_H + 0.1, frontWallZ, -0.15, 1],
        [-8, WALL_H + 0.1, frontWallZ, 0, 1],
        [8, WALL_H + 0.1, frontWallZ, 0, 1],
        [16, WALL_H + 0.1, frontWallZ, 0.15, 1],
        [-FORT_HALF, WALL_H + 0.1, RED_Z + 12, -1, 0],
        [FORT_HALF, WALL_H + 0.1, RED_Z + 12, 1, 0],
      ]

  return {
    map,
    isCustom: Boolean(customLayout),
    root,
    sky,
    colliders,
    cityAvenues,
    redPosts,
    playerSpawnPos,
    blueSpawnOffsets,
    crossbowDefs,
    redFlag: redFlagGroup,
    blueCaptureFlag: blueCaptureGroup,
    captureRing,
    captureDisc,
    cityRedFlag,
    cityBlueFlag,
    cityRing,
    cityDisc,
    resupplyRing,
    resupplyPosition,
    cityCenter,
    flagTopY,
    flagBottomY,
    cityFlagTopY,
    cityFlagBottomY,
    update: (t: number) => {
      for (const f of flags) f.update(t)
      const pulse = 0.5 + Math.sin(t * 3) * 0.5
      ;(resupplyRing.material as THREE.MeshBasicMaterial).opacity = 0.55 + pulse * 0.4
      for (let i = 0; i < flameMeshes.length; i++) {
        const flicker = 0.88 + Math.sin(t * 11 + i * 1.7) * 0.14
        flameMeshes[i].scale.set(flicker, 0.9 + Math.cos(t * 14 + i) * 0.2, flicker)
      }
    },
    dispose: () => {
      scene.remove(root)
      const geometries = new Set<THREE.BufferGeometry>()
      const materials = new Set<THREE.Material>()
      const textures = new Set<THREE.Texture>()
      root.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh || obj instanceof THREE.Line) {
          if (obj.geometry) geometries.add(obj.geometry)
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
          for (const m of mats) {
            if (!m) continue
            materials.add(m)
            const std = m as THREE.MeshStandardMaterial
            if (std.map) textures.add(std.map)
            if (std.emissiveMap) textures.add(std.emissiveMap)
          }
        }
      })
      for (const g of geometries) g.dispose()
      for (const m of materials) m.dispose()
      for (const tex of textures) tex.dispose()
    },
  }
}
