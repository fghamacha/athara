import { NavLink } from 'react-router-dom'

const style = {
  nav: {
    background: 'var(--bg2)',
    borderBottom: '1px solid var(--border)',
    padding: '0 2rem',
    display: 'flex',
    alignItems: 'center',
    height: '56px',
    gap: '2rem',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  logo: {
    fontWeight: 800,
    fontSize: '1.2rem',
    color: 'var(--accent)',
    letterSpacing: '-0.02em',
    display: 'flex',
    flexDirection: 'column',
    lineHeight: 1,
  },
  sub: { fontSize: '0.6rem', color: 'var(--text2)', fontWeight: 400 },
  links: { display: 'flex', gap: '0.25rem', marginLeft: '1rem' },
}

const navStyle = ({ isActive }) => ({
  padding: '0.4rem 0.85rem',
  borderRadius: '8px',
  fontSize: '0.875rem',
  fontWeight: 500,
  color: isActive ? 'var(--accent)' : 'var(--text2)',
  background: isActive ? 'rgba(108,99,255,0.12)' : 'transparent',
  textDecoration: 'none',
  transition: 'all 0.15s',
})

export default function Navbar() {
  return (
    <nav style={style.nav}>
      <div style={style.logo}>
        Athara <span style={style.sub}>أثارة</span>
      </div>
      <div style={style.links}>
        <NavLink to="/" style={navStyle} end>Arbre</NavLink>
        <NavLink to="/people" style={navStyle}>Personnes</NavLink>
        <NavLink to="/persons/new" style={navStyle}>+ Ajouter</NavLink>
      </div>
    </nav>
  )
}
