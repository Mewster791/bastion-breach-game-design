import * as THREE from 'three'

function makeTexture(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  draw(ctx, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

function speckle(ctx: CanvasRenderingContext2D, size: number, count: number, colors: string[], maxR: number) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)]
    const r = Math.random() * maxR + 0.5
    ctx.globalAlpha = 0.25 + Math.random() * 0.5
    ctx.fillRect(Math.random() * size, Math.random() * size, r, r)
  }
  ctx.globalAlpha = 1
}

export function createGrassTexture() {
  return makeTexture(512, (ctx, s) => {
    ctx.fillStyle = '#5a8a3a'
    ctx.fillRect(0, 0, s, s)
    speckle(ctx, s, 9000, ['#4c7a2f', '#6b9c45', '#7aa94f', '#466f2a', '#86b35a'], 3)
    ctx.lineWidth = 1
    for (let i = 0; i < 2200; i++) {
      const x = Math.random() * s
      const y = Math.random() * s
      ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(130,175,80,0.55)' : 'rgba(55,90,30,0.5)'
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + (Math.random() - 0.5) * 3, y - 3 - Math.random() * 5)
      ctx.stroke()
    }
  })
}

export function createDirtTexture() {
  return makeTexture(512, (ctx, s) => {
    ctx.fillStyle = '#8b6b46'
    ctx.fillRect(0, 0, s, s)
    speckle(ctx, s, 9000, ['#7a5c3a', '#9a7a52', '#6e5233', '#a4865d'], 3)
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(170,150,120,0.7)' : 'rgba(90,70,48,0.7)'
      ctx.beginPath()
      ctx.ellipse(Math.random() * s, Math.random() * s, 2 + Math.random() * 4, 1.5 + Math.random() * 3, Math.random() * 3, 0, Math.PI * 2)
      ctx.fill()
    }
  })
}

export function createStoneTexture() {
  return makeTexture(512, (ctx, s) => {
    ctx.fillStyle = '#4b4842'
    ctx.fillRect(0, 0, s, s)
    const rows = 4
    const cols = 2
    const rowH = s / rows
    const colW = s / cols
    const mortar = 6
    for (let r = 0; r < rows; r++) {
      const offset = r % 2 === 0 ? 0 : colW / 2
      for (let c = -1; c <= cols; c++) {
        const x = c * colW + offset
        const shade = 120 + Math.floor(Math.random() * 40)
        const warm = Math.floor(Math.random() * 10)
        ctx.fillStyle = `rgb(${shade + warm},${shade + warm - 4},${shade - 8})`
        ctx.fillRect(x + mortar / 2, r * rowH + mortar / 2, colW - mortar, rowH - mortar)
        const grad = ctx.createLinearGradient(0, r * rowH, 0, (r + 1) * rowH)
        grad.addColorStop(0, 'rgba(255,255,255,0.10)')
        grad.addColorStop(1, 'rgba(0,0,0,0.18)')
        ctx.fillStyle = grad
        ctx.fillRect(x + mortar / 2, r * rowH + mortar / 2, colW - mortar, rowH - mortar)
      }
    }
    speckle(ctx, s, 7000, ['#6d6a62', '#9e998d', '#3e3b36', '#b0aa9c'], 2.5)
  })
}

export function createFrostStoneTexture() {
  return makeTexture(512, (ctx, s) => {
    ctx.fillStyle = '#627080'
    ctx.fillRect(0, 0, s, s)
    const rows = 4
    const cols = 2
    const rowH = s / rows
    const colW = s / cols
    const mortar = 6
    for (let r = 0; r < rows; r++) {
      const offset = r % 2 === 0 ? 0 : colW / 2
      for (let c = -1; c <= cols; c++) {
        const x = c * colW + offset
        const shade = 126 + Math.floor(Math.random() * 34)
        ctx.fillStyle = `rgb(${shade - 8},${shade},${shade + 12})`
        ctx.fillRect(x + mortar / 2, r * rowH + mortar / 2, colW - mortar, rowH - mortar)
        const grad = ctx.createLinearGradient(0, r * rowH, 0, (r + 1) * rowH)
        grad.addColorStop(0, 'rgba(235,246,255,0.22)')
        grad.addColorStop(1, 'rgba(20,35,52,0.2)')
        ctx.fillStyle = grad
        ctx.fillRect(x + mortar / 2, r * rowH + mortar / 2, colW - mortar, rowH - mortar)
      }
    }
    speckle(ctx, s, 6500, ['#dceaf7', '#8393a6', '#556373', '#eef6ff'], 2.6)
  })
}

export function createBasaltStoneTexture() {
  return makeTexture(512, (ctx, s) => {
    ctx.fillStyle = '#261d1a'
    ctx.fillRect(0, 0, s, s)
    const rows = 4
    const cols = 2
    const rowH = s / rows
    const colW = s / cols
    const mortar = 6
    for (let r = 0; r < rows; r++) {
      const offset = r % 2 === 0 ? 0 : colW / 2
      for (let c = -1; c <= cols; c++) {
        const x = c * colW + offset
        const shade = 56 + Math.floor(Math.random() * 28)
        ctx.fillStyle = `rgb(${shade + 8},${shade},${shade - 2})`
        ctx.fillRect(x + mortar / 2, r * rowH + mortar / 2, colW - mortar, rowH - mortar)
        const grad = ctx.createLinearGradient(0, r * rowH, 0, (r + 1) * rowH)
        grad.addColorStop(0, 'rgba(255,190,140,0.08)')
        grad.addColorStop(1, 'rgba(0,0,0,0.28)')
        ctx.fillStyle = grad
        ctx.fillRect(x + mortar / 2, r * rowH + mortar / 2, colW - mortar, rowH - mortar)
      }
    }
    speckle(ctx, s, 6500, ['#3d312c', '#57443c', '#1f1816', '#7a523c'], 2.4)
  })
}

