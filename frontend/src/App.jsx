import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

const API_URL = import.meta.env.VITE_API_URL ?? ''  // vacío → usa el proxy de Vite (/api/...)

// ── Utilidades visuales ────────────────────────────────────────────────────────

const DICTAMEN_STYLES = {
  'Aprobado':                    { bg: 'bg-neo-green',  icon: '✅' },
  'Alerta - Sobreprecio':        { bg: 'bg-neo-yellow', icon: '⚠️' },
  'Alerta - Ítem No Tarifado':   { bg: 'bg-neo-orange', icon: '🔍' },
  'Rechazado - Cobro Duplicado': { bg: 'bg-neo-red',    icon: '🚫' },
}

const ESTADO_STYLES = {
  OK:          { bg: 'bg-neo-green',  label: 'OK'         },
  SOBREPRECIO: { bg: 'bg-neo-red',    label: 'SOBREPRECIO'},
  NO_TARIFADO: { bg: 'bg-neo-orange', label: 'NO TARIFADO'},
  DUPLICADO:   { bg: 'bg-neo-yellow', label: 'DUPLICADO'  },
}

// ── Componentes ────────────────────────────────────────────────────────────────

function DictamenBadge({ dictamen }) {
  const style = DICTAMEN_STYLES[dictamen] ?? { bg: 'bg-gray-300', icon: '❓' }
  return (
    <span className={`${style.bg} neo-badge inline-flex items-center gap-1.5`}>
      <span>{style.icon}</span>
      <span>{dictamen}</span>
    </span>
  )
}

