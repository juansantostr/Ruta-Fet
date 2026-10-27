import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut, Users, DollarSign, Activity, TrendingUp,
  Bus, Bell, User, LayoutDashboard, FileText, ChevronDown,
  Settings, AlertTriangle, AlertCircle, Clock, UserX,
  CreditCard, MapPin, Shield, ArrowRight, TrendingDown,
  Minus, BarChart2, Calendar
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Formatea un número como peso colombiano abreviado: 10000 → $10K */
function formatPeso(val) {
  const n = parseFloat(val) || 0;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString('es-CO')}`;
}

/** Devuelve rango dinámico de 30 días en formato "15 ago – 14 sep 2026" */
function calcularRango30Dias() {
  const hoy = new Date();
  const hace30 = new Date(hoy);
  hace30.setDate(hoy.getDate() - 30);

  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const fmt = (d) => `${d.getDate()} ${meses[d.getMonth()]}`;

  return `${fmt(hace30)} – ${fmt(hoy)} ${hoy.getFullYear()}`;
}

// ─── Sparkline ──────────────────────────────────────────────────────────────

function Sparkline({ data = [], color = '#154734', height = 32, width = 80 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });
  const polyline = pts.join(' ');
  // Area fill
  const area = `${pts[0].split(',')[0]},${height} ${polyline} ${pts[pts.length - 1].split(',')[0]},${height}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={`spk-grad-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#spk-grad-${color.replace('#','')})`} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ─── LineChart con ejes y tooltip ───────────────────────────────────────────

