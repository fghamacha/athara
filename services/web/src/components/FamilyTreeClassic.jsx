import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { useNavigate } from 'react-router-dom'

// ── Dimensions ────────────────────────────────────────────────────────────────
const W  = 200   // person card width
const H  = 86    // person card height
const PR = 25    // photo circle radius
const CI = 18    // inner gap between couple cards
const HG = 28    // horizontal gap between sibling units
const VG = 90    // vertical gap between generations

const truncate = (s, n) => !s ? '' : s.length > n ? s.slice(0, n - 1) + '…' : s
const mKey    = (a, b) => [a, b].sort().join('|')
const borderC = d => d.death_date ? '#6b7280' : d.gender === 'male' ? '#3b82f6' : d.gender === 'female' ? '#ec4899' : '#2e3347'

// ♥ uniquement sur les liens mariage — jamais sur les liens parent-enfant
function drawMarriageLine(g, x1, y1, x2, y2) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
  g.append('line')
    .attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
    .attr('stroke', '#e91e8c').attr('stroke-width', 2).attr('stroke-dasharray', '5,4')
  // Petit fond blanc pour lisibilité du ♥
  g.append('circle').attr('cx', mx).attr('cy', my).attr('r', 8).attr('fill', '#1a1d27')
  g.append('text').text('♥')
    .attr('x', mx).attr('y', my + 4)
    .attr('text-anchor', 'middle').attr('font-size', '11px').attr('fill', '#e91e8c')
}

