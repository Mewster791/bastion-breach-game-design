import * as THREE from 'three'

export type Team = 'blue' | 'red'
export type Weapon = 'sword' | 'gun' | 'bow'

export interface SoldierModel {
  root: THREE.Group
  body: THREE.Group
  legL: THREE.Group
  legR: THREE.Group
  armL: THREE.Group
  armR: THREE.Group
  sword: THREE.Group
  gun: THREE.Group
  bow: THREE.Group
  shield: THREE.Group
  muzzle: THREE.Object3D
  tunicMaterial: THREE.MeshStandardMaterial
}

let shared: ReturnType<typeof createShared> | null = null

function createShared() {
  const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...extra })
  return {
    geo: {
      torso: new THREE.BoxGeometry(0.62, 0.72, 0.36),
      belt: new THREE.BoxGeometry(0.66, 0.11, 0.4),
      buckle: new THREE.BoxGeometry(0.12, 0.09, 0.04),
      skirt: new THREE.CylinderGeometry(0.32, 0.4, 0.3, 10),
      head: new THREE.SphereGeometry(0.2, 14, 10),
      helmet: new THREE.SphereGeometry(0.235, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      brim: new THREE.CylinderGeometry(0.27, 0.27, 0.04, 14),
      plume: new THREE.BoxGeometry(0.07, 0.22, 0.34),
      pauldron: new THREE.SphereGeometry(0.15, 10, 8),
      arm: new THREE.BoxGeometry(0.16, 0.56, 0.18),
      hand: new THREE.SphereGeometry(0.075, 8, 6),
      leg: new THREE.BoxGeometry(0.22, 0.74, 0.24),
      boot: new THREE.BoxGeometry(0.25, 0.18, 0.36),
      blade: new THREE.BoxGeometry(0.06, 0.02, 0.95),
      guard: new THREE.BoxGeometry(0.3, 0.05, 0.05),
      grip: new THREE.CylinderGeometry(0.03, 0.03, 0.2, 6),
      gunStock: new THREE.BoxGeometry(0.1, 0.38, 0.14),
      gunBarrel: new THREE.CylinderGeometry(0.035, 0.035, 0.7, 8),
      bowArc: new THREE.TorusGeometry(0.55, 0.025, 6, 20, Math.PI),
      bowString: new THREE.CylinderGeometry(0.006, 0.006, 1.1, 4),
      shieldDisc: new THREE.CylinderGeometry(0.42, 0.42, 0.06, 20),
      shieldBoss: new THREE.SphereGeometry(0.1, 10, 6),
      shieldRim: new THREE.TorusGeometry(0.42, 0.03, 6, 24),
      quiver: new THREE.CylinderGeometry(0.08, 0.07, 0.6, 8),
    },
    mat: {
      skin: std('#e0b38f', { roughness: 0.8 }),
      steel: std('#b9bec4', { metalness: 0.8, roughness: 0.3 }),
      darkSteel: std('#55595e', { metalness: 0.7, roughness: 0.4 }),
      leather: std('#4a3222', { roughness: 0.9 }),
      boots: std('#2e2119', { roughness: 0.9 }),
      wood: std('#6e4a2c', { roughness: 0.8 }),
      gold: std('#d8a93b', { metalness: 0.8, roughness: 0.3 }),
      trousers: std('#3b3530', { roughness: 0.95 }),
      string: std('#e8e0cc'),
      blue: std('#2463c9'),
      blueDark: std('#173f86'),
      red: std('#b42a2a'),
      redDark: std('#6f1919'),
      plumeRed: std('#d9312b'),
      plumeGold: std('#f0c348'),
      plumeBlue: std('#5aa0ff'),
    },
  }
}

function getShared() {
  if (!shared) shared = createShared()
  return shared
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat)
  m.position.set(x, y, z)
  m.castShadow = true
  return m
}

