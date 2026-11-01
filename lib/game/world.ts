import * as THREE from 'three'
import {
  BLUE_Z,
  CAPTURE_RADIUS,
  FORT_HALF,
  GATE_HALF,
  RED_Z,
  TOWER_H,
  TOWER_R,
  WALL_H,
  WALL_T,
} from './constants'
import {
  createAshSandTexture,
  createBasaltStoneTexture,
  createDirtTexture,
  createFrostStoneTexture,
  createGrassTexture,
  createIceTexture,
  createMagmaTexture,
  createSnowTexture,
  createStoneTexture,
  createWoodTexture,
  scaleBoxUVs,
} from './textures'

export const MAP_IDS = ['valley', 'frost', 'canyon'] as const
export type MapId = (typeof MAP_IDS)[number]

export interface MapSpec {
  id: MapId
  name: string
  subtitle: string
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
}

export const MAP_SPECS: Record<MapId, MapSpec> = {
  valley: {
    id: 'valley',
    name: 'Verdant Valley',
    subtitle: 'Sunlit meadow road and timber breastworks',
    skyTop: '#2f6fd0',
    skyMid: '#8fbbe8',
    skyHorizon: '#f2d6ad',
    skyBottom: '#b9c7a8',
    sunDiscColor: '#fff3d6',
    fogColor: '#e6d6bb',
    fogNear: 110,
    fogFar: 430,
    hemiSky: '#bcd8ff',
    hemiGround: '#5b6b3a',
    hemiIntensity: 0.85,
    sunColor: '#fff0d6',
    sunIntensity: 2.6,
    sunDir: [-0.6, 0.45, 0.66],
  },
  frost: {
    id: 'frost',
    name: 'Frostspire Crossing',
    subtitle: 'Twin arched stone bridges over a frozen alpine gorge',
    skyTop: '#1d4378',
    skyMid: '#76a7d4',
    skyHorizon: '#dae9f7',
    skyBottom: '#9db4c9',
    sunDiscColor: '#f5fbff',
    fogColor: '#d0e2f2',
    fogNear: 95,
    fogFar: 415,
    hemiSky: '#d4ebff',
    hemiGround: '#6b7f94',
    hemiIntensity: 0.95,
    sunColor: '#fff8ec',
    sunIntensity: 2.45,
    sunDir: [0.56, 0.48, 0.67],
  },
  canyon: {
    id: 'canyon',
    name: 'Scorched Basalt',
    subtitle: 'Shattered center keep and molten canyon fissures',
    skyTop: '#22162b',
    skyMid: '#7a3328',
    skyHorizon: '#e38246',
    skyBottom: '#42251d',
    sunDiscColor: '#ffd194',
    fogColor: '#b36b4c',
    fogNear: 95,
    fogFar: 395,
    hemiSky: '#ffb085',
    hemiGround: '#3d2822',
    hemiIntensity: 0.9,
    sunColor: '#ffca8a',
    sunIntensity: 2.75,
    sunDir: [-0.65, 0.38, 0.65],
  },
}

/** Uniformly selects 1 of the 3 maps with an exact 1/3 probability each round. */
export function pickRandomMap(): MapId {
  return MAP_IDS[Math.floor(Math.random() * MAP_IDS.length)]
}

export interface Collider {
  box: THREE.Box3
  low: boolean
  movementOnly?: boolean
}

export interface CrossingConfig {
  halfBandZ: number
  bridgeXs: number[]
  bridgeHalfW: number
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
  root: THREE.Group
  sky: THREE.Mesh
  colliders: Collider[]
  crossing: CrossingConfig | null
  redPosts: RedPostDef[]
  blueSpawnOffsets: [number, number][]
  crossbowDefs: [number, number, number, number, number][]
  redFlag: THREE.Object3D
  blueCaptureFlag: THREE.Object3D
  captureRing: THREE.Mesh
  captureDisc: THREE.Mesh
  resupplyRing: THREE.Mesh
  resupplyPosition: THREE.Vector3
  flagTopY: number
  flagBottomY: number
  update: (t: number) => void
  dispose: () => void
}

const teamColors = {
  blue: { cloth: '#1f5fc4', roof: '#28467a', trim: '#e3b448' },
  red: { cloth: '#b4232a', roof: '#7a2525', trim: '#2b2b2b' },
}