// ── Hierarchy builder ─────────────────────────────────────────────────────────
// Couple nodes (virtual) are created for each marriage.
// Children whose parents are married are attached to the couple node → no duplicates.
// Multi-generation: a child who is also in a couple (with their own children) gets their
// person-node replaced by their couple-node in the parent's _ch, so the chain is unbroken.
function buildHierarchy(nodes, parentChild, marriages) {
  if (!nodes.length) return null

  const pMap = new Map(nodes.map(n => [String(n.id), { ...n, _ch: [] }]))

  // child → [parentIds]
  const c2p = new Map()
  parentChild.forEach(({ parent_id, child_id }) => {
    const cid = String(child_id)
    if (!c2p.has(cid)) c2p.set(cid, [])
    c2p.get(cid).push(String(parent_id))
  })

  // couple nodes keyed by sorted spouse ids
  const coupleMap = new Map()
  marriages.forEach(m => {
    const s1 = String(m.spouse1_id), s2 = String(m.spouse2_id)
    const k = mKey(s1, s2)
    coupleMap.set(k, { id: `couple_${k}`, __couple: true, __virtual: true, __s1: s1, __s2: s2, _ch: [] })
  })

  // Map every person → their couple-node (for single-parent fallback below)
  const personToCouple = new Map()
  coupleMap.forEach(cn => {
    personToCouple.set(cn.__s1, cn)
    personToCouple.set(cn.__s2, cn)
  })

  const childIds = new Set()

  // Assign children to couple-node or single parent
  c2p.forEach((pids, cid) => {
    childIds.add(cid)
    let done = false
    for (let i = 0; i < pids.length && !done; i++)
      for (let j = i + 1; j < pids.length && !done; j++) {
        const couple = coupleMap.get(mKey(pids[i], pids[j]))
        if (couple) { couple._ch.push(pMap.get(cid)); done = true }
      }
    if (!done && pids[0]) {
      // Use couple-node if the single parent is married — keeps child visible after substituteCouple
      const p = personToCouple.get(pids[0]) || pMap.get(pids[0])
      const c = pMap.get(cid)
      if (p && c) p._ch.push(c)
    }
  })

  // Map each person (in a couple with children) → that couple-node
  const personToCoupleWithKids = new Map()
  coupleMap.forEach(cn => {
    if (cn._ch.length > 0) {
      personToCoupleWithKids.set(cn.__s1, cn)
      personToCoupleWithKids.set(cn.__s2, cn)
    }
  })

  // Set s1data / s2data on ALL couple nodes (needed for rendering at any depth)
  coupleMap.forEach(cn => {
    cn.__s1data = pMap.get(cn.__s1)
    cn.__s2data = pMap.get(cn.__s2)
  })

  // Replace person-nodes in _ch arrays with their couple-node (multi-gen fix).
  // grandparents._ch = [fathi_person] → [couple_Fathi|Souad] → [fahmi_person]
  const substituteCouple = (ch_array, visited = new Set()) => {
    for (let i = 0; i < ch_array.length; i++) {
      const child = ch_array[i]
      if (!child) continue
      const coupleNode = personToCoupleWithKids.get(String(child.id))
      if (coupleNode && !visited.has(coupleNode.id)) {
        ch_array[i] = coupleNode
        visited.add(coupleNode.id)
        substituteCouple(coupleNode._ch, visited)
      } else {
        substituteCouple(child._ch || [], visited)
      }
    }
  }
  coupleMap.forEach(cn => substituteCouple(cn._ch))
  pMap.forEach(p => substituteCouple(p._ch))

  // Break cycles in _ch graph (e.g. A is parent of B AND B is parent of A).
  // A cycle would cause d3.hierarchy to recurse infinitely and crash.
  const cycleVisited = new Set()
  const cycleStack = new Set()
  const breakCycles = (node) => {
    if (!node?._ch?.length) return
    const id = String(node.id)
    if (cycleVisited.has(id)) return
    cycleVisited.add(id)
    cycleStack.add(id)
    node._ch = node._ch.filter(child => {
      if (!child) return false
      if (cycleStack.has(String(child.id))) return false  // remove back edge
      breakCycles(child)
      return true
    })
    cycleStack.delete(id)
  }
  pMap.forEach(p => breakCycles(p))
  coupleMap.forEach(cn => breakCycles(cn))

  // Collect ALL couple-spouses embedded anywhere in the hierarchy (after substitution),
  // so we never re-add them as disconnected solo roots.
  // Must traverse every pMap and coupleMap node — not just current top-level entries —
  // because a single (unmarried) parent like Ahmed makes couple_Zayed|Jmila non-root,
  // yet Jmila must still be excluded as a solo duplicate.
  const embeddedCoupleSpouses = new Set()
  const gv = new Set()
  const collectEmbedded = (node) => {
    if (!node?._ch?.length || gv.has(node.id)) return
    gv.add(node.id)
    node._ch.forEach(child => {
      if (child?.__couple) {
        embeddedCoupleSpouses.add(child.__s1)
        embeddedCoupleSpouses.add(child.__s2)
      }
      collectEmbedded(child)
    })
  }
  pMap.forEach(p => collectEmbedded(p))
  coupleMap.forEach(cn => collectEmbedded(cn))

  // Top-level: couple nodes where BOTH spouses are roots
  const usedIds = new Set()
  const top = []

  coupleMap.forEach(cn => {
    if (!cn._ch.length) return
    const s1Root = !childIds.has(cn.__s1), s2Root = !childIds.has(cn.__s2)
    if (s1Root && s2Root) {
      top.push(cn)
      usedIds.add(cn.__s1)
      usedIds.add(cn.__s2)
    }
  })

  // Solo roots: persons not already placed in the hierarchy
  nodes
    .filter(n => {
      const sid = String(n.id)
      return !childIds.has(sid) && !usedIds.has(sid) && !embeddedCoupleSpouses.has(sid)
    })
    .forEach(n => top.push(pMap.get(String(n.id))))

  if (!top.length) return { id: '__root', __virtual: true, _ch: [...pMap.values()] }
  if (top.length === 1) return top[0]
  return { id: '__root', __virtual: true, _ch: top }
}