export function createSoldierModel(team: Team, isPlayer = false): SoldierModel {
  const { geo, mat } = getShared()
  const teamMat = (team === 'blue' ? mat.blue : mat.red).clone()
  const teamDark = team === 'blue' ? mat.blueDark : mat.redDark

  const root = new THREE.Group()
  const body = new THREE.Group()
  root.add(body)

  const legL = new THREE.Group()
  const legR = new THREE.Group()
  for (const [leg, x] of [
    [legL, -0.14],
    [legR, 0.14],
  ] as const) {
    leg.position.set(x, 0.9, 0)
    leg.add(mesh(geo.leg, mat.trousers, 0, -0.38, 0))
    leg.add(mesh(geo.boot, mat.boots, 0, -0.81, 0.05))
    body.add(leg)
  }

  body.add(mesh(geo.skirt, teamDark, 0, 0.86, 0))
  body.add(mesh(geo.torso, teamMat, 0, 1.27, 0))
  body.add(mesh(geo.belt, mat.leather, 0, 0.97, 0))
  body.add(mesh(geo.buckle, mat.gold, 0, 0.97, 0.21))
  body.add(mesh(geo.head, mat.skin, 0, 1.82, 0))
  const helmet = mesh(geo.helmet, mat.steel, 0, 1.85, 0)
  body.add(helmet)
  body.add(mesh(geo.brim, mat.steel, 0, 1.86, 0))
  const plumeMat = isPlayer ? mat.plumeGold : team === 'red' ? mat.plumeRed : mat.plumeBlue
  body.add(mesh(geo.plume, plumeMat, 0, 2.15, -0.02))
  body.add(mesh(geo.pauldron, mat.steel, -0.36, 1.56, 0))
  body.add(mesh(geo.pauldron, mat.steel, 0.36, 1.56, 0))

  const quiver = mesh(geo.quiver, mat.leather, 0.15, 1.3, -0.24)
  quiver.rotation.z = 0.4
  body.add(quiver)

  const armL = new THREE.Group()
  armL.position.set(-0.4, 1.52, 0)
  armL.add(mesh(geo.arm, teamMat, 0, -0.27, 0))
  armL.add(mesh(geo.hand, mat.skin, 0, -0.58, 0))
  body.add(armL)

  const armR = new THREE.Group()
  armR.position.set(0.4, 1.52, 0)
  armR.add(mesh(geo.arm, teamMat, 0, -0.27, 0))
  armR.add(mesh(geo.hand, mat.skin, 0, -0.58, 0))
  body.add(armR)

  const sword = new THREE.Group()
  sword.position.set(0, -0.6, 0)
  sword.add(mesh(geo.grip, mat.leather, 0, 0, 0.0).rotateX(Math.PI / 2))
  sword.add(mesh(geo.guard, mat.gold, 0, 0, 0.1))
  sword.add(mesh(geo.blade, mat.steel, 0, 0, 0.6))
  armR.add(sword)

  const gun = new THREE.Group()
  gun.position.set(0, -0.6, 0)
  gun.add(mesh(geo.gunStock, mat.wood, 0, 0.05, -0.04))
  gun.add(mesh(geo.gunBarrel, mat.darkSteel, 0, -0.38, 0.02))
  const muzzle = new THREE.Object3D()
  muzzle.position.set(0, -0.75, 0.02)
  gun.add(muzzle)
  armR.add(gun)

  const bow = new THREE.Group()
  bow.position.set(0, -0.62, 0)
  const arc = mesh(geo.bowArc, mat.wood)
  arc.rotation.set(0, Math.PI / 2, Math.PI)
  bow.add(arc)
  const string = mesh(geo.bowString, mat.string)
  string.rotation.x = Math.PI / 2
  bow.add(string)
  armR.add(bow)

  const shield = new THREE.Group()
  const disc = mesh(geo.shieldDisc, teamMat)
  disc.rotation.x = Math.PI / 2
  shield.add(disc)
  const rim = mesh(geo.shieldRim, mat.steel)
  shield.add(rim)
  shield.add(mesh(geo.shieldBoss, isPlayer ? mat.gold : mat.steel, 0, 0, 0.05))
  body.add(shield)

  root.traverse((o) => {
    o.userData.soldierRoot = root
  })

  return { root, body, legL, legR, armL, armR, sword, gun, bow, shield, muzzle, tunicMaterial: teamMat }
}

export interface CrossbowModel {
  root: THREE.Group
  pitch: THREE.Group
}

export function createCrossbowModel(): CrossbowModel {
  const { geo, mat } = getShared()
  const root = new THREE.Group()
  const post = mesh(new THREE.CylinderGeometry(0.18, 0.28, 1.0, 8), mat.wood, 0, 0.5, 0)
  root.add(post)
  const base = mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.2, 10), mat.darkSteel, 0, 0.1, 0)
  root.add(base)
  const pitch = new THREE.Group()
  pitch.position.y = 1.05
  root.add(pitch)
  pitch.add(mesh(new THREE.BoxGeometry(0.28, 0.22, 2.2), mat.wood, 0, 0, 0.3))
  for (const side of [-1, 1]) {
    const limb = mesh(new THREE.BoxGeometry(1.3, 0.1, 0.12), mat.darkSteel, side * 0.65, 0, 1.25)
    limb.rotation.y = side * -0.35
    pitch.add(limb)
  }
  const bolt = mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6), mat.steel, 0, 0.14, 0.6)
  bolt.rotation.x = Math.PI / 2
  pitch.add(bolt)
  pitch.add(mesh(geo.shieldBoss, mat.red, 0, 0.18, -0.6))
  root.traverse((o) => {
    o.castShadow = true
  })
  return { root, pitch }
}