function LineChart({ data = [] }) {
  const [tooltip, setTooltip] = useState(null);
  const svgRef = useRef(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-[#6B7570]">
        <Calendar className="w-8 h-8 opacity-30" />
        <p className="text-sm">Sin actividad registrada en este período</p>
        <p className="text-xs opacity-60">Selecciona un rango más amplio de fechas</p>
      </div>
    );
  }

  const W = 500;
  const H = 160;
  const PAD = { top: 12, right: 16, bottom: 36, left: 56 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const values = data.map((d) => d.valor);
  const maxV = Math.max(...values);
  const minV = 0;
  const rangeV = maxV - minV || 1;

  // Y-axis ticks
  const yTicks = 4;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => Math.round((maxV / yTicks) * i));

  // Points
  const pts = data.map((d, i) => ({
    x: PAD.left + (i / (data.length - 1)) * innerW,
    y: PAD.top + innerH - ((d.valor - minV) / rangeV) * innerH,
    label: d.label,
    valor: d.valor,
  }));

  const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ');
  const area = `${pts[0].x},${PAD.top + innerH} ${polyline} ${pts[pts.length - 1].x},${PAD.top + innerH}`;

  return (
    <div className="relative flex-1 w-full min-h-[160px]">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#154734" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#154734" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines & Y-axis labels */}
        {yTickValues.map((tick, i) => {
          const yPos = PAD.top + innerH - ((tick - minV) / rangeV) * innerH;
          return (
            <g key={i}>
              <line
                x1={PAD.left} y1={yPos} x2={PAD.left + innerW} y2={yPos}
                stroke="#E4EFE7" strokeWidth="1"
              />
              <text
                x={PAD.left - 6} y={yPos + 4}
                textAnchor="end" fontSize="10" fill="#6B7570"
              >
                {formatPeso(tick)}
              </text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {pts.map((p, i) => {
          const step = Math.ceil(data.length / 6);
          const isLast = i === data.length - 1;
          const isMultiple = i % step === 0;
          
          if (data.length > 8) {
            // Mostrar solo si es múltiplo o el último
            if (!isMultiple && !isLast) return null;
            // Si es múltiplo pero está muy cerca del último, ocultarlo para evitar superposición
            if (isMultiple && !isLast && (data.length - 1 - i) < step) return null;
          }

          return (
            <text key={i} x={p.x} y={H - 6} textAnchor="middle" fontSize="9" fill="#6B7570">
              {p.label}
            </text>
          );
        })}

        {/* X-axis line */}
        <line
          x1={PAD.left} y1={PAD.top + innerH} x2={PAD.left + innerW} y2={PAD.top + innerH}
          stroke="#E4EFE7" strokeWidth="1"
        />

        {/* Area */}
        <polygon points={area} fill="url(#chart-grad)" />

        {/* Line */}
        <polyline
          points={polyline} fill="none" stroke="#154734" strokeWidth="2.5"
          strokeLinejoin="round" strokeLinecap="round"
        />

        {/* Invisible hover zones */}
        {pts.map((p, i) => (
          <rect
            key={i}
            x={p.x - innerW / (2 * data.length)} y={PAD.top}
            width={innerW / data.length} height={innerH}
            fill="transparent"
            onMouseEnter={() => setTooltip({ x: p.x, y: p.y, label: p.label, valor: p.valor })}
          />
        ))}

        {/* Active dot */}
        {tooltip && (
          <circle cx={tooltip.x} cy={tooltip.y} r="4" fill="#154734" stroke="white" strokeWidth="2" />
        )}
      </svg>

      {/* Tooltip box */}
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-[#1A2420] text-white text-xs rounded-lg px-3 py-2 shadow-lg -translate-x-1/2 -translate-y-full"
          style={{
            left: `${(tooltip.x / W) * 100}%`,
            top: `${(tooltip.y / H) * 100}%`,
            marginTop: '-8px',
          }}
        >
          <div className="font-semibold">{tooltip.label}</div>
          <div className="text-[#E4EFE7]">${parseFloat(tooltip.valor).toLocaleString('es-CO')}</div>
        </div>
      )}
    </div>
  );
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function AdminDashboard() {
  const [reportes, setReportes] = useState({
    total_recaudado: 0,
    total_viajes: 0,
    rutas: [],
    lineaDatos: [],
    barrasSemana: [0,0,0,0,0,0,0],
    alertas: [],
    sparklineRecaudo: [],
    sparklineViajes: [],
    sparklineRutaN: [],
    sparklineRutaS: []
  });
  const [modalConfig, setModalConfig] = useState(null);
  const [monto, setMonto] = useState('');
  const [loadingAccion, setLoadingAccion] = useState(false);
  const [periodoCode, setPeriodoCode] = useState('30d');
  const [periodoLabel, setPeriodoLabel] = useState('Últimos 30 días');
  const [rangoLabel, setRangoLabel] = useState('');

  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const calcularRangoPorCodigo = (codigo) => {
    const hoy = new Date();
    const inicio = new Date(hoy);
    
    if (codigo === '7d') inicio.setDate(hoy.getDate() - 7);
    else if (codigo === '30d') inicio.setDate(hoy.getDate() - 30);
    else if (codigo === 'este_mes') inicio.setDate(1);

    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const fmt = (d) => `${d.getDate()} ${meses[d.getMonth()]}`;
    
    setRangoLabel(`${fmt(inicio)} - ${fmt(hoy)} ${hoy.getFullYear()}`);
    return { 
      inicio: inicio.toISOString().split('T')[0], 
      fin: hoy.toISOString().split('T')[0] 
    };
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!token || user.rol !== 'ADMIN') {
      navigate('/login');
      return;
    }
    const { inicio, fin } = calcularRangoPorCodigo(periodoCode);
    fetchReportes(inicio, fin);
  }, [navigate, token, user.rol, periodoCode]);

  const fetchReportes = async (inicioStr, finStr) => {
    try {
      const url = `/api/admin/reportes?inicio=${inicioStr}&fin=${finStr}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReportes({
          ...data,
          lineaDatos: data.lineaDatos || [],
          barrasSemana: data.barrasSemana || [0,0,0,0,0,0,0],
          sparklineRecaudo: data.sparklineRecaudo || [],
          sparklineViajes: data.sparklineViajes || [],
          sparklineRutaN: data.sparklineRutaN || [],
          sparklineRutaS: data.sparklineRutaS || []
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch de estudiantes se mantiene sólo para el modal de recarga/descuento
  const fetchEstudianteById = async (id) => {
    try {
      const res = await fetch(`/api/admin/estudiantes?q=${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) return await res.json();
    } catch (err) { console.error(err); }
    return [];
  };

  const handleProcesarAccion = async (e) => {
    e.preventDefault();
    setLoadingAccion(true);
    const endpoint = modalConfig.tipo === 'recargar' ? '/api/admin/recargar' : '/api/admin/descontar';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ estudianteId: modalConfig.estudiante.id, monto: parseFloat(monto) })
      });
      const data = await res.json();
      if (res.ok) {
        alert(modalConfig.tipo === 'recargar' ? 'Recarga exitosa' : 'Deducción exitosa');
        setModalConfig(null);
        setMonto('');
        fetchReportes();
      } else {
        alert(data.error || 'Error procesando la solicitud');
      }
    } catch (err) {
      alert('Error de conexión');
    } finally {
      setLoadingAccion(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getRutaAbordajes = (nombre) => {
    const ruta = reportes.rutas.find(r => r.nombre_ruta === nombre);
    return ruta ? ruta.abordajes : 0;
  };

  // ¿Hay datos suficientes del período anterior para mostrar tendencia?
  const hayDatosAnteriores = false; // Con 1 solo viaje no hay período anterior comparable

  // ─── KPIs ─────────────────────────────────────────────────────────────────

  const kpis = [
    {
      id: 'recaudo',
      label: 'Recaudo Total',
      valor: `$${parseFloat(reportes.total_recaudado || 0).toLocaleString('es-CO')}`,
      periodoAnterior: hayDatosAnteriores ? '$78.200' : null,
      sparkline: reportes.sparklineRecaudo,
      sparkColor: '#154734',
      importante: true,
    },
    {
      id: 'viajes',
      label: 'Viajes Realizados',
      valor: reportes.total_viajes,
      periodoAnterior: hayDatosAnteriores ? '24' : null,
      sparkline: reportes.sparklineViajes,
      sparkColor: '#1F6E4A',
    },
    {
      id: 'norte',
      label: 'Viajes Ruta Norte',
      valor: getRutaAbordajes('Ruta Norte'),
      periodoAnterior: null,
      sparkline: reportes.sparklineRutaN,
      sparkColor: '#154734',
    },
    {
      id: 'sur',
      label: 'Viajes Ruta Sur',
      valor: getRutaAbordajes('Ruta Sur'),
      periodoAnterior: null,
      sparkline: reportes.sparklineRutaS,
      sparkColor: '#154734',
    },
  ];

  // ── Render Helpers ────────────────────────────────────────────────────────
  const hayActividad = reportes.lineaDatos && reportes.lineaDatos.length > 0 && reportes.lineaDatos.some(d => d.valor > 0);
  const hayAlertas = reportes.alertas && reportes.alertas.length > 0;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-[#FAF8F4] overflow-hidden" style={{ fontFamily: 'Manrope, sans-serif' }}>

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside className="w-64 bg-white border-r border-gray-100 hidden md:flex flex-col h-screen shrink-0">
        {/* Logo */}
        <div className="h-24 flex items-center justify-center px-4 border-b border-gray-100">
          <img src="/logo-page-sinfondo.png" alt="Sanbus Logo" className="h-16 w-auto max-w-full object-contain" />
        </div>

        {/* Nav agrupada */}
        <nav className="flex-1 px-4 py-5 overflow-y-auto space-y-5">

          {/* GENERAL */}
          <div>
            <p className="text-[10px] font-bold tracking-widest text-[#6B7570] uppercase px-3 mb-2">General</p>
            <NavItem icon={LayoutDashboard} label="Dashboard" active onClick={() => {}} />
          </div>

          {/* OPERACIÓN */}
          <div>
            <div className="h-px bg-gray-100 mb-3" />
            <p className="text-[10px] font-bold tracking-widest text-[#6B7570] uppercase px-3 mb-2">Operación</p>
            <NavItem icon={Users} label="Estudiantes" onClick={() => navigate('/admin/estudiantes')} />
            <NavItem icon={User} label="Conductores" onClick={() => navigate('/admin/conductores')} />
            <NavItem icon={MapPin} label="Rutas y Horarios" onClick={() => navigate('/admin/rutas')} />
            <NavItem icon={Bus} label="Viajes" onClick={() => navigate('/admin/viajes')} />
          </div>

          {/* FINANZAS Y SISTEMA */}
          <div>
            <div className="h-px bg-gray-100 mb-3" />
            <p className="text-[10px] font-bold tracking-widest text-[#6B7570] uppercase px-3 mb-2">Finanzas y Sistema</p>
            <NavItem icon={CreditCard} label="Transacciones" onClick={() => navigate('/admin/transacciones')} />
            <NavItem icon={FileText} label="Reportes" onClick={() => navigate('/admin/reportes')} />
            <NavItem icon={Settings} label="Configuración" onClick={() => navigate('/admin/configuracion')} />
          </div>
        </nav>
      </aside>

      {/* ── Main Area ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-8 bg-[#FAF8F4] shrink-0 border-b border-gray-100">
          <div className="relative hidden md:block">
            <svg className="w-4 h-4 text-[#6B7570] absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar..."
              className="bg-white border border-gray-200 rounded-full pl-10 pr-4 py-2 text-sm text-[#1A2420] w-80 focus:outline-none focus:border-[#154734] focus:ring-1 focus:ring-[#154734]"
            />
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#E4EFE7] flex items-center justify-center text-[#154734]">
                <User className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-[#1A2420] hidden lg:block">{user.nombre || 'Admin'}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" /> Salir
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto px-8 py-6 bg-[#FAF8F4]">

          {/* Encabezado + Controles */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Dashboard
              </h1>
              <p className="text-sm text-[#6B7570] mt-0.5">Vista general de operación — Sanbus FET</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#6B7570] font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {rangoLabel}
              </div>
              <div className="relative">
                <select 
                  value={periodoCode}
                  onChange={(e) => {
                    setPeriodoCode(e.target.value);
                    setPeriodoLabel(e.target.options[e.target.selectedIndex].text);
                  }}
                  className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm text-[#6B7570] font-medium cursor-pointer hover:border-[#154734] transition-colors focus:outline-none"
                >
                  <option value="7d">Últimos 7 días</option>
                  <option value="30d">Últimos 30 días</option>
                  <option value="este_mes">Este mes</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#6B7570] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <button 
                onClick={() => navigate('/admin/reportes')}
                className="bg-[#154734] hover:bg-[#1F6E4A] text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                Exportar
              </button>
            </div>
          </div>

          {/* ── KPIs ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {kpis.map((kpi, idx) => (
              <div
                key={kpi.id}
                className={`bg-white rounded-2xl border border-gray-100 flex flex-col overflow-hidden ${
                  idx === 0 ? 'ring-1 ring-[#154734]/10' : ''
                }`}
                style={{ padding: idx === 0 ? '20px' : '16px' }}
              >
                <p className="text-xs font-semibold text-[#6B7570] uppercase tracking-wide">{kpi.label}</p>
                <div className="flex items-end justify-between mt-2 gap-2">
                  <p
                    className={`font-bold text-[#1A2420] leading-none ${idx === 0 ? 'text-3xl' : 'text-2xl'}`}
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    {kpi.valor}
                  </p>
                  <Sparkline
                    data={kpi.sparkline}
                    color={kpi.sparkColor}
                    height={idx === 0 ? 36 : 28}
                    width={idx === 0 ? 90 : 72}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  {kpi.periodoAnterior !== null && kpi.periodoAnterior !== undefined ? (
                    <span className="text-xs text-[#6B7570]">
                      Período anterior: <strong className="text-[#1A2420]">{kpi.periodoAnterior}</strong>
                    </span>
                  ) : (
                    <span className="text-xs text-[#6B7570] flex items-center gap-1">
                      <Minus className="w-3 h-3" /> Sin datos previos
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ── Gráficas ───────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

            {/* Evolución de Recaudo */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 flex flex-col min-h-[280px]">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-base font-bold text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    Evolución de Recaudo
                  </h3>
                  <p className="text-xs text-[#6B7570] mt-0.5">{periodoLabel}</p>
                </div>
                <button className="text-sm font-medium text-[#154734] hover:underline">Ver reporte</button>
              </div>
              {hayActividad ? (
                <LineChart data={reportes.lineaDatos} />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-[#6B7570]">
                  <BarChart2 className="w-8 h-8 opacity-20" />
                  <p className="text-sm">Sin actividad registrada en este período</p>
                  <p className="text-xs opacity-60">Selecciona un rango más amplio de fechas</p>
                </div>
              )}
            </div>

            {/* Días de mayor actividad */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 flex flex-col min-h-[280px]">
              <h3 className="text-base font-bold text-[#1A2420] mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Días de mayor actividad
              </h3>
              <p className="text-xs text-[#6B7570] mb-4">Esta semana</p>
              <div className="flex-1 flex items-end justify-between gap-2">
                {reportes.barrasSemana.map((h, i) => (
                  <div key={i} className="flex flex-col items-center w-full gap-1.5">
                    <div className="w-full bg-[#F5F5F5] rounded-t relative" style={{ height: 100 }}>
                      <div
                        className={`absolute bottom-0 w-full rounded-t transition-all ${i === 3 ? 'bg-[#154734]' : 'bg-[#E4EFE7]'}`}
                        style={{ height: `${h}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[#6B7570] font-medium">{DIAS_SEMANA[i]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Panel de Alertas ───────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Alertas y Excepciones
                </h3>
                <p className="text-xs text-[#6B7570] mt-0.5">Requieren atención del administrador</p>
              </div>
              <span className="text-xs font-semibold bg-[#FEE9E0] text-[#E15A2E] px-2.5 py-1 rounded-full">
                {reportes.alertas.length} activas
              </span>
            </div>

            <div className="divide-y divide-gray-50">
              {reportes.alertas.length === 0 ? (
                <div className="py-10 text-center text-sm text-[#6B7570]">
                  No hay reportes ni incidentes pendientes por atender en este momento.
                </div>
              ) : (
                reportes.alertas.map((alerta) => {
                  const esCritica = alerta.severidad === 'critica';
                  const IconoAlerta = typeof alerta.icono === 'function' ? alerta.icono : (esCritica ? AlertCircle : AlertTriangle);
                  return (
                    <div key={alerta.id} className="flex items-start gap-4 px-6 py-4 hover:bg-[#FAF8F4] transition-colors">
                      <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                        esCritica ? 'bg-red-50' : 'bg-[#FEE9E0]'
                      }`}>
                        <IconoAlerta className={`w-4 h-4 ${esCritica ? 'text-red-500' : 'text-[#E15A2E]'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#1A2420]">{alerta.titulo}</p>
                        <p className="text-xs text-[#6B7570] mt-0.5 leading-relaxed">{alerta.descripcion}</p>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/admin/incidentes/${alerta.id}/atender`, {
                              method: 'PUT',
                              headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (res.ok) {
                              setReportes(prev => ({
                                ...prev,
                                alertas: prev.alertas.filter(a => a.id !== alerta.id)
                              }));
                            }
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-[#154734] hover:text-[#1F6E4A] bg-[#E4EFE7] hover:bg-[#D0E8D7] px-3 py-1.5 rounded-lg transition-colors mt-0.5"
                      >
                        {alerta.accion || 'Marcar atendido'} <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </main>
      </div>

      {/* ── Modal de Acción (funcionalidad intacta) ──────────────── */}
      {modalConfig && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-[#1A2420] mb-1">
              {modalConfig.tipo === 'recargar' ? 'Recargar Saldo' : 'Quitar Saldo'}
            </h3>
            <p className="text-[#6B7570] text-sm mb-6">
              Estudiante: <strong className="text-[#1A2420]">{modalConfig.estudiante.nombre}</strong>
            </p>
            <form onSubmit={handleProcesarAccion}>
              <div className="mb-6 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[#6B7570]">$</span>
                <input
                  type="number"
                  required
                  min="1000"
                  step="1000"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 text-base font-bold text-[#1A2420] border border-gray-200 rounded-xl focus:outline-none focus:border-[#154734] focus:ring-1 focus:ring-[#154734] bg-gray-50"
                  placeholder="Monto"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setModalConfig(null); setMonto(''); }}
                  className="flex-1 py-2.5 bg-gray-100 text-[#1A2420] hover:bg-gray-200 font-medium rounded-xl transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingAccion}
                  className={`flex-1 py-2.5 text-white font-medium rounded-xl transition-colors disabled:opacity-70 text-sm ${
                    modalConfig.tipo === 'recargar' ? 'bg-[#154734] hover:bg-[#1F6E4A]' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── NavItem ────────────────────────────────────────────────────────────────

function NavItem({ icon: Icon, label, active = false, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
        active
          ? 'bg-[#E4EFE7] text-[#154734]'
          : 'text-[#6B7570] hover:bg-gray-50 hover:text-[#1A2420]'
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {label}
    </button>
  );
}