export function buildWorld(scene: THREE.Scene, mapId: MapId = 'valley'): WorldRefs {
  const map = MAP_SPECS[mapId]
  const root = new THREE.Group()
  root.name = `world-${mapId}`
  scene.add(root)

  const colliders: Collider[] = []
  const flags: WavingFlag[] = []
  const flameMeshes: THREE.Mesh[] = []

  const dirtTex = createDirtTexture()
  const woodTex = createWoodTexture()
  const stoneTex =
    mapId === 'frost' ? createFrostStoneTexture() : mapId === 'canyon' ? createBasaltStoneTexture() : createStoneTexture()

  const stoneTint = mapId === 'frost' ? '#dde6f0' : mapId === 'canyon' ? '#d4c4bc' : '#e9e4d8'
  const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.9, color: stoneTint })
  const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.85 })
  const darkWoodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.85, color: '#6b4a32' })
  const ironMat = new THREE.MeshStandardMaterial({ color: '#2f3236', metalness: 0.75, roughness: 0.42 })
  const emberMat = new THREE.MeshStandardMaterial({
    color: '#ff9d3b',
    emissive: '#ff5d0a',
    emissiveIntensity: 1.8,
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
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.9, 8), ironMat)
    pedestal.position.y = 0.45
    pedestal.castShadow = true
    stand.add(pedestal)
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.26, 0.36, 10), ironMat)
    bowl.position.y = 1.02
    bowl.castShadow = true
    stand.add(bowl)
    const flame = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 0), emberMat)
    flame.position.y = 1.28
    stand.add(flame)
    flameMeshes.push(flame)
    parent.add(stand)
  }

  const makeFlag = (color: string, phase: number) => {
    const geo = new THREE.PlaneGeometry(3.2, 2, 16, 8)
    geo.translate(1.6, 0, 0)
    const mat = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.8 })
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
  const sky = new THREE.Mesh(new THREE.SphereGeometry(800, 32, 16), skyMat)
  sky.renderOrder = -1
  sky.name = 'sky'
  root.add(sky)

  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(18, 16, 8),
    new THREE.MeshBasicMaterial({ color: map.sunDiscColor, fog: false }),
  )
  const sunPos = new THREE.Vector3(...map.sunDir).normalize().multiplyScalar(620)
  sun.position.copy(sunPos)
  sky.add(sun)

  // Forts
  const redFlagGroup = new THREE.Group()
  const blueCaptureGroup = new THREE.Group()
  const flagTopY = 12.8
  const flagBottomY = 2.2

  const yardColor = mapId === 'frost' ? '#cfd8e3' : mapId === 'canyon' ? '#9e7f6e' : '#d9cbb4'

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
    const roofMat = new THREE.MeshStandardMaterial({ color: colors.roof, roughness: 0.7 })
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
          const roof = new THREE.Mesh(new THREE.ConeGeometry(TOWER_R + 0.9, 5, 20), roofMat)
          roof.position.set(tx, TOWER_H + 3.1, tz)
          roof.castShadow = true
          fort.add(roof)
          const pennantPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4), ironMat)
          pennantPole.position.set(tx, TOWER_H + 6.6, tz)
          fort.add(pennantPole)
          const pennant = makeFlag(colors.cloth, tx + tz)
          pennant.scale.set(0.4, 0.35, 0.4)
          pennant.position.set(tx, TOWER_H + 7.4, tz)
          fort.add(pennant)
        }
      }
    }

    // Gate frame with raised iron portcullis
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.7, 6.6, 0.9), darkWoodMat)
      post.position.set(side * (GATE_HALF - 0.3), 3.3, frontZ + s * (WALL_T / 2 + 0.3))
      post.castShadow = true
      fort.add(post)
      if (mapId !== 'valley') {
        addBrazier(fort, side * (GATE_HALF + 1.8), 0, frontZ + s * (WALL_T / 2 + 1.2))
      }
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(GATE_HALF * 2 + 0.6, 0.7, 0.9), darkWoodMat)
    beam.position.set(0, 6.6, frontZ + s * (WALL_T / 2 + 0.3))
    beam.castShadow = true
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
    const keepRoof = new THREE.Mesh(new THREE.ConeGeometry(11, 5, 4), roofMat)
    keepRoof.rotation.y = Math.PI / 4
    keepRoof.scale.set(1, 1, 0.55)
    keepRoof.position.set(0, 13.5, keepZ)
    keepRoof.castShadow = true
    fort.add(keepRoof)
    const door = new THREE.Mesh(new THREE.BoxGeometry(3, 4.5, 0.3), darkWoodMat)
    door.position.set(0, 2.25, keepZ + s * 4.6)
    fort.add(door)
    const bannerMat = new THREE.MeshStandardMaterial({ color: colors.cloth, roughness: 0.85, side: THREE.DoubleSide })
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
      new THREE.MeshStandardMaterial({ map: yardTex, roughness: 1, color: yardColor }),
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
    const finial = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 12, 8),
      new THREE.MeshStandardMaterial({ color: '#d4a53c', metalness: 0.8, roughness: 0.3 }),
    )
    finial.position.set(0, 14.1, cz)
    fort.add(finial)
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 0.6, 16), stoneMat)
    base.position.set(0, 0.3, cz)
    base.receiveShadow = true
    fort.add(base)

    if (team === 'blue') {
      const flag = makeFlag(teamColors.blue.cloth, 0)
      flag.position.set(0.12, flagTopY, cz)
      fort.add(flag)
    } else {
      const red = makeFlag(teamColors.red.cloth, 1.3)
      redFlagGroup.add(red)
      redFlagGroup.position.set(0.12, flagTopY, cz)
      fort.add(redFlagGroup)
      const blue = makeFlag(teamColors.blue.cloth, 2.1)
      blueCaptureGroup.add(blue)
      blueCaptureGroup.position.set(0.12, flagBottomY, cz)
      blueCaptureGroup.visible = false
      fort.add(blueCaptureGroup)
    }
  }

  buildFort(BLUE_Z, 'blue')
  buildFort(RED_Z, 'red')

  // Capture circle
  const captureRing = new THREE.Mesh(
    new THREE.RingGeometry(CAPTURE_RADIUS - 0.35, CAPTURE_RADIUS, 72),
    new THREE.MeshBasicMaterial({ color: '#f2c14e', transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
  )
  captureRing.rotation.x = -Math.PI / 2
  captureRing.position.set(0, 0.07, RED_Z)
  root.add(captureRing)
  const captureDisc = new THREE.Mesh(
    new THREE.CircleGeometry(CAPTURE_RADIUS - 0.35, 64),
    new THREE.MeshBasicMaterial({ color: '#f2c14e', transparent: true, opacity: 0.12, depthWrite: false }),
  )
  captureDisc.rotation.x = -Math.PI / 2
  captureDisc.position.set(0, 0.06, RED_Z)
  root.add(captureDisc)

  // Resupply ring
  const resupplyPosition = new THREE.Vector3(12, 0, BLUE_Z)
  const resupplyRing = new THREE.Mesh(
    new THREE.RingGeometry(3.6, 4, 56),
    new THREE.MeshBasicMaterial({ color: '#58a6ff', transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
  )
  resupplyRing.rotation.x = -Math.PI / 2
  resupplyRing.position.set(resupplyPosition.x, 0.07, resupplyPosition.z)
  root.add(resupplyRing)
  addBlock(root, woodMat, 1.2, 1, 1.2, resupplyPosition.x + 1.4, 0.5, resupplyPosition.z + 1.2, 1.2, false)
  addBlock(root, woodMat, 1.2, 1, 1.2, resupplyPosition.x - 1.3, 0.5, resupplyPosition.z + 1.4, 1.2, false)

  // Shared helpers
  const inFortArea = (x: number, z: number, margin: number) =>
    (Math.abs(x) < FORT_HALF + margin && Math.abs(z - BLUE_Z) < FORT_HALF + margin) ||
    (Math.abs(x) < FORT_HALF + margin && Math.abs(z - RED_Z) < FORT_HALF + margin)

  const nearCollider = (x: number, z: number, margin: number) =>
    colliders.some(
      (c) => x > c.box.min.x - margin && x < c.box.max.x + margin && z > c.box.min.z - margin && z < c.box.max.z + margin,
    )

  const dummy = new THREE.Object3D()
  const colorTmp = new THREE.Color()

  const addLogBarricade = (x: number, z: number, rot: number, mat: THREE.Material) => {
    const group = new THREE.Group()
    group.position.set(x, 0, z)
    group.rotation.y = rot
    for (let i = 0; i < 2; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 5, 10), mat)
      log.rotation.z = Math.PI / 2
      log.position.y = 0.3 + i * 0.5
      log.castShadow = true
      log.receiveShadow = true
      group.add(log)
    }
    for (let sx = -2; sx <= 2; sx += 1) {
      const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 1.6, 6), mat)
      stake.position.set(sx, 0.7, 0.35)
      stake.rotation.x = 0.6
      stake.castShadow = true
      group.add(stake)
    }
    root.add(group)
    colliders.push({
      box: new THREE.Box3(new THREE.Vector3(x - 2.5, 0, z - 0.55), new THREE.Vector3(x + 2.5, 1.0, z + 0.55)),
      low: true,
    })
  }

  // Base Red courtyard & gatehouse defender posts (14 defenders)
  const makeCourtyardRedPosts = (): RedPostDef[] => {
    const out: RedPostDef[] = []
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      out.push({ pos: new THREE.Vector3(Math.cos(a) * 9, 0, RED_Z + Math.sin(a) * 9), leash: 20 })
    }
    out.push(
      { pos: new THREE.Vector3(-5, 0, RED_Z - 10), leash: 20 },
      { pos: new THREE.Vector3(5, 0, RED_Z - 10), leash: 20 },
      { pos: new THREE.Vector3(-3, 0, RED_Z + 20), leash: 20 },
      { pos: new THREE.Vector3(3, 0, RED_Z + 20), leash: 20 },
      { pos: new THREE.Vector3(-9, 0, RED_Z + 19), leash: 20 },
      { pos: new THREE.Vector3(9, 0, RED_Z + 19), leash: 20 },
    )
    return out
  }

  const frontWallZ = RED_Z + FORT_HALF
  let crossing: CrossingConfig | null = null
  const redPosts: RedPostDef[] = makeCourtyardRedPosts()
  const blueSpawnOffsets: [number, number][] = []
  for (let i = 0; i < 12; i++) {
    blueSpawnOffsets.push([-10 + (i % 6) * 4, -14 - Math.floor(i / 6) * 3])
  }

  let crossbowDefs: [number, number, number, number, number][] = [
    [-FORT_HALF, TOWER_H + 0.65, frontWallZ, -1, 1],
    [FORT_HALF, TOWER_H + 0.65, frontWallZ, 1, 1],
    [-10, WALL_H + 0.1, frontWallZ, 0, 1],
    [10, WALL_H + 0.1, frontWallZ, 0, 1],
    [-FORT_HALF, WALL_H + 0.1, RED_Z + 12, -1, 0],
    [FORT_HALF, WALL_H + 0.1, RED_Z + 12, 1, 0],
  ]

  // =========================================================================
  // MAP 1: VERDANT VALLEY
  // =========================================================================
  if (mapId === 'valley') {
    const grassTex = createGrassTexture()
    grassTex.repeat.set(90, 90)
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(700, 700),
      new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    root.add(ground)

    const roadTex = dirtTex.clone()
    roadTex.needsUpdate = true
    roadTex.repeat.set(1.5, 32)
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 196),
      new THREE.MeshStandardMaterial({ map: roadTex, roughness: 1 }),
    )
    road.rotation.x = -Math.PI / 2
    road.position.y = 0.02
    road.receiveShadow = true
    root.add(road)

    const hillMat = new THREE.MeshStandardMaterial({ color: '#4f7a3a', roughness: 1 })
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + Math.random() * 0.2
      const r = 360 + Math.random() * 60
      const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10), hillMat)
      hill.scale.set(70 + Math.random() * 60, 25 + Math.random() * 30, 70 + Math.random() * 50)
      hill.position.set(Math.cos(a) * r, -6, Math.sin(a) * r)
      root.add(hill)
    }

    const crateSpots: [number, number][] = [
      [-13, 62],
      [15, 48],
      [-22, 28],
      [20, 14],
      [-12, -6],
      [26, -22],
      [-18, -42],
      [13, -58],
      [-30, 75],
      [32, -70],
    ]
    for (const [x, z] of crateSpots) {
      addBlock(root, woodMat, 1.7, 1.7, 1.7, x, 0.85, z, 1.7)
      addBlock(root, woodMat, 1.7, 1.7, 1.7, x + 1.75, 0.85, z + 0.3, 1.7)
      addBlock(root, woodMat, 1.5, 1.5, 1.5, x + 0.9, 2.45, z + 0.1, 1.5, false)
    }

    const logMat = new THREE.MeshStandardMaterial({ color: '#7a5a3c', roughness: 0.9 })
    const logSpots: [number, number, number][] = [
      [-26, 50, 0.2],
      [10, 34, -0.15],
      [-9, 18, 0.1],
      [24, 4, 0.3],
      [-24, -14, -0.2],
      [9, -30, 0.15],
      [-11, -68, 0],
      [22, -46, -0.25],
    ]
    for (const [x, z, rot] of logSpots) addLogBarricade(x, z, rot, logMat)

    const scatter = (count: number, minAbsX: number, maxAbsX: number, fortMargin: number) => {
      const out: [number, number][] = []
      let guard = 0
      while (out.length < count && guard++ < count * 30) {
        const x = (Math.random() < 0.5 ? -1 : 1) * (minAbsX + Math.random() * (maxAbsX - minAbsX))
        const z = (Math.random() - 0.5) * 360
        if (inFortArea(x, z, fortMargin)) continue
        if (nearCollider(x, z, 2)) continue
        out.push([x, z])
      }
      return out
    }

    const treeSpots = scatter(110, 34, 160, 8)
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
    const foliageColors = ['#3f6f2c', '#4c7d33', '#2f5e26', '#5a8a3c']
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
        foliageMesh.setColorAt(i * 2 + k, colorTmp.set(foliageColors[Math.floor(Math.random() * foliageColors.length)]))
      }
    })
    trunkMesh.computeBoundingSphere()
    foliageMesh.computeBoundingSphere()
    trunkMesh.castShadow = true
    foliageMesh.castShadow = true
    foliageMesh.receiveShadow = true
    root.add(trunkMesh, foliageMesh)

    const bushSpots = scatter(160, 7, 120, 3)
    const bushMesh = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(0.9, 1),
      new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true }),
      bushSpots.length,
    )
    bushSpots.forEach(([x, z], i) => {
      const s = 0.6 + Math.random() * 0.8
      dummy.position.set(x, 0.35 * s, z)
      dummy.scale.set(s * 1.3, s * 0.8, s * 1.2)
      dummy.rotation.set(0, Math.random() * 6, 0)
      dummy.updateMatrix()
      bushMesh.setMatrixAt(i, dummy.matrix)
      bushMesh.setColorAt(i, colorTmp.set(foliageColors[i % foliageColors.length]).offsetHSL(0, 0, 0.04))
    })
    bushMesh.computeBoundingSphere()
    bushMesh.castShadow = true
    bushMesh.receiveShadow = true
    root.add(bushMesh)

    const rockSpots = scatter(100, 6, 130, 2)
    const rockMesh = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(0.6, 0),
      new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, flatShading: true }),
      rockSpots.length,
    )
    rockSpots.forEach(([x, z], i) => {
      const s = 0.4 + Math.random() * 1.1
      dummy.position.set(x, 0.15 * s, z)
      dummy.scale.set(s * (0.8 + Math.random() * 0.6), s * 0.6, s)
      dummy.rotation.set(Math.random(), Math.random() * 6, Math.random())
      dummy.updateMatrix()
      rockMesh.setMatrixAt(i, dummy.matrix)
      const g = 0.45 + Math.random() * 0.2
      rockMesh.setColorAt(i, colorTmp.setRGB(g, g * 0.97, g * 0.92))
    })
    rockMesh.computeBoundingSphere()
    rockMesh.castShadow = true
    rockMesh.receiveShadow = true
    root.add(rockMesh)

    const flowerSpots = scatter(700, 5.5, 110, 1)
    const flowerMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.12, 6, 4),
      new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 }),
      flowerSpots.length,
    )
    const flowerColors = ['#f4e04d', '#f2f2f2', '#e86fa3', '#b48cf0', '#f39a3b']
    flowerSpots.forEach(([x, z], i) => {
      dummy.position.set(x, 0.18, z)
      dummy.scale.setScalar(0.8 + Math.random() * 0.6)
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      flowerMesh.setMatrixAt(i, dummy.matrix)
      flowerMesh.setColorAt(i, colorTmp.set(flowerColors[Math.floor(Math.random() * flowerColors.length)]))
    })
    flowerMesh.computeBoundingSphere()
    root.add(flowerMesh)

    for (let i = 0; i < 8; i++) {
      redPosts.push({
        pos: new THREE.Vector3(-14 + (i % 4) * 9.3 + (Math.random() - 0.5) * 2, 0, RED_Z + 34 + Math.floor(i / 4) * 12),
        leash: 28,
      })
    }
  }

  // =========================================================================
  // MAP 2: FROSTSPIRE CROSSING (Twin Bridges over Frozen Alpine Gorge)
  // =========================================================================
  else if (mapId === 'frost') {
    crossing = { halfBandZ: 15.5, bridgeXs: [-18, 18], bridgeHalfW: 2.6 }

    const snowTex = createSnowTexture()
    snowTex.repeat.set(85, 85)
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(700, 700),
      new THREE.MeshStandardMaterial({ map: snowTex, roughness: 0.92 }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    root.add(ground)

    // Frozen river channel cutting east-west across z in [-14, 14]
    const iceTex = createIceTexture()
    iceTex.repeat.set(36, 2)
    const riverMat = new THREE.MeshStandardMaterial({
      map: iceTex,
      roughness: 0.2,
      metalness: 0.18,
      color: '#a8daf7',
    })
    const river = new THREE.Mesh(new THREE.PlaneGeometry(700, 28), riverMat)
    river.rotation.x = -Math.PI / 2
    river.position.set(0, 0.025, 0)
    river.receiveShadow = true
    root.add(river)

    // Snow/stone riverbanks along z = -14.2 and z = +14.2 (excluding bridges)
    const bankMat = new THREE.MeshStandardMaterial({ color: '#b7c7d8', roughness: 0.95 })
    const bankSegments: [number, number][] = [
      [-86, 126],
      [0, 27],
      [86, 126],
    ]
    for (const [bx, bw] of bankSegments) {
      for (const bz of [-14.2, 14.2]) {
        const bank = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.45, 1.4), bankMat)
        bank.position.set(bx, 0.12, bz)
        bank.receiveShadow = true
        root.add(bank)
      }
      // Block soldiers & player from walking onto the deep frozen river while allowing projectiles & sightlines
      addCollider(bx, 0, bw, 28, 4, true)
    }

    // Twin cobblestone approaches & bridges at x = -18 and x = +18
    const cobbleTex = stoneTex.clone()
    cobbleTex.needsUpdate = true
    cobbleTex.repeat.set(1.4, 18)
    const roadMat = new THREE.MeshStandardMaterial({
      map: cobbleTex,
      roughness: 0.95,
      color: '#95a3b3',
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })

    // Approach spurs from Blue & Red gates out to the Twin Bridges
    for (const gateSide of [-1, 1]) {
      const stem = new THREE.Mesh(new THREE.PlaneGeometry(8, 32), roadMat)
      stem.rotation.x = -Math.PI / 2
      stem.position.set(0, 0.02, gateSide * 79)
      stem.receiveShadow = true
      root.add(stem)

      for (const bridgeSide of [-1, 1]) {
        const lane = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 52), roadMat)
        lane.rotation.x = -Math.PI / 2
        lane.rotation.z = bridgeSide * gateSide * 0.34
        lane.position.set(bridgeSide * 9.5, 0.02, gateSide * 41)
        lane.receiveShadow = true
        root.add(lane)
      }
    }

    // Build Twin Arched Stone Bridges at x = -18 and x = +18
    for (const bx of [-18, 18]) {
      const bridge = new THREE.Group()
      root.add(bridge)

      // Flat walkable cobble roadway
      const deckGeo = scaleBoxUVs(new THREE.BoxGeometry(8.4, 0.5, 32), 8.4, 0.5, 32, 3.5)
      const deck = new THREE.Mesh(deckGeo, stoneMat)
      deck.position.set(bx, -0.19, 0)
      deck.receiveShadow = true
      bridge.add(deck)

      // Stone arch piers beneath bridge edges
      for (const pz of [-9.5, 0, 9.5]) {
        for (const px of [-3.9, 3.9]) {
          const pier = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.85, 1.3, 10), stoneMat)
          pier.position.set(bx + px, 0.35, pz)
          pier.castShadow = true
          bridge.add(pier)
        }
      }

      // Low crenellated stone parapets along both sides of the bridge (low: true cover!)
      for (const side of [-1, 1]) {
        const px = bx + side * 4.0
        addBlock(bridge, stoneMat, 0.65, 1.05, 30, px, 0.525, 0, 3, true)
        for (let mz = -12; mz <= 12; mz += 4) {
          addBlock(bridge, stoneMat, 0.72, 0.32, 1.3, px, 1.18, mz, 2, false)
        }
        // Bridgehead towers / pillars with flaming braziers
        for (const endZ of [-15.8, 15.8]) {
          addBlock(bridge, stoneMat, 1.35, 2.2, 1.35, px, 1.1, endZ, 2.5, true)
          addBrazier(bridge, px, 2.2, endZ)
        }
      }
    }

    // Shattered center bridge ruins on both banks (sniper cover overlooking the river)
    for (const bankSide of [-1, 1]) {
      const rz = bankSide * 16.5
      addBlock(root, stoneMat, 5.2, 1.05, 1.1, 0, 0.525, rz, 3, true)
      addBlock(root, stoneMat, 1.4, 2.4, 1.4, -3.2, 1.2, rz + bankSide * 0.5, 2.5, true)
      addBlock(root, stoneMat, 1.4, 1.9, 1.4, 3.2, 0.95, rz + bankSide * 0.5, 2.5, true)
    }

    // Floating ice floes on the river
    const floeCount = 46
    const floeMesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(1.4, 1.6, 0.22, 7),
      new THREE.MeshStandardMaterial({ color: '#e6f2fc', roughness: 0.65, flatShading: true }),
      floeCount,
    )
    let fi = 0
    for (let i = 0; i < floeCount * 3 && fi < floeCount; i++) {
      const fx = (Math.random() - 0.5) * 240
      if (Math.abs(fx - -18) < 7 || Math.abs(fx - 18) < 7) continue
      const fz = (Math.random() - 0.5) * 21
      const s = 0.6 + Math.random() * 1.2
      dummy.position.set(fx, 0.04, fz)
      dummy.scale.set(s * 1.2, 1, s * 0.85)
      dummy.rotation.set(0, Math.random() * 6, 0)
      dummy.updateMatrix()
      floeMesh.setMatrixAt(fi++, dummy.matrix)
    }
    floeMesh.count = fi
    floeMesh.computeBoundingSphere()
    floeMesh.receiveShadow = true
    root.add(floeMesh)

    // Frost stone breastworks & supply sled barricades on north and south approaches
    const frostWallSpots: [number, number, number][] = [
      [-26, 46, 0.2],
      [26, 46, -0.2],
      [-10, 34, -0.15],
      [10, 34, 0.15],
      [-27, -36, -0.2],
      [27, -36, 0.2],
      [-11, -54, 0.15],
      [11, -54, -0.15],
      [0, -70, 0],
      [0, 62, 0],
    ]
    for (const [wx, wz, rot] of frostWallSpots) {
      addLogBarricade(wx, wz, rot, darkWoodMat)
    }

    const crateSpots: [number, number][] = [
      [-28, 66],
      [28, 66],
      [-8, 48],
      [8, 48],
      [-28, -62],
      [28, -62],
      [-14, -78],
      [14, -78],
    ]
    for (const [x, z] of crateSpots) {
      addBlock(root, stoneMat, 1.8, 1.6, 1.8, x, 0.8, z, 2)
      addBlock(root, woodMat, 1.4, 1.4, 1.4, x + 1.6, 0.7, z + 0.3, 1.4)
    }

    // Towering snow-capped alpine mountains on the horizon
    const mountainMat = new THREE.MeshStandardMaterial({ color: '#6b7f96', roughness: 0.95, flatShading: true })
    const peakSnowMat = new THREE.MeshStandardMaterial({ color: '#edf5fc', roughness: 0.85, flatShading: true })
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2 + Math.random() * 0.15
      const r = 355 + Math.random() * 65
      const h = 75 + Math.random() * 55
      const rad = 52 + Math.random() * 35
      const mGroup = new THREE.Group()
      mGroup.position.set(Math.cos(a) * r, -4, Math.sin(a) * r)
      const baseCone = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 7), mountainMat)
      baseCone.position.y = h / 2
      mGroup.add(baseCone)
      const snowCap = new THREE.Mesh(new THREE.ConeGeometry(rad * 0.46, h * 0.44, 7), peakSnowMat)
      snowCap.position.y = h * 0.79
      mGroup.add(snowCap)
      mGroup.rotation.y = Math.random() * Math.PI
      root.add(mGroup)
    }

    // Snow-laden pine forest (InstancedMesh trunk + 2 pine tiers + snow tier)
    const scatterFrost = (count: number, minAbsX: number, maxAbsX: number, fortMargin: number) => {
      const out: [number, number][] = []
      let guard = 0
      while (out.length < count && guard++ < count * 35) {
        const x = (Math.random() < 0.5 ? -1 : 1) * (minAbsX + Math.random() * (maxAbsX - minAbsX))
        const z = (Math.random() - 0.5) * 360
        if (Math.abs(z) < 20) continue
        if (inFortArea(x, z, fortMargin)) continue
        if (nearCollider(x, z, 2.5)) continue
        out.push([x, z])
      }
      return out
    }

    const pineSpots = scatterFrost(125, 34, 165, 8)
    const pineTrunk = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.22, 0.38, 3.2, 6),
      new THREE.MeshStandardMaterial({ color: '#4a3525', roughness: 1 }),
      pineSpots.length,
    )
    const pineNeedles = new THREE.InstancedMesh(
      new THREE.ConeGeometry(2.2, 3.6, 7),
      new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92, flatShading: true }),
      pineSpots.length * 2,
    )
    const pineSnow = new THREE.InstancedMesh(
      new THREE.ConeGeometry(1.5, 1.5, 7),
      new THREE.MeshStandardMaterial({ color: '#eef6ff', roughness: 0.85, flatShading: true }),
      pineSpots.length,
    )
    const pineColors = ['#234236', '#2c4f40', '#1d382d', '#355c4b']
    pineSpots.forEach(([x, z], i) => {
      const s = 0.85 + Math.random() * 0.75
      dummy.position.set(x, 1.5 * s, z)
      dummy.scale.set(s, s, s)
      dummy.rotation.set(0, Math.random() * 6, 0)
      dummy.updateMatrix()
      pineTrunk.setMatrixAt(i, dummy.matrix)

      for (let tier = 0; tier < 2; tier++) {
        const ts = s * (1.05 - tier * 0.26)
        dummy.position.set(x, (3.2 + tier * 2.0) * s, z)
        dummy.scale.set(ts, ts, ts)
        dummy.updateMatrix()
        pineNeedles.setMatrixAt(i * 2 + tier, dummy.matrix)
        pineNeedles.setColorAt(i * 2 + tier, colorTmp.set(pineColors[(i + tier) % pineColors.length]))
      }

      dummy.position.set(x, 6.1 * s, z)
      dummy.scale.set(s * 0.78, s * 0.78, s * 0.78)
      dummy.updateMatrix()
      pineSnow.setMatrixAt(i, dummy.matrix)
    })
    pineTrunk.computeBoundingSphere()
    pineNeedles.computeBoundingSphere()
    pineSnow.computeBoundingSphere()
    pineTrunk.castShadow = true
    pineNeedles.castShadow = true
    pineNeedles.receiveShadow = true
    pineSnow.castShadow = true
    root.add(pineTrunk, pineNeedles, pineSnow)

    // Frosted granite boulders
    const rockSpots = scatterFrost(110, 8, 135, 3)
    const rockMesh = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(0.75, 0),
      new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, flatShading: true }),
      rockSpots.length,
    )
    rockSpots.forEach(([x, z], i) => {
      const s = 0.5 + Math.random() * 1.2
      dummy.position.set(x, 0.2 * s, z)
      dummy.scale.set(s * 1.2, s * 0.75, s)
      dummy.rotation.set(Math.random(), Math.random() * 6, Math.random())
      dummy.updateMatrix()
      rockMesh.setMatrixAt(i, dummy.matrix)
      const g = 0.58 + Math.random() * 0.2
      rockMesh.setColorAt(i, colorTmp.setRGB(g * 0.92, g * 0.97, g * 1.04))
    })
    rockMesh.computeBoundingSphere()
    rockMesh.castShadow = true
    rockMesh.receiveShadow = true
    root.add(rockMesh)

    // Station forward Red defenders directly guarding BOTH bridges + northern approaches (8 vanguard = 22 total)
    const bridgeVanguard: [number, number, number][] = [
      [-20, -23, 26],
      [-16, -23, 26],
      [-18, -34, 28],
      [16, -23, 26],
      [20, -23, 26],
      [18, -34, 28],
      [-9, -68, 26],
      [9, -68, 26],
    ]
    for (const [rx, rz, leash] of bridgeVanguard) {
      redPosts.push({ pos: new THREE.Vector3(rx, 0, rz), leash })
    }

    // Angle Red front-wall crossbows slightly outward to cover both bridge exits
    crossbowDefs = [
      [-FORT_HALF, TOWER_H + 0.65, frontWallZ, -0.55, 1],
      [FORT_HALF, TOWER_H + 0.65, frontWallZ, 0.55, 1],
      [-12, WALL_H + 0.1, frontWallZ, -0.2, 1],
      [12, WALL_H + 0.1, frontWallZ, 0.2, 1],
      [-FORT_HALF, WALL_H + 0.1, RED_Z + 12, -1, 0],
      [FORT_HALF, WALL_H + 0.1, RED_Z + 12, 1, 0],
    ]
  }

  // =========================================================================
  // MAP 3: SCORCHED BASALT (Shattered Center Keep & Molten Canyon Fissures)
  // =========================================================================
  else {
    const ashTex = createAshSandTexture()
    ashTex.repeat.set(85, 85)
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(700, 700),
      new THREE.MeshStandardMaterial({ map: ashTex, roughness: 0.98 }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    root.add(ground)

    // Dark flagstone siege causeway linking the forts through the central ruined keep
    const causewayTex = stoneTex.clone()
    causewayTex.needsUpdate = true
    causewayTex.repeat.set(2, 34)
    const causeway = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 196),
      new THREE.MeshStandardMaterial({
        map: causewayTex,
        roughness: 0.95,
        color: '#80685c',
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    )
    causeway.rotation.x = -Math.PI / 2
    causeway.position.y = 0.02
    causeway.receiveShadow = true
    root.add(causeway)

    // Central Shattered Watchtower Ruins (x in [-12, 12], z in [-14, 14]) — wide clear central & flanking lanes
    const ruinFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 26),
      new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.95, color: '#6e5a50' }),
    )
    ruinFloor.rotation.x = -Math.PI / 2
    ruinFloor.position.set(0, 0.03, 0)
    ruinFloor.receiveShadow = true
    root.add(ruinFloor)

    for (const side of [-1, 1]) {
      // Broken outer side walls with wide central breach
      addBlock(root, stoneMat, 1.5, 4.2, 8.5, side * 11.2, 2.1, -7.5, 3, true)
      addBlock(root, stoneMat, 1.5, 3.4, 8.5, side * 11.2, 1.7, 7.5, 3, true)
      // Ruined corner pillars + flaming braziers
      addBlock(root, stoneMat, 2.4, 5.8, 2.4, side * 11.2, 2.9, -12.2, 3, true)
      addBlock(root, stoneMat, 2.4, 5.2, 2.4, side * 11.2, 2.6, 12.2, 3, true)
      addBrazier(root, side * 11.2, 5.8, -12.2)
      addBrazier(root, side * 11.2, 5.2, 12.2)
      // Low steppable stone cover blocks inside the ruin arena (leaves x in [-3.8, 3.8] wide open)
      addBlock(root, stoneMat, 2.8, 1.0, 1.1, side * 5.8, 0.5, -6.5, 2.5, true)
      addBlock(root, stoneMat, 2.8, 1.0, 1.1, side * 5.8, 0.5, 6.5, 2.5, true)
    }

    // Flanking Molten Magma Fissures on outer mid-wings (x in [-62, -26] and [26, 62])
    const magmaTex = createMagmaTexture()
    magmaTex.repeat.set(6, 2)
    const magmaMat = new THREE.MeshStandardMaterial({
      map: magmaTex,
      emissive: '#ff4800',
      emissiveIntensity: 1.15,
      roughness: 0.55,
    })
    const crustMat = new THREE.MeshStandardMaterial({ color: '#2b1d19', roughness: 0.95, flatShading: true })

    for (const side of [-1, 1]) {
      const fx = side * 44
      const lavaPool = new THREE.Mesh(new THREE.PlaneGeometry(36, 16), magmaMat)
      lavaPool.rotation.x = -Math.PI / 2
      lavaPool.position.set(fx, 0.03, 0)
      root.add(lavaPool)
      // Block movement into molten lava while keeping projectiles & sightlines unobstructed
      addCollider(fx, 0, 36, 16, 4, true)

      // Jagged basalt rim boulders bordering the fissure
      for (let rx = -17; rx <= 17; rx += 3.4) {
        for (const rz of [-8.2, 8.2]) {
          const rim = new THREE.Mesh(new THREE.DodecahedronGeometry(1.05, 0), crustMat)
          rim.position.set(fx + rx, 0.25, rz + (Math.random() - 0.5) * 0.6)
          rim.scale.set(1.3, 0.55, 0.95)
          rim.rotation.y = Math.random() * 6
          rim.receiveShadow = true
          root.add(rim)
        }
      }
    }

    // Basalt monolith columns & iron-staked barricades along northern and southern canyon approaches
    const monolithSpots: [number, number, number][] = [
      [-20, 56, 6.5],
      [21, 52, 7.2],
      [-23, 28, 5.8],
      [22, 26, 6.2],
      [-21, -28, 6.8],
      [22, -30, 6.0],
      [-19, -58, 7.4],
      [20, -60, 6.6],
    ]
    for (const [mx, mz, mh] of monolithSpots) {
      const col = new THREE.Group()
      col.position.set(mx, 0, mz)
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.55, mh, 6), crustMat)
      shaft.position.y = mh / 2
      shaft.castShadow = true
      shaft.receiveShadow = true
      col.add(shaft)
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.2, 1.4, 6), crustMat)
      cap.position.y = mh + 0.6
      cap.castShadow = true
      col.add(cap)
      root.add(col)
      addCollider(mx, mz, 2.8, 2.8, mh)
    }

    // Braziers flanking the siege causeway
    for (const bz of [-72, -42, 42, 72]) {
      addBrazier(root, -6.5, 0, bz)
      addBrazier(root, 6.5, 0, bz)
    }

    const charredWoodMat = new THREE.MeshStandardMaterial({ color: '#3d2a20', roughness: 0.95 })
    const barricadeSpots: [number, number, number][] = [
      [-13, 64, 0.15],
      [14, 48, -0.18],
      [-15, 36, -0.1],
      [15, 34, 0.12],
      [-14, -36, 0.12],
      [14, -38, -0.15],
      [-12, -52, -0.1],
      [13, -68, 0.1],
    ]
    for (const [bx, bz, rot] of barricadeSpots) addLogBarricade(bx, bz, rot, charredWoodMat)

    // Canyon mesas & glowing volcanic cones around the horizon
    const mesaMat = new THREE.MeshStandardMaterial({ color: '#613829', roughness: 0.98, flatShading: true })
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2 + Math.random() * 0.18
      const r = 350 + Math.random() * 65
      const h = 48 + Math.random() * 46
      const rad = 46 + Math.random() * 36
      const mesa = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.62, rad, h, 8), mesaMat)
      mesa.position.set(Math.cos(a) * r, h / 2 - 6, Math.sin(a) * r)
      mesa.rotation.y = Math.random() * Math.PI
      root.add(mesa)
      if (i % 7 === 0) {
        const rimGlow = new THREE.Mesh(
          new THREE.RingGeometry(rad * 0.18, rad * 0.45, 12),
          new THREE.MeshBasicMaterial({ color: '#ff6a1a', side: THREE.DoubleSide }),
        )
        rimGlow.rotation.x = -Math.PI / 2
        rimGlow.position.set(mesa.position.x, h - 5.5, mesa.position.z)
        root.add(rimGlow)
      }
    }

    // Charred ironwood snags & volcanic basalt rocks
    const scatterCanyon = (count: number, minAbsX: number, maxAbsX: number, fortMargin: number) => {
      const out: [number, number][] = []
      let guard = 0
      while (out.length < count && guard++ < count * 35) {
        const x = (Math.random() < 0.5 ? -1 : 1) * (minAbsX + Math.random() * (maxAbsX - minAbsX))
        const z = (Math.random() - 0.5) * 360
        if (Math.abs(z) < 18 && Math.abs(x) < 68) continue
        if (inFortArea(x, z, fortMargin)) continue
        if (nearCollider(x, z, 2.5)) continue
        out.push([x, z])
      }
      return out
    }

    const snagSpots = scatterCanyon(75, 28, 155, 8)
    const snagTrunk = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.14, 0.36, 4.2, 6),
      new THREE.MeshStandardMaterial({ color: '#2b1e19', roughness: 1 }),
      snagSpots.length,
    )
    const snagBranch = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.06, 0.14, 2.0, 5),
      new THREE.MeshStandardMaterial({ color: '#2b1e19', roughness: 1 }),
      snagSpots.length,
    )
    snagSpots.forEach(([x, z], i) => {
      const s = 0.8 + Math.random() * 0.8
      dummy.position.set(x, 2.0 * s, z)
      dummy.scale.set(s, s, s)
      dummy.rotation.set((Math.random() - 0.5) * 0.18, Math.random() * 6, (Math.random() - 0.5) * 0.18)
      dummy.updateMatrix()
      snagTrunk.setMatrixAt(i, dummy.matrix)

      dummy.position.set(x + 0.3 * s, 3.1 * s, z)
      dummy.rotation.set(0.4, Math.random() * 6, 0.65)
      dummy.updateMatrix()
      snagBranch.setMatrixAt(i, dummy.matrix)
    })
    snagTrunk.computeBoundingSphere()
    snagBranch.computeBoundingSphere()
    snagTrunk.castShadow = true
    snagBranch.castShadow = true
    root.add(snagTrunk, snagBranch)

    const rockSpots = scatterCanyon(140, 8, 145, 3)
    const rockMesh = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(0.8, 0),
      new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, flatShading: true }),
      rockSpots.length,
    )
    rockSpots.forEach(([x, z], i) => {
      const s = 0.5 + Math.random() * 1.35
      dummy.position.set(x, 0.22 * s, z)
      dummy.scale.set(s * 1.15, s * 0.7, s)
      dummy.rotation.set(Math.random(), Math.random() * 6, Math.random())
      dummy.updateMatrix()
      rockMesh.setMatrixAt(i, dummy.matrix)
      const g = 0.24 + Math.random() * 0.18
      rockMesh.setColorAt(i, colorTmp.setRGB(g * 1.25, g * 0.88, g * 0.76))
    })
    rockMesh.computeBoundingSphere()
    rockMesh.castShadow = true
    rockMesh.receiveShadow = true
    root.add(rockMesh)

    // Forward Red vanguard holding the Central Shattered Ruins & Canyon Passes (8 vanguard = 22 total)
    const canyonVanguard: [number, number, number][] = [
      [-6, -10, 28],
      [6, -10, 28],
      [0, -22, 28],
      [-16, -24, 28],
      [16, -24, 28],
      [-9, -58, 26],
      [9, -58, 26],
      [0, -76, 24],
    ]
    for (const [rx, rz, leash] of canyonVanguard) {
      redPosts.push({ pos: new THREE.Vector3(rx, 0, rz), leash })
    }
  }

  return {
    map,
    root,
    sky,
    colliders,
    crossing,
    redPosts,
    blueSpawnOffsets,
    crossbowDefs,
    redFlag: redFlagGroup,
    blueCaptureFlag: blueCaptureGroup,
    captureRing,
    captureDisc,
    resupplyRing,
    resupplyPosition,
    flagTopY,
    flagBottomY,
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