// ── Person card renderer ──────────────────────────────────────────────────────
function renderCard(container, cx, cy, d, navigate, defs) {
  const g = container.append('g')
    .attr('transform', `translate(${cx - W / 2},${cy - H / 2})`)
    .style('cursor', 'pointer')
    .on('click', () => navigate(`/persons/${d.id}`))

  // shadow
  g.append('rect').attr('x', 2).attr('y', 3).attr('width', W).attr('height', H).attr('rx', 10).attr('fill', 'rgba(0,0,0,0.28)')

  // card bg
  g.append('rect').attr('width', W).attr('height', H).attr('rx', 10)
    .attr('fill', '#1a1d27').attr('stroke', borderC(d)).attr('stroke-width', 2)

  // photo circle
  const pcx = PR + 10, pcy = H / 2
  g.append('circle').attr('cx', pcx).attr('cy', pcy).attr('r', PR)
    .attr('fill', d.gender === 'male' ? 'rgba(59,130,246,0.15)' : d.gender === 'female' ? 'rgba(236,72,153,0.15)' : '#252836')
    .attr('stroke', borderC(d)).attr('stroke-width', 1.5)

  if (d.photo_url) {
    const clipId = `cp-${d.id}-${Math.random().toString(36).slice(2)}`
    defs.append('clipPath').attr('id', clipId)
      .append('circle').attr('cx', cx - W / 2 + pcx).attr('cy', cy - H / 2 + pcy).attr('r', PR - 2)
    g.append('image')
      .attr('href', d.photo_url)
      .attr('x', pcx - PR + 2).attr('y', pcy - PR + 2)
      .attr('width', (PR - 2) * 2).attr('height', (PR - 2) * 2)
      .attr('clip-path', `url(#${clipId})`)
      .attr('preserveAspectRatio', 'xMidYMid slice')
  } else {
    const ini = `${d.first_name?.[0] ?? ''}${d.last_name?.[0] ?? ''}`.toUpperCase()
    g.append('text').text(ini).attr('x', pcx).attr('y', pcy + 5)
      .attr('text-anchor', 'middle').attr('font-size', '14px').attr('font-weight', '700')
      .attr('fill', d.gender === 'male' ? '#3b82f6' : d.gender === 'female' ? '#ec4899' : '#8b91a7')
  }

  // text
  const tx = pcx + PR + 10
  g.append('text').text(truncate(d.first_name, 13))
    .attr('x', tx).attr('y', H / 2 - 22).attr('font-size', '13px').attr('font-weight', '700').attr('fill', '#e8eaf0')
  g.append('text').text(truncate((d.last_name ?? '').toUpperCase(), 13))
    .attr('x', tx).attr('y', H / 2 - 8).attr('font-size', '11px').attr('font-weight', '600').attr('fill', '#c8cad4')
  g.append('text').text(truncate(d.profession, 20))
    .attr('x', tx).attr('y', H / 2 + 9).attr('font-size', '10px').attr('fill', '#8b91a7')

  const born = d.birth_date ? `✓ ${new Date(d.birth_date).getFullYear()}` : ''
  const died = d.death_date ? `◆ ${new Date(d.death_date).getFullYear()}` : ''
  g.append('text').text([born, died].filter(Boolean).join('  '))
    .attr('x', tx).attr('y', H / 2 + 25).attr('font-size', '10px').attr('fill', '#8b91a7')
}

