import { useState, useCallback, useEffect, useRef } from 'react'
import { useDropzone } from 'react-dropzone'

const API_URL = import.meta.env.VITE_API_URL ?? ''

/* ────────────────────────────────────────────
   ICONS
──────────────────────────────────────────── */
const svgProps = (w = '1em') => ({
  viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor',
  strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round',
  width: w, height: w, style: { display: 'inline-block', verticalAlign: '-0.15em', flexShrink: 0 },
})

const I = {
  Check:    () => <svg {...svgProps()}><circle cx="10" cy="10" r="8"/><polyline points="6,10.5 8.5,13 14,7"/></svg>,
  Warn:     () => <svg {...svgProps()}><polygon points="10,2 18,17 2,17"/><line x1="10" y1="8" x2="10" y2="12"/><circle cx="10" cy="14.5" r="0.9" fill="currentColor" stroke="none"/></svg>,
  Block:    () => <svg {...svgProps()}><circle cx="10" cy="10" r="8"/><line x1="3.5" y1="3.5" x2="16.5" y2="16.5"/></svg>,
  Search:   () => <svg {...svgProps()}><circle cx="8.5" cy="8.5" r="5.5"/><line x1="13" y1="13" x2="18" y2="18"/></svg>,
  File:     () => <svg {...svgProps()}><path d="M4,2 L12,2 L16,6 L16,18 L4,18 Z"/><polyline points="12,2 12,6 16,6"/></svg>,
  Clip:     () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="1.3em" height="1.3em" style={{display:'inline-block',verticalAlign:'-0.2em'}}><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>,
  Mail:     () => <svg {...svgProps()}><rect x="2" y="4" width="16" height="12" rx="1"/><polyline points="2,4 10,11 18,4"/></svg>,
  Notion:   () => <svg {...svgProps()}><rect x="3" y="2" width="14" height="16" rx="1.5"/><line x1="6" y1="7" x2="14" y2="7"/><line x1="6" y1="10.5" x2="11" y2="10.5"/></svg>,
  Download: () => <svg {...svgProps()}><path d="M3,2 L13,2 L17,6 L17,18 L3,18 Z"/><polyline points="13,2 13,6 17,6"/><line x1="10" y1="8" x2="10" y2="14"/><polyline points="7,11 10,14 13,11"/></svg>,
  Upload:   () => <svg {...svgProps()}><path d="M3,2 L13,2 L17,6 L17,18 L3,18 Z"/><polyline points="13,2 13,6 17,6"/><line x1="10" y1="14" x2="10" y2="8"/><polyline points="7,11 10,8 13,11"/></svg>,
  Eye:      () => <svg {...svgProps()}><path d="M1,10 Q5,4 10,4 Q15,4 19,10 Q15,16 10,16 Q5,16 1,10"/><circle cx="10" cy="10" r="3"/></svg>,
  DB:       () => <svg {...svgProps()}><ellipse cx="10" cy="4.5" rx="7" ry="2.5"/><path d="M3,4.5 L3,15.5 Q3,18 10,18 Q17,18 17,15.5 L17,4.5"/><path d="M3,10 Q3,12.5 10,12.5 Q17,12.5 17,10"/></svg>,
  X:        () => <svg {...svgProps()}><circle cx="10" cy="10" r="8"/><line x1="7" y1="7" x2="13" y2="13"/><line x1="13" y1="7" x2="7" y2="13"/></svg>,
  Q:        () => <svg {...svgProps()}><circle cx="10" cy="10" r="8"/><path d="M7,8.5 Q7,5 10,5 Q13,5 13,8 Q13,10.5 10,10.5 L10,11.5"/><circle cx="10" cy="14" r="0.8" fill="currentColor" stroke="none"/></svg>,
  Table:    () => <svg {...svgProps()}><rect x="2" y="3" width="16" height="14" rx="1.5"/><line x1="2" y1="8" x2="18" y2="8"/><line x1="8" y1="8" x2="8" y2="17"/></svg>,
  Audit:    () => <svg {...svgProps()}><path d="M9,2 L3,2 L3,18 L17,18 L17,8"/><polyline points="13,2 17,2 17,8 13,8 13,2"/><line x1="6" y1="11" x2="11" y2="11"/><line x1="6" y1="14" x2="9" y2="14"/></svg>,
  Spin:     () => <span style={{display:'inline-block',width:'1em',height:'1em',border:'2px solid rgba(255,255,255,0.4)',borderTopColor:'white',borderRadius:'50%',animation:'spin 0.7s linear infinite',verticalAlign:'-0.1em'}}/>,
}

