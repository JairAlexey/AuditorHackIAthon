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

// ── Modal de correo ────────────────────────────────────────────────────────────

function EmailModal({ onConfirm, onSkip }) {
  const [email, setEmail] = useState('')
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4"
      onClick={onSkip}
    >
      <div
        className="neo-card bg-white w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-black text-neo-yellow px-6 py-4 flex items-center gap-3">
          <Icons.Mail size="1.6rem" />
          <div>
            <p className="font-black uppercase text-lg leading-none tracking-wide">Enviar Reporte PDF</p>
            <p className="text-sm mt-1 font-medium opacity-60">Recibirás el dictamen completo como adjunto</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-black uppercase tracking-wider mb-2">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && valid) onConfirm(email); if (e.key === 'Escape') onSkip() }}
              placeholder="correo@ejemplo.com"
              autoFocus
              className="w-full border-4 border-black p-3 font-medium text-base bg-[#F9F9F9]
                         focus:outline-none focus:bg-neo-yellow transition-colors shadow-neo"
            />
            <p className="text-xs text-gray-400 font-medium mt-2">
              Enter para confirmar · Esc o clic afuera para cancelar
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => valid && onConfirm(email)}
              disabled={!valid}
              className={[
                'flex-1 py-3.5 font-black text-base uppercase border-4 border-black tracking-wide',
                'inline-flex items-center justify-center gap-2',
                valid
                  ? 'bg-black text-neo-yellow shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo-lg transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none'
                  : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed',
              ].join(' ')}
            >
              <Icons.Mail size="1em" /> Auditar y Enviar
            </button>
            <button
              onClick={onSkip}
              className="px-5 py-3.5 font-black text-base uppercase border-4 border-black bg-white
                         hover:bg-neo-yellow transition-colors shadow-neo
                         hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo-lg
                         active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              Sin correo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Estilos de dictamen / estado ───────────────────────────────────────────────

const DICTAMEN_STYLES = {
  'Aprobado':                          { bg: 'bg-neo-green',  Icon: Icons.Check   },
  'Alerta - Sobreprecio':              { bg: 'bg-neo-yellow', Icon: Icons.Warning },
  'Alerta - Ítem No Tarifado':         { bg: 'bg-neo-orange', Icon: Icons.Search  },
  'Rechazado - Cobro Duplicado':       { bg: 'bg-neo-red',    Icon: Icons.Block   },
  'Rechazado - Incoherencia Mecánica': { bg: 'bg-neo-red',    Icon: Icons.Block   },
}

const ESTADO_STYLES = {
  OK:                    { bg: 'bg-neo-green',  label: 'OK'                   },
  SOBREPRECIO:           { bg: 'bg-neo-red',    label: 'SOBREPRECIO'          },
  NO_TARIFADO:           { bg: 'bg-neo-orange', label: 'NO TARIFADO'          },
  DUPLICADO:             { bg: 'bg-neo-yellow', label: 'DUPLICADO'            },
  INCOHERENCIA_MECANICA: { bg: 'bg-neo-orange', label: 'INCOHERENCIA MEC.'   },
}

// ── Componentes de resultado ───────────────────────────────────────────────────

function DictamenBadge({ dictamen }) {
  const style = DICTAMEN_STYLES[dictamen] ?? { bg: 'bg-gray-300', Icon: Icons.Question }
  return (
    <span className={`${style.bg} neo-badge inline-flex items-center gap-2`}>
      <style.Icon size="1.1em" />
      <span>{dictamen}</span>
    </span>
  )
}