function ItemRow({ item, index }) {
  const style = ESTADO_STYLES[item.estado] ?? { bg: 'bg-gray-100', label: item.estado }
  return (
    <div className={`${style.bg} border-2 border-black p-3 flex items-start justify-between gap-3`}>
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <span className="font-black text-xs border-2 border-black bg-white px-1.5 py-0.5 flex-shrink-0">
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="min-w-0">
          <p className="font-bold text-sm leading-tight">{item.descripcion}</p>
          {item.observacion && (
            <p className="text-xs mt-1 opacity-75 font-medium">{item.observacion}</p>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="font-black text-sm">
          {typeof item.precio === 'number' ? `$${item.precio.toFixed(2)}` : '—'}
        </p>
        <span className="text-xs font-black bg-black text-white px-1.5 py-0.5 mt-0.5 inline-block">
          {style.label}
        </span>
      </div>
    </div>
  )
}

function LoadingOverlay() {
  const steps = [
    { icon: '👁️', text: 'Extrayendo ítems con GPT-4o Vision' },
    { icon: '🗄️', text: 'Consultando tarifario en Supabase' },
    { icon: '🔎', text: 'Detectando sobreprecios y duplicados' },
    { icon: '📝', text: 'Registrando dictamen en Notion' },
  ]
  return (
    <div className="mt-6 neo-card p-6 bg-neo-yellow">
      <div className="flex items-center gap-3 mb-5">
        <span className="text-3xl animate-spin" style={{ animationDuration: '2s' }}>⚙️</span>
        <div>
          <p className="font-black text-lg uppercase leading-none">Agente en ejecución</p>
          <p className="text-sm font-medium mt-0.5">Procesando factura, esto puede tomar ~30 segundos…</p>
        </div>
      </div>
      <div className="space-y-2.5">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            <span
              className="w-3 h-3 rounded-full bg-black flex-shrink-0"
              style={{
                animation: `pulse-dot 1.4s ease-in-out infinite`,
                animationDelay: `${i * 0.35}s`,
              }}
            />
            <span className="text-sm font-semibold">
              {step.icon} {step.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function InvoiceCard({ invoiceData }) {
  return (
    <div className="neo-card p-6">
      <h2 className="text-xl font-black uppercase border-b-4 border-black pb-2 mb-4">
        Factura Procesada
      </h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
        {[
          { label: 'Taller',       value: invoiceData.taller },
          { label: 'N° Factura',   value: invoiceData.numero_factura },
          { label: 'Fecha',        value: invoiceData.fecha },
          { label: 'Total',        value: typeof invoiceData.total === 'number'
              ? `$${invoiceData.total.toFixed(2)}`
              : invoiceData.total },
        ].map(({ label, value }) => (
          <div key={label}>
            <dt className="text-xs font-black uppercase tracking-wider text-gray-500">{label}</dt>
            <dd className="font-bold text-base mt-0.5">{value ?? '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function AuditResultPanel({ result }) {
  const { invoice_data, audit_result, filename } = result
  const alertCount = audit_result?.alertas ?? 0

  return (
    <div className="mt-8 space-y-5">
      {/* Encabezado de factura */}
      {invoice_data && <InvoiceCard invoiceData={invoice_data} />}

      {/* Dictamen */}
      <div className={`neo-card p-6 ${DICTAMEN_STYLES[audit_result?.dictamen]?.bg ?? 'bg-gray-100'}`}>
        <h2 className="text-xl font-black uppercase border-b-4 border-black pb-2 mb-4">
          Dictamen Final
        </h2>
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <DictamenBadge dictamen={audit_result?.dictamen ?? 'Error'} />
          {alertCount > 0 && (
            <span className="font-bold text-sm border-2 border-black bg-white px-2 py-1">
              {alertCount} alerta{alertCount !== 1 ? 's' : ''} detectada{alertCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {audit_result?.resumen && (
          <p className="text-sm font-semibold border-t-2 border-black pt-3 mt-3">
            {audit_result.resumen}
          </p>
        )}

        {audit_result?.notion_url && (
          <a
            href={audit_result.notion_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 bg-black text-white border-2 border-black
                       px-4 py-2 font-black text-sm uppercase
                       hover:bg-white hover:text-black transition-colors"
          >
            Ver dictamen en Notion →
          </a>
        )}
      </div>

      {/* Ítems auditados */}
      {Array.isArray(audit_result?.items_auditados) && audit_result.items_auditados.length > 0 && (
        <div className="neo-card p-6">
          <h2 className="text-xl font-black uppercase border-b-4 border-black pb-2 mb-4">
            Ítems Auditados ({audit_result.items_auditados.length})
          </h2>
          <div className="space-y-2">
            {audit_result.items_auditados.map((item, i) => (
              <ItemRow key={i} item={item} index={i} />
            ))}
          </div>

          {/* Leyenda */}
          <div className="mt-5 pt-4 border-t-2 border-black">
            <p className="text-xs font-black uppercase mb-2">Leyenda</p>
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

// ── App principal ──────────────────────────────────────────────────────────────

export default function App() {
  const [file, setFile]       = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState(null)

  const onDrop = useCallback((accepted) => {
    const f = accepted[0]
    if (!f) return
    setFile(f)
    setResult(null)
    setError(null)
    if (f.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(f))
    } else {
      setPreview(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png':  ['.png'],
      'image/webp': ['.webp'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    disabled: loading,
  })

  const clearFile = (e) => {
    e.stopPropagation()
    setFile(null)
    setPreview(null)
    setResult(null)
    setError(null)
  }

  const handleAudit = async () => {
    if (!file || loading) return
    setLoading(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`${API_URL}/api/audit`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail ?? `Error ${res.status}`)
      }
      setResult(data)
    } catch (err) {
      setError(err.message ?? 'Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#EBEBEB] p-4 md:p-10">
      <div className="max-w-2xl mx-auto">

        {/* ── Header ── */}
        <header className="mb-8">
          <div className="neo-card bg-neo-yellow p-6 md:p-8">
            <p className="text-xs font-black uppercase tracking-[0.2em] mb-2 opacity-60">
              Sistema Agéntico IA · Hackathon
            </p>
            <h1 className="text-4xl md:text-5xl font-black uppercase leading-[1.05]">
              Auditor de<br />Facturación
            </h1>
            <p className="mt-3 text-sm font-semibold max-w-sm">
              Detecta sobreprecios y cobros indebidos en facturas de siniestros
              usando GPT-4o + LangChain + Supabase.
            </p>
          </div>
        </header>

        {/* ── Zona de carga ── */}
        <section className="neo-card p-6">
          <h2 className="text-base font-black uppercase mb-4 flex items-center gap-2">
            <span className="bg-black text-white text-xs font-black px-1.5 py-0.5">01</span>
            Cargar Factura
          </h2>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={[
              'border-4 border-dashed border-black p-10 text-center cursor-pointer transition-colors',
              isDragActive  ? 'bg-neo-yellow'  : 'bg-[#F9F9F9]',
              loading       ? 'opacity-50 cursor-not-allowed' : 'hover:bg-neo-yellow',
            ].join(' ')}
          >
            <input {...getInputProps()} />
            <div className="text-4xl mb-3 select-none">{isDragActive ? '📂' : '📎'}</div>
            {isDragActive ? (
              <p className="font-black text-lg uppercase">Suelta aquí</p>
            ) : (
              <>
                <p className="font-black text-base">Arrastra tu factura aquí</p>
                <p className="text-sm font-medium mt-1 text-gray-500">o haz clic para seleccionar</p>
                <p className="text-xs mt-2 font-bold uppercase text-gray-400">
                  JPG · PNG · WebP · PDF — Máx 10 MB
                </p>
              </>
            )}
          </div>

          {/* Archivo seleccionado */}
          {file && (
            <div className="mt-3 border-2 border-black bg-neo-green p-3 flex items-start gap-3">
              {preview && (
                <img
                  src={preview}
                  alt="preview"
                  className="w-16 h-16 object-cover border-2 border-black flex-shrink-0"
                />
              )}
              {!preview && (
                <span className="text-2xl flex-shrink-0">📄</span>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm truncate">{file.name}</p>
                <p className="text-xs font-medium text-gray-600 mt-0.5">
                  {(file.size / 1024).toFixed(1)} KB · {file.type}
                </p>
              </div>
              <button
                onClick={clearFile}
                className="flex-shrink-0 bg-black text-white font-black text-xs px-2 py-1
                           hover:bg-neo-red transition-colors border-2 border-black"
              >
                ✕ Quitar
              </button>
            </div>
          )}
        </section>

        {/* ── Botón Auditar ── */}
        <div className="mt-4">
          <button
            onClick={handleAudit}
            disabled={!file || loading}
            className={[
              'w-full py-4 text-lg border-4 border-black font-black uppercase tracking-widest transition-all duration-100',
              !file || loading
                ? 'neo-btn-disabled'
                : 'neo-btn-primary',
            ].join(' ')}
          >
            {loading
              ? '⏳ Auditando…'
              : (<><span className="bg-neo-yellow text-black text-xs font-black px-1 py-0.5 mr-2">02</span>Iniciar Auditoría</>)
            }
          </button>
        </div>

        {/* ── Estado de carga ── */}
        {loading && <LoadingOverlay />}

        {/* ── Error ── */}
        {error && (
          <div className="mt-5 neo-card-sm bg-neo-red p-4">
            <p className="font-black uppercase text-xs mb-1">❌ Error</p>
            <p className="font-semibold text-sm">{error}</p>
          </div>
        )}

        {/* ── Resultados ── */}
        {result && <AuditResultPanel result={result} />}

        {/* ── Footer ── */}
        <footer className="mt-12 text-center">
          <p className="text-xs font-black uppercase tracking-widest text-gray-400">
            GPT-4o Vision · LangChain · Supabase · Notion · FastAPI
          </p>
        </footer>

      </div>
    </div>
  )
}