/* ────────────────────────────────────────────
   TYPEWRITER HOOK
──────────────────────────────────────────── */
const PHRASES = [
  'sobreprecios en repuestos',
  'cobros duplicados',
  'incoherencias mecánicas',
  'ítems sin tarifar',
  'fraudes en facturas',
]

function useTypewriter(phrases, typingSpeed = 60, pauseMs = 1800, deletingSpeed = 35) {
  const [displayed, setDisplayed] = useState('')
  const [phraseIdx, setPhraseIdx] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const timeoutRef = useRef(null)

  useEffect(() => {
    const current = phrases[phraseIdx]
    const tick = () => {
      if (!isDeleting) {
        if (displayed.length < current.length) {
          setDisplayed(current.slice(0, displayed.length + 1))
          timeoutRef.current = setTimeout(tick, typingSpeed)
        } else {
          timeoutRef.current = setTimeout(() => setIsDeleting(true), pauseMs)
        }
      } else {
        if (displayed.length > 0) {
          setDisplayed(current.slice(0, displayed.length - 1))
          timeoutRef.current = setTimeout(tick, deletingSpeed)
        } else {
          setIsDeleting(false)
          setPhraseIdx(i => (i + 1) % phrases.length)
        }
      }
    }
    timeoutRef.current = setTimeout(tick, isDeleting ? deletingSpeed : typingSpeed)
    return () => clearTimeout(timeoutRef.current)
  }, [displayed, isDeleting, phraseIdx])

  return displayed
}

/* ────────────────────────────────────────────
   EXAMPLE PDFs
──────────────────────────────────────────── */
const EXAMPLES = [
  { file: '/examples/factura_siniestro_prueba.pdf',     name: 'Factura General',      desc: 'Factura mixta con varios tipos de ítems',              tag: 'General', color: '#5b21b6', bg: '#ede9fe' },
  { file: '/examples/factura_sobreprecio.pdf',           name: 'Sobreprecio',           desc: 'Toyota Corolla — lateral derecho',                    tag: 'Alerta',  color: '#92400e', bg: '#fef3c7' },
  { file: '/examples/factura_cobro_duplicado.pdf',       name: 'Cobro Duplicado',       desc: 'Chevrolet Aveo — impacto frontal',                    tag: 'Rechazo', color: '#991b1b', bg: '#fee2e2' },
  { file: '/examples/factura_incoherencia_mecanica.pdf', name: 'Incoherencia Mecánica', desc: 'Hyundai Accent — siniestro trasero con ítems frontales', tag: 'Rechazo', color: '#991b1b', bg: '#fee2e2' },
]

/* ────────────────────────────────────────────
   DICTAMEN / ESTADO CONFIG
──────────────────────────────────────────── */
const DICTAMEN = {
  'Aprobado':                          { Icon: I.Check,  color: '#065f46', bg: '#d1fae5' },
  'Alerta - Sobreprecio':              { Icon: I.Warn,   color: '#92400e', bg: '#fef3c7' },
  'Alerta - Ítem No Tarifado':         { Icon: I.Search, color: '#92400e', bg: '#fef3c7' },
  'Rechazado - Cobro Duplicado':       { Icon: I.Block,  color: '#991b1b', bg: '#fee2e2' },
  'Rechazado - Incoherencia Mecánica': { Icon: I.Block,  color: '#991b1b', bg: '#fee2e2' },
}