// ── Main component ────────────────────────────────────────────────────────────
export default function FamilyTreeClassic({ data }) {
  const svgRef = useRef()
  const navigate = useNavigate()

  useEffect(() => {
    if (!data || !svgRef.current) return
    const { nodes, parent_child, marriages } = data
    if (!nodes.length) return

    const el = svgRef.current
    const svgW = el.clientWidth || 900
    const svgH = el.clientHeight || 600

    d3.select(el).selectAll('*').remove()

    try {
    const svg = d3.select(el).attr('width', svgW).attr('height', svgH)
    const defs = svg.append('defs')

    // ── Animated particle background ──────────────────────────────────────────
    svg.append('rect').attr('width', '100%').attr('height', '100%')
      .attr('fill', 'var(--bg)').attr('pointer-events', 'none')
    // Static micro-dot grid (base layer)
    defs.append('pattern').attr('id', 'dot-bg').attr('width', 32).attr('height', 32)
      .attr('patternUnits', 'userSpaceOnUse')
      .append('circle').attr('cx', 16).attr('cy', 16).attr('r', 0.9)
      .attr('fill', 'rgba(139,145,167,0.08)')
    svg.append('rect').attr('width', '100%').attr('height', '100%')
      .attr('fill', 'url(#dot-bg)').attr('pointer-events', 'none')
    // Glow filter for bright sparkle particles
    const glowF = defs.append('filter').attr('id', 'sparkle-glow')
      .attr('x', '-60%').attr('y', '-60%').attr('width', '220%').attr('height', '220%')
    glowF.append('feGaussianBlur').attr('stdDeviation', '2.5').attr('result', 'blur')
    const glowMerge = glowF.append('feMerge')
    glowMerge.append('feMergeNode').attr('in', 'blur')
    glowMerge.append('feMergeNode').attr('in', 'SourceGraphic')
    // Animated particles (viewport-fixed, outside zoom group)
    const bgLayer = svg.append('g').attr('pointer-events', 'none')
    const rnd = () => Math.random()
    for (let i = 0; i < 60; i++) {
      const px = rnd() * svgW, py = rnd() * svgH
      const delay = (rnd() * 8).toFixed(2)
      const isStar = rnd() < 0.14  // ~14% are shooting stars

      if (isStar) {
        // Shooting star: appears, streaks diagonally, fades out, long pause
        const angle = Math.PI * (0.25 + rnd() * 0.7)  // mostly downward diagonal
        const dist  = 55 + rnd() * 90
        const nx = (px + Math.cos(angle) * dist).toFixed(1)
        const ny = (py + Math.sin(angle) * dist).toFixed(1)
        const period   = (9  + rnd() * 12).toFixed(2)
        const shootDur = (0.35 + rnd() * 0.5).toFixed(3)
        const s0 = (rnd() * 0.75).toFixed(3)
        const s1 = (+s0 + 0.003).toFixed(3)
        const s2 = Math.min(+s1 + +shootDur / +period, 0.98).toFixed(3)
        const s3 = Math.min(+s2 + 0.005, 0.99).toFixed(3)
        const kt  = `0;${s0};${s1};${s2};${s3};1`
        const c = bgLayer.append('circle')
          .attr('cx', px).attr('cy', py).attr('r', 0.9 + rnd() * 1.0)
          .attr('fill', rnd() > 0.4 ? '#ffffff' : '#a5b4fc')
          .attr('opacity', 0).attr('filter', 'url(#sparkle-glow)')
        c.append('animate').attr('attributeName', 'opacity')
          .attr('values', `0;0;0.95;0;0;0`).attr('keyTimes', kt)
          .attr('dur', `${period}s`).attr('begin', `${delay}s`).attr('repeatCount', 'indefinite')
        c.append('animate').attr('attributeName', 'cx')
          .attr('values', `${px};${px};${px};${nx};${nx};${px}`).attr('keyTimes', kt)
          .attr('dur', `${period}s`).attr('begin', `${delay}s`).attr('repeatCount', 'indefinite')
        c.append('animate').attr('attributeName', 'cy')
          .attr('values', `${py};${py};${py};${ny};${ny};${py}`).attr('keyTimes', kt)
          .attr('dur', `${period}s`).attr('begin', `${delay}s`).attr('repeatCount', 'indefinite')
      } else {
        // Regular sparkle: slow oscillation + random opacity pulse
        const r     = 0.6 + rnd() * 1.5
        const bright = rnd() > 0.6
        const oLow   = bright ? 0.15 : 0.03
        const oHigh  = bright ? 0.92 : 0.30
        const oDur   = (2.0 + rnd() * 4.5).toFixed(2)
        const mDur   = (10  + rnd() * 12).toFixed(2)
        const dx = ((rnd() - 0.5) * 26).toFixed(1)
        const dy = ((rnd() - 0.5) * 26).toFixed(1)
        const fill   = bright ? (rnd() > 0.5 ? '#818cf8' : '#67e8f9') : 'rgba(139,145,167,0.85)'
        const c = bgLayer.append('circle')
          .attr('cx', px).attr('cy', py).attr('r', r)
          .attr('fill', fill).attr('opacity', oLow)
        if (bright) c.attr('filter', 'url(#sparkle-glow)')
        c.append('animate').attr('attributeName', 'opacity')
          .attr('values', `${oLow};${oHigh};${oLow}`)
          .attr('dur', `${oDur}s`).attr('begin', `${delay}s`).attr('repeatCount', 'indefinite')
        c.append('animate').attr('attributeName', 'cx')
          .attr('values', `${px};${(+px + +dx).toFixed(1)};${px}`)
          .attr('dur', `${mDur}s`).attr('begin', `${delay}s`).attr('repeatCount', 'indefinite')
        c.append('animate').attr('attributeName', 'cy')
          .attr('values', `${py};${(+py + +dy).toFixed(1)};${py}`)
          .attr('dur', `${mDur}s`).attr('begin', `${delay}s`).attr('repeatCount', 'indefinite')
      }
    }

    // ── Build hierarchy & layout ──────────────────────────────────────────────
    const hierarchyData = buildHierarchy(nodes, parent_child, marriages)
    if (!hierarchyData) return

    const root = d3.hierarchy(hierarchyData, d => d._ch?.length ? d._ch : null)

    d3.tree()
      .nodeSize([W + HG, H + VG])
      .separation((a, b) => {
        const ac = a.data.__couple ? 1.15 : 0.55
        const bc = b.data.__couple ? 1.15 : 0.55
        return ac + bc + (a.parent === b.parent ? 0 : 0.25)
      })
      (root)

    // ── Position map ──────────────────────────────────────────────────────────
    // Maps every id (person or couple_*) to its (x, y) in D3 coords
    const d3Pos = new Map()
    root.each(d => {
      if (!d.data.__virtual || d.data.__couple) d3Pos.set(String(d.data.id), d)
    })

    const nodeMap = new Map(nodes.map(n => [String(n.id), n]))

    // ── Extra spouse nodes ────────────────────────────────────────────────────
    const extra      = new Map()  // personId → { x, y, data }
    const skipInTree = new Set()

    // Find the nearest x that doesn't overlap any D3 node or already-placed extra node
    const clearX = (startX, y, dir) => {
      let x = startX, moved = true, iters = 0
      while (moved && iters++ < 20) {
        moved = false
        for (const [, d] of d3Pos) {
          if (Math.abs(d.y - y) > H * 0.4) continue
          const hw = (d.data.__couple ? W + CI / 2 : W / 2) + W / 2 + HG / 2
          if (Math.abs(d.x - x) < hw) {
            x = dir > 0
              ? d.x + (d.data.__couple ? W + CI / 2 : W / 2) + W / 2 + HG
              : d.x - (d.data.__couple ? W + CI / 2 : W / 2) - W / 2 - HG
            moved = true; break
          }
        }
        if (!moved) for (const [, e] of extra) {
          if (!e.data || Math.abs(e.y - y) > H * 0.4) continue
          if (Math.abs(e.x - x) < W + HG) {
            x = dir > 0 ? e.x + W + HG : e.x - W - HG
            moved = true; break
          }
        }
      }
      return x
    }

    marriages.forEach(m => {
      const s1 = String(m.spouse1_id), s2 = String(m.spouse2_id)
      const coupleId = `couple_${mKey(s1, s2)}`
      if (d3Pos.has(coupleId)) return

      const d1 = d3Pos.get(s1), d2 = d3Pos.get(s2)

      if (d1 && !d2 && !extra.has(s2)) {
        extra.set(s2, { x: clearX(d1.x + W + CI, d1.y, 1), y: d1.y, data: nodeMap.get(s2) })
        skipInTree.add(s2)
      } else if (!d1 && d2 && !extra.has(s1)) {
        extra.set(s1, { x: clearX(d2.x - W - CI, d2.y, -1), y: d2.y, data: nodeMap.get(s1) })
        skipInTree.add(s1)
      } else if (d1 && d2 && Math.abs(d1.y - d2.y) > H * 0.5) {
        if (d1.depth >= d2.depth) {
          extra.set(s2, { x: clearX(d1.x + W + CI, d1.y, 1), y: d1.y, data: d2.data })
          skipInTree.add(s2)
        } else {
          extra.set(s1, { x: clearX(d2.x - W - CI, d2.y, -1), y: d2.y, data: d1.data })
          skipInTree.add(s1)
        }
      }
    })

    // When a spouse is moved via extra, walk up their original parent chain.
    // If all of a parent's children are now skipped/moved, reposition that parent
    // directly above the moved child's slot (creates an in-law column).
    const movedParents = new Map()
    extra.forEach((eData, movedId) => {
      const origD = d3Pos.get(movedId)
      if (!origD?.parent) return
      let par = origD.parent
      let slotX = eData.x, slotY = eData.y
      while (par) {
        const parId = String(par.data.id)
        if (par.data.__virtual && !par.data.__couple) break
        if (movedParents.has(parId)) break
        const visChildren = (par.children || []).filter(c => {
          const cid = String(c.data.id)
          return !skipInTree.has(cid) && !movedParents.has(cid)
        })
        if (visChildren.length > 0) break
        movedParents.set(parId, { x: slotX, y: slotY - (H + VG), data: par.data })
        skipInTree.add(parId)
        slotY = slotY - (H + VG)
        par = par.parent
      }
    })

    const getPos = id => {
      if (extra.has(id))        { const e  = extra.get(id);        return { x: e.x,  y: e.y  } }
      if (movedParents.has(id)) { const mp = movedParents.get(id); return { x: mp.x, y: mp.y } }
      const n = d3Pos.get(id); return n ? { x: n.x, y: n.y } : null
    }

    // ── In-law subtree relocation ─────────────────────────────────────────────
    // When a top-level D3 subtree has a child who was moved to extra (e.g. Fatma
    // placed next to Fahmi), shift the ENTIRE subtree so it sits one generation
    // above that extra child — keeping in-laws visually near their child instead
    // of stranded at the far top of the tree.
    // We modify D3 node .x/.y directly so all subsequent rendering is automatic.
    root.each(par => {
      const parId = String(par.data.id)
      if (par.data.__virtual && !par.data.__couple) return
      if (skipInTree.has(parId)) return
      // Only top-level nodes (direct children of the virtual root or the lone root)
      const isTopLevel = !par.parent || (par.parent.data.__virtual && !par.parent.data.__couple)
      if (!isTopLevel) return
      // Find children that were moved to an extra slot
      const extraKids = (par.children || []).filter(c => extra.has(String(c.data.id)))
      if (!extraKids.length) return
      const ep = extra.get(String(extraKids[0].data.id))
      const dx = ep.x - par.x
      const dy = (ep.y - H - VG) - par.y
      if (Math.abs(dy) < H && Math.abs(dx) < W) return  // already close enough
      par.each(node => {
        if (!skipInTree.has(String(node.data.id))) { node.x += dx; node.y += dy }
      })
    })

    // ── Center the tree ───────────────────────────────────────────────────────
    let minX = Infinity, maxX = -Infinity
    const allXY = []
    root.each(d => { if (!d.data.__virtual || d.data.__couple) allXY.push({ x: d.x, data: d.data }) })
    extra.forEach(e => allXY.push({ x: e.x }))
    allXY.forEach(({ x, data }) => {
      const hw = data?.__couple ? W + CI / 2 : W / 2
      if (x - hw < minX) minX = x - hw
      if (x + hw > maxX) maxX = x + hw
    })
    const treeW  = maxX - minX
    const initTX = (svgW - treeW) / 2 - minX
    const initTY = 50

    const g = svg.append('g')
    const zoom = d3.zoom().scaleExtent([0.1, 3]).on('zoom', ev => g.attr('transform', ev.transform))
    svg.call(zoom)
    svg.call(zoom.transform, d3.zoomIdentity.translate(initTX, initTY))

    // ── Elbow links ───────────────────────────────────────────────────────────
    const lG = g.append('g')
    const stroke = '#2e3347', sw = 1.5
    const drawElbow = (px, py, children) => {
      if (!children.length) return
      const midY = (py + children[0].y) / 2
      const xs = children.map(c => c.x)
      lG.append('line').attr('x1', px).attr('y1', py + H / 2).attr('x2', px).attr('y2', midY)
        .attr('stroke', stroke).attr('stroke-width', sw)
      if (children.length > 1)
        lG.append('line').attr('x1', Math.min(...xs)).attr('y1', midY).attr('x2', Math.max(...xs)).attr('y2', midY)
          .attr('stroke', stroke).attr('stroke-width', sw)
      children.forEach(ch =>
        lG.append('line').attr('x1', ch.x).attr('y1', midY).attr('x2', ch.x).attr('y2', ch.y - H / 2)
          .attr('stroke', stroke).attr('stroke-width', sw)
      )
    }

    root.each(par => {
      if (!par.children?.length || (par.data.__virtual && !par.data.__couple)) return
      if (skipInTree.has(String(par.data.id))) return  // couple was moved to movedParents
      const vis = par.children.filter(c => !skipInTree.has(String(c.data.id)))
      drawElbow(par.x, par.y, vis)
      // Dashed path to children moved to an extra slot (e.g. Fatma when siblings keep parent in tree)
      par.children.forEach(c => {
        const cid = String(c.data.id)
        if (!skipInTree.has(cid) || !extra.has(cid)) return
        const ep = extra.get(cid)
        const midY = (par.y + ep.y) / 2
        lG.append('path')
          .attr('d', `M${par.x},${par.y + H / 2} L${par.x},${midY} L${ep.x},${midY} L${ep.x},${ep.y - H / 2}`)
          .attr('stroke', '#3d4460').attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '5,3').attr('fill', 'none')
      })
    })

    // Links from moved parents (e.g. Hedi) down to their extra-placed children (e.g. Fatma)
    movedParents.forEach((mpData, parId) => {
      extra.forEach((eData, childId) => {
        const origD = d3Pos.get(childId)
        if (!origD?.parent || String(origD.parent.data.id) !== parId) return
        lG.append('line')
          .attr('x1', mpData.x).attr('y1', mpData.y + H / 2)
          .attr('x2', eData.x).attr('y2', eData.y - H / 2)
          .attr('stroke', stroke).attr('stroke-width', sw)
      })
    })

    // ── Marriage lines ────────────────────────────────────────────────────────
    const mG = g.append('g')
    marriages.forEach(m => {
      const s1 = String(m.spouse1_id), s2 = String(m.spouse2_id)
      const coupleId = `couple_${mKey(s1, s2)}`

      if (d3Pos.has(coupleId)) {
        const dPos = movedParents.has(coupleId) ? movedParents.get(coupleId) : d3Pos.get(coupleId)
        drawMarriageLine(mG, dPos.x - CI / 2, dPos.y, dPos.x + CI / 2, dPos.y)
      } else {
        // Extra-placed spouse — positions are now at the same y level
        const p1 = getPos(s1), p2 = getPos(s2)
        if (!p1 || !p2) return
        const lx = Math.min(p1.x, p2.x) + W / 2
        const rx = Math.max(p1.x, p2.x) - W / 2
        if (rx <= lx) return
        drawMarriageLine(mG, lx, p1.y, rx, p2.y)
      }
    })

    // ── Nodes ─────────────────────────────────────────────────────────────────
    const nG = g.append('g')

    root.each(d => {
      if (d.data.__virtual && !d.data.__couple) return

      if (d.data.__couple) {
        if (skipInTree.has(String(d.data.id))) return  // repositioned via movedParents
        const cx = d.x, cy = d.y
        if (d.data.__s1data) renderCard(nG, cx - W / 2 - CI / 2, cy, d.data.__s1data, navigate, defs)
        if (d.data.__s2data) renderCard(nG, cx + W / 2 + CI / 2, cy, d.data.__s2data, navigate, defs)
      } else if (!skipInTree.has(String(d.data.id))) {
        // Skip nodes repositioned via extra (avoid duplicate rendering)
        renderCard(nG, d.x, d.y, d.data, navigate, defs)
      }
    })

    // Extra spouse nodes (placed adjacent to their partner)
    extra.forEach(({ x, y, data }) => {
      if (data) renderCard(nG, x, y, data, navigate, defs)
    })

    // Moved parent nodes (e.g. Hedi repositioned above Fatma's extra slot)
    movedParents.forEach(({ x, y, data }) => {
      if (!data.__virtual) {
        renderCard(nG, x, y, data, navigate, defs)
      } else if (data.__couple) {
        if (data.__s1data) renderCard(nG, x - W / 2 - CI / 2, y, data.__s1data, navigate, defs)
        if (data.__s2data) renderCard(nG, x + W / 2 + CI / 2, y, data.__s2data, navigate, defs)
      }
    })

    } catch (err) {
      console.error('FamilyTreeClassic error:', err)
      d3.select(el).selectAll('*').remove()
      const errSvg = d3.select(el).attr('width', svgW).attr('height', svgH)
      errSvg.append('text').attr('x', svgW / 2).attr('y', svgH / 2 - 20)
        .attr('text-anchor', 'middle').attr('font-size', '15px').attr('fill', '#ef4444')
        .text('⚠ Erreur de rendu : données invalides (cycle ou lien corrompu)')
      errSvg.append('text').attr('x', svgW / 2).attr('y', svgH / 2 + 10)
        .attr('text-anchor', 'middle').attr('font-size', '12px').attr('fill', '#8b91a7')
        .text(err.message)
    }

  }, [data, navigate])

  return <svg ref={svgRef} style={{ width: '100%', height: '100%', display: 'block' }} />
}
