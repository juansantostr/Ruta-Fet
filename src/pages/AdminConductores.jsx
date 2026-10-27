import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, User, Bus, LayoutDashboard, FileText, Settings,
  CreditCard, MapPin, LogOut, Bell, ChevronDown, ChevronUp,
  Plus, X, Check, ArrowUpDown, AlertCircle, Activity,
  ShieldCheck, ChevronLeft, ChevronRight
} from 'lucide-react';
import { TARIFA_VIAJE, RUTAS_DISPONIBLES } from '../data/conductoresMock';

// ─── Constantes ───────────────────────────────────────────────────────────────
const HORA_ACTUAL_MIN = 19 * 60 + 13; // 19:13 — hora simulada del sistema
const MESES_ES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

const ESTADO_CONFIG = {
  en_ruta:    { dot: 'bg-[#154734]',  text: 'En ruta',    color: 'text-[#154734]'  },
  disponible: { dot: 'bg-gray-400',   text: 'Disponible', color: 'text-[#6B7570]'  },
  inactivo:   { dot: 'bg-red-400',    text: 'Inactivo',   color: 'text-red-500'    },
};

const ETAPA_CONFIG = {
  abordando: { label: 'Abordando', color: '#E15A2E', bg: '#FEE9E0' },
  en_camino: { label: 'En camino', color: '#1F6E4A', bg: '#E4EFE7' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatPeso = (v) => '$' + (parseFloat(v) || 0).toLocaleString('es-CO');

const formatFecha = (s) => {
  if (!s) return '—';
  const d = new Date(s);
  return `${d.getDate()} ${MESES_ES[d.getMonth()]} ${d.getFullYear()}`;
};

const getInitials = (nombre) => {
  const p = nombre.trim().split(' ');
  return (p[0][0] + (p[1]?.[0] || '')).toUpperCase();
};

const tiempoTranscurrido = (horaInicioRaw) => {
  if (!horaInicioRaw) return '-';
  const start = new Date(horaInicioRaw);
  const now = new Date();
  const diffMin = Math.floor((now - start) / 60000);
  if (diffMin < 0) return '-';
  if (diffMin < 60) return `${diffMin} min`;
  return `${Math.floor(diffMin / 60)}h ${diffMin % 60}min`;
};

const validarForm = (f, esNuevo) => {
  const e = {};
  if (!f.nombre.trim())    e.nombre    = 'Requerido';
  if (!f.documento.trim()) e.documento = 'Requerido';
  else if (!/^\d{7,12}$/.test(f.documento.trim())) e.documento = 'Ingresa entre 7 y 12 dígitos';
  if (!f.correo.trim())    e.correo    = 'Requerido';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.correo)) e.correo = 'Correo inválido';
  if (!f.telefono.trim())  e.telefono  = 'Requerido';
  else if (!/^\d{7,10}$/.test(f.telefono.trim())) e.telefono = 'Teléfono inválido (7–10 dígitos)';
  if (esNuevo) {
    if (!f.password.trim())     e.password = 'Requerido';
    else if (f.password.length < 8) e.password = 'Mínimo 8 caracteres';
  }
  return e;
};

