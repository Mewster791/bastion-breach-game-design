import * as THREE from 'three'

export type GroundTheme =
  | 'grass'
  | 'snow'
  | 'ash'
  | 'sand'
  | 'autumn'
  | 'marsh'
  | 'blossom'
  | 'night'
  | 'aegean'
  | 'moor'

export type MasonryTheme =
  | 'limestone'
  | 'frost'
  | 'basalt'
  | 'sandstone'
  | 'brick'
  | 'moss'
  | 'marble'
  | 'granite'

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
    ctx.globalAlpha = 0.24 + Math.random() * 0.5
    ctx.fillRect(Math.random() * size, Math.random() * size, r, r)
  }
  ctx.globalAlpha = 1
}

export function createGroundTexture(theme: GroundTheme) {
  const palettes: Record<
    GroundTheme,
    { base: string; dots: string[]; bladeA: string; bladeB: string; ripples?: boolean }
  > = {
    grass: {
      base: '#5a8a3a',
      dots: ['#4c7a2f', '#6b9c45', '#7aa94f', '#466f2a', '#86b35a'],
      bladeA: 'rgba(130,175,80,0.55)',
      bladeB: 'rgba(55,90,30,0.5)',
    },
    snow: {
      base: '#dde7f2',
      dots: ['#eef5fc', '#cad8e8', '#bfd0e3', '#f7fbff'],
      bladeA: 'rgba(255,255,255,0.45)',
      bladeB: 'rgba(165,190,218,0.32)',
      ripples: true,
    },
    ash: {
      base: '#634636',
      dots: ['#4e362a', '#785541', '#876049', '#3f2b22', '#946a50'],
      bladeA: 'rgba(168,118,86,0.32)',
      bladeB: 'rgba(42,26,20,0.38)',
      ripples: true,
    },
    sand: {
      base: '#d4ab6a',
      dots: ['#dfb97a', '#c49856', '#e8c78e', '#b58947'],
      bladeA: 'rgba(248,224,175,0.42)',
      bladeB: 'rgba(168,122,62,0.32)',
      ripples: true,
    },
    autumn: {
      base: '#6f7334',
      dots: ['#5b6129', '#b85d28', '#d4872c', '#8c3b23', '#7f8038'],
      bladeA: 'rgba(218,132,48,0.45)',
      bladeB: 'rgba(84,74,28,0.45)',
    },
    marsh: {
      base: '#43593d',
      dots: ['#354a31', '#4f6946', '#2e3f2b', '#60784e', '#4c5c47'],
      bladeA: 'rgba(105,138,88,0.45)',
      bladeB: 'rgba(34,48,32,0.5)',
    },
    blossom: {
      base: '#65944c',
      dots: ['#56823f', '#76a65b', '#f5b8cb', '#fae1ea', '#82b066'],
      bladeA: 'rgba(142,190,104,0.5)',
      bladeB: 'rgba(246,184,206,0.45)',
    },
    night: {
      base: '#2b4038',
      dots: ['#22332d', '#354f45', '#3e5c50', '#1d2b27'],
      bladeA: 'rgba(92,132,118,0.4)',
      bladeB: 'rgba(20,32,28,0.5)',
    },
    aegean: {
      base: '#8c9450',
      dots: ['#7b8243', '#9ea660', '#b5b074', '#6d743a'],
      bladeA: 'rgba(190,188,124,0.45)',
      bladeB: 'rgba(96,102,48,0.42)',
    },
    moor: {
      base: '#594a4f',
      dots: ['#4a3d42', '#6e5263', '#4f593b', '#7a596c', '#3e3538'],
      bladeA: 'rgba(138,96,124,0.42)',
      bladeB: 'rgba(62,72,46,0.45)',
    },
  }

  const p = palettes[theme]
  return makeTexture(512, (ctx, s) => {
    ctx.fillStyle = p.base
    ctx.fillRect(0, 0, s, s)
    speckle(ctx, s, 9000, p.dots, 3.1)
    if (p.ripples) {
      ctx.lineWidth = 1.8
      for (let i = 0; i < 460; i++) {
        const x = Math.random() * s
        const y = Math.random() * s
        ctx.strokeStyle = i % 2 === 0 ? p.bladeA : p.bladeB
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.quadraticCurveTo(x + 15, y + (Math.random() - 0.5) * 4, x + 30, y + (Math.random() - 0.5) * 3)
        ctx.stroke()
      }
    } else {
      ctx.lineWidth = 1
      for (let i = 0; i < 2000; i++) {
        const x = Math.random() * s
        const y = Math.random() * s
        ctx.strokeStyle = i % 2 === 0 ? p.bladeA : p.bladeB
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + (Math.random() - 0.5) * 3, y - 3 - Math.random() * 5)
        ctx.stroke()
      }
    }
  })
}

