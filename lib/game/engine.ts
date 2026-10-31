import * as THREE from 'three'
import {
  BLOCKING_SWORD_MULTIPLIER,
  BLUE_STATS,
  BLUE_Z,
  CAPTURE_RADIUS,
  CAPTURE_TIME,
  CROSSBOW_STATS,
  FORT_HALF,
  GATE_HALF,
  PLAYER_STATS,
  RED_STATS,
  RED_Z,
  SHIELD_BLOCK_REDUCTION,
  TOWER_H,
  WALL_H,
  WEAPON_DAMAGE,
  WORLD_LIMIT_X,
  WORLD_LIMIT_Z,
  isInsideFort,
} from './constants'
import { createCrossbowModel, createSoldierModel, type CrossbowModel, type SoldierModel, type Team, type Weapon } from './models'
import { buildWorld, type Collider, type WorldRefs } from './world'

export type GameState = 'ready' | 'playing' | 'paused' | 'victory' | 'defeat'
export type CaptureStatus = 'idle' | 'capturing' | 'contested'

export interface Toast {
  id: number
  text: string
  tone: 'info' | 'good' | 'bad'
}

export interface HudSnapshot {
  state: GameState
  hp: number
  maxHp: number
  weapon: Weapon
  bullets: number
  arrows: number
  medkits: number
  healing: number | null
  blocking: boolean
  running: boolean
  capture: number
  captureStatus: CaptureStatus
  redAlive: number
  redTotal: number
  blueAlive: number
  crossbowsAlive: number
  crossbowsTotal: number
  insideRedFort: boolean
  inResupply: boolean
  kills: number
  damageAt: number
  hitAt: number
  killAt: number
  toasts: Toast[]
  elapsed: number
  nextReinforcement: number
}

interface Soldier {
  id: number
  team: Team
  isPlayer: boolean
  model: SoldierModel
  pos: THREE.Vector3
  yaw: number
  hp: number
  maxHp: number
  alive: boolean
  deadTime: number
  weapon: Weapon
  bullets: number
  arrows: number
  cooldown: number
  swingTime: number
  swingHit: boolean
  swingBlocking: boolean
  blocking: boolean
  walkPhase: number
  animSpeed: number
  damageMultiplier: number
  speed: number
  post: THREE.Vector3 | null
  leash: number
  target: Soldier | null
  retarget: number
  laneX: number
  stuckCheck: number
  stuckFrom: THREE.Vector3
  sidestep: number
  sidestepTime: number
  aimPitch: number
  recoil: number
}

interface Projectile {
  kind: 'arrow' | 'bolt'
  mesh: THREE.Object3D
  pos: THREE.Vector3
  prev: THREE.Vector3
  vel: THREE.Vector3
  gravity: number
  team: Team
  damage: number
  fromPlayer: boolean
  life: number
  stuck: boolean
}

interface Crossbow {
  model: CrossbowModel
  pivot: THREE.Vector3
  dir: THREE.Vector3
  hp: number
  alive: boolean
  cooldown: number
  deadTime: number
}

interface Effect {
  object: THREE.Object3D
  life: number
  maxLife: number
  vel: THREE.Vector3 | null
  fade: boolean
}

const UP = new THREE.Vector3(0, 1, 0)
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function angleDiff(a: number, b: number) {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}

function raySphere(o: THREE.Vector3, d: THREE.Vector3, c: THREE.Vector3, r: number) {
  const ox = o.x - c.x
  const oy = o.y - c.y
  const oz = o.z - c.z
  const b = ox * d.x + oy * d.y + oz * d.z
  const cc = ox * ox + oy * oy + oz * oz - r * r
  const disc = b * b - cc
  if (disc < 0) return -1
  const sq = Math.sqrt(disc)
  const t = -b - sq
  return t >= 0 ? t : -b + sq
}

const segTmpAB = new THREE.Vector3()
const segTmpAC = new THREE.Vector3()
function segmentSphere(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, r: number) {
  segTmpAB.subVectors(b, a)
  segTmpAC.subVectors(c, a)
  const lenSq = segTmpAB.lengthSq()
  const t = lenSq > 0 ? clamp(segTmpAC.dot(segTmpAB) / lenSq, 0, 1) : 0
  const px = a.x + segTmpAB.x * t - c.x
  const py = a.y + segTmpAB.y * t - c.y
  const pz = a.z + segTmpAB.z * t - c.z
  return px * px + py * py + pz * pz < r * r
}

export class GameEngine {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private sun: THREE.DirectionalLight
  private sunOffset = new THREE.Vector3(-0.6, 0.45, 0.66).normalize().multiplyScalar(140)
  private world: WorldRefs
  private colliders: Collider[]
  private dynamic = new THREE.Group()
  private raf = 0
  private clock = new THREE.Clock()
  private time = 0
  private listeners = new Set<() => void>()
  private snapshot: HudSnapshot
  private lastEmit = 0

  private state: GameState = 'ready'
  private lockFailed = false
  private keys = new Set<string>()
  private primaryDown = false
  private secondaryDown = false
  private camYaw = Math.PI
  private camPitch = 0.05

  private soldiers: Soldier[] = []
  private player!: Soldier
  private playerVy = 0
  private onGround = true
  private medkits = PLAYER_STATS.medkits
  private healRemaining = 0
  private healTime = 0
  private kills = 0
  private damageAt = 0
  private hitAt = 0
  private killAt = 0
  private capture = 0
  private captureStatus: CaptureStatus = 'idle'
  private reinforceTimer = BLUE_STATS.interval
  private resupplyTimer = 0
  private elapsed = 0
  private insideRedFort = false
  private inResupply = false
  private crossbowNoticeShown = false
  private lastAmmoWarning = 0

  private projectiles: Projectile[] = []
  private crossbows: Crossbow[] = []
  private effects: Effect[] = []
  private toasts: (Toast & { expires: number })[] = []
  private toastId = 0
  private nextId = 1