// ─── BarChart de pasajeros por día ────────────────────────────────────────────
function BarChart({ data }) {
  const max = Math.max(...data, 1);
  const BASE = new Date('2026-09-15');

  return (
    <div>
      <div className="flex items-end gap-[3px]" style={{ height: 72 }}>
        {data.map((val, i) => (
          <div key={i} className="flex-1 relative rounded-t-sm overflow-hidden bg-[#E4EFE7]" style={{ height: 72 }}>
            <div
              className="absolute bottom-0 left-0 right-0 bg-[#1F6E4A] rounded-t-sm"
              style={{ height: `${Math.round((val / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-[3px] mt-1">
        {data.map((_, i) => {
          const d = new Date(BASE);
          d.setDate(BASE.getDate() - (data.length - 1 - i));
          return (
            <div key={i} className="flex-1 text-center">
              {i % 2 === 0 && (
                <span className="text-[9px] text-[#6B7570]">{d.getDate()}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Encabezado de columna ordenable ─────────────────────────────────────────
function ColHeader({ label, colKey, sortCol, sortDir, onSort, className = '' }) {
  const activo = sortCol === colKey;
  return (
    <th
      onClick={() => onSort(colKey)}
      className={`text-[11px] font-bold text-[#6B7570] uppercase tracking-wider pb-3 border-b border-gray-100 cursor-pointer select-none whitespace-nowrap ${className}`}
    >
      <span className="flex items-center gap-1">
        {label}
        <span className={activo ? 'text-[#154734]' : 'text-gray-300'}>
          {activo && sortDir === 'asc'  ? <ChevronUp className="w-3 h-3" />   :
           activo && sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> :
                                          <ArrowUpDown className="w-3 h-3" /> }
        </span>
      </span>
    </th>
  );
}

// ─── NavItem ──────────────────────────────────────────────────────────────────
function NavItem({ icon: Icon, label, active = false, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
        active ? 'bg-[#E4EFE7] text-[#154734]' : 'text-[#6B7570] hover:bg-gray-50 hover:text-[#1A2420]'
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {label}
    </button>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ navigate }) {
  return (
    <aside className="w-64 bg-white border-r border-gray-100 hidden md:flex flex-col h-screen shrink-0">
      <div className="h-24 flex items-center justify-center px-4 border-b border-gray-100">
        <img src="/logo-page-sinfondo.png" alt="Sanbus Logo" className="h-16 w-auto max-w-full object-contain" />
      </div>
      <nav className="flex-1 px-4 py-5 overflow-y-auto space-y-5">
        <div>
          <p className="text-[10px] font-bold tracking-widest text-[#6B7570] uppercase px-3 mb-2">General</p>
          <NavItem icon={LayoutDashboard} label="Dashboard" onClick={() => navigate('/admin')} />
        </div>
        <div>
          <div className="h-px bg-gray-100 mb-3" />
          <p className="text-[10px] font-bold tracking-widest text-[#6B7570] uppercase px-3 mb-2">Operación</p>
          <NavItem icon={Users}   label="Estudiantes"    onClick={() => navigate('/admin/estudiantes')} />
          <NavItem icon={User}    label="Conductores"    active onClick={() => {}} />
          <NavItem icon={MapPin}  label="Rutas y Horarios" onClick={() => navigate('/admin/rutas')} />
          <NavItem icon={Bus}     label="Viajes"         onClick={() => navigate('/admin/viajes')} />
        </div>
        <div>
          <div className="h-px bg-gray-100 mb-3" />
          <p className="text-[10px] font-bold tracking-widest text-[#6B7570] uppercase px-3 mb-2">Finanzas y Sistema</p>
          <NavItem icon={CreditCard} label="Transacciones" onClick={() => navigate('/admin/transacciones')} />
          <NavItem icon={FileText}   label="Reportes"      onClick={() => navigate('/admin/reportes')} />
          <NavItem icon={Settings}   label="Configuración" onClick={() => navigate('/admin/configuracion')} />
        </div>
      </nav>
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login'); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

// ─── Campo de formulario con error ────────────────────────────────────────────
function FormField({ label, error, required, children }) {
  return (
    <div>
      <label className="text-xs font-semibold text-[#6B7570] uppercase tracking-wide block mb-1.5">
        {label} {required && <span className="text-[#E15A2E]">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AdminConductores() {
  const navigate  = useNavigate();
  const token     = localStorage.getItem('token');
  const userLocal = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!token || userLocal.rol !== 'ADMIN') navigate('/login');
  }, [navigate, token, userLocal.rol]);

  // ── Tabla ──────────────────────────────────────────────────────────────────
  const [sortCol, setSortCol]   = useState('nombre');
  const [sortDir, setSortDir]   = useState('asc');
  const [pagina, setPagina]     = useState(1);
  const porPagina               = 10;

  // ── Reasignación de ruta en línea ──────────────────────────────────────────
  const [rutasOverride, setRutasOverride] = useState({});

  // ── Panel de detalle ───────────────────────────────────────────────────────
  const [conductorDetalle, setConductorDetalle] = useState(null);

  // ── Modal nuevo / editar ───────────────────────────────────────────────────
  const [modalConfig, setModalConfig] = useState(null); // { modo: 'nuevo'|'editar', conductor? }
  const [form, setForm]               = useState({ nombre:'', documento:'', correo:'', telefono:'', ruta:'', password:'' });
  const [erroresForm, setErroresForm] = useState({});
  const [loadingForm, setLoadingForm] = useState(false);

  const [conductores, setConductores] = useState([]);

  useEffect(() => {
    const fetchConductores = async () => {
      try {
        const res = await fetch('/api/admin/conductores', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setConductores(data);
        }
      } catch (error) {
        console.error('Error fetching conductores:', error);
      }
    };
    fetchConductores();
  }, [token]);

  // ── Datos derivados ────────────────────────────────────────────────────────

  /** Conductores con ruta actualizada si fue cambiada inline */
  const conductoresConRuta = useMemo(() =>
    conductores.map(c => ({
      ...c,
      rutaAsignada: rutasOverride[c.id] !== undefined ? (rutasOverride[c.id] || null) : c.rutaAsignada,
    })),
  [rutasOverride, conductores]);

  const conductoresEnRuta = useMemo(() =>
    conductoresConRuta.filter(c => c.estado === 'en_ruta'),
  [conductoresConRuta]);

  const conductoresOrdenados = useMemo(() => {
    return [...conductoresConRuta].sort((a, b) => {
      let va, vb;
      switch (sortCol) {
        case 'documento':           va = a.documento;           vb = b.documento;           break;
        case 'nombre':              va = a.nombre;              vb = b.nombre;              break;
        case 'estado':              va = a.estado;              vb = b.estado;              break;
        case 'viajesMes':           va = a.viajesMes;           vb = b.viajesMes;           break;
        case 'validacionesTotales': va = a.validacionesTotales; vb = b.validacionesTotales; break;
        default:                    va = a.nombre;              vb = b.nombre;
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
  }, [conductoresConRuta, sortCol, sortDir]);

  const totalPaginas       = Math.max(1, Math.ceil(conductoresOrdenados.length / porPagina));
  const conductoresPagina  = conductoresOrdenados.slice((pagina - 1) * porPagina, pagina * porPagina);

  /** KPIs: calculados sobre todos los conductores, no sobre la página */
  const kpis = useMemo(() => {
    const activos          = conductoresConRuta.filter(c => c.estado !== 'inactivo').length;
    const rutasEnOp        = new Set(conductoresEnRuta.map(c => c.rutaAsignada).filter(Boolean)).size;
    const validacionesHoy  = conductoresConRuta.reduce((s, c) => s + (c.pasajerosPorDia[13] || 0), 0);
    const sinRuta          = conductoresConRuta.filter(c => !c.rutaAsignada && c.estado !== 'inactivo').length;
    return { activos, rutasEnOp, validacionesHoy, sinRuta };
  }, [conductoresConRuta, conductoresEnRuta]);

  /** Métricas del conductor en el panel de detalle */
  const metricas = useMemo(() => {
    const h = conductorDetalle?.historialViajes ?? [];
    if (h.length === 0) return { avg: '—', totalRecaudo: 0 };
    const avg         = (h.reduce((s, v) => s + v.pasajeros, 0) / h.length).toFixed(1);
    const totalRecaudo = h.reduce((s, v) => s + v.recaudo, 0);
    return { avg, totalRecaudo };
  }, [conductorDetalle]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const handleReasignarInline = (conductorId, nuevaRuta, e) => {
    e?.stopPropagation();
    setRutasOverride(prev => ({ ...prev, [conductorId]: nuevaRuta }));
    // TODO: PATCH /api/admin/conductores/:conductorId { rutaAsignada: nuevaRuta }
  };

  const abrirModalNuevo = () => {
    setForm({ nombre: '', documento: '', correo: '', telefono: '', ruta: '', password: '', placa: '' });
    setErroresForm({});
    setModalConfig({ modo: 'nuevo' });
  };

  const abrirModalEditar = (conductor, e) => {
    e?.stopPropagation();
    setForm({
      nombre:    conductor.nombre,
      documento: conductor.documento,
      correo:    conductor.correo,
      telefono:  conductor.telefono,
      ruta:      conductor.rutaAsignada || '',
      password:  '',
      placa:     conductor.placa || ''
    });
    setErroresForm({});
    setModalConfig({ modo: 'editar', conductor });
  };

  const handleCampoForm = (campo, valor) => {
    setForm(prev => ({ ...prev, [campo]: valor }));
    if (erroresForm[campo]) setErroresForm(prev => { const e = {...prev}; delete e[campo]; return e; });
  };

  const handleSubmitForm = async (ev) => {
    ev.preventDefault();
    const errs = validarForm(form, modalConfig.modo === 'nuevo');
    if (Object.keys(errs).length > 0) { setErroresForm(errs); return; }
    
    setLoadingForm(true);
    
    try {
      if (modalConfig.modo === 'editar') {
        const res = await fetch(`/api/admin/conductores/${modalConfig.conductor.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            nombre: form.nombre,
            documento: form.documento,
            correo: form.correo,
            telefono: form.telefono,
            ruta: form.ruta,
            placa: form.placa
          })
        });

        if (!res.ok) {
          throw new Error('Error al actualizar datos');
        }

        // Actualizar el estado local para reflejar el cambio de inmediato
        setConductores(prev => prev.map(c => 
          c.id === modalConfig.conductor.id 
            ? { ...c, nombre: form.nombre, documento: form.documento, correo: form.correo, telefono: form.telefono, rutaAsignada: form.ruta, placa: form.placa }
            : c
        ));

        alert('Datos actualizados correctamente.');
      } else {
        const res = await fetch('/api/admin/conductores', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            nombre: form.nombre,
            documento: form.documento,
            correo: form.correo,
            telefono: form.telefono,
            ruta: form.ruta,
            password: form.password,
            placa: form.placa
          })
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Error al crear conductor');
        }
        
        const nuevoConductor = await res.json();

        // Actualizar lista local con los datos iniciales
        setConductores(prev => [...prev, {
            id: nuevoConductor.id,
            nombre: form.nombre,
            documento: form.documento,
            correo: form.correo,
            telefono: form.telefono,
            rutaAsignada: form.ruta || null,
            placa: form.placa,
            estado: 'disponible',
            viajesMes: 0,
            validacionesTotales: 0,
            pasajerosPorDia: [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            historialViajes: []
        }]);

        alert('Conductor creado. Datos de acceso enviados por correo.');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setModalConfig(null);
      setLoadingForm(false);
    }
  };

  // Ruta actual del conductor en el panel de detalle (considera overrides)
  const rutaActualDetalle = conductorDetalle
    ? (rutasOverride[conductorDetalle.id] !== undefined
        ? rutasOverride[conductorDetalle.id]
        : conductorDetalle.rutaAsignada)
    : null;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-[#FAF8F4] overflow-hidden" style={{ fontFamily: 'Manrope, sans-serif' }}>
      <Sidebar navigate={navigate} />

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-8 bg-[#FAF8F4] shrink-0 border-b border-gray-100">
          <div className="relative hidden md:block">
            <svg className="w-4 h-4 text-[#6B7570] absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input placeholder="Buscar..." className="bg-white border border-gray-200 rounded-full pl-10 pr-4 py-2 text-sm text-[#1A2420] w-72 focus:outline-none focus:border-[#154734] focus:ring-1 focus:ring-[#154734]" />
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#E4EFE7] flex items-center justify-center text-[#154734]">
                <User className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-[#1A2420] hidden lg:block">{userLocal.nombre || 'Admin'}</span>
            </div>
          </div>
        </header>

        {/* Contenido */}
        <main className="flex-1 overflow-y-auto px-8 py-6">

          {/* ── 1. Encabezado ────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Conductores
              </h1>
              <p className="text-sm text-[#6B7570] mt-0.5">
                {conductores.length} conductores registrados · {kpis.activos} activos
              </p>
            </div>
            <button
              onClick={abrirModalNuevo}
              className="flex items-center gap-1.5 bg-[#154734] hover:bg-[#1F6E4A] text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" /> Nuevo conductor
            </button>
          </div>

          {/* ── 2. KPIs compactos ────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
              <p className="text-[11px] font-semibold text-[#6B7570] uppercase tracking-wide">Conductores activos</p>
              <p className="text-2xl font-bold text-[#1A2420] mt-0.5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {kpis.activos}
              </p>
              <p className="text-[11px] text-[#6B7570]">{conductores.length - kpis.activos} inactivo{conductores.length - kpis.activos !== 1 ? 's' : ''}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
              <p className="text-[11px] font-semibold text-[#6B7570] uppercase tracking-wide">Rutas en operación</p>
              <p className="text-2xl font-bold text-[#1A2420] mt-0.5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {kpis.rutasEnOp}
              </p>
              <p className="text-[11px] text-[#6B7570]">{conductoresEnRuta.length} conductor{conductoresEnRuta.length !== 1 ? 'es' : ''} en ruta</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
              <p className="text-[11px] font-semibold text-[#6B7570] uppercase tracking-wide">Validaciones hoy</p>
              <p className="text-2xl font-bold text-[#1A2420] mt-0.5" style={{ fontFamily: 'Space Grotesk, sans-serif', fontVariantNumeric: 'tabular-nums' }}>
                {kpis.validacionesHoy}
              </p>
              <p className="text-[11px] text-[#6B7570]">abordajes procesados</p>
            </div>
            {kpis.sinRuta > 0 ? (
              <div className="bg-[#FEE9E0] rounded-xl border border-orange-100 px-4 py-3">
                <p className="text-[11px] font-semibold text-[#E15A2E] uppercase tracking-wide">Sin ruta asignada</p>
                <p className="text-2xl font-bold text-[#E15A2E] mt-0.5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {kpis.sinRuta}
                </p>
                <p className="text-[11px] text-[#E15A2E]/70">requiere asignación</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
                <p className="text-[11px] font-semibold text-[#6B7570] uppercase tracking-wide">Sin ruta asignada</p>
                <p className="text-2xl font-bold text-[#1A2420] mt-0.5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  0
                </p>
                <p className="text-[11px] text-[#6B7570]">todos asignados</p>
              </div>
            )}
          </div>

          {/* ── 3. Vista en Vivo ─────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              {/* Indicador de pulso "en vivo" */}
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#154734] opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#154734]" />
              </span>
              <h3 className="text-base font-bold text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                En ruta ahora
              </h3>
              <span className="text-xs font-semibold bg-[#E4EFE7] text-[#154734] px-2.5 py-0.5 rounded-full">
                {conductoresEnRuta.length} activos
              </span>
              <span className="text-xs text-[#6B7570] ml-auto">19:13</span>
            </div>

            {conductoresEnRuta.length === 0 ? (
              <div className="py-10 text-center text-sm text-[#6B7570]">
                No hay conductores en ruta en este momento.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                  <thead>
                    <tr>
                      {['Conductor', 'Ruta', 'Etapa', 'Pasajeros', 'Inicio', 'Transcurrido', 'Aviso'].map(h => (
                        <th key={h} className="text-[11px] font-bold text-[#6B7570] uppercase tracking-wider pb-3 pt-4 px-6 border-b border-gray-50 whitespace-nowrap first:pl-6 last:pr-6">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {conductoresEnRuta.map((c, idx) => {
                      const etapa = ETAPA_CONFIG[c.viajeActivo?.etapa] || { label: c.viajeActivo?.etapa || 'N/A', color: '#6B7570', bg: '#F3F4F6' };
                      return (
                        <tr
                          key={c.id}
                          className={`cursor-pointer hover:bg-[#FAF8F4] transition-colors ${idx !== conductoresEnRuta.length - 1 ? 'border-b border-gray-50' : ''}`}
                          onClick={() => setConductorDetalle(c)}
                        >
                          <td className="py-3.5 pl-6 pr-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-[#E4EFE7] flex items-center justify-center shrink-0">
                                <span className="text-[10px] font-bold text-[#154734]">{getInitials(c.nombre)}</span>
                              </div>
                              <span className="text-sm font-semibold text-[#1A2420]">{c.nombre}</span>
                            </div>
                          </td>
                          <td className="py-3.5 pr-4">
                            <span className="text-sm text-[#1A2420]">{c.rutaAsignada}</span>
                          </td>
                          <td className="py-3.5 pr-4">
                            <span
                              className="text-xs font-semibold px-2.5 py-1 rounded-full"
                              style={{ background: etapa.bg, color: etapa.color }}
                            >
                              {etapa.label}
                            </span>
                          </td>
                          <td className="py-3.5 pr-4">
                            <span
                              className="text-xl font-bold text-[#1A2420]"
                              style={{ fontFamily: 'Space Grotesk, sans-serif', fontVariantNumeric: 'tabular-nums' }}
                            >
                              {c.viajeActivo.pasajerosABordo}
                            </span>
                          </td>
                          <td className="py-3.5 pr-4">
                            <span className="text-sm text-[#6B7570]">{c.viajeActivo.horaInicio}</span>
                          </td>
                          <td className="py-3.5 pr-4">
                            <span className="text-sm text-[#1A2420]">{tiempoTranscurrido(c.viajeActivo.horaInicio)}</span>
                          </td>
                          <td className="py-3.5 pr-6">
                            {c.viajeActivo.aviso ? (
                              <span className="text-xs font-semibold bg-[#FEE9E0] text-[#E15A2E] px-2 py-0.5 rounded-full">
                                {c.viajeActivo.aviso}
                              </span>
                            ) : (
                              <span className="text-sm text-[#6B7570]">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── 4. Tabla de todos los conductores ────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Todos los conductores
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[860px]">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr>
                    <ColHeader label="Documento"   colKey="documento"           sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="pl-6 pr-4" />
                    <ColHeader label="Nombre"       colKey="nombre"              sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="pr-4" />
                    <th className="text-[11px] font-bold text-[#6B7570] uppercase tracking-wider pb-3 border-b border-gray-100 pr-4">Correo</th>
                    <th className="text-[11px] font-bold text-[#6B7570] uppercase tracking-wider pb-3 border-b border-gray-100 pr-4">Ruta asignada</th>
                    <ColHeader label="Estado"       colKey="estado"              sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="pr-4" />
                    <ColHeader label="Viajes/mes"   colKey="viajesMes"           sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="text-center pr-4" />
                    <ColHeader label="Validaciones" colKey="validacionesTotales" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="text-center pr-4" />
                    <th className="text-[11px] font-bold text-[#6B7570] uppercase tracking-wider pb-3 border-b border-gray-100 text-center pr-6">Detalles</th>
                  </tr>
                </thead>
                <tbody>
                  {conductoresPagina.map((c, idx) => {
                    const estado = ESTADO_CONFIG[c.estado];
                    const rutaMostrada = rutasOverride[c.id] !== undefined ? rutasOverride[c.id] : c.rutaAsignada;
                    return (
                      <tr
                        key={c.id}
                        className={`cursor-pointer hover:bg-[#FAF8F4] transition-colors ${idx !== conductoresPagina.length - 1 ? 'border-b border-gray-50' : ''}`}
                        onClick={() => setConductorDetalle(c)}
                      >
                        {/* Documento */}
                        <td className="py-3.5 pl-6 pr-4">
                          <span className="text-sm text-[#6B7570] font-mono">{c.documento}</span>
                        </td>
                        {/* Nombre con avatar */}
                        <td className="py-3.5 pr-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#E4EFE7] flex items-center justify-center shrink-0">
                              <span className="text-[11px] font-bold text-[#154734]">{getInitials(c.nombre)}</span>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-[#1A2420] leading-tight">{c.nombre}</p>
                              {!c.activo && <span className="text-[10px] text-[#6B7570] bg-gray-100 px-1.5 py-0.5 rounded">Inactivo</span>}
                            </div>
                          </div>
                        </td>
                        {/* Correo */}
                        <td className="py-3.5 pr-4">
                          <span className="text-sm text-[#6B7570]">{c.correo}</span>
                        </td>
                        {/* Ruta — dropdown inline */}
                        <td className="py-3.5 pr-4" onClick={e => e.stopPropagation()}>
                          <div className="relative">
                            <select
                              value={rutaMostrada || ''}
                              onChange={e => handleReasignarInline(c.id, e.target.value || null, e)}
                              className="appearance-none bg-transparent text-sm text-[#1A2420] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#154734] rounded px-1 pr-5 -ml-1 border-0"
                            >
                              <option value="">Sin asignar</option>
                              {RUTAS_DISPONIBLES.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <ChevronDown className="w-3 h-3 text-[#6B7570] absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                          {!rutaMostrada && (
                            <p className="text-[10px] text-[#E15A2E] mt-0.5 flex items-center gap-0.5">
                              <AlertCircle className="w-3 h-3" /> Sin asignar
                            </p>
                          )}
                        </td>
                        {/* Estado */}
                        <td className="py-3.5 pr-4">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${estado.dot}`} />
                            <span className={`text-sm ${estado.color}`}>{estado.text}</span>
                          </div>
                        </td>
                        {/* Viajes/mes */}
                        <td className="py-3.5 pr-4 text-center">
                          <span className="text-sm text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            {c.viajesMes}
                          </span>
                        </td>
                        {/* Validaciones */}
                        <td className="py-3.5 pr-4 text-center">
                          <span className="text-sm text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif', fontVariantNumeric: 'tabular-nums' }}>
                            {c.validacionesTotales}
                          </span>
                        </td>
                        {/* Detalles */}
                        <td className="py-3.5 pr-6 text-center" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setConductorDetalle(c)}
                            className="text-xs font-semibold text-[#154734] hover:text-[#1F6E4A] transition-colors"
                          >
                            Ver detalle &gt;
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <span className="text-sm text-[#6B7570]">
                Mostrando <strong className="text-[#1A2420]">
                  {Math.min((pagina - 1) * porPagina + 1, conductoresOrdenados.length)}–{Math.min(pagina * porPagina, conductoresOrdenados.length)}
                </strong> de <strong className="text-[#1A2420]">{conductoresOrdenados.length}</strong>
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={pagina === 1}
                  onClick={() => setPagina(p => p - 1)}
                  className="p-1.5 rounded-lg border border-gray-200 text-[#6B7570] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPaginas }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setPagina(i + 1)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      pagina === i + 1 ? 'bg-[#154734] text-white' : 'border border-gray-200 text-[#1A2420] hover:bg-gray-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  disabled={pagina === totalPaginas}
                  onClick={() => setPagina(p => p + 1)}
                  className="p-1.5 rounded-lg border border-gray-200 text-[#6B7570] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ── Backdrop del panel de detalle ────────────────────────────── */}
      {conductorDetalle && (
        <div className="fixed inset-0 bg-black/20 z-30" onClick={() => setConductorDetalle(null)} />
      )}

      {/* ── 5. Panel de detalle lateral ───────────────────────────────── */}
      <div className={`fixed top-0 right-0 h-full w-[460px] max-w-full bg-white z-40 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
        conductorDetalle ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {conductorDetalle && (
          <>
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#E4EFE7] flex items-center justify-center shrink-0">
                    <span className="text-base font-bold text-[#154734]">{getInitials(conductorDetalle.nombre)}</span>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {conductorDetalle.nombre}
                    </h2>
                    <p className="text-xs text-[#6B7570] mt-0.5">CC {conductorDetalle.documento}</p>
                  </div>
                </div>
                <button onClick={() => setConductorDetalle(null)} className="text-[#6B7570] hover:text-[#1A2420]">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <p className="text-[#6B7570]"><strong className="text-[#1A2420]">Correo:</strong> {conductorDetalle.correo}</p>
                <p className="text-[#6B7570]"><strong className="text-[#1A2420]">Tel:</strong> {conductorDetalle.telefono}</p>
                <p className="text-[#6B7570]"><strong className="text-[#1A2420]">Ruta:</strong> {rutaActualDetalle || <span className="text-[#E15A2E]">Sin asignar</span>}</p>
                <p className="text-[#6B7570]"><strong className="text-[#1A2420]">Placa:</strong> {conductorDetalle.placa || <span className="text-[#E15A2E]">Sin asignar</span>}</p>
                <p className="text-[#6B7570]">
                  <strong className="text-[#1A2420]">Estado: </strong>
                  <span className={ESTADO_CONFIG[conductorDetalle.estado].color}>{ESTADO_CONFIG[conductorDetalle.estado].text}</span>
                </p>
              </div>
            </div>

            {/* Métricas */}
            <div className="px-6 py-4 grid grid-cols-2 gap-3">
              <div className="bg-[#FAF8F4] rounded-xl p-3">
                <p className="text-[10px] font-semibold text-[#6B7570] uppercase tracking-wide mb-0.5">Prom. pasajeros</p>
                <p className="text-xl font-bold text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {metricas.avg}
                </p>
                <p className="text-[10px] text-[#6B7570]">por viaje</p>
              </div>
              <div className="bg-[#FAF8F4] rounded-xl p-3">
                <p className="text-[10px] font-semibold text-[#6B7570] uppercase tracking-wide mb-0.5">Recaudo total</p>
                <p className="text-base font-bold text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {formatPeso(metricas.totalRecaudo)}
                </p>
                <p className="text-[10px] text-[#6B7570]">este mes</p>
              </div>
            </div>

            {/* Gráfica de pasajeros por día */}
            <div className="px-6 mb-4">
              <p className="text-xs font-bold text-[#1A2420] uppercase tracking-wide mb-3">
                Pasajeros por día — últimos 14 días
              </p>
              <BarChart data={conductorDetalle.pasajerosPorDia} />
            </div>

            {/* Historial de viajes */}
            <div className="flex-1 overflow-y-auto px-6">
              <p className="text-xs font-bold text-[#1A2420] uppercase tracking-wide mb-3">
                Historial de viajes (últimos 30 días)
              </p>
              {conductorDetalle.historialViajes.length === 0 ? (
                <p className="text-sm text-[#6B7570] text-center py-6">Sin viajes registrados en este período.</p>
              ) : (
                <div className="space-y-0">
                  {/* Encabezado */}
                  <div className="grid grid-cols-4 text-[10px] font-bold text-[#6B7570] uppercase tracking-wide pb-2 border-b border-gray-100">
                    <span>Fecha</span>
                    <span className="text-center">Pasajeros</span>
                    <span className="text-center">Duración</span>
                    <span className="text-right">Recaudo</span>
                  </div>
                  {conductorDetalle.historialViajes.map((v) => (
                    <div key={v.id} className="grid grid-cols-4 py-2.5 border-b border-gray-50 last:border-0 items-center">
                      <span className="text-xs text-[#6B7570]">{formatFecha(v.fecha)}</span>
                      <span className="text-xs font-bold text-[#1A2420] text-center" style={{ fontFamily: 'Space Grotesk, sans-serif', fontVariantNumeric: 'tabular-nums' }}>
                        {v.pasajeros}
                      </span>
                      <span className="text-xs text-[#6B7570] text-center">{v.duracion}</span>
                      <span className="text-xs font-semibold text-[#154734] text-right" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        {formatPeso(v.recaudo)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Acciones del panel */}
            <div className="px-6 py-4 border-t border-gray-100 grid grid-cols-2 gap-2">
              <button
                onClick={e => { abrirModalEditar(conductorDetalle, e); setConductorDetalle(null); }}
                className="flex items-center justify-center gap-1 bg-[#154734] hover:bg-[#1F6E4A] text-white text-xs font-semibold py-2.5 rounded-xl transition-colors"
              >
                Editar datos
              </button>
              <button className="flex items-center justify-center gap-1 text-red-500 bg-red-50 hover:bg-red-100 text-xs font-semibold py-2.5 rounded-xl transition-colors">
                Desactivar
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── 6. Modal Nuevo / Editar conductor ─────────────────────────── */}
      {modalConfig && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            {/* Header del modal */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {modalConfig.modo === 'nuevo' ? 'Nuevo conductor' : 'Editar conductor'}
              </h3>
              <button onClick={() => setModalConfig(null)} className="text-[#6B7570] hover:text-[#1A2420]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="px-6 py-5 space-y-4">
              {/* Nombre */}
              <FormField label="Nombre completo" error={erroresForm.nombre} required>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={e => handleCampoForm('nombre', e.target.value)}
                  placeholder="Ej: Hernán Darío Cardona Ríos"
                  className={`w-full px-4 py-2.5 text-sm text-[#1A2420] border rounded-xl bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#154734] ${erroresForm.nombre ? 'border-red-400' : 'border-gray-200 focus:border-[#154734]'}`}
                />
              </FormField>

              {/* Documento y teléfono en columnas */}
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Documento (CC)" error={erroresForm.documento} required>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.documento}
                    onChange={e => handleCampoForm('documento', e.target.value)}
                    placeholder="1005123456"
                    className={`w-full px-4 py-2.5 text-sm text-[#1A2420] border rounded-xl bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#154734] ${erroresForm.documento ? 'border-red-400' : 'border-gray-200 focus:border-[#154734]'}`}
                  />
                </FormField>
                <FormField label="Teléfono" error={erroresForm.telefono} required>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.telefono}
                    onChange={e => handleCampoForm('telefono', e.target.value)}
                    placeholder="3145678901"
                    className={`w-full px-4 py-2.5 text-sm text-[#1A2420] border rounded-xl bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#154734] ${erroresForm.telefono ? 'border-red-400' : 'border-gray-200 focus:border-[#154734]'}`}
                  />
                </FormField>
              </div>

              {/* Correo y Placa en columnas */}
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Correo electrónico" error={erroresForm.correo} required>
                  <input
                    type="email"
                    value={form.correo}
                    onChange={e => handleCampoForm('correo', e.target.value)}
                    placeholder="conductor@sanbus.edu.co"
                    className={`w-full px-4 py-2.5 text-sm text-[#1A2420] border rounded-xl bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#154734] ${erroresForm.correo ? 'border-red-400' : 'border-gray-200 focus:border-[#154734]'}`}
                  />
                </FormField>
                <FormField label="Placa (Vehículo)" error={erroresForm.placa}>
                  <input
                    type="text"
                    value={form.placa}
                    onChange={e => handleCampoForm('placa', e.target.value.toUpperCase())}
                    placeholder="Ej: ABC-123"
                    className={`w-full px-4 py-2.5 text-sm text-[#1A2420] border rounded-xl bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#154734] ${erroresForm.placa ? 'border-red-400' : 'border-gray-200 focus:border-[#154734]'}`}
                  />
                </FormField>
              </div>

              {/* Ruta */}
              <FormField label="Ruta asignada" error={erroresForm.ruta}>
                <div className="relative">
                  <select
                    value={form.ruta}
                    onChange={e => handleCampoForm('ruta', e.target.value)}
                    className="w-full appearance-none px-4 pr-10 py-2.5 text-sm text-[#1A2420] border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-[#154734] focus:ring-1 focus:ring-[#154734] cursor-pointer"
                  >
                    <option value="">Sin asignar por ahora</option>
                    {RUTAS_DISPONIBLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#6B7570] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </FormField>

              {/* Contraseña temporal — solo en modo nuevo */}
              {modalConfig.modo === 'nuevo' && (
                <FormField label="Contraseña temporal" error={erroresForm.password} required>
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => handleCampoForm('password', e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className={`w-full px-4 py-2.5 text-sm text-[#1A2420] border rounded-xl bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#154734] ${erroresForm.password ? 'border-red-400' : 'border-gray-200 focus:border-[#154734]'}`}
                  />
                  <p className="text-[10px] text-[#6B7570] mt-1">El conductor deberá cambiarla al primer inicio de sesión.</p>
                </FormField>
              )}

              {/* Botones */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setModalConfig(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-[#1A2420] hover:bg-gray-200 font-medium rounded-xl text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingForm}
                  className="flex-1 py-2.5 bg-[#154734] hover:bg-[#1F6E4A] text-white font-medium rounded-xl text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loadingForm
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Check className="w-4 h-4" />}
                  {loadingForm
                    ? 'Guardando...'
                    : modalConfig.modo === 'nuevo' ? 'Crear conductor' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