export function createMasonryTexture(theme: MasonryTheme) {
  const configs: Record<
    MasonryTheme,
    { mortarColor: string; rows: number; cols: number; rgb: (sh: number) => [number, number, number]; dots: string[] }
  > = {
    limestone: {
      mortarColor: '#4b4842',
      rows: 4,
      cols: 2,
      rgb: (sh) => [sh + 6, sh + 2, sh - 8],
      dots: ['#6d6a62', '#9e998d', '#3e3b36', '#b0aa9c'],
    },
    frost: {
      mortarColor: '#627080',
      rows: 4,
      cols: 2,
      rgb: (sh) => [sh - 8, sh, sh + 12],
      dots: ['#dceaf7', '#8393a6', '#556373', '#eef6ff'],
    },
    basalt: {
      mortarColor: '#261d1a',
      rows: 4,
      cols: 2,
      rgb: (sh) => {
        const d = Math.floor(sh * 0.48)
        return [d + 8, d, d - 2]
      },
      dots: ['#3d312c', '#57443c', '#1f1816', '#7a523c'],
    },
    sandstone: {
      mortarColor: '#8c6d46',
      rows: 4,
      cols: 2,
      rgb: (sh) => [Math.min(245, sh + 58), Math.min(220, sh + 30), Math.max(80, sh - 12)],
      dots: ['#dfb982', '#b58d58', '#edd1a1', '#997445'],
    },
    brick: {
      mortarColor: '#b8afa0',
      rows: 6,
      cols: 3,
      rgb: (sh) => [Math.min(210, sh + 32), Math.max(55, Math.floor(sh * 0.58)), Math.max(42, Math.floor(sh * 0.46))],
      dots: ['#8c3f2f', '#a8523d', '#6e3024', '#c27055'],
    },
    moss: {
      mortarColor: '#364234',
      rows: 4,
      cols: 2,
      rgb: (sh) => [sh - 18, sh - 6, sh - 20],
      dots: ['#4a663e', '#5d7a4c', '#3c453a', '#708762'],
    },
    marble: {
      mortarColor: '#b5afa4',
      rows: 4,
      cols: 2,
      rgb: (sh) => {
        const b = Math.min(248, sh + 82)
        return [b, b - 2, b - 6]
      },
      dots: ['#ffffff', '#d9d4ca', '#c4beb2', '#f2efe9'],
    },
    granite: {
      mortarColor: '#3a3c42',
      rows: 4,
      cols: 2,
      rgb: (sh) => {
        const g = Math.floor(sh * 0.78)
        return [g, g + 2, g + 6]
      },
      dots: ['#52565e', '#7c818c', '#34373d', '#989ea8'],
    },
  }

  const cfg = configs[theme]
  return makeTexture(512, (ctx, s) => {
    ctx.fillStyle = cfg.mortarColor
    ctx.fillRect(0, 0, s, s)
    const rowH = s / cfg.rows
    const colW = s / cfg.cols
    const mortar = 6
    for (let r = 0; r < cfg.rows; r++) {
      const offset = r % 2 === 0 ? 0 : colW / 2
      for (let c = -1; c <= cfg.cols; c++) {
        const x = c * colW + offset
        const shade = 120 + Math.floor(Math.random() * 40)
        const [cr, cg, cb] = cfg.rgb(shade)
        ctx.fillStyle = `rgb(${cr},${cg},${cb})`
        ctx.fillRect(x + mortar / 2, r * rowH + mortar / 2, colW - mortar, rowH - mortar)
        const grad = ctx.createLinearGradient(0, r * rowH, 0, (r + 1) * rowH)
        grad.addColorStop(0, 'rgba(255,255,255,0.10)')
        grad.addColorStop(1, 'rgba(0,0,0,0.18)')
        ctx.fillStyle = grad
        ctx.fillRect(x + mortar / 2, r * rowH + mortar / 2, colW - mortar, rowH - mortar)
      }
    }
    speckle(ctx, s, 6000, cfg.dots, 2.5)
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

export function createLiquidTexture(kind: 'ice' | 'magma' | 'bog') {
  return makeTexture(256, (ctx, s) => {
    if (kind === 'ice') {
      ctx.fillStyle = '#38769c'
      ctx.fillRect(0, 0, s, s)
      speckle(ctx, s, 4500, ['#2c6082', '#4c8db5', '#68a8cf', '#254f6b'], 3.2)
      for (let i = 0; i < 95; i++) {
        ctx.strokeStyle = 'rgba(218,242,255,0.42)'
        ctx.lineWidth = 1.1
        const x = Math.random() * s
        const y = Math.random() * s
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40)
        ctx.stroke()
      }
    } else if (kind === 'magma') {
      ctx.fillStyle = '#29110c'
      ctx.fillRect(0, 0, s, s)
      speckle(ctx, s, 3000, ['#421910', '#1c0b08', '#6b2410'], 3)
      for (let i = 0; i < 90; i++) {
        ctx.strokeStyle = i % 3 === 0 ? '#ffd04d' : '#ff5e14'
        ctx.lineWidth = 1.6 + Math.random() * 2.5
        const x = Math.random() * s
        const y = Math.random() * s
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.bezierCurveTo(x + 15, y - 20, x - 15, y + 20, x + (Math.random() - 0.5) * 48, y + (Math.random() - 0.5) * 48)
        ctx.stroke()
      }
    } else {
      ctx.fillStyle = '#253b30'
      ctx.fillRect(0, 0, s, s)
      speckle(ctx, s, 4500, ['#1d2e25', '#34523f', '#426348', '#2a4236'], 3.5)
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