  private arrowGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.9, 5).rotateX(Math.PI / 2)
  private boltGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.3, 6).rotateX(Math.PI / 2)
  private tipGeo = new THREE.ConeGeometry(0.06, 0.18, 6).rotateX(Math.PI / 2).translate(0, 0, 0.5)
  private arrowMat = new THREE.MeshStandardMaterial({ color: '#c8a26a', roughness: 0.7 })
  private boltMat = new THREE.MeshStandardMaterial({ color: '#4a4f55', metalness: 0.6, roughness: 0.4 })
  private particleGeo = new THREE.BoxGeometry(0.09, 0.09, 0.09)
  private bloodMat = new THREE.MeshBasicMaterial({ color: '#8f1515' })
  private sparkMat = new THREE.MeshBasicMaterial({ color: '#ffd27a' })
  private dustMat = new THREE.MeshBasicMaterial({ color: '#9a8a74', transparent: true })
  private flashGeo = new THREE.SphereGeometry(0.16, 8, 6)
  private flashMat = new THREE.MeshBasicMaterial({ color: '#ffe08a', transparent: true })

  private ray = new THREE.Ray()
  private tmp = new THREE.Vector3()
  private tmp2 = new THREE.Vector3()
  private tmp3 = new THREE.Vector3()
  private camDir = new THREE.Vector3()

  constructor(private container: HTMLDivElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.domElement.className = 'block h-full w-full'
    this.renderer.domElement.setAttribute('aria-label', 'Bastion Breach battlefield')
    container.appendChild(this.renderer.domElement)

    this.camera = new THREE.PerspectiveCamera(65, container.clientWidth / container.clientHeight, 0.1, 1200)
    this.scene.fog = new THREE.Fog('#e6d6bb', 110, 430)

    const hemi = new THREE.HemisphereLight('#bcd8ff', '#5b6b3a', 0.85)
    this.scene.add(hemi)
    this.sun = new THREE.DirectionalLight('#fff0d6', 2.6)
    this.sun.castShadow = true
    this.sun.shadow.mapSize.set(2048, 2048)
    this.sun.shadow.camera.left = -55
    this.sun.shadow.camera.right = 55
    this.sun.shadow.camera.top = 55
    this.sun.shadow.camera.bottom = -55
    this.sun.shadow.camera.near = 10
    this.sun.shadow.camera.far = 320
    this.sun.shadow.bias = -0.0004
    this.sun.shadow.normalBias = 0.04
    this.sun.shadow.radius = 3
    this.scene.add(this.sun, this.sun.target)

    this.world = buildWorld(this.scene)
    this.colliders = this.world.colliders
    this.scene.add(this.dynamic)

    this.reset()
    this.snapshot = this.buildSnapshot()
    this.bindInput()
    this.clock.start()
    this.loop()
  }

  // ---------- public API ----------

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  getSnapshot = () => this.snapshot

  start() {
    if (this.state === 'victory' || this.state === 'defeat') this.reset()
    this.state = 'playing'
    this.requestLock()
    this.emit()
  }

  restart() {
    this.reset()
    this.start()
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    this.unbindInput()
    if (document.pointerLockElement === this.renderer.domElement) document.exitPointerLock()
    this.renderer.dispose()
    this.renderer.domElement.remove()
    this.listeners.clear()
  }

  // ---------- setup ----------

  private requestLock() {
    const canvas = this.renderer.domElement
    if (this.lockFailed) return
    try {
      const result = canvas.requestPointerLock() as unknown as Promise<void> | undefined
      if (result && typeof result.catch === 'function') {
        result.catch(() => {
          this.lockFailed = true
        })
      }
    } catch {
      this.lockFailed = true
    }
  }

  private reset() {
    for (const child of [...this.dynamic.children]) this.dynamic.remove(child)
    this.soldiers = []
    this.projectiles = []
    this.crossbows = []
    this.effects = []
    this.toasts = []
    this.capture = 0
    this.captureStatus = 'idle'
    this.kills = 0
    this.elapsed = 0
    this.medkits = PLAYER_STATS.medkits
    this.healRemaining = 0
    this.reinforceTimer = BLUE_STATS.interval
    this.crossbowNoticeShown = false
    this.playerVy = 0
    this.onGround = true
    this.camYaw = Math.PI
    this.camPitch = 0.05
    this.damageAt = 0
    this.hitAt = 0
    this.killAt = 0

    this.player = this.createSoldier('blue', new THREE.Vector3(0, 0, BLUE_Z - 10), true)
    this.player.yaw = Math.PI

    for (let i = 0; i < BLUE_STATS.start; i++) {
      const p = new THREE.Vector3(-10 + (i % 6) * 4, 0, BLUE_Z - 14 - Math.floor(i / 6) * 3)
      this.createSoldier('blue', p)
    }

    const redPosts: THREE.Vector3[] = []
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      redPosts.push(new THREE.Vector3(Math.cos(a) * 9, 0, RED_Z + Math.sin(a) * 9))
    }
    redPosts.push(new THREE.Vector3(-5, 0, RED_Z - 10), new THREE.Vector3(5, 0, RED_Z - 10))
    redPosts.push(
      new THREE.Vector3(-3, 0, RED_Z + 20),
      new THREE.Vector3(3, 0, RED_Z + 20),
      new THREE.Vector3(-9, 0, RED_Z + 19),
      new THREE.Vector3(9, 0, RED_Z + 19),
    )
    for (let i = 0; i < 8; i++) {
      redPosts.push(new THREE.Vector3(-14 + (i % 4) * 9.3 + (Math.random() - 0.5) * 2, 0, RED_Z + 34 + Math.floor(i / 4) * 12))
    }
    redPosts.forEach((post, i) => {
      const s = this.createSoldier('red', post.clone())
      s.post = post
      s.leash = i >= 14 ? 28 : 20
      s.yaw = 0
    })

    const front = RED_Z + FORT_HALF
    const crossbowDefs: [number, number, number, number, number][] = [
      [-FORT_HALF, TOWER_H + 0.65, front, -1, 1],
      [FORT_HALF, TOWER_H + 0.65, front, 1, 1],
      [-10, WALL_H + 0.1, front, 0, 1],
      [10, WALL_H + 0.1, front, 0, 1],
      [-FORT_HALF, WALL_H + 0.1, RED_Z + 12, -1, 0],
      [FORT_HALF, WALL_H + 0.1, RED_Z + 12, 1, 0],
    ]
    for (const [x, y, z, dx, dz] of crossbowDefs) {
      const model = createCrossbowModel()
      const dir = new THREE.Vector3(dx, 0, dz).normalize()
      model.root.position.set(x, y, z)
      model.root.rotation.y = Math.atan2(dir.x, dir.z)
      this.dynamic.add(model.root)
      this.crossbows.push({
        model,
        pivot: new THREE.Vector3(x, y + 1.05, z),
        dir,
        hp: CROSSBOW_STATS.hp,
        alive: true,
        cooldown: 2 + Math.random() * 2,
        deadTime: 0,
      })
    }

    this.world.redFlag.position.y = this.world.flagTopY
    this.world.redFlag.visible = true
    this.world.blueCaptureFlag.position.y = this.world.flagBottomY
    this.world.blueCaptureFlag.visible = false
  }

  private createSoldier(team: Team, pos: THREE.Vector3, isPlayer = false): Soldier {
    const model = createSoldierModel(team, isPlayer)
    this.dynamic.add(model.root)
    const stats = team === 'red' ? RED_STATS : BLUE_STATS
    const s: Soldier = {
      id: this.nextId++,
      team,
      isPlayer,
      model,
      pos,
      yaw: team === 'red' ? 0 : Math.PI,
      hp: isPlayer ? PLAYER_STATS.hp : stats.hp,
      maxHp: isPlayer ? PLAYER_STATS.hp : stats.hp,
      alive: true,
      deadTime: 0,
      weapon: 'sword',
      bullets: isPlayer ? PLAYER_STATS.bullets : stats.bullets,
      arrows: isPlayer ? PLAYER_STATS.arrows : stats.arrows,
      cooldown: Math.random(),
      swingTime: -1,
      swingHit: true,
      swingBlocking: false,
      blocking: false,
      walkPhase: Math.random() * 6,
      animSpeed: 0,
      damageMultiplier: isPlayer ? 1 : stats.damageMultiplier,
      speed: isPlayer ? PLAYER_STATS.walkSpeed : stats.speed * (0.9 + Math.random() * 0.2),
      post: null,
      leash: 30,
      target: null,
      retarget: Math.random() * 0.4,
      laneX: (Math.random() - 0.5) * 12,
      stuckCheck: 1,
      stuckFrom: pos.clone(),
      sidestep: 1,
      sidestepTime: 0,
      aimPitch: 0,
      recoil: 0,
    }
    this.soldiers.push(s)
    return s
  }

  // ---------- input ----------

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault()
    if (e.code === 'KeyR' && (this.state === 'victory' || this.state === 'defeat')) {
      this.restart()
      return
    }
    if (this.state !== 'playing') return
    if (e.code === 'Escape' && this.lockFailed) {
      this.state = 'paused'
      this.emit()
      return
    }
    this.keys.add(e.code)
    if (e.repeat) return
    switch (e.code) {
      case 'Digit1':
        this.selectWeapon('sword')
        break
      case 'Digit2':
        this.selectWeapon('gun')
        break
      case 'Digit3':
        this.selectWeapon('bow')
        break
      case 'Digit4':
      case 'KeyH':
      case 'KeyQ':
        this.useMedkit()
        break
      case 'Space':
        if (this.onGround) {
          this.playerVy = PLAYER_STATS.jumpVelocity
          this.onGround = false
        }
        break
    }
  }

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code)
  }

  private onMouseDown = (e: MouseEvent) => {
    if (this.state !== 'playing') return
    if (e.button === 0) this.primaryDown = true
    if (e.button === 2) this.secondaryDown = true
    if (!this.lockFailed && document.pointerLockElement !== this.renderer.domElement) this.requestLock()
  }

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) this.primaryDown = false
    if (e.button === 2) this.secondaryDown = false
  }

  private onMouseMove = (e: MouseEvent) => {
    if (this.state !== 'playing') return
    const locked = document.pointerLockElement === this.renderer.domElement
    if (!locked && !this.lockFailed) return
    this.camYaw -= e.movementX * 0.0024
    this.camPitch = clamp(this.camPitch - e.movementY * 0.0022, -0.85, 0.75)
  }

  private onContextMenu = (e: Event) => e.preventDefault()

  private onLockChange = () => {
    const locked = document.pointerLockElement === this.renderer.domElement
    if (!locked && this.state === 'playing' && !this.lockFailed) {
      this.state = 'paused'
      this.primaryDown = false
      this.secondaryDown = false
      this.keys.clear()
      this.emit()
    }
  }

  private onLockError = () => {
    this.lockFailed = true
  }

  private onBlur = () => {
    this.keys.clear()
    this.primaryDown = false
    this.secondaryDown = false
  }

  private onResize = () => {
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  private bindInput() {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('mousedown', this.onMouseDown)
    window.addEventListener('mouseup', this.onMouseUp)
    window.addEventListener('mousemove', this.onMouseMove)
    window.addEventListener('blur', this.onBlur)
    window.addEventListener('resize', this.onResize)
    this.renderer.domElement.addEventListener('contextmenu', this.onContextMenu)
    this.container.addEventListener('contextmenu', this.onContextMenu)
    document.addEventListener('pointerlockchange', this.onLockChange)
    document.addEventListener('pointerlockerror', this.onLockError)
  }

  private unbindInput() {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('mousedown', this.onMouseDown)
    window.removeEventListener('mouseup', this.onMouseUp)
    window.removeEventListener('mousemove', this.onMouseMove)
    window.removeEventListener('blur', this.onBlur)
    window.removeEventListener('resize', this.onResize)
    this.renderer.domElement.removeEventListener('contextmenu', this.onContextMenu)
    this.container.removeEventListener('contextmenu', this.onContextMenu)
    document.removeEventListener('pointerlockchange', this.onLockChange)
    document.removeEventListener('pointerlockerror', this.onLockError)
  }

  // ---------- HUD ----------

  private toast(text: string, tone: Toast['tone'] = 'info') {
    this.toasts.push({ id: ++this.toastId, text, tone, expires: this.time + 3 })
    if (this.toasts.length > 3) this.toasts.shift()
    this.emit()
  }

  private buildSnapshot(): HudSnapshot {
    const reds = this.soldiers.filter((s) => s.team === 'red' && s.alive).length
    const blues = this.soldiers.filter((s) => s.team === 'blue' && !s.isPlayer && s.alive).length
    return {
      state: this.state,
      hp: Math.max(0, Math.ceil(this.player.hp)),
      maxHp: this.player.maxHp,
      weapon: this.player.weapon,
      bullets: this.player.bullets,
      arrows: this.player.arrows,
      medkits: this.medkits,
      healing: this.healRemaining > 0 ? clamp(this.healTime / PLAYER_STATS.healDuration, 0, 1) : null,
      blocking: this.player.blocking,
      running: this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'),
      capture: this.capture,
      captureStatus: this.captureStatus,
      redAlive: reds,
      redTotal: RED_STATS.count,
      blueAlive: blues,
      crossbowsAlive: this.crossbows.filter((c) => c.alive).length,
      crossbowsTotal: this.crossbows.length,
      insideRedFort: this.insideRedFort,
      inResupply: this.inResupply,
      kills: this.kills,
      damageAt: this.damageAt,
      hitAt: this.hitAt,
      killAt: this.killAt,
      toasts: this.toasts.map(({ id, text, tone }) => ({ id, text, tone })),
      elapsed: this.elapsed,
      nextReinforcement: Math.ceil(this.reinforceTimer),
    }
  }

  private emit() {
    this.snapshot = this.buildSnapshot()
    this.lastEmit = this.time
    for (const fn of this.listeners) fn()
  }

  // ---------- main loop ----------

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop)
    const dt = Math.min(this.clock.getDelta(), 0.05)
    this.time += dt
    if (this.state === 'playing') this.update(dt)
    this.updateVisuals(dt)
    this.renderer.render(this.scene, this.camera)
    if (this.time - this.lastEmit > 0.1) {
      const before = this.toasts.length
      this.toasts = this.toasts.filter((t) => t.expires > this.time)
      if (this.state === 'playing' || before !== this.toasts.length) this.emit()
    }
  }

  private update(dt: number) {
    this.elapsed += dt
    this.updatePlayer(dt)
    for (const s of this.soldiers) {
      if (!s.isPlayer && s.alive) this.updateNpc(s, dt)
    }
    this.separateSoldiers()
    this.updateCrossbows(dt)
    this.updateProjectiles(dt)
    this.updateCapture(dt)
    this.updateReinforcements(dt)
    this.cleanupDead()
  }

  // ---------- player ----------

  private selectWeapon(w: Weapon) {
    if (this.player.weapon === w) return
    this.player.weapon = w
    this.player.swingTime = -1
    this.player.cooldown = Math.max(this.player.cooldown, 0.15)
  }

  private useMedkit() {
    if (this.medkits <= 0) {
      this.toast('No med kits left', 'bad')
      return
    }
    if (this.healRemaining > 0) return
    if (this.player.hp >= this.player.maxHp) {
      this.toast('Health is already full')
      return
    }
    this.medkits--
    this.healRemaining = PLAYER_STATS.healAmount
    this.healTime = 0
    this.toast('Applying med kit', 'good')
  }

  private groundHeightAt(x: number, z: number, y: number) {
    let h = 0
    for (const c of this.colliders) {
      if (!c.low) continue
      const b = c.box
      if (x > b.min.x - 0.3 && x < b.max.x + 0.3 && z > b.min.z - 0.3 && z < b.max.z + 0.3 && b.max.y <= y + 0.08) {
        h = Math.max(h, b.max.y)
      }
    }
    return h
  }

  private resolveCollisions(pos: THREE.Vector3, r: number, footY: number) {
    for (const c of this.colliders) {
      const b = c.box
      if (b.max.y <= footY + 0.05) continue
      const cx = clamp(pos.x, b.min.x, b.max.x)
      const cz = clamp(pos.z, b.min.z, b.max.z)
      const dx = pos.x - cx
      const dz = pos.z - cz
      const d2 = dx * dx + dz * dz
      if (d2 >= r * r) continue
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2)
        pos.x += (dx / d) * (r - d)
        pos.z += (dz / d) * (r - d)
      } else {
        const left = pos.x - b.min.x
        const right = b.max.x - pos.x
        const back = pos.z - b.min.z
        const front = b.max.z - pos.z
        const m = Math.min(left, right, back, front)
        if (m === left) pos.x = b.min.x - r
        else if (m === right) pos.x = b.max.x + r
        else if (m === back) pos.z = b.min.z - r
        else pos.z = b.max.z + r
      }
    }
    pos.x = clamp(pos.x, -WORLD_LIMIT_X, WORLD_LIMIT_X)
    pos.z = clamp(pos.z, -WORLD_LIMIT_Z, WORLD_LIMIT_Z)
  }

  private updatePlayer(dt: number) {
    const p = this.player
    if (!p.alive) return
    p.cooldown -= dt
    p.recoil = Math.max(0, p.recoil - dt * 6)
    p.yaw = this.camYaw
    p.aimPitch = this.camPitch

    p.blocking = p.weapon === 'sword' && (this.secondaryDown || this.keys.has('KeyF'))
    const running = (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) && !p.blocking
    const speed = p.blocking ? PLAYER_STATS.blockSpeed : running ? PLAYER_STATS.runSpeed : PLAYER_STATS.walkSpeed

    const fx = Math.sin(this.camYaw)
    const fz = Math.cos(this.camYaw)
    let mx = 0
    let mz = 0
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) {
      mx += fx
      mz += fz
    }
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) {
      mx -= fx
      mz -= fz
    }
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) {
      mx -= fz
      mz += fx
    }
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) {
      mx += fz
      mz -= fx
    }
    const len = Math.hypot(mx, mz)
    if (len > 0) {
      p.pos.x += (mx / len) * speed * dt
      p.pos.z += (mz / len) * speed * dt
      p.animSpeed = speed
    } else {
      p.animSpeed = 0
    }

    this.playerVy -= PLAYER_STATS.gravity * dt
    p.pos.y += this.playerVy * dt
    const support = this.groundHeightAt(p.pos.x, p.pos.z, p.pos.y)
    if (p.pos.y <= support) {
      p.pos.y = support
      this.playerVy = 0
      this.onGround = true
    } else if (p.pos.y > support + 0.05) {
      this.onGround = false
    }
    this.resolveCollisions(p.pos, 0.45, p.pos.y)

    // Attacks
    if (p.weapon === 'sword') {
      if (this.primaryDown && p.cooldown <= 0) {
        p.swingTime = 0
        p.swingHit = false
        p.swingBlocking = p.blocking
        p.cooldown = 0.5
      }
    } else if ((this.primaryDown || this.secondaryDown) && p.cooldown <= 0) {
      if (p.weapon === 'gun') {
        if (p.bullets > 0) {
          this.playerFireGun()
          p.cooldown = 0.22
        } else this.warnAmmo('Out of bullets — resupply at the blue ring or switch weapons')
      } else if (p.arrows > 0) {
        this.playerFireBow()
        p.cooldown = 0.75
      } else this.warnAmmo('Out of arrows — resupply at the blue ring or switch weapons')
    }

    if (p.swingTime >= 0) {
      p.swingTime += dt
      if (!p.swingHit && p.swingTime >= 0.16) {
        p.swingHit = true
        this.meleeSweep(p, WEAPON_DAMAGE.sword * (p.swingBlocking || p.blocking ? BLOCKING_SWORD_MULTIPLIER : 1), 2.9, 0.3, true)
      }
      if (p.swingTime > 0.42) p.swingTime = -1
    }

    // Healing
    if (this.healRemaining > 0) {
      this.healTime += dt
      const amount = Math.min(this.healRemaining, (PLAYER_STATS.healAmount / PLAYER_STATS.healDuration) * dt)
      this.healRemaining -= amount
      p.hp = Math.min(p.maxHp, p.hp + amount)
      if (p.hp >= p.maxHp) this.healRemaining = 0
    }

    // Resupply
    const rp = this.world.resupplyPosition
    this.inResupply = Math.hypot(p.pos.x - rp.x, p.pos.z - rp.z) < 4
    if (this.inResupply) {
      this.resupplyTimer -= dt
      p.hp = Math.min(p.maxHp, p.hp + dt * 12)
      if (this.resupplyTimer <= 0) {
        const needed =
          p.bullets < PLAYER_STATS.bullets || p.arrows < PLAYER_STATS.arrows || this.medkits < PLAYER_STATS.medkits
        if (needed) {
          p.bullets = PLAYER_STATS.bullets
          p.arrows = PLAYER_STATS.arrows
          this.medkits = PLAYER_STATS.medkits
          this.toast('Restocked bullets, arrows and med kits', 'good')
        }
        this.resupplyTimer = 1.5
      }
    }

    const wasInside = this.insideRedFort
    this.insideRedFort = isInsideFort(p.pos.x, p.pos.z, RED_Z)
    if (this.insideRedFort && !wasInside && !this.crossbowNoticeShown) {
      this.crossbowNoticeShown = true
      this.toast('Inside the walls — the crossbows can no longer reach you', 'good')
    }
  }

  private warnAmmo(text: string) {
    if (this.time - this.lastAmmoWarning > 2) {
      this.lastAmmoWarning = this.time
      this.toast(text, 'bad')
    }
  }

  private aimRay() {
    this.camera.getWorldDirection(this.camDir)
    this.ray.set(this.camera.position, this.camDir)
    return this.ray
  }

  private castAim(): { t: number; soldier: Soldier | null; head: boolean; crossbow: Crossbow | null } {
    const ray = this.aimRay()
    const minT = this.camera.position.distanceTo(this.tmp.copy(this.player.pos).setY(this.player.pos.y + 1.4)) + 0.6
    let best = { t: 220, soldier: null as Soldier | null, head: false, crossbow: null as Crossbow | null }
    for (const s of this.soldiers) {
      if (!s.alive || s.team === 'blue') continue
      const body = this.tmp2.copy(s.pos).setY(s.pos.y + 1.2)
      let t = raySphere(ray.origin, ray.direction, body, 0.58)
      if (t > minT && t < best.t) best = { t, soldier: s, head: false, crossbow: null }
      const head = this.tmp2.copy(s.pos).setY(s.pos.y + 1.84)
      t = raySphere(ray.origin, ray.direction, head, 0.3)
      if (t > minT && t < best.t) best = { t, soldier: s, head: true, crossbow: null }
    }
    for (const c of this.crossbows) {
      if (!c.alive) continue
      const t = raySphere(ray.origin, ray.direction, c.pivot, 1.4)
      if (t > minT && t < best.t) best = { t, soldier: null, head: false, crossbow: c }
    }
    for (const c of this.colliders) {
      const hit = ray.intersectBox(c.box, this.tmp3)
      if (hit) {
        const t = hit.distanceTo(ray.origin)
        if (t > minT && t < best.t) best = { t, soldier: null, head: false, crossbow: null }
      }
    }
    if (ray.direction.y < -1e-4) {
      const t = -ray.origin.y / ray.direction.y
      if (t > minT && t < best.t) best = { t, soldier: null, head: false, crossbow: null }
    }
    return best
  }

  private muzzlePosition(s: Soldier, target: THREE.Vector3) {
    if (s.isPlayer) {
      s.model.root.updateMatrixWorld(true)
      return s.model.muzzle.getWorldPosition(target)
    }
    return target.set(s.pos.x + Math.sin(s.yaw) * 0.9, s.pos.y + 1.45, s.pos.z + Math.cos(s.yaw) * 0.9)
  }

  private playerFireGun() {
    const p = this.player
    p.bullets--
    p.recoil = 0.25
    const hit = this.castAim()
    const end = this.ray.at(hit.t, new THREE.Vector3())
    const start = this.muzzlePosition(p, new THREE.Vector3())
    this.spawnTracer(start, end, '#ffe7a3')
    this.spawnFlash(start)
    if (hit.soldier) {
      this.damageSoldier(hit.soldier, WEAPON_DAMAGE.gun * (hit.head ? 1.6 : 1), p.pos, p)
    } else if (hit.crossbow) {
      this.damageCrossbow(hit.crossbow, WEAPON_DAMAGE.gun)
    } else {
      this.spawnBurst(end, this.dustMat, 5, 2)
    }
  }

  private playerFireBow() {
    const p = this.player
    p.arrows--
    p.recoil = 0.35
    const hit = this.castAim()
    const aimPoint = this.ray.at(Math.min(hit.t, 160), new THREE.Vector3())
    const start = this.muzzlePosition(p, new THREE.Vector3())
    const dist = start.distanceTo(aimPoint)
    const speed = 85
    const gravity = 9
    const vel = aimPoint.clone().sub(start).normalize().multiplyScalar(speed)
    vel.y += 0.5 * gravity * (dist / speed)
    this.spawnProjectile('arrow', start, vel, gravity, 'blue', WEAPON_DAMAGE.bow, true)
  }

  private meleeSweep(attacker: Soldier, damage: number, range: number, minDot: number, sweep: boolean) {
    const fx = Math.sin(attacker.yaw)
    const fz = Math.cos(attacker.yaw)
    let hitAny = false
    for (const s of this.soldiers) {
      if (!s.alive || s.team === attacker.team) continue
      const dx = s.pos.x - attacker.pos.x
      const dz = s.pos.z - attacker.pos.z
      const d = Math.hypot(dx, dz)
      if (d > range || Math.abs(s.pos.y - attacker.pos.y) > 1.6) continue
      if (d > 0.01 && (dx * fx + dz * fz) / d < minDot) continue
      if (!sweep && s !== attacker.target) continue
      this.damageSoldier(s, damage, attacker.pos, attacker)
      hitAny = true
    }
    return hitAny
  }

  private damageSoldier(victim: Soldier, amount: number, from: THREE.Vector3, attacker: Soldier | null) {
    if (!victim.alive) return
    const hitPoint = this.tmp3.copy(victim.pos).setY(victim.pos.y + 1.3)
    if (victim.blocking) {
      const dx = from.x - victim.pos.x
      const dz = from.z - victim.pos.z
      const d = Math.hypot(dx, dz) || 1
      if ((dx * Math.sin(victim.yaw) + dz * Math.cos(victim.yaw)) / d > 0.25) {
        amount *= 1 - SHIELD_BLOCK_REDUCTION
        this.spawnBurst(hitPoint, this.sparkMat, 6, 4)
      }
    } else {
      this.spawnBurst(hitPoint, this.bloodMat, 7, 3)
    }
    victim.hp -= amount

    if (victim.isPlayer) {
      this.damageAt = this.time
      if (victim.hp <= 0) {
        if (this.medkits > 0) {
          this.medkits--
          victim.hp = 60
          this.healRemaining = 0
          this.toast('Med kit used automatically — get to cover!', 'bad')
        } else {
          victim.hp = 0
          victim.alive = false
          this.state = 'defeat'
          this.toast('You have fallen', 'bad')
          this.releaseLock()
        }
      }
      this.emit()
      return
    }

    if (victim.hp <= 0) {
      victim.alive = false
      victim.deadTime = 0
      if (attacker?.isPlayer) {
        this.kills++
        this.killAt = this.time
      }
    }
    if (attacker?.isPlayer) {
      this.hitAt = this.time
      this.emit()
    }
  }

  private damageCrossbow(c: Crossbow, amount: number) {
    if (!c.alive) return
    c.hp -= amount
    this.hitAt = this.time
    this.spawnBurst(c.pivot, this.sparkMat, 8, 4)
    if (c.hp <= 0) {
      c.alive = false
      c.deadTime = 0
      this.spawnBurst(c.pivot, this.dustMat, 18, 6)
      const left = this.crossbows.filter((x) => x.alive).length
      this.toast(left > 0 ? `Crossbow destroyed — ${left} left` : 'All crossbows destroyed', 'good')
    }
    this.emit()
  }

  private releaseLock() {
    this.primaryDown = false
    this.secondaryDown = false
    this.keys.clear()
    if (document.pointerLockElement === this.renderer.domElement) document.exitPointerLock()
  }

  // ---------- NPCs ----------

  private navGoal(from: THREE.Vector3, to: THREE.Vector3, out: THREE.Vector3) {
    for (const cz of [BLUE_Z, RED_Z]) {
      const inFrom = isInsideFort(from.x, from.z, cz)
      const inTo = isInsideFort(to.x, to.z, cz)
      if (inFrom === inTo) continue
      const s = cz > 0 ? -1 : 1
      const frontZ = cz + s * FORT_HALF
      const inLane = Math.abs(from.x) < GATE_HALF - 0.9 && Math.abs(from.z - frontZ) < 6
      if (inFrom) return inLane ? out.set(0, 0, frontZ + s * 6) : out.set(0, 0, frontZ - s * 5)
      if (inLane) return out.set(0, 0, frontZ - s * 6)
      if ((from.z - frontZ) * s < 1.5) {
        return out.set(Math.sign(from.x || 1) * (FORT_HALF + 7), 0, frontZ + s * 7)
      }
      return out.set(0, 0, frontZ + s * 5)
    }
    return out.copy(to)
  }

  private hasLineOfSight(a: THREE.Vector3, b: THREE.Vector3) {
    const dir = this.tmp2.subVectors(b, a)
    const len = dir.length()
    if (len < 0.01) return true
    dir.divideScalar(len)
    const ray = new THREE.Ray(a, dir)
    for (const c of this.colliders) {
      if (c.low) continue
      const hit = ray.intersectBox(c.box, this.tmp3)
      if (hit && hit.distanceTo(a) < len - 0.4) return false
    }
    return true
  }

  private findTarget(s: Soldier) {
    const stats = s.team === 'red' ? RED_STATS : BLUE_STATS
    let best: Soldier | null = null
    let bestScore = Infinity
    for (const o of this.soldiers) {
      if (!o.alive || o.team === s.team) continue
      const d = Math.hypot(o.pos.x - s.pos.x, o.pos.z - s.pos.z)
      if (d > stats.aggroRange) continue
      if (s.post && Math.hypot(o.pos.x - s.post.x, o.pos.z - s.post.z) > s.leash + 12) continue
      const score = d * (o.isPlayer ? 0.8 : 1)
      if (score < bestScore) {
        bestScore = score
        best = o
      }
    }
    return best
  }

  private updateNpc(s: Soldier, dt: number) {
    const stats = s.team === 'red' ? RED_STATS : BLUE_STATS
    s.cooldown -= dt
    s.retarget -= dt
    if (s.retarget <= 0 || (s.target && !s.target.alive)) {
      s.retarget = 0.4 + Math.random() * 0.2
      s.target = this.findTarget(s)
    }

    const goal = this.tmp.set(0, 0, 0)
    let wantMove = true
    let stopRange = 1
    const t = s.target
    let dist = Infinity

    if (t) {
      dist = Math.hypot(t.pos.x - s.pos.x, t.pos.z - s.pos.z)
      if (dist < 3.5) s.weapon = 'sword'
      else if (s.bullets > 0 && dist < 45) s.weapon = 'gun'
      else if (s.arrows > 0 && dist < 55) s.weapon = 'bow'
      else s.weapon = 'sword'

      s.yaw += angleDiff(s.yaw, Math.atan2(t.pos.x - s.pos.x, t.pos.z - s.pos.z)) * Math.min(1, dt * 8)

      if (s.weapon === 'sword') {
        goal.copy(t.pos)
        stopRange = 1.6
      } else {
        const ideal = s.weapon === 'gun' ? 22 : 30
        if (dist > ideal) {
          goal.copy(t.pos)
          stopRange = ideal
        } else {
          const strafe = Math.sin(this.time * 0.8 + s.id) * 4
          goal.set(s.pos.x + Math.cos(s.yaw) * strafe, 0, s.pos.z - Math.sin(s.yaw) * strafe)
          stopRange = 0.5
        }
      }
      if (s.post && Math.hypot(goal.x - s.post.x, goal.z - s.post.z) > s.leash) {
        goal.copy(s.post)
        if (s.weapon === 'sword') wantMove = Math.hypot(s.pos.x - s.post.x, s.pos.z - s.post.z) > 1
      }
      this.npcAttack(s, t, dist, stats)
    } else if (s.team === 'blue') {
      const inRed = isInsideFort(s.pos.x, s.pos.z, RED_Z)
      goal.set(s.laneX * (inRed ? 1.2 : 0.6), 0, RED_Z + (inRed ? 0 : 4))
      stopRange = 2
      s.weapon = 'sword'
    } else if (s.post) {
      goal.copy(s.post)
      stopRange = 0.8
      s.yaw += angleDiff(s.yaw, 0) * Math.min(1, dt * 2)
    }

    if (s.swingTime >= 0) {
      s.swingTime += dt
      if (!s.swingHit && s.swingTime >= 0.22) {
        s.swingHit = true
        this.meleeSweep(s, WEAPON_DAMAGE.sword * s.damageMultiplier, 2.6, 0.2, false)
      }
      if (s.swingTime > 0.5) s.swingTime = -1
    }

    const nav = this.navGoal(s.pos, goal, this.tmp2.set(0, 0, 0)).clone()
    const finalLeg = nav.equals(goal)
    let dx = nav.x - s.pos.x
    let dz = nav.z - s.pos.z
    const d = Math.hypot(dx, dz)
    if (wantMove && d > (finalLeg ? stopRange : 0.8)) {
      dx /= d
      dz /= d
      if (s.sidestepTime > 0) {
        s.sidestepTime -= dt
        const px = -dz * s.sidestep
        const pz = dx * s.sidestep
        dx = dx * 0.3 + px
        dz = dz * 0.3 + pz
        const l = Math.hypot(dx, dz)
        dx /= l
        dz /= l
      }
      s.pos.x += dx * s.speed * dt
      s.pos.z += dz * s.speed * dt
      s.animSpeed = s.speed
      if (!t) s.yaw += angleDiff(s.yaw, Math.atan2(dx, dz)) * Math.min(1, dt * 6)

      s.stuckCheck -= dt
      if (s.stuckCheck <= 0) {
        const moved = s.pos.distanceTo(s.stuckFrom)
        if (moved < s.speed * 0.25 && s.sidestepTime <= 0) {
          s.sidestep = Math.random() < 0.5 ? -1 : 1
          s.sidestepTime = 1.2
        }
        s.stuckFrom.copy(s.pos)
        s.stuckCheck = 1
      }
    } else {
      s.animSpeed = 0
      s.stuckFrom.copy(s.pos)
      s.stuckCheck = 1
    }
    this.resolveCollisions(s.pos, 0.42, 0)
  }

  private npcAttack(s: Soldier, t: Soldier, dist: number, stats: typeof RED_STATS | typeof BLUE_STATS) {
    if (s.cooldown > 0) return
    const facing = Math.abs(angleDiff(s.yaw, Math.atan2(t.pos.x - s.pos.x, t.pos.z - s.pos.z))) < 0.5
    if (!facing) return
    if (s.weapon === 'sword') {
      if (dist < 2.3 && s.swingTime < 0) {
        s.swingTime = 0
        s.swingHit = false
        s.cooldown = stats.swordCooldown * (0.85 + Math.random() * 0.3)
      }
      return
    }
    const start = this.muzzlePosition(s, new THREE.Vector3())
    const aim = new THREE.Vector3(t.pos.x, t.pos.y + 1.25, t.pos.z)
    if (!this.hasLineOfSight(start, aim)) {
      s.cooldown = 0.4
      return
    }
    s.aimPitch = Math.atan2(aim.y - start.y, dist)
    if (s.weapon === 'gun') {
      s.bullets--
      s.recoil = 0.25
      s.cooldown = stats.gunCooldown * (0.85 + Math.random() * 0.3)
      const chance = clamp(stats.gunAccuracy * (1 - dist / 70) + 0.1, 0.08, 0.9)
      const hit = Math.random() < chance
      const end = aim.clone()
      if (!hit) end.add(new THREE.Vector3((Math.random() - 0.5) * 3, (Math.random() - 0.3) * 2, (Math.random() - 0.5) * 3))
      this.spawnTracer(start, end, s.team === 'red' ? '#ffb08a' : '#bfe0ff')
      this.spawnFlash(start)
      if (hit) this.damageSoldier(t, WEAPON_DAMAGE.gun * s.damageMultiplier, s.pos, s)
    } else {
      s.arrows--
      s.recoil = 0.35
      s.cooldown = stats.bowCooldown * (0.85 + Math.random() * 0.3)
      const spread = s.team === 'red' ? 2.4 : 1.4
      aim.x += (Math.random() - 0.5) * spread
      aim.z += (Math.random() - 0.5) * spread
      aim.y += (Math.random() - 0.5) * spread * 0.5
      const speed = 45
      const gravity = 9
      const vel = aim.clone().sub(start).normalize().multiplyScalar(speed)
      vel.y += 0.5 * gravity * (dist / speed)
      this.spawnProjectile('arrow', start, vel, gravity, s.team, WEAPON_DAMAGE.bow * s.damageMultiplier, false)
    }
  }

  private separateSoldiers() {
    const list = this.soldiers
    for (let i = 0; i < list.length; i++) {
      const a = list[i]
      if (!a.alive) continue
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j]
        if (!b.alive) continue
        const dx = b.pos.x - a.pos.x
        const dz = b.pos.z - a.pos.z
        const d2 = dx * dx + dz * dz
        if (d2 > 0.81 || d2 < 1e-6) continue
        const d = Math.sqrt(d2)
        const push = (0.9 - d) / 2
        const nx = dx / d
        const nz = dz / d
        const friendly = a.team === b.team
        const wa = a.isPlayer ? (friendly ? 0 : 0.3) : b.isPlayer && friendly ? 2 : 1
        const wb = b.isPlayer ? (friendly ? 0 : 0.3) : a.isPlayer && friendly ? 2 : 1
        a.pos.x -= nx * push * wa
        a.pos.z -= nz * push * wa
        b.pos.x += nx * push * wb
        b.pos.z += nz * push * wb
      }
    }
  }

  private updateReinforcements(dt: number) {
    this.reinforceTimer -= dt
    if (this.reinforceTimer > 0) return
    this.reinforceTimer = BLUE_STATS.interval
    const alive = this.soldiers.filter((s) => s.team === 'blue' && !s.isPlayer && s.alive).length
    const count = Math.min(BLUE_STATS.reinforce, BLUE_STATS.max - alive)
    for (let i = 0; i < count; i++) {
      this.createSoldier('blue', new THREE.Vector3((i === 0 ? -1 : 1) * 4, 0, BLUE_Z - 6))
    }
    if (count > 0) this.toast(`${count} blue reinforcements have arrived`, 'good')
  }

  private cleanupDead() {
    this.soldiers = this.soldiers.filter((s) => {
      if (s.alive || s.isPlayer) return true
      if (s.deadTime > 10) {
        this.dynamic.remove(s.model.root)
        return false
      }
      return true
    })
  }

  // ---------- crossbows ----------

  private updateCrossbows(dt: number) {
    for (const c of this.crossbows) {
      if (!c.alive) continue
      let target: Soldier | null = null
      let bestD = Infinity
      for (const s of this.soldiers) {
        if (!s.alive || s.team !== 'blue') continue
        if (isInsideFort(s.pos.x, s.pos.z, RED_Z)) continue
        const dx = s.pos.x - c.pivot.x
        const dz = s.pos.z - c.pivot.z
        const hd = Math.hypot(dx, dz)
        if (hd > CROSSBOW_STATS.range || hd < 2) continue
        if ((dx * c.dir.x + dz * c.dir.z) / hd < CROSSBOW_STATS.coneCos) continue
        const score = hd * (s.isPlayer ? 0.6 : 1)
        if (score < bestD) {
          const aim = this.tmp.set(s.pos.x, s.pos.y + 1.2, s.pos.z)
          if (!this.hasLineOfSight(c.pivot, aim)) continue
          bestD = score
          target = s
        }
      }
      if (!target) {
        c.cooldown = Math.max(c.cooldown, 1.5)
        c.model.pitch.rotation.x = lerp(c.model.pitch.rotation.x, 0, dt * 2)
        continue
      }
      c.cooldown -= dt
      const aim = new THREE.Vector3(target.pos.x, target.pos.y + 1.2, target.pos.z)
      const hd = Math.hypot(aim.x - c.pivot.x, aim.z - c.pivot.z)
      const elevation = Math.atan2(aim.y - c.pivot.y, hd)
      c.model.pitch.rotation.x = lerp(c.model.pitch.rotation.x, -elevation, dt * 6)
      if (c.cooldown <= 0) {
        c.cooldown = CROSSBOW_STATS.cooldown + Math.random() * 1.2
        const speed = CROSSBOW_STATS.boltSpeed
        const gravity = 4
        const vel = aim.clone().sub(c.pivot)
        const dist = vel.length()
        vel.normalize().multiplyScalar(speed)
        vel.x += (Math.random() - 0.5) * 2.5
        vel.z += (Math.random() - 0.5) * 2.5
        vel.y += 0.5 * gravity * (dist / speed)
        const start = c.pivot.clone().addScaledVector(vel.clone().normalize(), 1.4)
        this.spawnProjectile('bolt', start, vel, gravity, 'red', CROSSBOW_STATS.damage, false)
      }
    }
  }

  // ---------- projectiles ----------

  private spawnProjectile(
    kind: Projectile['kind'],
    start: THREE.Vector3,
    vel: THREE.Vector3,
    gravity: number,
    team: Team,
    damage: number,
    fromPlayer: boolean,
  ) {
    const group = new THREE.Group()
    const shaft = new THREE.Mesh(kind === 'bolt' ? this.boltGeo : this.arrowGeo, kind === 'bolt' ? this.boltMat : this.arrowMat)
    group.add(shaft)
    const tip = new THREE.Mesh(this.tipGeo, this.boltMat)
    if (kind === 'bolt') tip.position.z = 0.15
    group.add(tip)
    group.position.copy(start)
    this.dynamic.add(group)
    this.projectiles.push({
      kind,
      mesh: group,
      pos: start.clone(),
      prev: start.clone(),
      vel: vel.clone(),
      gravity,
      team,
      damage,
      fromPlayer,
      life: 6,
      stuck: false,
    })
  }

  private updateProjectiles(dt: number) {
    const center = new THREE.Vector3()
    this.projectiles = this.projectiles.filter((p) => {
      p.life -= dt
      if (p.life <= 0) {
        this.dynamic.remove(p.mesh)
        return false
      }
      if (p.stuck) return true
      p.prev.copy(p.pos)
      p.vel.y -= p.gravity * dt
      p.pos.addScaledVector(p.vel, dt)
      p.mesh.position.copy(p.pos)
      p.mesh.lookAt(this.tmp.copy(p.pos).add(p.vel))

      for (const s of this.soldiers) {
        if (!s.alive || s.team === p.team) continue
        if (p.kind === 'bolt' && isInsideFort(s.pos.x, s.pos.z, RED_Z)) continue
        center.set(s.pos.x, s.pos.y + 1.2, s.pos.z)
        const headCenter = this.tmp2.set(s.pos.x, s.pos.y + 1.84, s.pos.z)
        const head = segmentSphere(p.prev, p.pos, headCenter, 0.3)
        if (head || segmentSphere(p.prev, p.pos, center, 0.6)) {
          const mult = head && p.fromPlayer ? 1.5 : 1
          this.damageSoldier(s, p.damage * mult, p.prev, p.fromPlayer ? this.player : null)
          this.dynamic.remove(p.mesh)
          return false
        }
      }
      if (p.team === 'blue') {
        for (const c of this.crossbows) {
          if (c.alive && segmentSphere(p.prev, p.pos, c.pivot, 1.4)) {
            this.damageCrossbow(c, p.damage)
            this.dynamic.remove(p.mesh)
            return false
          }
        }
      }
      if (p.pos.y <= 0.05) {
        p.pos.y = 0.05
        p.stuck = true
        p.life = Math.min(p.life, 4)
        return true
      }
      for (const c of this.colliders) {
        if (c.box.containsPoint(p.pos)) {
          p.stuck = true
          p.life = Math.min(p.life, 4)
          this.spawnBurst(p.pos, this.dustMat, 3, 1.5)
          return true
        }
      }
      return true
    })
  }

  // ---------- capture ----------

  private updateCapture(dt: number) {
    const p = this.player
    const inCircle = p.alive && Math.hypot(p.pos.x, p.pos.z - RED_Z) < CAPTURE_RADIUS
    let status: CaptureStatus = 'idle'
    if (inCircle) {
      const contested = this.soldiers.some(
        (s) => s.alive && s.team === 'red' && Math.hypot(s.pos.x, s.pos.z - RED_Z) < CAPTURE_RADIUS,
      )
      status = contested ? 'contested' : 'capturing'
      if (!contested) this.capture = Math.min(1, this.capture + dt / CAPTURE_TIME)
    }
    if (status !== this.captureStatus) {
      if (status === 'contested') this.toast('Capture paused — clear the defenders from the circle', 'bad')
      if (status === 'capturing' && this.captureStatus === 'idle' && this.capture === 0) this.toast('Raising the blue banner…', 'good')
      this.captureStatus = status
    }
    const { flagTopY, flagBottomY } = this.world
    this.world.redFlag.position.y = lerp(flagTopY, flagBottomY, this.capture)
    this.world.redFlag.visible = this.capture < 0.98
    this.world.blueCaptureFlag.visible = this.capture > 0.01
    this.world.blueCaptureFlag.position.y = lerp(flagBottomY, flagTopY, this.capture)
    if (this.capture >= 1) {
      this.state = 'victory'
      this.toast('The red fort is yours!', 'good')
      this.releaseLock()
    }
  }

  // ---------- effects ----------

  private spawnTracer(a: THREE.Vector3, b: THREE.Vector3, color: string) {
    const geo = new THREE.BufferGeometry().setFromPoints([a.clone(), b.clone()])
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }))
    this.dynamic.add(line)
    this.effects.push({ object: line, life: 0.08, maxLife: 0.08, vel: null, fade: true })
  }

  private spawnFlash(pos: THREE.Vector3) {
    const m = new THREE.Mesh(this.flashGeo, this.flashMat)
    m.position.copy(pos)
    this.dynamic.add(m)
    this.effects.push({ object: m, life: 0.05, maxLife: 0.05, vel: null, fade: false })
  }

  private spawnBurst(pos: THREE.Vector3, mat: THREE.Material, count: number, speed: number) {
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(this.particleGeo, mat)
      m.position.copy(pos)
      this.dynamic.add(m)
      const vel = new THREE.Vector3((Math.random() - 0.5) * speed, Math.random() * speed, (Math.random() - 0.5) * speed)
      this.effects.push({ object: m, life: 0.5, maxLife: 0.5, vel, fade: false })
    }
  }

  private updateEffects(dt: number) {
    this.effects = this.effects.filter((e) => {
      e.life -= dt
      if (e.life <= 0) {
        this.dynamic.remove(e.object)
        if (e.object instanceof THREE.Line) {
          e.object.geometry.dispose()
          ;(e.object.material as THREE.Material).dispose()
        }
        return false
      }
      if (e.vel) {
        e.vel.y -= 12 * dt
        e.object.position.addScaledVector(e.vel, dt)
        if (e.object.position.y < 0.05) {
          e.object.position.y = 0.05
          e.vel.set(0, 0, 0)
        }
        e.object.scale.setScalar(Math.max(0.2, e.life / e.maxLife))
      }
      if (e.fade && e.object instanceof THREE.Line) {
        ;(e.object.material as THREE.LineBasicMaterial).opacity = e.life / e.maxLife
      }
      return true
    })
  }

  // ---------- visuals ----------

  private updateVisuals(dt: number) {
    this.world.update(this.time)
    this.updateEffects(dt)
    for (const s of this.soldiers) this.animateSoldier(s, dt)
    for (const c of this.crossbows) {
      if (!c.alive && c.deadTime < 1) {
        c.deadTime += dt
        c.model.root.rotation.z = Math.min(c.deadTime * 2, 1.2)
        c.model.pitch.rotation.x = Math.min(c.deadTime * 2, 0.9)
      }
    }
    const pulse = 0.5 + Math.sin(this.time * 4) * 0.5
    const ringMat = this.world.captureRing.material as THREE.MeshBasicMaterial
    const discMat = this.world.captureDisc.material as THREE.MeshBasicMaterial
    if (this.captureStatus === 'contested') {
      ringMat.color.set('#ff5a4f')
      discMat.color.set('#ff5a4f')
    } else if (this.captureStatus === 'capturing') {
      ringMat.color.set('#5aa0ff')
      discMat.color.set('#5aa0ff')
    } else {
      ringMat.color.set('#f2c14e')
      discMat.color.set('#f2c14e')
    }
    discMat.opacity = 0.08 + pulse * 0.12
    this.updateCamera()
  }

  private animateSoldier(s: Soldier, dt: number) {
    const m = s.model
    m.root.position.copy(s.pos)
    m.root.rotation.y = s.yaw
    if (!s.alive) {
      s.deadTime += dt
      m.body.rotation.x = -Math.min(s.deadTime * 3.2, Math.PI / 2)
      m.body.position.y = Math.min(s.deadTime * 0.4, 0.15)
      if (s.deadTime > 7) m.root.position.y = -(s.deadTime - 7) * 0.4
      return
    }
    s.recoil = Math.max(0, s.recoil - dt * 4)
    const amt = Math.min(s.animSpeed / 6, 1.3)
    if (amt > 0.01) s.walkPhase += dt * (4 + s.animSpeed * 0.9)
    const swing = Math.sin(s.walkPhase) * 0.7 * amt
    m.legL.rotation.x = swing
    m.legR.rotation.x = -swing
    m.body.position.y = Math.abs(Math.cos(s.walkPhase)) * 0.06 * amt
    m.body.rotation.x = 0

    m.sword.visible = s.weapon === 'sword'
    m.gun.visible = s.weapon === 'gun'
    m.bow.visible = s.weapon === 'bow'

    if (s.weapon === 'sword') {
      if (s.blocking) {
        m.shield.position.set(-0.05, 1.32, 0.5)
        m.shield.rotation.set(0, 0, 0)
        m.armL.rotation.set(-1.35, 0, 0.35)
      } else {
        m.shield.position.set(-0.46, 1.15, 0.22)
        m.shield.rotation.set(0, -0.7, 0)
        m.armL.rotation.set(-0.5 - swing * 0.2, 0, 0.1)
      }
      let arm = -0.55 + swing * 0.3
      if (s.swingTime >= 0) {
        const dur = s.isPlayer ? 0.42 : 0.5
        const u = clamp(s.swingTime / dur, 0, 1)
        arm = u < 0.3 ? lerp(-0.6, -2.8, u / 0.3) : lerp(-2.8, -0.15, (u - 0.3) / 0.7)
      }
      m.armR.rotation.set(arm, 0, s.swingTime >= 0 ? -0.25 : 0.05)
    } else {
      m.shield.position.set(0, 1.3, -0.27)
      m.shield.rotation.set(0, Math.PI, 0)
      const aim = -Math.PI / 2 - s.aimPitch + s.recoil * 0.6
      m.armR.rotation.set(aim, 0, 0.12)
      m.armL.rotation.set(aim + 0.15, 0, -0.45)
    }
  }

  private updateCamera() {
    const p = this.player
    const pivot = this.tmp.set(p.pos.x, p.pos.y + 1.7, p.pos.z)
    const cp = Math.cos(this.camPitch)
    const dir = this.tmp2.set(Math.sin(this.camYaw) * cp, Math.sin(this.camPitch), Math.cos(this.camYaw) * cp)
    const right = new THREE.Vector3(-Math.cos(this.camYaw), 0, Math.sin(this.camYaw))
    const shoulder = pivot.clone().addScaledVector(right, 0.85).addScaledVector(UP, 0.25)
    let dist = this.player.blocking ? 3.6 : 4.4
    const back = dir.clone().negate()
    const ray = new THREE.Ray(shoulder, back)
    for (const c of this.colliders) {
      if (c.low) continue
      const hit = ray.intersectBox(c.box, this.tmp3)
      if (hit) {
        const t = hit.distanceTo(shoulder)
        if (t < dist) dist = Math.max(0.6, t - 0.3)
      }
    }
    const camPos = shoulder.clone().addScaledVector(back, dist)
    camPos.y = Math.max(camPos.y, 0.4)
    this.camera.position.copy(camPos)
    this.camera.lookAt(camPos.clone().add(dir))

    this.sun.position.copy(p.pos).add(this.sunOffset)
    this.sun.target.position.copy(p.pos)
    const sky = this.scene.getObjectByName('sky')
    if (sky) sky.position.copy(camPos)
  }
}
