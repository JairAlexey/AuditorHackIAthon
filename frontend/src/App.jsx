import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'

const API_URL = import.meta.env.VITE_API_URL ?? ''

function mkSvg(size, sw = '2.5') {
  return {
    width: size, height: size,
    viewBox: '0 0 20 20',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: sw,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    style: { display: 'inline-block', verticalAlign: '-0.15em', flexShrink: 0 },
  }
}

const Icons = {
  Check:      ({ size = '1.1em' }) => <svg {...mkSvg(size)}><circle cx="10" cy="10" r="8"/><polyline points="6,10.5 8.5,13 14,7"/></svg>,
  Warning:    ({ size = '1.1em' }) => <svg {...mkSvg(size)}><polygon points="10,2 18,17 2,17"/><line x1="10" y1="7" x2="10" y2="12"/><circle cx="10" cy="14.5" r="0.8" fill="currentColor" stroke="none"/></svg>,
  Search:     ({ size = '1.1em' }) => <svg {...mkSvg(size)}><circle cx="8.5" cy="8.5" r="5.5"/><line x1="13" y1="13" x2="18" y2="18"/></svg>,
  Block:      ({ size = '1.1em' }) => <svg {...mkSvg(size)}><circle cx="10" cy="10" r="8"/><line x1="3.5" y1="3.5" x2="16.5" y2="16.5"/></svg>,
  Question:   ({ size = '1.1em' }) => <svg {...mkSvg(size)}><circle cx="10" cy="10" r="8"/><path d="M7,8.5 Q7,5 10,5 Q13,5 13,8 Q13,10.5 10,10.5 L10,11.5"/><circle cx="10" cy="14" r="0.8" fill="currentColor" stroke="none"/></svg>,
  Eye:        ({ size = '1.1em' }) => <svg {...mkSvg(size)}><path d="M1,10 Q5,4 10,4 Q15,4 19,10 Q15,16 10,16 Q5,16 1,10"/><circle cx="10" cy="10" r="3"/><circle cx="10" cy="10" r="1" fill="currentColor" stroke="none"/></svg>,
  Database:   ({ size = '1.1em' }) => <svg {...mkSvg(size)}><ellipse cx="10" cy="4.5" rx="7" ry="2.5"/><path d="M3,4.5 L3,15.5 Q3,18 10,18 Q17,18 17,15.5 L17,4.5"/><path d="M3,10 Q3,12.5 10,12.5 Q17,12.5 17,10"/></svg>,
  Edit:       ({ size = '1.1em' }) => <svg {...mkSvg(size)}><path d="M3,3 L11,3 L15,7 L15,17 L3,17 Z"/><polyline points="11,3 11,7 15,7"/><line x1="6" y1="10" x2="12" y2="10"/><line x1="6" y1="13" x2="10" y2="13"/></svg>,
  Gear:       ({ size = '1.2em' }) => <svg {...mkSvg(size, '2')}><circle cx="10" cy="10" r="3"/><path d="M10,2 L10,5 M10,15 L10,18 M2,10 L5,10 M15,10 L18,10"/><path d="M4.2,4.2 L6.3,6.3 M13.7,13.7 L15.8,15.8 M15.8,4.2 L13.7,6.3 M6.3,13.7 L4.2,15.8"/></svg>,
  Clip:       ({ size = '1.4em' }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display:'inline-block', verticalAlign:'-0.2em', flexShrink:0 }}><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>,
  FolderOpen: ({ size = '1.1em' }) => <svg {...mkSvg(size)}><path d="M2,6 L2,16 L18,16 L18,8 L9,8 L7,5 L2,5 Z"/><line x1="2" y1="10" x2="18" y2="10"/></svg>,
  File:       ({ size = '1.1em' }) => <svg {...mkSvg(size)}><path d="M4,2 L12,2 L16,6 L16,18 L4,18 Z"/><polyline points="12,2 12,6 16,6"/></svg>,
  Hourglass:  ({ size = '1.1em' }) => <svg {...mkSvg(size)}><line x1="4" y1="2" x2="16" y2="2"/><line x1="4" y1="18" x2="16" y2="18"/><path d="M4,2 L10,10 L16,2"/><path d="M4,18 L10,10 L16,18"/></svg>,
  XCircle:    ({ size = '1.1em' }) => <svg {...mkSvg(size)}><circle cx="10" cy="10" r="8"/><line x1="7" y1="7" x2="13" y2="13"/><line x1="13" y1="7" x2="7" y2="13"/></svg>,
  Mail:       ({ size = '1.1em' }) => <svg {...mkSvg(size)}><rect x="2" y="4" width="16" height="12" rx="1"/><polyline points="2,4 10,11 18,4"/></svg>,
  Notion:     ({ size = '1.1em' }) => <svg {...mkSvg(size, '1.8')}><rect x="3" y="2" width="14" height="16" rx="1.5"/><line x1="6" y1="7" x2="14" y2="7"/><line x1="6" y1="10.5" x2="11" y2="10.5"/></svg>,
}

