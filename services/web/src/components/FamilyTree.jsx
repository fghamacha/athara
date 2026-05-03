import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { useNavigate } from 'react-router-dom'

export default function FamilyTree({ data }) {
  const svgRef = useRef()
  const navigate = useNavigate()

  useEffect(() => {
    if (!data || !svgRef.current) return
    const { nodes, parent_child, marriages } = data
    if (!nodes.length) return

    const el = svgRef.current
    const width = el.clientWidth || 900
    const height = el.clientHeight || 600

    d3.select(el).selectAll('*').remove()

    const svg = d3.select(el).attr('width', width).attr('height', height)
    const bgDefs = svg.append('defs')
    bgDefs.append('pattern').attr('id', 'dot-bg-f').attr('width', 32).attr('height', 32)
      .attr('patternUnits', 'userSpaceOnUse')
      .append('circle').attr('cx', 16).attr('cy', 16).attr('r', 1.1)
      .attr('fill', 'rgba(139,145,167,0.13)')
    svg.append('rect').attr('width', '100%').attr('height', '100%')
      .attr('fill', 'var(--bg)').attr('pointer-events', 'none')
    svg.append('rect').attr('width', '100%').attr('height', '100%')
      .attr('fill', 'url(#dot-bg-f)').attr('pointer-events', 'none')

    const g = svg.append('g')

    svg.call(
      d3.zoom()
        .scaleExtent([0.2, 4])
        .on('zoom', (event) => g.attr('transform', event.transform))
    )

    // Build link array for force simulation
    const nodeById = new Map(nodes.map((n) => [String(n.id), n]))
    const links = []

    parent_child.forEach((r) => {
      if (nodeById.has(String(r.parent_id)) && nodeById.has(String(r.child_id))) {
        links.push({ source: String(r.parent_id), target: String(r.child_id), type: 'parent' })
      }
    })
    marriages.forEach((m) => {
      if (nodeById.has(String(m.spouse1_id)) && nodeById.has(String(m.spouse2_id))) {
        links.push({ source: String(m.spouse1_id), target: String(m.spouse2_id), type: 'marriage' })
      }
    })

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d) => String(d.id)).distance((l) => l.type === 'marriage' ? 90 : 130))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(55))
      .force('y', d3.forceY().strength(0.05))

    // Liens parent-enfant — trait gris, sans ♥
    const parentLinks = g.append('g').selectAll('line')
      .data(links.filter((l) => l.type === 'parent'))
      .join('line')
      .attr('stroke', 'var(--border)')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.8)

    // Liens mariage — trait rose pointillé + ♥ au milieu
    const marriageLinkData = links.filter((l) => l.type === 'marriage')

    const marriageLinks = g.append('g').selectAll('line')
      .data(marriageLinkData)
      .join('line')
      .attr('stroke', 'var(--accent2)')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '6,4')
      .attr('opacity', 0.8)

    // ♥ uniquement sur les liens mariage
    const marriageHeartBg = g.append('g').selectAll('circle')
      .data(marriageLinkData)
      .join('circle')
      .attr('r', 9)
      .attr('fill', 'var(--bg)')
      .attr('opacity', 0.85)

    const marriageHearts = g.append('g').selectAll('text')
      .data(marriageLinkData)
      .join('text')
      .text('♥')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '12px')
      .attr('fill', 'var(--accent2)')
      .style('pointer-events', 'none')

    // Node groups
    const node = g.append('g').selectAll('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer')
      .call(
        d3.drag()
          .on('start', (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
          .on('end', (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null })
      )
      .on('click', (event, d) => navigate(`/persons/${d.id}`))

    // Circle background
    node.append('circle')
      .attr('r', 36)
      .attr('fill', (d) => {
        if (d.death_date) return 'var(--bg3)'
        if (d.gender === 'male') return 'rgba(59,130,246,0.15)'
        if (d.gender === 'female') return 'rgba(236,72,153,0.15)'
        return 'var(--bg3)'
      })
      .attr('stroke', (d) => {
        if (d.death_date) return 'var(--deceased)'
        if (d.gender === 'male') return 'var(--male)'
        if (d.gender === 'female') return 'var(--female)'
        return 'var(--border)'
      })
      .attr('stroke-width', 2)

    // Photo or initials
    node.each(function(d) {
      const g = d3.select(this)
      if (d.photo_url) {
        const defs = svg.append('defs')
        const clipId = `clip-${d.id}`
        defs.append('clipPath').attr('id', clipId)
          .append('circle').attr('r', 34)
        g.append('image')
          .attr('href', d.photo_url)
          .attr('x', -34).attr('y', -34)
          .attr('width', 68).attr('height', 68)
          .attr('clip-path', `url(#${clipId})`)
          .attr('preserveAspectRatio', 'xMidYMid slice')
      } else {
        const initials = `${d.first_name?.[0] ?? ''}${d.last_name?.[0] ?? ''}`.toUpperCase()
        g.append('text')
          .text(initials)
          .attr('text-anchor', 'middle')
          .attr('dy', '0.35em')
          .attr('font-size', '16px')
          .attr('font-weight', '700')
          .attr('fill', d.gender === 'male' ? 'var(--male)' : d.gender === 'female' ? 'var(--female)' : 'var(--text2)')
      }
    })

    // First name label below
    node.append('text')
      .text((d) => d.first_name)
      .attr('text-anchor', 'middle')
      .attr('dy', '3.2em')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('fill', 'var(--text)')

    node.append('text')
      .text((d) => d.last_name)
      .attr('text-anchor', 'middle')
      .attr('dy', '4.5em')
      .attr('font-size', '10px')
      .attr('fill', 'var(--text2)')

    simulation.on('tick', () => {
      const updateLine = (sel) => sel
        .attr('x1', (d) => d.source.x).attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x).attr('y2', (d) => d.target.y)
      updateLine(parentLinks)
      updateLine(marriageLinks)

      // ♥ au milieu de chaque lien mariage
      const mx = (d) => (d.source.x + d.target.x) / 2
      const my = (d) => (d.source.y + d.target.y) / 2
      marriageHeartBg.attr('cx', mx).attr('cy', my)
      marriageHearts.attr('x', mx).attr('y', my)

      node.attr('transform', (d) => `translate(${d.x},${d.y})`)
    })

    return () => simulation.stop()
  }, [data, navigate])

  return (
    <svg
      ref={svgRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}
