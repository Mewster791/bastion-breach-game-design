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
  createDirtTexture,
  createGrassTexture,
  createStoneTexture,
  createWoodTexture,
  scaleBoxUVs,
} from './textures'

export interface Collider {
  box: THREE.Box3
  low: boolean
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
  colliders: Collider[]
  redFlag: THREE.Object3D
  blueCaptureFlag: THREE.Object3D
  captureRing: THREE.Mesh
  captureDisc: THREE.Mesh
  resupplyRing: THREE.Mesh
  resupplyPosition: THREE.Vector3
  flagTopY: number
  flagBottomY: number
  update: (t: number) => void
}

const teamColors = {
  blue: { cloth: '#1f5fc4', roof: '#28467a', trim: '#e3b448' },
  red: { cloth: '#b4232a', roof: '#7a2525', trim: '#2b2b2b' },
}

export function buildWorld(scene: THREE.Scene): WorldRefs {
  const colliders: Collider[] = []
  const flags: WavingFlag[] = []

  const grassTex = createGrassTexture()
  const dirtTex = createDirtTexture()
  const stoneTex = createStoneTexture()
  const woodTex = createWoodTexture()

  const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.92, color: '#e9e4d8' })
  const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.85 })
  const darkWoodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.85, color: '#6b4a32' })
  const ironMat = new THREE.MeshStandardMaterial({ color: '#2f3236', metalness: 0.75, roughness: 0.45 })

  const addCollider = (x: number, z: number, w: number, d: number, h: number) => {
    colliders.push({
      box: new THREE.Box3(new THREE.Vector3(x - w / 2, 0, z - d / 2), new THREE.Vector3(x + w / 2, h, z + d / 2)),
      low: h <= 1.15,
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

  // Sky
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color('#2f6fd0') },
      mid: { value: new THREE.Color('#8fbbe8') },
      horizon: { value: new THREE.Color('#f2d6ad') },
      bottom: { value: new THREE.Color('#b9c7a8') },
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
  scene.add(sky)

  // Sun disc
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(18, 16, 8),
    new THREE.MeshBasicMaterial({ color: '#fff3d6', fog: false }),
  )
  sun.position.set(-380, 260, 420)
  sky.add(sun)

  // Ground
  grassTex.repeat.set(90, 90)
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(700, 700),
    new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  // Road
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
  scene.add(road)

  // Distant hills
  const hillMat = new THREE.MeshStandardMaterial({ color: '#4f7a3a', roughness: 1 })
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + Math.random() * 0.2
    const r = 360 + Math.random() * 60
    const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10), hillMat)
    hill.scale.set(70 + Math.random() * 60, 25 + Math.random() * 30, 70 + Math.random() * 50)
    hill.position.set(Math.cos(a) * r, -6, Math.sin(a) * r)
    scene.add(hill)
  }

  // Forts
  const redFlagGroup = new THREE.Group()
  const blueCaptureGroup = new THREE.Group()
  const flagTopY = 12.8
  const flagBottomY = 2.2

  const buildFort = (cz: number, team: 'blue' | 'red') => {
    const fort = new THREE.Group()
    scene.add(fort)
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
      new THREE.MeshStandardMaterial({ map: yardTex, roughness: 1, color: '#d9cbb4' }),
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
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), new THREE.MeshStandardMaterial({ color: '#d4a53c', metalness: 0.8, roughness: 0.3 }))
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
  scene.add(captureRing)
  const captureDisc = new THREE.Mesh(
    new THREE.CircleGeometry(CAPTURE_RADIUS - 0.35, 64),
    new THREE.MeshBasicMaterial({ color: '#f2c14e', transparent: true, opacity: 0.12, depthWrite: false }),
  )
  captureDisc.rotation.x = -Math.PI / 2
  captureDisc.position.set(0, 0.06, RED_Z)
  scene.add(captureDisc)

  // Resupply ring
  const resupplyPosition = new THREE.Vector3(12, 0, BLUE_Z)
  const resupplyRing = new THREE.Mesh(
    new THREE.RingGeometry(3.6, 4, 56),
    new THREE.MeshBasicMaterial({ color: '#58a6ff', transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
  )
  resupplyRing.rotation.x = -Math.PI / 2
  resupplyRing.position.set(resupplyPosition.x, 0.07, resupplyPosition.z)
  scene.add(resupplyRing)
  addBlock(scene, woodMat, 1.2, 1, 1.2, resupplyPosition.x + 1.4, 0.5, resupplyPosition.z + 1.2, 1.2, false)
  addBlock(scene, woodMat, 1.2, 1, 1.2, resupplyPosition.x - 1.3, 0.5, resupplyPosition.z + 1.4, 1.2, false)

  // Barricades in no-man's land (kept off the road)
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
    addBlock(scene, woodMat, 1.7, 1.7, 1.7, x, 0.85, z, 1.7)
    addBlock(scene, woodMat, 1.7, 1.7, 1.7, x + 1.75, 0.85, z + 0.3, 1.7)
    addBlock(scene, woodMat, 1.5, 1.5, 1.5, x + 0.9, 2.45, z + 0.1, 1.5, false)
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
  for (const [x, z, rot] of logSpots) {
    const group = new THREE.Group()
    group.position.set(x, 0, z)
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
      stake.castShadow = true
      group.add(stake)
    }
    scene.add(group)
    colliders.push({
      box: new THREE.Box3(new THREE.Vector3(x - 2.5, 0, z - 0.45), new THREE.Vector3(x + 2.5, 1.0, z + 0.45)),
      low: true,
    })
  }

  // Scatter helpers
  const inFortArea = (x: number, z: number, margin: number) =>
    (Math.abs(x) < FORT_HALF + margin && Math.abs(z - BLUE_Z) < FORT_HALF + margin) ||
    (Math.abs(x) < FORT_HALF + margin && Math.abs(z - RED_Z) < FORT_HALF + margin)
  const nearCollider = (x: number, z: number, margin: number) =>
    colliders.some(
      (c) => x > c.box.min.x - margin && x < c.box.max.x + margin && z > c.box.min.z - margin && z < c.box.max.z + margin,
    )
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
  const dummy = new THREE.Object3D()

  // Trees
  const treeSpots = scatter(110, 34, 160, 8)
  const trunkMesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.28, 0.42, 3.4, 7),
    new THREE.MeshStandardMaterial({ color: '#5b3f28', roughness: 1 }),
    treeSpots.length,
  )
  const foliageGeo = new THREE.IcosahedronGeometry(2.3, 1)
  const foliageMesh = new THREE.InstancedMesh(
    foliageGeo,
    new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, flatShading: true }),
    treeSpots.length * 2,
  )
  const foliageColors = ['#3f6f2c', '#4c7d33', '#2f5e26', '#5a8a3c']
  const c = new THREE.Color()
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
      foliageMesh.setColorAt(i * 2 + k, c.set(foliageColors[Math.floor(Math.random() * foliageColors.length)]))
    }
  })
  trunkMesh.castShadow = true
  foliageMesh.castShadow = true
  foliageMesh.receiveShadow = true
  scene.add(trunkMesh, foliageMesh)

  // Bushes
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
    bushMesh.setColorAt(i, c.set(foliageColors[i % foliageColors.length]).offsetHSL(0, 0, 0.04))
  })
  bushMesh.castShadow = true
  bushMesh.receiveShadow = true
  scene.add(bushMesh)

  // Rocks
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
    rockMesh.setColorAt(i, c.setRGB(g, g * 0.97, g * 0.92))
  })
  rockMesh.castShadow = true
  rockMesh.receiveShadow = true
  scene.add(rockMesh)

  // Flowers
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
    flowerMesh.setColorAt(i, c.set(flowerColors[Math.floor(Math.random() * flowerColors.length)]))
  })
  scene.add(flowerMesh)

  return {
    colliders,
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
    },
  }
}