function EmailModal({ onConfirm, onSkip }) {
  const [email, setEmail] = useState('')
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onSkip}
    >
      <div
        className="glass-card w-full max-w-md overflow-hidden animate-float"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-clean-tech-accent-blue to-clean-tech-accent-cyan px-6 py-4 flex items-center gap-3">
          <Icons.Mail size="1.6rem" className="text-white" />
          <div>
            <p className="font-semibold uppercase text-lg leading-none tracking-wide text-white">Enviar Reporte PDF</p>
            <p className="text-sm mt-1 font-medium text-cyan-100">Recibirás el dictamen completo como adjunto</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold uppercase tracking-wider mb-2 text-light-primary">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && valid) onConfirm(email); if (e.key === 'Escape') onSkip() }}
              placeholder="correo@ejemplo.com"
              autoFocus
              className="glow-input w-full"
            />
            <p className="text-xs text-light-secondary font-medium mt-2">
              Enter para confirmar · Esc o clic afuera para cancelar
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => valid && onConfirm(email)}
              disabled={!valid}
              className={[
                'flex-1 py-3.5 font-semibold text-base uppercase rounded-lg tracking-wide',
                'inline-flex items-center justify-center gap-2 transition-all duration-300',
                valid
                  ? 'glow-button hover:shadow-glow-cyan active:scale-95'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50',
              ].join(' ')}
            >
              <Icons.Mail size="1em" /> Auditar y Enviar
            </button>
            <button
              onClick={onSkip}
              className="px-5 py-3.5 font-semibold text-base uppercase rounded-lg tracking-wide
                         glass-card-hover transition-all duration-300"
            >
              Sin correo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const DICTAMEN_STYLES = {
  'Aprobado': { color: 'text-clean-tech-success', bgChip: 'bg-[rgba(16,185,129,0.2)]', Icon: Icons.Check },
  'Alerta - Sobreprecio': { color: 'text-clean-tech-warning', bgChip: 'bg-[rgba(245,158,11,0.2)]', Icon: Icons.Warning },
  'Alerta - Ítem No Tarifado': { color: 'text-clean-tech-warning', bgChip: 'bg-[rgba(245,158,11,0.2)]', Icon: Icons.Search },
  'Rechazado - Cobro Duplicado': { color: 'text-clean-tech-error', bgChip: 'bg-[rgba(239,68,68,0.2)]', Icon: Icons.Block },
  'Rechazado - Incoherencia Mecánica': { color: 'text-clean-tech-error', bgChip: 'bg-[rgba(239,68,68,0.2)]', Icon: Icons.Block },
}

const ESTADO_STYLES = {
  OK: { color: 'text-clean-tech-success', bg: 'bg-[rgba(16,185,129,0.1)]' },
  SOBREPRECIO: { color: 'text-clean-tech-error', bg: 'bg-[rgba(239,68,68,0.1)]' },
  NO_TARIFADO: { color: 'text-clean-tech-warning', bg: 'bg-[rgba(245,158,11,0.1)]' },
  DUPLICADO: { color: 'text-clean-tech-warning', bg: 'bg-[rgba(245,158,11,0.1)]' },
  INCOHERENCIA_MECANICA: { color: 'text-clean-tech-error', bg: 'bg-[rgba(239,68,68,0.1)]' },
}