const ESTADO_ITEM = {
  OK:                    { color: '#065f46', bg: '#f0fdf4', border: '#bbf7d0' },
  SOBREPRECIO:           { color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  NO_TARIFADO:           { color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  DUPLICADO:             { color: '#991b1b', bg: '#fff1f2', border: '#fecdd3' },
  INCOHERENCIA_MECANICA: { color: '#991b1b', bg: '#fff1f2', border: '#fecdd3' },
}

const CAT_COLORS = {
  'Mano de Obra': { bg: '#ede9fe', color: '#5b21b6' },
  'Repuestos':    { bg: '#dbeafe', color: '#1e40af' },
  'Lubricantes':  { bg: '#d1fae5', color: '#065f46' },
  'Insumos':      { bg: '#fef3c7', color: '#92400e' },
  'Servicios':    { bg: '#fce7f3', color: '#9d174d' },
  'Eléctrico':    { bg: '#e0f2fe', color: '#0c4a6e' },
}

/* ════════════════════════════════════════════════════
   COMPONENTS
════════════════════════════════════════════════════ */

/* ── Hero ── */
function Hero() {
  const typed = useTypewriter(PHRASES)
  return (
    <div className="relative overflow-hidden"
         style={{ background: 'linear-gradient(135deg,#4c1d95 0%,#7c3aed 45%,#a78bfa 100%)' }}>
      {/* Decorative orbs */}
      <div className="orb" style={{ width:340, height:340, background:'rgba(167,139,250,0.35)', top:-100, right:-60, animationDelay:'0s' }} />
      <div className="orb" style={{ width:220, height:220, background:'rgba(196,181,253,0.25)', bottom:-60, left:80, animationDelay:'-6s' }} />

      <div className="relative max-w-6xl mx-auto px-4 py-12 md:py-16">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-purple-300 mb-3">
          Sistema Agéntico IA · Hackathon 2026
        </p>

        <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-4">
          Auditor Agéntico de Facturación de siniestros
        </h1>

        {/* Typewriter line */}
        <div className="text-lg md:text-xl font-semibold text-purple-200 mb-8 min-h-[2rem]">
          Detecta&nbsp;
          <span style={{ color: '#fde68a', fontWeight: 800 }}>{typed}</span>
          <span className="tw-cursor" />
          &nbsp;con IA
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-4">
          {[
            { label: 'GPT-4o Vision', sub: 'Extracción de ítems' },
            { label: 'LangChain',     sub: 'Agente autónomo'    },
            { label: 'Supabase',      sub: 'Tarifario oficial'  },
            { label: 'Notion + Email',sub: 'Reporte automático' },
          ].map(({ label, sub }) => (
            <div key={label}
                 className="rounded-xl px-4 py-2.5 stagger-1"
                 style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <p className="font-bold text-white text-sm leading-none">{label}</p>
              <p className="text-purple-300 text-xs mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Email modal ── */
function EmailModal({ onConfirm, onSkip }) {
  const [email, setEmail] = useState('')
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
         style={{ background: 'rgba(76,29,149,0.25)', backdropFilter: 'blur(8px)' }}
         onClick={onSkip}>
      <div className="card w-full max-w-md p-0 overflow-hidden fade-up"
           onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 flex items-center gap-3"
             style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
          <span className="text-white text-xl"><I.Mail /></span>
          <div>
            <p className="font-bold text-base text-white leading-none">Enviar Reporte por Email</p>
            <p className="text-sm text-purple-200 mt-0.5">Recibirás el dictamen completo como adjunto</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-purple-700 mb-2">
              Correo electrónico
            </label>
            <input type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && ok) onConfirm(email); if (e.key === 'Escape') onSkip() }}
              placeholder="correo@ejemplo.com" autoFocus className="field" />
            <p className="text-xs text-purple-400 mt-1.5">Enter para confirmar · Esc para omitir</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => ok && onConfirm(email)} disabled={!ok} className="btn-primary flex-1">
              <I.Mail /> Auditar y Enviar
            </button>
            <button onClick={onSkip} className="btn-secondary px-5">Sin correo</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Example PDFs ── */
function ExamplePDFs({ onLoad, disabled }) {
  const [loadError, setLoadError] = useState(null)

  const load = async (ex) => {
    setLoadError(null)
    try {
      const res = await fetch(ex.file)
      if (!res.ok) {
        setLoadError(`No se encontró el archivo (${res.status}). Reinicia el servidor frontend.`)
        return
      }
      const contentType = res.headers.get('content-type') ?? ''
      const blob = await res.blob()
      // Verify magic bytes — must start with %PDF
      const arr = await blob.slice(0, 4).arrayBuffer()
      const header = String.fromCharCode(...new Uint8Array(arr))
      if (!header.startsWith('%PDF')) {
        setLoadError('El servidor no está sirviendo los PDFs aún. Reinicia el contenedor frontend.')
        return
      }
      onLoad(new File([blob], ex.file.split('/').pop(), { type: 'application/pdf' }))
    } catch (e) {
      setLoadError('Error de red al cargar el archivo.')
    }
  }
  return (
    <div className="card p-5 stagger-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="step-badge">PDF</span>
        <h2 className="text-sm font-bold uppercase tracking-wide text-purple-800">Facturas de Ejemplo</h2>
      </div>
      <p className="text-xs text-purple-400 mb-3">
        Carga un ejemplo para probar el auditor — el sistema detecta los problemas solo.
      </p>
      {loadError && (
        <div className="rounded-lg px-3 py-2 mb-2 text-xs font-semibold flex items-center gap-1.5"
             style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecdd3' }}>
          <I.X /> {loadError}
        </div>
      )}
      <div className="space-y-2">
        {EXAMPLES.map(ex => (
          <div key={ex.file}
               className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 hover:shadow-sm"
               style={{ background: '#faf8ff', border: '1px solid #ede9fe' }}>
            <span style={{ color: ex.color, opacity: 0.7, fontSize: '1.05em' }}><I.File /></span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-sm text-purple-900 leading-none">{ex.name}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: ex.bg, color: ex.color }}>{ex.tag}</span>
              </div>
              <p className="text-xs text-purple-400 mt-0.5 leading-snug">{ex.desc}</p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button onClick={() => !disabled && load(ex)} disabled={disabled}
                      className="btn-secondary" style={disabled ? { opacity: 0.4 } : {}}>
                <I.Upload /> Cargar
              </button>
              <a href={ex.file} download className="btn-outline">
                <I.Download /> Descargar
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Loading overlay ── */
function LoadingOverlay() {
  const steps = [
    { Icon: I.Eye,    text: 'Extrayendo ítems con GPT-4o Vision'     },
    { Icon: I.DB,     text: 'Consultando tarifario en Supabase'       },
    { Icon: I.Search, text: 'Detectando sobreprecios e incoherencias' },
    { Icon: I.Notion, text: 'Registrando dictamen en Notion'          },
  ]
  return (
    <div className="card p-8 fade-up">
      <div className="flex items-center gap-4 mb-7">
        <div style={{ background: 'linear-gradient(135deg,#7c3aed,#a78bfa)', borderRadius: '50%', padding: '0.85rem', flexShrink: 0 }}>
          <span style={{ color: 'white', fontSize: '1.4rem' }}><I.Spin /></span>
        </div>
        <div>
          <p className="font-bold text-lg text-purple-900">Agente en ejecución</p>
          <p className="text-sm text-purple-400 mt-0.5">Procesando factura, ~30 segundos…</p>
        </div>
      </div>
      <div className="space-y-4">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="pulse-dot" style={{ animationDelay: `${i * 0.35}s` }} />
            <span className="text-sm text-purple-700 flex items-center gap-2 font-medium">
              <s.Icon /> {s.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Audit result ── */
function DictamenBadge({ dictamen }) {
  const d = DICTAMEN[dictamen] ?? { Icon: I.Q, color: '#4b5563', bg: '#f3f4f6' }
  return (
    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm"
          style={{ background: d.bg, color: d.color }}>
      <d.Icon /> {dictamen}
    </span>
  )
}

function ItemRow({ item, idx }) {
  const s = ESTADO_ITEM[item.estado] ?? { color: '#4b5563', bg: '#f9fafb', border: '#e5e7eb' }
  const showAnalysis = item.razonamiento_agente &&
    ['INCOHERENCIA_MECANICA','DUPLICADO'].includes(item.estado ?? item.alerta_sugerida)
  return (
    <div className="rounded-xl p-4 transition-all" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <span className="text-xs font-bold px-2 py-1 rounded-md flex-shrink-0 mt-0.5"
                style={{ background: '#ede9fe', color: '#7c3aed' }}>
            {String(idx + 1).padStart(2,'0')}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-sm leading-snug text-purple-950">{item.descripcion}</p>
            {item.observacion && <p className="text-xs mt-0.5 leading-snug text-gray-500">{item.observacion}</p>}
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="font-bold text-sm text-purple-950">
            {typeof item.precio === 'number' ? `$${item.precio.toFixed(2)}` : '—'}
          </p>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-md mt-0.5 inline-block"
                style={{ background: s.border, color: s.color }}>
            {item.estado?.replace(/_/g,' ')}
          </span>
        </div>
      </div>
      {showAnalysis && (
        <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${s.border}` }}>
          <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: s.color }}>Análisis</p>
          <p className="text-sm leading-snug text-gray-700">{item.razonamiento_agente}</p>
        </div>
      )}
    </div>
  )
}

function AuditResult({ result }) {
  const { invoice_data: inv, audit_result: ar } = result
  const verdict    = ar?.dictamen ?? 'Error'
  const totalF     = Number(ar?.total_facturado ?? 0)
  const totalA     = Number(ar?.total_aprobado  ?? 0)
  const ahorro     = Math.max(0, totalF - totalA)
  const alertCount = ar?.alertas ?? 0

  return (
    <div className="space-y-4 fade-up">
      {inv && (
        <div className="card p-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-4 pb-3"
              style={{ borderBottom: '1px solid #ede9fe' }}>Factura Procesada</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[['Taller', inv.taller], ['N° Factura', inv.numero_factura],
              ['Fecha', inv.fecha],
              ['Total', typeof inv.total === 'number' ? `$${inv.total.toFixed(2)}` : inv.total]
            ].map(([l, v]) => (
              <div key={l}>
                <dt className="text-xs font-bold uppercase tracking-widest text-purple-300 mb-0.5">{l}</dt>
                <dd className="font-bold text-base text-purple-900 truncate">{v ?? '—'}</dd>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-4 pb-3"
            style={{ borderBottom: '1px solid #ede9fe' }}>Dictamen Final</h2>
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <DictamenBadge dictamen={verdict} />
          {alertCount > 0 && (
            <span className="text-sm font-bold px-3 py-1 rounded-full"
                  style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
              {alertCount} alerta{alertCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {ar?.total_facturado != null && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { l:'Facturado', v:`$${totalF.toFixed(2)}`, accent:'#7c3aed' },
              { l:'Aprobado',  v:`$${totalA.toFixed(2)}`, accent:'#059669' },
              { l:'Ahorro',    v:`$${ahorro.toFixed(2)}`, accent:'#d97706' },
            ].map(({ l, v, accent }) => (
              <div key={l} className="stat-card">
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: accent }}>{l}</p>
                <p className="font-bold text-xl text-purple-950">{v}</p>
              </div>
            ))}
          </div>
        )}
        {ar?.resumen && (
          <p className="text-sm leading-relaxed text-gray-700 border-t border-purple-100 pt-4">{ar.resumen}</p>
        )}
        {ar?.notion_url && (
          <a href={ar.notion_url} target="_blank" rel="noopener noreferrer" className="btn-primary mt-5 w-auto">
            <I.Notion /> Ver en Notion →
          </a>
        )}
      </div>

      {Array.isArray(ar?.items_auditados) && ar.items_auditados.length > 0 && (
        <div className="card p-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-4 pb-3"
              style={{ borderBottom: '1px solid #ede9fe' }}>
            Ítems Auditados <span className="text-purple-300">({ar.items_auditados.length})</span>
          </h2>
          <div className="space-y-2">
            {ar.items_auditados.map((item, i) => <ItemRow key={i} item={item} idx={i} />)}
          </div>
          <div className="mt-5 pt-4 border-t border-purple-100">
            <p className="text-xs font-bold uppercase tracking-widest text-purple-300 mb-2">Leyenda</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(ESTADO_ITEM).map(([k, s]) => (
                <span key={k} className="text-xs font-semibold px-3 py-1 rounded-full"
                      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                  {k.replace(/_/g,' ')}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Placeholder() {
  return (
    <div className="hidden lg:flex flex-col items-center justify-center min-h-[480px] card text-center p-12">
      <div style={{ color: '#c4b5fd', fontSize: '4rem', lineHeight: 1 }}><I.Search /></div>
      <p className="font-bold text-2xl text-purple-900 mt-5">Resultados de Auditoría</p>
      <p className="text-sm text-purple-400 mt-2 max-w-xs">
        Carga una factura e inicia la auditoría. El agente analizará cada ítem automáticamente.
      </p>
    </div>
  )
}

/* ── Tarifario ── */
function Tarifario() {
  const [data,     setData]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [search,   setSearch]   = useState('')
  const [category, setCategory] = useState('Todas')

  useEffect(() => {
    fetch(`${API_URL}/api/tarifario`)
      .then(r => r.json())
      .then(j => { setData(j.data ?? []); setLoading(false) })
      .catch(() => { setError('No se pudo conectar con el servidor.'); setLoading(false) })
  }, [])

  const categories = ['Todas', ...Array.from(new Set(data.map(d => d.categoria)))]

  const filtered = data.filter(d => {
    const matchCat = category === 'Todas' || d.categoria === category
    const q = search.toLowerCase()
    const matchSearch = !q || d.descripcion.toLowerCase().includes(q) || d.codigo.toLowerCase().includes(q)
    return matchCat && matchSearch
  })

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <span style={{ fontSize: '2rem', color: '#7c3aed' }}><I.Spin /></span>
        <p className="text-purple-500 font-semibold mt-3">Cargando tarifario…</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="card p-6 mt-6" style={{ background:'#fff1f2', borderColor:'#fecdd3' }}>
      <p className="font-bold text-red-700 flex items-center gap-2"><I.X /> {error}</p>
    </div>
  )

  return (
    <div className="space-y-5 fade-up">
      {/* Header strip */}
      <div className="card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h2 className="font-bold text-lg text-purple-900 flex items-center gap-2">
              <span style={{ color: '#7c3aed' }}><I.DB /></span> Tarifario Oficial
            </h2>
            <p className="text-sm text-purple-400 mt-0.5">
              {filtered.length} ítem{filtered.length !== 1 ? 's' : ''} · precios máximos aprobados por la aseguradora
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
            <input
              type="text" placeholder="Buscar código o descripción…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="field" style={{ width: 240 }}
            />
            <select value={category} onChange={e => setCategory(e.target.value)}
                    className="field" style={{ width: 160 }}>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                {['Código','Descripción','Unidad','Categoría','Precio Máx.'].map(h => (
                  <th key={h} style={{ padding:'0.75rem 1rem', textAlign:'left', color:'white', fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding:'2rem', textAlign:'center', color:'#a78bfa', fontSize:'0.9rem' }}>
                    No hay ítems que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : filtered.map((row, i) => {
                const cat = CAT_COLORS[row.categoria] ?? { bg: '#f5f3ff', color: '#5b21b6' }
                return (
                  <tr key={row.id}
                      style={{ background: i % 2 === 0 ? '#ffffff' : '#faf8ff', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f5f3ff'}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#ffffff' : '#faf8ff'}>
                    <td style={{ padding:'0.65rem 1rem', fontFamily:'monospace', fontSize:'0.82rem', fontWeight:700, color:'#7c3aed', borderBottom:'1px solid #ede9fe', whiteSpace:'nowrap' }}>
                      {row.codigo}
                    </td>
                    <td style={{ padding:'0.65rem 1rem', fontSize:'0.88rem', color:'#1e1b4b', borderBottom:'1px solid #ede9fe', maxWidth:340 }}>
                      {row.descripcion}
                    </td>
                    <td style={{ padding:'0.65rem 1rem', fontSize:'0.82rem', color:'#6b7280', borderBottom:'1px solid #ede9fe', whiteSpace:'nowrap' }}>
                      {row.unidad}
                    </td>
                    <td style={{ padding:'0.65rem 1rem', borderBottom:'1px solid #ede9fe' }}>
                      <span style={{ background:cat.bg, color:cat.color, fontSize:'0.72rem', fontWeight:700, padding:'0.2rem 0.6rem', borderRadius:999, whiteSpace:'nowrap' }}>
                        {row.categoria}
                      </span>
                    </td>
                    <td style={{ padding:'0.65rem 1rem', fontWeight:800, color:'#059669', fontSize:'0.95rem', borderBottom:'1px solid #ede9fe', whiteSpace:'nowrap' }}>
                      ${Number(row.precio_maximo).toFixed(2)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════
   APP ROOT
════════════════════════════════════════════════════ */
export default function App() {
  const [tab,          setTab]          = useState('auditor')   // 'auditor' | 'tarifario'
  const [sinisterReport, setSinisterReport] = useState('')
  const [file,           setFile]           = useState(null)
  const [preview,        setPreview]        = useState(null)
  const [loading,        setLoading]        = useState(false)
  const [result,         setResult]         = useState(null)
  const [error,          setError]          = useState(null)
  const [showEmail,      setShowEmail]      = useState(false)
  const [emailStatus,    setEmailStatus]    = useState(null)
  const [emailSentTo,    setEmailSentTo]    = useState('')
  const [emailError,     setEmailError]     = useState('')

  const setFileClean = useCallback((f) => {
    setFile(f); setResult(null); setError(null); setEmailStatus(null)
    setPreview(f?.type?.startsWith('image/') ? URL.createObjectURL(f) : null)
  }, [])

  const onDrop = useCallback((accepted) => {
    if (accepted[0]) setFileClean(accepted[0])
  }, [setFileClean])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg':['.jpg','.jpeg'], 'image/png':['.png'], 'image/webp':['.webp'], 'application/pdf':['.pdf'] },
    maxFiles: 1, disabled: loading,
  })

  const startAudit = async (email) => {
    setShowEmail(false); setEmailSentTo(email)
    setEmailStatus(null); setEmailError(''); setLoading(true); setError(null); setResult(null)

    const fd = new FormData()
    fd.append('file', file)
    fd.append('sinister_report', sinisterReport)

    let auditData = null
    try {
      const res  = await fetch(`${API_URL}/api/audit`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? `Error ${res.status}`)
      auditData = data; setResult(data)
    } catch (err) {
      setError(err.message ?? 'Error de conexión con el servidor')
    } finally { setLoading(false) }

    if (email && auditData?.success) {
      setEmailStatus('sending')
      try {
        const res  = await fetch(`${API_URL}/api/send-report`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ email, audit_data: auditData }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail ?? `Error ${res.status}`)
        setEmailStatus('sent')
      } catch (err) { setEmailStatus('error'); setEmailError(err.message ?? 'Error enviando correo') }
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#faf8ff' }}>

      {showEmail && <EmailModal onConfirm={startAudit} onSkip={() => startAudit('')} />}

      <Hero />

      {/* ── Tab bar ── */}
      <div style={{ background: 'white', borderBottom: '1.5px solid #ede9fe', position: 'sticky', top: 0, zIndex: 40 }}>
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex gap-2">
          <button onClick={() => setTab('auditor')}
                  className={`tab-btn ${tab === 'auditor' ? 'tab-btn-active' : 'tab-btn-inactive'}`}>
            <span className="inline-flex items-center gap-1.5"><I.Audit /> Auditor</span>
          </button>
          <button onClick={() => setTab('tarifario')}
                  className={`tab-btn ${tab === 'tarifario' ? 'tab-btn-active' : 'tab-btn-inactive'}`}>
            <span className="inline-flex items-center gap-1.5"><I.Table /> Tarifario</span>
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-6xl mx-auto px-4 py-8">

        {tab === 'tarifario' && <Tarifario />}

        {tab === 'auditor' && (
          <div className="lg:grid lg:grid-cols-[420px_1fr] lg:gap-6 lg:items-start">

            {/* Left column */}
            <div className="space-y-4 lg:sticky lg:top-[60px]">

              {/* 01 */}
              <div className="card p-5 stagger-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="step-badge">01</span>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-purple-800">Reporte de Siniestralidad</h2>
                </div>
                <textarea value={sinisterReport} onChange={e => setSinisterReport(e.target.value)}
                  placeholder={"Describe el siniestro: tipo de impacto, zona afectada, daños…\nEj: Impacto trasero, daños en faros posteriores y maletero."}
                  rows={3} disabled={loading} className="field resize-none" />
                <p className="text-xs text-purple-400 mt-2">
                  Opcional — ayuda a detectar incoherencias mecánicas.
                </p>
              </div>

              {/* 02 Upload */}
              <div className="card p-5 stagger-2">
                <div className="flex items-center gap-2 mb-3">
                  <span className="step-badge">02</span>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-purple-800">Cargar Factura</h2>
                </div>

                <div {...getRootProps()}
                     className={`dropzone ${isDragActive ? 'dropzone-active' : ''} ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <input {...getInputProps()} />
                  <div style={{ color: '#a78bfa', fontSize: '2rem', marginBottom: '0.75rem' }}><I.Clip /></div>
                  {isDragActive ? (
                    <p className="font-bold text-purple-700">Suelta aquí</p>
                  ) : (
                    <>
                      <p className="font-semibold text-purple-800">Arrastra tu factura aquí</p>
                      <p className="text-sm text-purple-400 mt-1">o haz clic para seleccionar</p>
                      <p className="text-xs text-purple-300 mt-2 font-bold uppercase tracking-wide">
                        JPG · PNG · WebP · PDF — Máx 10 MB
                      </p>
                    </>
                  )}
                </div>

                {file && (
                  <div className="mt-3 flex items-center gap-3 rounded-xl p-3"
                       style={{ background:'#f0fdf4', border:'1px solid #bbf7d0' }}>
                    {preview
                      ? <img src={preview} alt="" className="w-12 h-12 object-cover rounded-lg border border-green-200 flex-shrink-0" />
                      : <span style={{ color:'#059669', fontSize:'1.6rem' }}><I.File /></span>}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-green-900 truncate">{file.name}</p>
                      <p className="text-xs text-green-600 mt-0.5">{(file.size/1024).toFixed(1)} KB · {file.type}</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); setFileClean(null) }}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0"
                            style={{ background:'#fee2e2', color:'#991b1b' }}>
                      ✕ Quitar
                    </button>
                  </div>
                )}
              </div>

              {/* 03 Botón — justo después del upload */}
              <button onClick={() => { if (file && !loading) setShowEmail(true) }}
                      disabled={!file || loading}
                      className={`btn-primary w-full py-4 text-base stagger-3 ${file && !loading ? 'btn-audit-glow' : ''}`}>
                {loading
                  ? <><I.Spin /> Auditando…</>
                  : <><span style={{background:'rgba(255,255,255,0.25)',borderRadius:'6px',padding:'0.15rem 0.5rem',fontSize:'0.68rem',marginRight:'0.5rem',fontWeight:800}}>03</span>Iniciar Auditoría</>
                }
              </button>

              {/* Email status */}
              {emailStatus === 'sending' && (
                <div className="rounded-xl p-3 flex items-center gap-2.5"
                     style={{ background:'#fef3c7', border:'1px solid #fde68a' }}>
                  <I.Spin />
                  <p className="font-semibold text-sm text-amber-800">Enviando a {emailSentTo}…</p>
                </div>
              )}
              {emailStatus === 'sent' && (
                <div className="rounded-xl p-3 flex items-center gap-2.5"
                     style={{ background:'#d1fae5', border:'1px solid #6ee7b7' }}>
                  <span style={{ color:'#059669' }}><I.Check /></span>
                  <p className="font-semibold text-sm text-green-800">Enviado a {emailSentTo}</p>
                </div>
              )}
              {emailStatus === 'error' && (
                <div className="rounded-xl p-3" style={{ background:'#fee2e2', border:'1px solid #fca5a5' }}>
                  <p className="font-semibold text-sm text-red-800 flex items-center gap-1.5"><I.X /> Error al enviar correo</p>
                  <p className="text-xs text-red-600 mt-1">{emailError}</p>
                </div>
              )}

              {/* Ejemplos — al fondo como sección secundaria */}
              <ExamplePDFs onLoad={setFileClean} disabled={loading} />
            </div>

            {/* Right column */}
            <div className="mt-6 lg:mt-0">
              {loading && <LoadingOverlay />}
              {!loading && error && (
                <div className="card p-6 fade-up" style={{ background:'#fff1f2', borderColor:'#fecdd3' }}>
                  <p className="font-bold text-sm text-red-700 flex items-center gap-2 mb-2"><I.X /> Error</p>
                  <p className="text-base text-red-600">{error}</p>
                </div>
              )}
              {!loading && result && <AuditResult result={result} />}
              {!loading && !result && !error && <Placeholder />}
            </div>

          </div>
        )}
      </div>

      <footer className="text-center py-8 mt-4 border-t border-purple-100">
        <p className="text-xs font-bold uppercase tracking-widest text-purple-300">
          Jair Rueda · Mateo Rosero · Junior Espin
        </p>
      </footer>
    </div>
  )
}