function ItemRow({ item, index }) {
  const style      = ESTADO_STYLES[item.estado] ?? { bg: 'bg-gray-100', label: item.estado }
  const isMechAlert = item.estado === 'INCOHERENCIA_MECANICA' || item.alerta_sugerida === 'INCOHERENCIA_MECANICA'
  const isDuplicado = item.estado === 'DUPLICADO'             || item.alerta_sugerida === 'DUPLICADO'
  const showRazon   = item.razonamiento_agente && (isMechAlert || isDuplicado)

  return (
    <div className={`${style.bg} border-2 border-black p-3`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <span className="font-black text-xs border-2 border-black bg-white px-1.5 py-0.5 flex-shrink-0 leading-none mt-0.5">
            {String(index + 1).padStart(2, '0')}
          </span>
          <div className="min-w-0">
            <p className="font-bold text-sm leading-snug">{item.descripcion}</p>
            {item.observacion && (
              <p className="text-xs mt-0.5 opacity-70 font-medium leading-snug">{item.observacion}</p>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="font-black text-sm">
            {typeof item.precio === 'number' ? `$${item.precio.toFixed(2)}` : '—'}
          </p>
          <span className="text-xs font-black bg-black text-white px-1.5 py-0.5 mt-0.5 inline-block leading-snug">
            {style.label}
          </span>
        </div>
      </div>
      {showRazon && (
        <div className="mt-2 pt-2 border-t-2 border-dashed border-black">
          <p className="text-xs font-black uppercase opacity-60">Perito:</p>
          <p className="text-sm font-semibold leading-snug mt-0.5">{item.razonamiento_agente}</p>
        </div>
      )}
    </div>
  )
}

function LoadingOverlay() {
  const steps = [
    { Icon: Icons.Eye,      text: 'Extrayendo ítems con GPT-4o Vision'     },
    { Icon: Icons.Database, text: 'Consultando tarifario en Supabase'       },
    { Icon: Icons.Search,   text: 'Detectando sobreprecios e incoherencias' },
    { Icon: Icons.Edit,     text: 'Registrando dictamen en Notion'          },
  ]
  return (
    <div className="neo-card p-6 bg-neo-yellow">
      <div className="flex items-center gap-4 mb-5">
        <span className="animate-spin flex-shrink-0" style={{ animationDuration: '2s', display: 'inline-block' }}>
          <Icons.Gear size="2rem" />
        </span>
        <div>
          <p className="font-black text-lg uppercase leading-none">Agente en ejecución</p>
          <p className="text-sm font-medium mt-1 opacity-70">Procesando factura, ~30 segundos…</p>
        </div>
      </div>
      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            <span
              className="w-3 h-3 rounded-full bg-black flex-shrink-0"
              style={{ animation: `pulse-dot 1.4s ease-in-out infinite`, animationDelay: `${i * 0.35}s` }}
            />
            <span className="text-sm font-semibold inline-flex items-center gap-2">
              <step.Icon size="1.1em" />{step.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function InvoiceCard({ invoiceData }) {
  return (
    <div className="neo-card p-5">
      <h2 className="text-base font-black uppercase border-b-2 border-black pb-2 mb-4 flex items-center gap-2">
        <Icons.File size="1.1em" /> Factura Procesada
      </h2>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
        {[
          { label: 'Taller',     value: invoiceData.taller },
          { label: 'N° Factura', value: invoiceData.numero_factura },
          { label: 'Fecha',      value: invoiceData.fecha },
          { label: 'Total',      value: typeof invoiceData.total === 'number'
              ? `$${invoiceData.total.toFixed(2)}` : invoiceData.total },
        ].map(({ label, value }) => (
          <div key={label}>
            <dt className="text-xs font-black uppercase tracking-wider text-gray-400">{label}</dt>
            <dd className="font-bold text-base mt-0.5 truncate">{value ?? '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function AuditResultPanel({ result }) {
  const { invoice_data, audit_result } = result
  const alertCount = audit_result?.alertas ?? 0
  const dictBg     = DICTAMEN_STYLES[audit_result?.dictamen]?.bg ?? 'bg-gray-100'
  const totalF     = Number(audit_result?.total_facturado ?? 0)
  const totalA     = Number(audit_result?.total_aprobado  ?? 0)
  const ahorro     = Math.max(0, totalF - totalA)

  return (
    <div className="space-y-4">
      {invoice_data && <InvoiceCard invoiceData={invoice_data} />}

      {/* Dictamen */}
      <div className={`neo-card p-5 ${dictBg}`}>
        <h2 className="text-base font-black uppercase border-b-2 border-black pb-2 mb-4">
          Dictamen Final
        </h2>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <DictamenBadge dictamen={audit_result?.dictamen ?? 'Error'} />
          {alertCount > 0 && (
            <span className="font-bold text-sm border-2 border-black bg-white px-2.5 py-1">
              {alertCount} alerta{alertCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Resumen financiero */}
        {audit_result?.total_facturado != null && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: 'Facturado', value: `$${totalF.toFixed(2)}` },
              { label: 'Aprobado',  value: `$${totalA.toFixed(2)}` },
              { label: 'Ahorro',    value: `$${ahorro.toFixed(2)}` },
            ].map(({ label, value }) => (
              <div key={label} className="border-2 border-black bg-white p-2 text-center shadow-neo-sm">
                <p className="text-xs font-black uppercase opacity-50">{label}</p>
                <p className="font-black text-lg">{value}</p>
              </div>
            ))}
          </div>
        )}

        {audit_result?.resumen && (
          <p className="text-sm font-semibold border-t-2 border-black pt-3 mt-2 leading-relaxed">
            {audit_result.resumen}
          </p>
        )}

        {audit_result?.notion_url && (
          <a
            href={audit_result.notion_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 bg-black text-white border-2 border-black
                       px-4 py-2 font-black text-sm uppercase shadow-neo-sm
                       hover:bg-white hover:text-black transition-colors"
          >
            <Icons.Notion size="1.1em" /> Ver en Notion →
          </a>
        )}
      </div>

      {/* Ítems */}
      {Array.isArray(audit_result?.items_auditados) && audit_result.items_auditados.length > 0 && (
        <div className="neo-card p-5">
          <h2 className="text-base font-black uppercase border-b-2 border-black pb-2 mb-4">
            Ítems Auditados ({audit_result.items_auditados.length})
          </h2>
          <div className="space-y-2">
            {audit_result.items_auditados.map((item, i) => (
              <ItemRow key={i} item={item} index={i} />
            ))}
          </div>
          <div className="mt-4 pt-3 border-t-2 border-black">
            <p className="text-xs font-black uppercase mb-2 opacity-60">Leyenda</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(ESTADO_STYLES).map(([key, val]) => (
                <span key={key} className={`${val.bg} border-2 border-black px-2 py-0.5 text-xs font-black`}>
                  {val.label}
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
    <div className="hidden lg:flex flex-col items-center justify-center min-h-[400px]
                    border-4 border-dashed border-black bg-white/40 text-center p-10">
      <div className="opacity-20"><Icons.Search size="3.5rem" /></div>
      <p className="font-black text-xl uppercase mt-5 opacity-25">Resultados de Auditoría</p>
      <p className="text-sm font-bold mt-2 opacity-20">Completa el formulario e inicia la auditoría</p>
    </div>
  )
}

// ── App principal ──────────────────────────────────────────────────────────────

export default function App() {
  const [sinisterReport, setSinisterReport] = useState('')
  const [file, setFile]                     = useState(null)
  const [preview, setPreview]               = useState(null)
  const [loading, setLoading]               = useState(false)
  const [result, setResult]                 = useState(null)
  const [error, setError]                   = useState(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [pendingEmail, setPendingEmail]     = useState('')
  const [emailStatus, setEmailStatus]       = useState(null)
  const [emailError, setEmailError]         = useState('')

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
      const res  = await fetch(`${API_URL}/api/audit`, { method: 'POST', body: formData })
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
        const res  = await fetch(`${API_URL}/api/send-report`, {
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
    <div className="min-h-screen bg-[#EBEBEB] p-2 md:p-4">

      {showEmailModal && <EmailModal onConfirm={startAudit} onSkip={() => startAudit('')} />}

      <div className="max-w-[1500px] mx-auto">

        {/* ── Header ── */}
        <header className="mb-4">
          <div className="neo-card bg-neo-yellow px-6 py-5 flex items-center justify-between gap-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] opacity-50 mb-1">
                Sistema Agéntico IA · Hackathon
              </p>
              <h1 className="text-4xl md:text-5xl font-black uppercase leading-none">
                Auditor de Facturación
              </h1>
              <p className="mt-2 text-sm font-semibold opacity-70">
                Detecta sobreprecios e incoherencias en facturas de siniestros usando GPT-4o + LangChain.
              </p>
            </div>
            <div className="hidden sm:flex flex-col gap-1 text-right flex-shrink-0 opacity-40 text-xs font-black uppercase">
              <span>GPT-4o Vision</span>
              <span>LangChain · Supabase</span>
              <span>Notion · Mailjet</span>
            </div>
          </div>
        </header>

        {/* ── Layout de dos columnas ── */}
        <div className="lg:grid lg:grid-cols-[440px_1fr] lg:gap-5 lg:items-start">

          {/* ── Columna izquierda: formulario (sticky) ── */}
          <div className="lg:sticky lg:top-4 space-y-3">

            {/* 01 Reporte */}
            <section className="neo-card p-5">
              <h2 className="text-sm font-black uppercase mb-3 flex items-center gap-2">
                <span className="bg-black text-white text-xs font-black px-2 py-0.5">01</span>
                Reporte de Siniestralidad
              </h2>
              <textarea
                value={sinisterReport}
                onChange={e => setSinisterReport(e.target.value)}
                placeholder={"Describe el siniestro: tipo de impacto, zona afectada, daños…\nEj: Impacto trasero, daños en faros posteriores y maletero."}
                rows={3}
                disabled={loading}
                className={[
                  'w-full border-4 border-black p-3 font-medium text-sm resize-none',
                  'bg-[#F9F9F9] focus:outline-none focus:bg-neo-yellow transition-colors shadow-neo',
                  'placeholder:text-gray-400',
                  loading ? 'opacity-50 cursor-not-allowed' : '',
                ].join(' ')}
              />
              <p className="text-xs font-bold text-gray-400 mt-2">
                Opcional — detecta incoherencias mecánicas en la factura.
              </p>
            </section>

            {/* 02 Upload */}
            <section className="neo-card p-5">
              <h2 className="text-sm font-black uppercase mb-3 flex items-center gap-2">
                <span className="bg-black text-white text-xs font-black px-2 py-0.5">02</span>
                Cargar Factura
              </h2>

              <div
                {...getRootProps()}
                className={[
                  'border-4 border-dashed border-black p-7 text-center cursor-pointer transition-colors',
                  isDragActive ? 'bg-neo-yellow' : 'bg-[#F9F9F9]',
                  loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-neo-yellow',
                ].join(' ')}
              >
                <input {...getInputProps()} />
                <div className="flex justify-center mb-3 select-none">
                  {isDragActive ? <Icons.FolderOpen size="2.5rem" /> : <Icons.Clip size="2.5rem" />}
                </div>
                {isDragActive ? (
                  <p className="font-black text-base uppercase">Suelta aquí</p>
                ) : (
                  <>
                    <p className="font-black text-base">Arrastra tu factura aquí</p>
                    <p className="text-sm font-medium mt-1 text-gray-500">o haz clic para seleccionar</p>
                    <p className="text-xs mt-1.5 font-bold uppercase text-gray-400">
                      JPG · PNG · WebP · PDF — Máx 10 MB
                    </p>
                  </>
                )}
              </div>

              {file && (
                <div className="mt-3 border-2 border-black bg-neo-green p-3 flex items-center gap-3">
                  {preview
                    ? <img src={preview} alt="preview" className="w-12 h-12 object-cover border-2 border-black flex-shrink-0" />
                    : <span className="flex-shrink-0"><Icons.File size="1.8rem" /></span>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm truncate">{file.name}</p>
                    <p className="text-xs font-medium text-gray-600 mt-0.5">
                      {(file.size / 1024).toFixed(1)} KB · {file.type}
                    </p>
                  </div>
                  <button
                    onClick={clearFile}
                    className="flex-shrink-0 bg-black text-white font-black text-xs px-2.5 py-1.5
                               hover:bg-neo-red transition-colors border-2 border-black"
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
                'w-full py-4 text-base border-4 border-black font-black uppercase tracking-widest transition-all duration-100',
                !file || loading ? 'neo-btn-disabled' : 'neo-btn-primary',
              ].join(' ')}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Icons.Hourglass /> Auditando…
                </span>
              ) : (
                <>
                  <span className="bg-neo-yellow text-black text-xs font-black px-1.5 py-0.5 mr-2">03</span>
                  Iniciar Auditoría
                </>
              )}
            </button>

            {/* Estado de correo */}
            {emailStatus === 'sending' && (
              <div className="neo-card-sm bg-neo-yellow p-3 flex items-center gap-2.5">
                <span className="animate-spin flex-shrink-0" style={{ animationDuration: '1.5s', display: 'inline-block' }}>
                  <Icons.Gear size="1.1rem" />
                </span>
                <p className="font-black text-sm uppercase">Enviando a {pendingEmail}…</p>
              </div>
            )}
            {emailStatus === 'sent' && (
              <div className="neo-card-sm bg-neo-green p-3 flex items-center gap-2.5">
                <Icons.Check size="1.1rem" />
                <p className="font-black text-sm uppercase">Enviado a {pendingEmail}</p>
              </div>
            )}
            {emailStatus === 'error' && (
              <div className="neo-card-sm bg-neo-red p-3">
                <p className="font-black text-sm uppercase inline-flex items-center gap-2">
                  <Icons.XCircle size="1.1rem" /> Error al enviar correo
                </p>
                <p className="text-xs font-medium mt-1">{emailError}</p>
              </div>
            )}
          </div>

          {/* ── Columna derecha: resultados ── */}
          <div className="mt-4 lg:mt-0">
            {loading && <LoadingOverlay />}
            {!loading && error && (
              <div className="neo-card-sm bg-neo-red p-5">
                <p className="font-black uppercase text-sm mb-1 inline-flex items-center gap-2">
                  <Icons.XCircle /> Error
                </p>
                <p className="font-semibold text-base">{error}</p>
              </div>
            )}
            {!loading && result && <AuditResultPanel result={result} />}
            {!loading && !result && !error && <ResultsPlaceholder />}
          </div>

        </div>

        {/* ── Footer ── */}
        <footer className="mt-8 text-center">
          <p className="text-xs font-black uppercase tracking-widest text-gray-400">
            GPT-4o Vision · LangChain · Supabase · Notion · Mailjet · FastAPI
          </p>
        </footer>

      </div>
    </div>
  )
}