const VERDICT_COLORS = {
  'Aprobado':                       { bg: 'bg-[rgba(16,185,129,0.18)]',  text: 'text-clean-tech-success' },
  'Alerta - Sobreprecio':           { bg: 'bg-[rgba(245,158,11,0.18)]',  text: 'text-clean-tech-warning' },
  'Alerta - Ítem No Tarifado':      { bg: 'bg-[rgba(245,158,11,0.18)]',  text: 'text-clean-tech-warning' },
  'Rechazado - Cobro Duplicado':    { bg: 'bg-[rgba(239,68,68,0.18)]',   text: 'text-clean-tech-error'   },
  'Rechazado - Incoherencia Mecánica': { bg: 'bg-[rgba(239,68,68,0.18)]', text: 'text-clean-tech-error'  },
}

function DictamenBadge({ dictamen }) {
  const style = DICTAMEN_STYLES[dictamen] ?? { color: 'text-light-secondary', bgChip: 'bg-gray-600/20', Icon: Icons.Question }
  return (
    <span className={`${style.bgChip} ${style.color} px-4 py-2 rounded-lg font-semibold inline-flex items-center gap-2 text-sm`}>
      <style.Icon size="1.1em" />
      <span>{dictamen}</span>
    </span>
  )
}

function ItemRow({ item, index }) {
  const style = ESTADO_STYLES[item.estado] ?? { color: 'text-light-secondary', bg: 'bg-gray-600/10' }
  const isMechAlert = item.estado === 'INCOHERENCIA_MECANICA' || item.alerta_sugerida === 'INCOHERENCIA_MECANICA'
  const isDuplicado = item.estado === 'DUPLICADO' || item.alerta_sugerida === 'DUPLICADO'
  const showRazon = item.razonamiento_agente && (isMechAlert || isDuplicado)

  return (
    <div className={`${style.bg} ${style.color} rounded-xl p-4 transition-all duration-300`}
         style={{
           border: '1px solid rgba(255,255,255,0.08)',
           backdropFilter: 'blur(12px)',
           WebkitBackdropFilter: 'blur(12px)',
         }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <span className="font-bold text-xs px-2 py-1 rounded-md flex-shrink-0 leading-none mt-0.5"
                style={{ background: 'rgba(59,130,246,0.25)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.3)' }}>
            {String(index + 1).padStart(2, '0')}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-sm leading-snug text-white/90">{item.descripcion}</p>
            {item.observacion && (
              <p className="text-xs mt-0.5 font-medium leading-snug text-white/50">{item.observacion}</p>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="font-semibold text-sm text-white/90">
            {typeof item.precio === 'number' ? `$${item.precio.toFixed(2)}` : '—'}
          </p>
          <span className={`text-xs font-semibold px-2 py-1 mt-0.5 inline-block leading-snug rounded-md ${style.color} ${style.bg}`}>
            {item.estado?.replace(/_/g, ' ')}
          </span>
        </div>
      </div>
      {showRazon && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-xs font-semibold uppercase text-white/40 mb-1">Análisis:</p>
          <p className="text-sm font-medium leading-snug text-white/80">{item.razonamiento_agente}</p>
        </div>
      )}
    </div>
  )
}

function LoadingOverlay() {
  const steps = [
    { Icon: Icons.Eye,      text: 'Extrayendo ítems con GPT-4o Vision' },
    { Icon: Icons.Database, text: 'Consultando tarifario en Supabase' },
    { Icon: Icons.Search,   text: 'Detectando sobreprecios e incoherencias' },
    { Icon: Icons.Edit,     text: 'Registrando dictamen en Notion' },
  ]
  return (
    <div className="glass-card p-8 relative overflow-hidden float-card">
      <div className="scanline absolute inset-0" />
      <div className="relative" style={{ zIndex: 2 }}>
        <div className="flex items-center gap-4 mb-7">
          <span className="animate-spin flex-shrink-0" style={{ animationDuration: '2s', display: 'inline-block', color: '#38bdf8' }}>
            <Icons.Gear size="2.2rem" />
          </span>
          <div>
            <p className="font-bold text-lg uppercase leading-none text-white/90 tracking-wide">Agente en ejecución</p>
            <p className="text-sm font-medium mt-1 text-white/50">Procesando factura, ~30 segundos…</p>
          </div>
        </div>
        <div className="space-y-3.5">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{
                  background: '#38bdf8',
                  boxShadow: '0 0 8px rgba(56,189,248,0.6)',
                  animation: `pulse-dot 1.4s ease-in-out infinite`,
                  animationDelay: `${i * 0.35}s`,
                }}
              />
              <span className="text-sm font-medium inline-flex items-center gap-2 text-white/75">
                <step.Icon size="1.1em" />{step.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function InvoiceCard({ invoiceData }) {
  return (
    <div className="glass-card p-6 float-card">
      <h2 className="text-sm font-bold uppercase pb-3 mb-5 flex items-center gap-2 text-white/80 tracking-widest"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <Icons.File size="1.1em" /> Factura Procesada
      </h2>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-4">
        {[
          { label: 'Taller', value: invoiceData.taller },
          { label: 'N° Factura', value: invoiceData.numero_factura },
          { label: 'Fecha', value: invoiceData.fecha },
          { label: 'Total', value: typeof invoiceData.total === 'number'
              ? `$${invoiceData.total.toFixed(2)}` : invoiceData.total },
        ].map(({ label, value }) => (
          <div key={label}>
            <dt className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-1">{label}</dt>
            <dd className="font-semibold text-base truncate text-white/90">{value ?? '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function AuditResultPanel({ result }) {
  const { invoice_data, audit_result } = result
  const alertCount = audit_result?.alertas ?? 0
  const verdict = audit_result?.dictamen ?? 'Error'
  const verdictColor = VERDICT_COLORS[verdict] ?? { bg: 'bg-gray-600', text: 'text-white' }
  const totalF = Number(audit_result?.total_facturado ?? 0)
  const totalA = Number(audit_result?.total_aprobado ?? 0)
  const ahorro = Math.max(0, totalF - totalA)

  return (
    <div className="space-y-4">
      {invoice_data && <InvoiceCard invoiceData={invoice_data} />}

      <div className="glass-card p-6 float-card">
        <h2 className="text-sm font-bold uppercase pb-3 mb-5 tracking-widest text-white/80"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          Dictamen Final
        </h2>
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <DictamenBadge dictamen={verdict} />
          {alertCount > 0 && (
            <span className={`font-semibold text-sm ${verdictColor.bg} ${verdictColor.text} px-3 py-1.5 rounded-lg`}>
              {alertCount} alerta{alertCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {audit_result?.total_facturado != null && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Facturado', value: `$${totalF.toFixed(2)}`, accent: 'rgba(59,130,246,0.22)',  glow: 'rgba(59,130,246,0.15)'  },
              { label: 'Aprobado',  value: `$${totalA.toFixed(2)}`, accent: 'rgba(16,185,129,0.22)',  glow: 'rgba(16,185,129,0.15)'  },
              { label: 'Ahorro',    value: `$${ahorro.toFixed(2)}`, accent: 'rgba(6,182,212,0.22)',   glow: 'rgba(6,182,212,0.15)'   },
            ].map(({ label, value, accent, glow }) => (
              <div key={label}
                   className="rounded-xl p-3 text-center transition-all duration-300"
                   style={{
                     background: `linear-gradient(135deg, ${accent}, rgba(255,255,255,0.03))`,
                     border: '1px solid rgba(255,255,255,0.08)',
                     backdropFilter: 'blur(16px)',
                     WebkitBackdropFilter: 'blur(16px)',
                     boxShadow: `0 4px 20px ${glow}`,
                   }}>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/45">{label}</p>
                <p className="font-bold text-xl text-white/92 mt-1">{value}</p>
              </div>
            ))}
          </div>
        )}

        {audit_result?.resumen && (
          <p className="text-sm font-medium border-t border-clean-tech-border pt-4 mt-4 leading-relaxed text-light-primary">
            {audit_result.resumen}
          </p>
        )}

        {audit_result?.notion_url && (
          <a
            href={audit_result.notion_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 bg-gradient-to-r from-clean-tech-accent-blue to-clean-tech-accent-cyan
                       px-5 py-2.5 font-semibold text-sm uppercase rounded-lg text-white
                       transition-all duration-300 hover:shadow-glow-blue active:scale-95"
          >
            <Icons.Notion size="1.1em" /> Ver en Notion →
          </a>
        )}
      </div>

      {Array.isArray(audit_result?.items_auditados) && audit_result.items_auditados.length > 0 && (
        <div className="glass-card p-6 float-card">
          <h2 className="text-sm font-bold uppercase pb-3 mb-5 tracking-widest text-white/80"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            Ítems Auditados <span className="opacity-50">({audit_result.items_auditados.length})</span>
          </h2>
          <div className="space-y-2">
            {audit_result.items_auditados.map((item, i) => (
              <ItemRow key={i} item={item} index={i} />
            ))}
          </div>
          <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xs font-semibold uppercase mb-3 text-white/35 tracking-widest">Leyenda de Estados</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(ESTADO_STYLES).map(([key, val]) => (
                <span key={key} className={`${val.bg} ${val.color} px-3 py-1.5 text-xs font-semibold rounded-lg`}
                      style={{ backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {key.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ResultsPlaceholder() {
  return (
    <div className="hidden lg:flex flex-col items-center justify-center min-h-[440px] glass-card text-center p-10">
      <div style={{ opacity: 0.18 }} className="text-blue-400 mb-1">
        <Icons.Search size="4rem" />
      </div>
      <p className="font-semibold text-2xl uppercase mt-5 tracking-wide" style={{ opacity: 0.35, color: 'white' }}>
        Resultados de Auditoría
      </p>
      <p className="text-sm font-medium mt-2" style={{ opacity: 0.22, color: 'white' }}>
        Completa el formulario e inicia la auditoría
      </p>
    </div>
  )
}

export default function App() {
  const [sinisterReport, setSinisterReport] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')
  const [emailStatus, setEmailStatus] = useState(null)
  const [emailError, setEmailError] = useState('')

  const onDrop = useCallback((accepted) => {
    const f = accepted[0]
    if (!f) return
    setFile(f); setResult(null); setError(null); setEmailStatus(null)
    if (f.type.startsWith('image/')) setPreview(URL.createObjectURL(f))
    else setPreview(null)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': ['.jpg','.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'], 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: loading,
  })

  const clearFile = (e) => {
    e.stopPropagation()
    setFile(null); setPreview(null); setResult(null); setError(null); setEmailStatus(null)
  }

  const handleAudit = () => { if (!file || loading) return; setShowEmailModal(true) }

  const startAudit = async (email) => {
    setShowEmailModal(false); setPendingEmail(email)
    setEmailStatus(null); setEmailError(''); setLoading(true); setError(null); setResult(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('sinister_report', sinisterReport)

    let auditData = null
    try {
      const res = await fetch(`${API_URL}/api/audit`, { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? `Error ${res.status}`)
      auditData = data; setResult(data)
    } catch (err) {
      setError(err.message ?? 'Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }

    if (email && auditData?.success) {
      setEmailStatus('sending')
      try {
        const res = await fetch(`${API_URL}/api/send-report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, audit_data: auditData }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail ?? `Error ${res.status}`)
        setEmailStatus('sent')
      } catch (err) {
        setEmailStatus('error'); setEmailError(err.message ?? 'Error enviando correo')
      }
    }
  }

  return (
    <div className="min-h-screen relative p-2 md:p-4" style={{ background: '#060612' }}>

      {/* Ambient background orbs */}
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div className="orb-blue" />
        <div className="orb-purple" />
        <div className="orb-cyan" />
      </div>

      {showEmailModal && <EmailModal onConfirm={startAudit} onSkip={() => startAudit('')} />}

      <div className="max-w-[1500px] mx-auto relative" style={{ zIndex: 1 }}>

        {/* ── Header ── */}
        <header className="mb-6">
          <div className="liquid-glass-interactive bg-liquid-flow-bg px-6 py-6 md:px-8 md:py-8 flex items-center justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-light-secondary mb-2">
                Sistema Agéntico IA · Hackathon
              </p>
              <h1 className="liquid-text-gradient text-4xl md:text-5xl font-bold uppercase leading-none mb-3">
                Auditor de Facturación
              </h1>
              <p className="text-sm font-medium text-light-secondary max-w-2xl">
                Detecta sobreprecios e incoherencias en facturas de siniestros usando GPT-4o + LangChain.
              </p>
            </div>
            <div className="hidden sm:flex flex-col gap-1 text-right flex-shrink-0 opacity-40 text-xs font-semibold uppercase text-light-secondary">
              <span>GPT-4o Vision</span>
              <span>LangChain · Supabase</span>
              <span>Notion · Mailjet</span>
            </div>
          </div>
        </header>

        {/* ── Layout de dos columnas ── */}
        <div className="lg:grid lg:grid-cols-[440px_1fr] lg:gap-6 lg:items-start">

          {/* ── Columna izquierda: formulario (sticky) ── */}
          <div className="lg:sticky lg:top-4 space-y-4">

            {/* 01 Reporte */}
            <section className="liquid-glass p-6">
              <h2 className="text-sm font-semibold uppercase mb-3 flex items-center gap-2 text-light-primary">
                <span className="bg-clean-tech-accent-blue text-white text-xs font-semibold px-2.5 py-1 rounded">01</span>
                Reporte de Siniestralidad
              </h2>
              <textarea
                value={sinisterReport}
                onChange={e => setSinisterReport(e.target.value)}
                placeholder={"Describe el siniestro: tipo de impacto, zona afectada, daños…\nEj: Impacto trasero, daños en faros posteriores y maletero."}
                rows={3}
                disabled={loading}
                className={[
                  'glow-input w-full resize-none',
                  loading ? 'opacity-50 cursor-not-allowed' : '',
                ].join(' ')}
              />
              <p className="text-xs font-medium text-light-secondary mt-2.5">
                Opcional — detecta incoherencias mecánicas en la factura.
              </p>
            </section>

            {/* 02 Upload */}
            <section className="liquid-glass p-6">
              <h2 className="text-sm font-semibold uppercase mb-3 flex items-center gap-2 text-light-primary">
                <span className="bg-clean-tech-accent-blue text-white text-xs font-semibold px-2.5 py-1 rounded">02</span>
                Cargar Factura
              </h2>

              <div
                {...getRootProps()}
                className={[
                  'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300',
                  'bg-[rgba(59,130,246,0.05)] border-[rgba(59,130,246,0.5)]',
                  isDragActive ? 'border-clean-tech-accent-cyan bg-[rgba(6,182,212,0.1)] shadow-glow-cyan' : 'hover:border-clean-tech-accent-cyan hover:bg-[rgba(6,182,212,0.05)]',
                  loading ? 'opacity-50 cursor-not-allowed' : '',
                ].join(' ')}
              >
                <input {...getInputProps()} />
                <div className="flex justify-center mb-3 select-none text-clean-tech-accent-cyan">
                  {isDragActive ? <Icons.FolderOpen size="2.5rem" /> : <Icons.Clip size="2.5rem" />}
                </div>
                {isDragActive ? (
                  <p className="font-semibold text-base uppercase text-light-primary">Suelta aquí</p>
                ) : (
                  <>
                    <p className="font-semibold text-base text-light-primary">Arrastra tu factura aquí</p>
                    <p className="text-sm font-medium mt-1 text-light-secondary">o haz clic para seleccionar</p>
                    <p className="text-xs mt-2 font-semibold uppercase text-light-secondary">
                      JPG · PNG · WebP · PDF — Máx 10 MB
                    </p>
                  </>
                )}
              </div>

              {file && (
                <div className="mt-4 glass-card-hover bg-[rgba(16,185,129,0.1)] border border-clean-tech-success p-4 flex items-center gap-3">
                  {preview
                    ? <img src={preview} alt="preview" className="w-12 h-12 object-cover rounded border border-clean-tech-border flex-shrink-0" />
                    : <span className="flex-shrink-0 text-clean-tech-success"><Icons.File size="1.8rem" /></span>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate text-light-primary">{file.name}</p>
                    <p className="text-xs font-medium text-light-secondary mt-0.5">
                      {(file.size / 1024).toFixed(1)} KB · {file.type}
                    </p>
                  </div>
                  <button
                    onClick={clearFile}
                    className="flex-shrink-0 bg-[rgba(239,68,68,0.2)] text-clean-tech-error font-semibold text-xs px-3 py-1.5
                               hover:bg-[rgba(239,68,68,0.3)] transition-all rounded border border-[rgba(239,68,68,0.3)]"
                  >
                    ✕ Quitar
                  </button>
                </div>
              )}
            </section>

            {/* 03 Botón */}
            <button
              onClick={handleAudit}
              disabled={!file || loading}
              className={[
                'w-full py-4 text-base font-semibold uppercase rounded-lg tracking-wide transition-all duration-300',
                !file || loading
                  ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed opacity-50'
                  : 'liquid-button w-full',
              ].join(' ')}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Icons.Hourglass /> Auditando…
                </span>
              ) : (
                <>
                  <span className="bg-clean-tech-accent-cyan text-[#0F172A] text-xs font-semibold px-2 py-0.5 mr-2 rounded">03</span>
                  Iniciar Auditoría
                </>
              )}
            </button>

            {/* Estado de correo */}
            {emailStatus === 'sending' && (
              <div className="glass-card-hover bg-[rgba(245,158,11,0.1)] border border-clean-tech-warning p-3 flex items-center gap-2.5 rounded-lg">
                <span className="animate-spin flex-shrink-0 text-clean-tech-warning" style={{ animationDuration: '1.5s', display: 'inline-block' }}>
                  <Icons.Gear size="1.1rem" />
                </span>
                <p className="font-semibold text-sm uppercase text-light-primary">Enviando a {pendingEmail}…</p>
              </div>
            )}
            {emailStatus === 'sent' && (
              <div className="glass-card-hover bg-[rgba(16,185,129,0.1)] border border-clean-tech-success p-3 flex items-center gap-2.5 rounded-lg">
                <Icons.Check size="1.1rem" className="text-clean-tech-success" />
                <p className="font-semibold text-sm uppercase text-light-primary">Enviado a {pendingEmail}</p>
              </div>
            )}
            {emailStatus === 'error' && (
              <div className="glass-card-hover bg-[rgba(239,68,68,0.1)] border border-clean-tech-error p-3 rounded-lg">
                <p className="font-semibold text-sm uppercase inline-flex items-center gap-2 text-clean-tech-error">
                  <Icons.XCircle size="1.1rem" /> Error al enviar correo
                </p>
                <p className="text-xs font-medium mt-2 text-light-secondary">{emailError}</p>
              </div>
            )}
          </div>

          {/* ── Columna derecha: resultados ── */}
          <div className="mt-6 lg:mt-0">
            {loading && <LoadingOverlay />}
            {!loading && error && (
              <div className="glass-card p-6"
                   style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                <p className="font-bold uppercase text-sm mb-2 inline-flex items-center gap-2 text-red-400">
                  <Icons.XCircle /> Error
                </p>
                <p className="font-medium text-base text-white/80">{error}</p>
              </div>
            )}
            {!loading && result && <AuditResultPanel result={result} />}
            {!loading && !result && !error && <ResultsPlaceholder />}
          </div>

        </div>

        {/* ── Footer ── */}
        <footer className="mt-12 text-center pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/25">
            GPT-4o Vision · LangChain · Supabase · Notion · Mailjet · FastAPI
          </p>
        </footer>

      </div>
    </div>
  )
}