export function createSnowTexture() {
  return makeTexture(512, (ctx, s) => {
    ctx.fillStyle = '#dde7f2'
    ctx.fillRect(0, 0, s, s)
    speckle(ctx, s, 8500, ['#eef5fc', '#cad8e8', '#bfd0e3', '#f7fbff'], 3.2)
    ctx.lineWidth = 2
    for (let i = 0; i < 420; i++) {
      const x = Math.random() * s
      const y = Math.random() * s
      ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.45)' : 'rgba(165,190,218,0.32)'
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.quadraticCurveTo(x + 14, y + (Math.random() - 0.5) * 4, x + 28, y + (Math.random() - 0.5) * 3)
      ctx.stroke()
    }
  })
}

export function createIceTexture() {
  return makeTexture(512, (ctx, s) => {
    ctx.fillStyle = '#38769c'
    ctx.fillRect(0, 0, s, s)
    speckle(ctx, s, 7000, ['#2c6082', '#4c8db5', '#68a8cf', '#254f6b'], 3.5)
    for (let i = 0; i < 140; i++) {
      const x = Math.random() * s
      const y = Math.random() * s
      ctx.strokeStyle = Math.random() > 0.35 ? 'rgba(218,242,255,0.42)' : 'rgba(25,58,82,0.38)'
      ctx.lineWidth = 0.8 + Math.random() * 1.4
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + (Math.random() - 0.5) * 48, y + (Math.random() - 0.5) * 48)
      ctx.stroke()
    }
  })
}

export function createAshSandTexture() {
  return makeTexture(512, (ctx, s) => {
    ctx.fillStyle = '#694938'
    ctx.fillRect(0, 0, s, s)
    speckle(ctx, s, 9500, ['#543a2d', '#7d5843', '#8c644c', '#422d24', '#9a6f52'], 3.2)
    ctx.lineWidth = 1.6
    for (let i = 0; i < 500; i++) {
      const x = Math.random() * s
      const y = Math.random() * s
      ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(170,120,88,0.3)' : 'rgba(48,30,22,0.35)'
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.quadraticCurveTo(x + 16, y + 3, x + 32, y - 1)
      ctx.stroke()
    }
  })
}

export function createMagmaTexture() {
  return makeTexture(256, (ctx, s) => {
    ctx.fillStyle = '#29110c'
    ctx.fillRect(0, 0, s, s)
    speckle(ctx, s, 3200, ['#421910', '#1c0b08', '#6b2410'], 3)
    for (let i = 0; i < 95; i++) {
      const x = Math.random() * s
      const y = Math.random() * s
      ctx.strokeStyle = i % 3 === 0 ? '#ffd04d' : '#ff5e14'
      ctx.lineWidth = 1.5 + Math.random() * 2.8
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.bezierCurveTo(
        x + (Math.random() - 0.5) * 40,
        y + (Math.random() - 0.5) * 40,
        x + (Math.random() - 0.5) * 40,
        y + (Math.random() - 0.5) * 40,
        x + (Math.random() - 0.5) * 55,
        y + (Math.random() - 0.5) * 55,
      )
      ctx.stroke()
    }
  })
}

export function createWoodTexture() {
  return makeTexture(256, (ctx, s) => {
    ctx.fillStyle = '#7a5130'
    ctx.fillRect(0, 0, s, s)
    const planks = 4
    const w = s / planks
    for (let p = 0; p < planks; p++) {
      const shade = 100 + Math.floor(Math.random() * 30)
      ctx.fillStyle = `rgb(${shade + 22},${shade - 10},${shade - 45})`
      ctx.fillRect(p * w + 2, 0, w - 4, s)
      for (let g = 0; g < 14; g++) {
        ctx.strokeStyle = 'rgba(60,35,18,0.35)'
        ctx.lineWidth = 1
        ctx.beginPath()
        const gx = p * w + 4 + Math.random() * (w - 8)
        ctx.moveTo(gx, 0)
        ctx.bezierCurveTo(gx + 3, s * 0.3, gx - 3, s * 0.6, gx + 1, s)
        ctx.stroke()
      }
      ctx.fillStyle = 'rgba(40,24,12,0.9)'
      ctx.fillRect(p * w, 0, 2, s)
    }
  })
}

export function scaleBoxUVs(geometry: THREE.BoxGeometry, w: number, h: number, d: number, unit: number) {
  const uv = geometry.attributes.uv as THREE.BufferAttribute
  const dims: [number, number][] = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ]
  for (let face = 0; face < 6; face++) {
    for (let i = 0; i < 4; i++) {
      const idx = face * 4 + i
      uv.setXY(idx, (uv.getX(idx) * dims[face][0]) / unit, (uv.getY(idx) * dims[face][1]) / unit)
    }
  }
  uv.needsUpdate = true
  return geometry
}
