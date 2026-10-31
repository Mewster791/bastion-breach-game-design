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
