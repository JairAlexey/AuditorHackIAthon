CREATE TABLE IF NOT EXISTS tarifario (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo      TEXT        NOT NULL,
    descripcion TEXT        NOT NULL,
    unidad      TEXT        NOT NULL DEFAULT 'Unidad',
    categoria   TEXT        NOT NULL DEFAULT 'General',
    precio_maximo DECIMAL(10,2) NOT NULL CHECK (precio_maximo > 0),
    activo      BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para búsquedas por descripción (ilike)
CREATE INDEX IF NOT EXISTS idx_tarifario_descripcion
    ON tarifario USING gin(to_tsvector('spanish', descripcion));

-- ── Datos de ejemplo (talleres automotrices) ──────────────────────────────────
INSERT INTO tarifario (codigo, descripcion, unidad, categoria, precio_maximo) VALUES
    ('MO-001', 'Mano de obra - Diagnóstico general',          'Hora',   'Mano de Obra',     45.00),
    ('MO-002', 'Mano de obra - Mecánica general',             'Hora',   'Mano de Obra',     55.00),
    ('MO-003', 'Mano de obra - Pintura y carrocería',         'Hora',   'Mano de Obra',     65.00),
    ('MO-004', 'Mano de obra - Electricidad automotriz',      'Hora',   'Mano de Obra',     60.00),
    ('MO-005', 'Mano de obra - Alineación y balanceo',        'Servicio','Mano de Obra',    35.00),
    ('RE-001', 'Filtro de aceite',                            'Unidad', 'Repuestos',        18.00),
    ('RE-002', 'Filtro de aire',                              'Unidad', 'Repuestos',        25.00),
    ('RE-003', 'Filtro de combustible',                       'Unidad', 'Repuestos',        22.00),
    ('RE-004', 'Aceite de motor 5W-30 sintético (1L)',        'Litro',  'Lubricantes',      12.00),
    ('RE-005', 'Pastillas de freno delanteras (juego)',       'Juego',  'Repuestos',        85.00),
    ('RE-006', 'Pastillas de freno traseras (juego)',         'Juego',  'Repuestos',        75.00),
    ('RE-007', 'Disco de freno delantero',                    'Unidad', 'Repuestos',       120.00),
    ('RE-008', 'Disco de freno trasero',                      'Unidad', 'Repuestos',       110.00),
    ('RE-009', 'Amortiguador delantero',                      'Unidad', 'Repuestos',       180.00),
    ('RE-010', 'Amortiguador trasero',                        'Unidad', 'Repuestos',       160.00),
    ('RE-011', 'Bujías (juego de 4)',                         'Juego',  'Repuestos',        45.00),
    ('RE-012', 'Correa de distribución',                      'Unidad', 'Repuestos',        95.00),
    ('RE-013', 'Bomba de agua',                               'Unidad', 'Repuestos',       130.00),
    ('RE-014', 'Termostato',                                  'Unidad', 'Repuestos',        40.00),
    ('RE-015', 'Batería 12V 60Ah',                            'Unidad', 'Eléctrico',       150.00),
    ('IN-001', 'Insumos de pintura (por área)',               'Área',   'Insumos',          80.00),
    ('IN-002', 'Lija y material de preparación',              'Kit',    'Insumos',          25.00),
    ('IN-003', 'Sellador y masilla',                          'Unidad', 'Insumos',          35.00),
    ('SE-001', 'Diagnóstico computarizado OBD',               'Servicio','Servicios',       30.00),
    ('SE-002', 'Lavado y desengrase de motor',                'Servicio','Servicios',       40.00),
    ('SE-003', 'Cambio de aceite completo (incluye filtro)',  'Servicio','Servicios',       75.00)
ON CONFLICT (id) DO NOTHING;

-- ── RLS: permitir lectura pública (ajustar según política de seguridad) ───────
ALTER TABLE tarifario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura pública del tarifario"
    ON tarifario FOR SELECT
    USING (activo = TRUE);
