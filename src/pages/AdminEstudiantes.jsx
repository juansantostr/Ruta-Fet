import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, User, Bus, LayoutDashboard, FileText, Settings,
  CreditCard, MapPin, LogOut, Bell, ChevronDown, ChevronUp,
  Search, X, Plus, Minus, ArrowRight, Download, ChevronLeft,
  ChevronRight, AlertCircle, Check, UserX, ArrowUpDown
} from 'lucide-react';
import { ESTUDIANTES_MOCK, TARIFA_VIAJE, SALDO_BAJO_UMBRAL, RUTAS } from '../data/estudiantesMock';

// ─── Constantes ───────────────────────────────────────────────────────────────
const POR_PAGINA_OPCIONES = [10, 20, 50];
const MESES_ES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const HOY = new Date('2026-09-15');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatPeso(val) {
  const n = parseFloat(val) || 0;
  return '$' + n.toLocaleString('es-CO');
}

function fechaRelativa(fechaStr) {
  if (!fechaStr) return 'Nunca';
  const diff = Math.floor((HOY - new Date(fechaStr)) / 86400000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  if (diff < 7) return `Hace ${diff} días`;
  if (diff < 30) return `Hace ${Math.floor(diff / 7)} sem.`;
  return `Hace ${Math.floor(diff / 30)} mes(es)`;
}

function formatFecha(fechaStr) {
  if (!fechaStr) return '—';
  const d = new Date(fechaStr);
  return `${d.getDate()} ${MESES_ES[d.getMonth()]} ${d.getFullYear()}`;
}

function getInitials(nombre) {
  const p = nombre.trim().split(' ');
  return (p[0][0] + (p[1]?.[0] || '')).toUpperCase();
}

function viajesDisponibles(saldo) {
  return Math.floor(saldo / TARIFA_VIAJE);
}

function estadoSaldo(saldo) {
  if (saldo === 0) return 'sin';
  if (saldo < SALDO_BAJO_UMBRAL) return 'bajo';
  return 'ok';
}

function agruparPorFecha(txs) {
  const grupos = {};
  txs.forEach(tx => {
    if (!grupos[tx.fecha]) grupos[tx.fecha] = [];
    grupos[tx.fecha].push(tx);
  });
  return Object.entries(grupos).sort(([a], [b]) => new Date(b) - new Date(a));
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
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };
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
          <NavItem icon={Users} label="Estudiantes" active onClick={() => {}} />
          <NavItem icon={User} label="Conductores" onClick={() => navigate('/admin/conductores')} />
          <NavItem icon={MapPin} label="Rutas y Horarios" onClick={() => navigate('/admin/rutas')} />
          <NavItem icon={Bus} label="Viajes" onClick={() => navigate('/admin/viajes')} />
        </div>
        <div>
          <div className="h-px bg-gray-100 mb-3" />
          <p className="text-[10px] font-bold tracking-widest text-[#6B7570] uppercase px-3 mb-2">Finanzas y Sistema</p>
          <NavItem icon={CreditCard} label="Transacciones" onClick={() => navigate('/admin/transacciones')} />
          <NavItem icon={FileText} label="Reportes" onClick={() => navigate('/admin/reportes')} />
          <NavItem icon={Settings} label="Configuración" onClick={() => navigate('/admin/configuracion')} />
        </div>
      </nav>
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

// ─── Encabezado de columna ordenable ─────────────────────────────────────────
function ColHeader({ label, colKey, sortCol, sortDir, onSort, className = '' }) {
  const activo = sortCol === colKey;
  const isRight = className.includes('text-right');
  const isCenter = className.includes('text-center');
  const justifyClass = isRight ? 'justify-end' : isCenter ? 'justify-center' : 'justify-start';

  return (
    <th
      className={`text-[11px] font-bold text-[#6B7570] uppercase tracking-wider pb-3 border-b border-gray-100 cursor-pointer select-none whitespace-nowrap ${className}`}
      onClick={() => onSort(colKey)}
    >
      <span className={`flex items-center gap-1 ${justifyClass}`}>
        {label}
        <span className={`transition-colors ${activo ? 'text-[#154734]' : 'text-gray-300'}`}>
          {activo && sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : activo && sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ArrowUpDown className="w-3 h-3" />}
        </span>
      </span>
    </th>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AdminEstudiantes() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [estudiantes, setEstudiantes] = useState([]);

  // Auth guard and initial fetch
  useEffect(() => {
    window.scrollTo(0, 0);
    if (!token || user.rol !== 'ADMIN') {
      navigate('/login');
      return;
    }

    const fetchEstudiantes = async () => {
      try {
        const res = await fetch('/api/admin/estudiantes', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          // parse numbers properly
          setEstudiantes(data.map(e => ({ ...e, saldoActual: parseFloat(e.saldoActual) })));
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchEstudiantes();
  }, [navigate, token, user.rol]);

  // ── Filtros y búsqueda ──────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [filtroSaldo, setFiltroSaldo] = useState('todos');
  const [filtroRuta, setFiltroRuta] = useState('todas');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  // ── Ordenamiento ───────────────────────────────────────────────────────────
  const [sortCol, setSortCol] = useState('nombre');
  const [sortDir, setSortDir] = useState('asc');

  // ── Paginación ─────────────────────────────────────────────────────────────
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(20);

  // ── Selección múltiple ──────────────────────────────────────────────────────
  const [seleccionados, setSeleccionados] = useState(new Set());

  // ── Panel de detalle ───────────────────────────────────────────────────────
  const [estudianteDetalle, setEstudianteDetalle] = useState(null);

  // ── Modal de recarga/ajuste ────────────────────────────────────────────────
  const [modalConfig, setModalConfig] = useState(null); // { estudiante, tipo: 'recargar'|'descontar' }
  const [montoModal, setMontoModal] = useState('');
  const [notaModal, setNotaModal] = useState('');
  const [loadingModal, setLoadingModal] = useState(false);

  // ── Modal de Edición ────────────────────────────────────────────────────────
  const [editData, setEditData] = useState(null); // { id, nombre, documento, correo, rutaFavorita, programa }
  const [loadingEdit, setLoadingEdit] = useState(false);

  // ── KPIs (sobre el total, no filtrado) ─────────────────────────────────────
  const kpis = useMemo(() => {
    const total = estudiantes.length;
    const activos = estudiantes.filter(e => e.viajesMes > 0).length;
    const saldoTotal = estudiantes.reduce((acc, e) => acc + e.saldoActual, 0);
    // Hardcoded threshold to avoid missing import
    const conSaldoBajo = estudiantes.filter(e => e.saldoActual < 10000).length;
    return { total, activos, saldoTotal, conSaldoBajo };
  }, [estudiantes]);

  // ── Datos filtrados y ordenados ─────────────────────────────────────────────
  const estudiantesVisibles = useMemo(() => {
    let resultado = [...estudiantes];

    // Búsqueda
    if (search.trim()) {
      const q = search.toLowerCase();
      resultado = resultado.filter(e =>
        e.nombre.toLowerCase().includes(q) ||
        e.documento.includes(q) ||
        e.correo.toLowerCase().includes(q)
      );
    }

    // Filtro saldo
    if (filtroSaldo === 'bajo') resultado = resultado.filter(e => e.saldoActual > 0 && e.saldoActual < 10000);
    if (filtroSaldo === 'sin') resultado = resultado.filter(e => e.saldoActual === 0);

    // Filtro ruta
    if (filtroRuta !== 'todas') resultado = resultado.filter(e => (e.rutaFavorita || 'Ninguna') === filtroRuta);

    // Filtro estado
    if (filtroEstado === 'activos') resultado = resultado.filter(e => e.viajesMes > 0);
    if (filtroEstado === 'inactivos') resultado = resultado.filter(e => e.viajesMes === 0);

    // Ordenamiento
    resultado.sort((a, b) => {
      let va, vb;
      switch (sortCol) {
        case 'documento': va = a.documento; vb = b.documento; break;
        case 'nombre':    va = a.nombre; vb = b.nombre; break;
        case 'saldo':     va = a.saldoActual; vb = b.saldoActual; break;
        case 'viajes':    va = a.viajesMes; vb = b.viajesMes; break;
        case 'estado':    va = a.viajesMes > 0 ? 1 : 0; vb = b.viajesMes > 0 ? 1 : 0; break;
        default:          va = a.nombre; vb = b.nombre;
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return resultado;
  }, [estudiantes, search, filtroSaldo, filtroRuta, filtroEstado, sortCol, sortDir]);

  // Paginación
  const totalFiltrado = estudiantesVisibles.length;
  const totalPaginas = Math.max(1, Math.ceil(totalFiltrado / porPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const estudiantesPagina = estudiantesVisibles.slice(
    (paginaActual - 1) * porPagina,
    paginaActual * porPagina
  );

  // Resetear página al filtrar
  useEffect(() => { setPagina(1); }, [search, filtroSaldo, filtroRuta, filtroEstado, porPagina]);

  // ── Handlers de ordenamiento ───────────────────────────────────────────────
  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  // ── Handlers de selección ──────────────────────────────────────────────────
  const todosEnPaginaSeleccionados =
    estudiantesPagina.length > 0 &&
    estudiantesPagina.every(e => seleccionados.has(e.id));

  const algunoEnPaginaSeleccionado =
    estudiantesPagina.some(e => seleccionados.has(e.id));

  const toggleTodosEnPagina = () => {
    const nuevo = new Set(seleccionados);
    if (todosEnPaginaSeleccionados) {
      estudiantesPagina.forEach(e => nuevo.delete(e.id));
    } else {
      estudiantesPagina.forEach(e => nuevo.add(e.id));
    }
    setSeleccionados(nuevo);
  };

  const toggleSeleccion = (id) => {
    const nuevo = new Set(seleccionados);
    nuevo.has(id) ? nuevo.delete(id) : nuevo.add(id);
    setSeleccionados(nuevo);
  };

  // ── Handlers modal ─────────────────────────────────────────────────────────
  const abrirModal = (estudiante, tipo, e) => {
    e?.stopPropagation();
    setModalConfig({ estudiante, tipo });
    setMontoModal('');
    setNotaModal('');
  };

  const handleConfirmarModal = async (ev) => {
    ev.preventDefault();
    setLoadingModal(true);
    
    const endpoint = modalConfig.tipo === 'recargar' ? '/api/admin/recargar' : '/api/admin/descontar';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          estudianteId: modalConfig.estudiante.id,
          monto: parseFloat(montoModal)
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setEstudiantes(prev => prev.map(e => e.id === modalConfig.estudiante.id ? { ...e, saldoActual: data.nuevoSaldo } : e));
        alert(`${modalConfig.tipo === 'recargar' ? 'Recarga' : 'Ajuste'} de ${formatPeso(montoModal)} exitosa.`);
        setModalConfig(null);
      } else {
        alert(data.error || 'Error al procesar la solicitud');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    } finally {
      setLoadingModal(false);
    }
  };

  const handleGuardarEdicion = async (ev) => {
    ev.preventDefault();
    setLoadingEdit(true);
    
    try {
      const res = await fetch(`/api/admin/estudiantes/${editData.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(editData)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setEstudiantes(prev => prev.map(e => e.id === editData.id ? { ...e, ...editData } : e));
        alert('Datos del estudiante actualizados correctamente.');
        setEditData(null);
      } else {
        alert(data.error || 'Error al actualizar el estudiante');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al guardar los datos');
    } finally {
      setLoadingEdit(false);
    }
  };

  const [createData, setCreateData] = useState(null); // { nombre, documento, correo, password, confirmPassword }
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [pwdError, setPwdError] = useState(false);
  const [correoError, setCorreoError] = useState(false);
  const [docError, setDocError] = useState(false);

  const handleCrearEstudiante = async (ev) => {
    ev.preventDefault();
    let hasError = false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(createData.correo)) {
      setCorreoError(true);
      hasError = true;
    }

    const docRegex = /^\d+$/;
    if (!docRegex.test(createData.documento)) {
      setDocError(true);
      hasError = true;
    }
    
    if (createData.password !== createData.confirmPassword) {
      setPwdError(true);
      hasError = true;
    }

    if (hasError) return;

    setLoadingCreate(true);
    
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: createData.nombre,
          documento: createData.documento,
          correo: createData.correo,
          telefono: createData.telefono,
          password: createData.password,
          rutaFavorita: createData.rutaFavorita
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        alert('Estudiante creado exitosamente.');
        setCreateData(null);
        // Recargar la lista de estudiantes
        const reloadRes = await fetch('/api/admin/estudiantes', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (reloadRes.ok) {
          const reloadData = await reloadRes.json();
          setEstudiantes(reloadData.map(e => ({ ...e, saldoActual: parseFloat(e.saldoActual) })));
        }
      } else {
        alert(data.error || 'Error al crear el estudiante');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al crear estudiante');
    } finally {
      setLoadingCreate(false);
    }
  };

  const montoNum = parseFloat(montoModal) || 0;
  const saldoResultante = modalConfig
    ? (modalConfig.tipo === 'recargar'
        ? modalConfig.estudiante.saldoActual + montoNum
        : modalConfig.estudiante.saldoActual - montoNum)
    : 0;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-[#FAF8F4] overflow-hidden" style={{ fontFamily: 'Manrope, sans-serif' }}>
      <Sidebar navigate={navigate} />

      {/* Main */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-8 bg-[#FAF8F4] shrink-0 border-b border-gray-100">
          <div className="relative hidden md:block">
            <Search className="w-4 h-4 text-[#6B7570] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar..."
              className="bg-white border border-gray-200 rounded-full pl-10 pr-4 py-2 text-sm text-[#1A2420] w-72 focus:outline-none focus:border-[#154734] focus:ring-1 focus:ring-[#154734]"
            />
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#E4EFE7] flex items-center justify-center text-[#154734]">
                <User className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-[#1A2420] hidden lg:block">{user.nombre || 'Admin'}</span>
            </div>
          </div>
        </header>

        {/* Contenido principal */}
        <main className="flex-1 overflow-y-auto px-8 py-6">

          {/* ── Encabezado ─────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Estudiantes
              </h1>
              <p className="text-sm text-[#6B7570] mt-0.5">
                {ESTUDIANTES_MOCK.length} estudiantes registrados en el sistema
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button className="flex items-center gap-1.5 border border-gray-200 bg-white text-[#1A2420] text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
                <Download className="w-4 h-4 text-[#6B7570]" /> Exportar
              </button>
              <button
                onClick={() => setCreateData({ nombre: '', documento: '', correo: '', telefono: '', password: '', confirmPassword: '' })}
                className="flex items-center gap-1.5 bg-[#154734] hover:bg-[#1F6E4A] text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" /> Nuevo estudiante
              </button>
            </div>
          </div>

          {/* ── KPIs compactos ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex flex-col gap-0.5">
              <p className="text-[11px] font-semibold text-[#6B7570] uppercase tracking-wide">Total registrados</p>
              <p className="text-2xl font-bold text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {kpis.total}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex flex-col gap-0.5">
              <p className="text-[11px] font-semibold text-[#6B7570] uppercase tracking-wide">Activos este mes</p>
              <p className="text-2xl font-bold text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {kpis.activos}
              </p>
              <p className="text-[11px] text-[#6B7570]">{kpis.total - kpis.activos} sin actividad</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex flex-col gap-0.5">
              <p className="text-[11px] font-semibold text-[#6B7570] uppercase tracking-wide">Saldo en circulación</p>
              <p className="text-2xl font-bold text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif', fontVariantNumeric: 'tabular-nums' }}>
                {formatPeso(kpis.saldoTotal)}
              </p>
            </div>
            <div className="bg-[#FEE9E0] rounded-xl border border-orange-100 px-4 py-3 flex flex-col gap-0.5">
              <p className="text-[11px] font-semibold text-[#E15A2E] uppercase tracking-wide">Saldo bajo</p>
              <p className="text-2xl font-bold text-[#E15A2E]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {kpis.conSaldoBajo}
              </p>
              <p className="text-[11px] text-[#E15A2E]/70">menos de 3 viajes disponibles</p>
            </div>
          </div>

          {/* ── Barra de filtros ───────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            {/* Búsqueda */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#6B7570] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre, documento o correo..."
                className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-10 py-2.5 text-sm text-[#1A2420] focus:outline-none focus:border-[#154734] focus:ring-1 focus:ring-[#154734]"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7570] hover:text-[#1A2420]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filtro saldo */}
            <div className="relative">
              <select
                value={filtroSaldo}
                onChange={e => setFiltroSaldo(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-xl px-4 pr-8 py-2.5 text-sm text-[#1A2420] focus:outline-none focus:border-[#154734] cursor-pointer"
              >
                <option value="todos">Todos los saldos</option>
                <option value="bajo">Saldo bajo</option>
                <option value="sin">Sin saldo</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#6B7570] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Filtro ruta */}
            <div className="relative">
              <select
                value={filtroRuta}
                onChange={e => setFiltroRuta(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-xl px-4 pr-8 py-2.5 text-sm text-[#1A2420] focus:outline-none focus:border-[#154734] cursor-pointer"
              >
                <option value="todas">Todas las rutas</option>
                <option value="Ruta Norte">Ruta Norte</option>
                <option value="Ruta Sur">Ruta Sur</option>
                <option value="Ruta Oriente">Ruta Oriente</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#6B7570] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Limpiar filtros */}
            {(search || filtroSaldo !== 'todos' || filtroRuta !== 'todas') && (
              <button
                onClick={() => { setSearch(''); setFiltroSaldo('todos'); setFiltroRuta('todas'); }}
                className="flex items-center gap-1.5 text-sm text-[#6B7570] hover:text-[#1A2420] px-3 py-2.5 border border-gray-200 bg-white rounded-xl transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Limpiar
              </button>
            )}
          </div>

          {/* ── Tabla ──────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {totalFiltrado === 0 ? (
              /* Estado vacío */
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-base font-semibold text-[#1A2420] mb-1">Sin resultados</p>
                <p className="text-sm text-[#6B7570] mb-5">
                  No hay estudiantes que coincidan con los filtros aplicados.
                </p>
                <button
                  onClick={() => { setSearch(''); setFiltroSaldo('todos'); setFiltroRuta('todas'); }}
                  className="text-sm font-medium text-[#154734] bg-[#E4EFE7] hover:bg-[#D0E8D7] px-4 py-2 rounded-xl transition-colors"
                >
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[900px]">
                  <thead className="sticky top-0 z-10 bg-white">
                    <tr>
                      {/* Checkbox select-all */}
                      <th className="pb-3 pl-6 pt-4 border-b border-gray-100 w-10">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 text-[#154734] cursor-pointer accent-[#154734]"
                          checked={todosEnPaginaSeleccionados}
                          ref={el => { if (el) el.indeterminate = !todosEnPaginaSeleccionados && algunoEnPaginaSeleccionado; }}
                          onChange={toggleTodosEnPagina}
                        />
                      </th>
                      <ColHeader label="Documento" colKey="documento" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="pl-6 pr-4" />
                      <ColHeader label="Nombre" colKey="nombre" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="pr-4" />
                      <th className="text-[11px] font-bold text-[#6B7570] uppercase tracking-wider pb-3 border-b border-gray-100 pr-4">Correo</th>
                      <th className="text-[11px] font-bold text-[#6B7570] uppercase tracking-wider pb-3 border-b border-gray-100 pr-4">Ruta</th>
                      <ColHeader label="Saldo" colKey="saldo" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="pl-6 pr-4" />
                      <ColHeader label="Viajes/mes" colKey="viajes" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="text-center pr-4" />
                      <ColHeader label="Estado" colKey="estado" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} className="pr-4" />
                      <th className="text-[11px] font-bold text-[#6B7570] uppercase tracking-wider pb-3 border-b border-gray-100 text-center pr-6">Detalles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estudiantesPagina.map((est, idx) => {
                      const estado = estadoSaldo(est.saldoActual);
                      const seleccionado = seleccionados.has(est.id);
                      const esActivo = est.viajesMes > 0;
                      return (
                        <tr
                          key={est.id}
                          className={`cursor-pointer transition-colors ${
                            seleccionado ? 'bg-[#E4EFE7]/40' : 'hover:bg-[#FAF8F4]'
                          } ${idx !== estudiantesPagina.length - 1 ? 'border-b border-gray-50' : ''}`}
                          onClick={() => setEstudianteDetalle(est)}
                        >
                          {/* Checkbox */}
                          <td className="pl-6 py-3.5" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-gray-300 cursor-pointer accent-[#154734]"
                              checked={seleccionado}
                              onChange={() => toggleSeleccion(est.id)}
                            />
                          </td>
                          {/* Documento */}
                          <td className="py-3.5 pl-6 pr-4">
                            <span className="text-sm text-[#6B7570] font-mono">{est.documento}</span>
                          </td>
                          {/* Nombre con avatar */}
                          <td className="py-3.5 pr-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-[#E4EFE7] flex items-center justify-center shrink-0">
                                <span className="text-[11px] font-bold text-[#154734]">
                                  {getInitials(est.nombre)}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-[#1A2420] leading-tight">{est.nombre}</p>
                              </div>
                            </div>
                          </td>
                          {/* Correo */}
                          <td className="py-3.5 pr-4">
                            <span className="text-sm text-[#6B7570]">{est.correo}</span>
                          </td>
                          {/* Ruta */}
                          <td className="py-3.5 pr-4">
                            <span className="text-sm text-[#1A2420]">{est.rutaFavorita || 'Ninguna'}</span>
                          </td>
                          {/* Saldo */}
                          <td className="py-3.5 pl-6 pr-4">
                            <div className="flex items-center gap-1.5">
                              {estado !== 'ok' && (
                                <AlertCircle className="w-3.5 h-3.5 text-[#E15A2E]" />
                              )}
                              <span
                                className="text-sm font-bold"
                                style={{
                                  fontFamily: 'Space Grotesk, sans-serif',
                                  fontVariantNumeric: 'tabular-nums',
                                  color: estado === 'ok' ? '#154734' : '#E15A2E',
                                }}
                              >
                                {formatPeso(est.saldoActual)}
                              </span>
                            </div>
                          </td>
                          {/* Viajes */}
                          <td className="py-3.5 pr-4 text-center">
                            <span className="text-sm text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                              {est.viajesMes}
                            </span>
                          </td>
                          {/* Estado */}
                          <td className="py-3.5 pr-4">
                            <span className="text-sm text-[#6B7570]">
                              {esActivo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          {/* Detalles */}
                          <td className="py-3.5 pr-6 text-center">
                            <button
                              onClick={() => setEstudianteDetalle(est)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-[#154734] hover:text-[#1F6E4A] hover:underline px-2 py-1 transition-all"
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
            )}

            {/* ── Paginación ──────────────────────────────────────────── */}
            {totalFiltrado > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[#6B7570]">
                    Mostrando <strong className="text-[#1A2420]">
                      {Math.min((paginaActual - 1) * porPagina + 1, totalFiltrado)}–{Math.min(paginaActual * porPagina, totalFiltrado)}
                    </strong> de <strong className="text-[#1A2420]">{totalFiltrado}</strong>
                  </span>
                  <div className="relative">
                    <select
                      value={porPagina}
                      onChange={e => setPorPagina(Number(e.target.value))}
                      className="appearance-none bg-white border border-gray-200 rounded-lg px-3 pr-7 py-1.5 text-sm text-[#1A2420] focus:outline-none"
                    >
                      {POR_PAGINA_OPCIONES.map(n => (
                        <option key={n} value={n}>{n} por página</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3 h-3 text-[#6B7570] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    disabled={paginaActual === 1}
                    onClick={() => setPagina(p => p - 1)}
                    className="p-1.5 rounded-lg border border-gray-200 text-[#6B7570] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(totalPaginas, 5) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => setPagina(page)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          page === paginaActual
                            ? 'bg-[#154734] text-white'
                            : 'border border-gray-200 text-[#1A2420] hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  {totalPaginas > 5 && <span className="text-[#6B7570] px-1">…</span>}
                  <button
                    disabled={paginaActual === totalPaginas}
                    onClick={() => setPagina(p => p + 1)}
                    className="p-1.5 rounded-lg border border-gray-200 text-[#6B7570] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── Barra de acciones masivas ─────────────────────────────────── */}
      {seleccionados.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-[#1A2420] text-white rounded-2xl px-5 py-3 flex items-center gap-4 shadow-xl">
            <span className="text-sm font-medium">
              {seleccionados.size} {seleccionados.size === 1 ? 'estudiante' : 'estudiantes'} seleccionado{seleccionados.size > 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 bg-[#154734] hover:bg-[#1F6E4A] text-white text-sm font-medium px-4 py-1.5 rounded-xl transition-colors">
                <Plus className="w-3.5 h-3.5" /> Recargar seleccionados
              </button>
              <button className="flex items-center gap-1.5 border border-white/20 hover:bg-white/10 text-white text-sm font-medium px-4 py-1.5 rounded-xl transition-colors">
                <Download className="w-3.5 h-3.5" /> Exportar
              </button>
              <button
                onClick={() => setSeleccionados(new Set())}
                className="text-white/50 hover:text-white transition-colors ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Backdrop del panel de detalle ────────────────────────────── */}
      {estudianteDetalle && (
        <div
          className="fixed inset-0 bg-black/20 z-30"
          onClick={() => setEstudianteDetalle(null)}
        />
      )}

      {/* ── Panel de detalle lateral ──────────────────────────────────── */}
      <div
        className={`fixed top-0 right-0 h-full w-[440px] max-w-full bg-white z-40 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
          estudianteDetalle ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {estudianteDetalle && (
          <>
            {/* Header del panel */}
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#E4EFE7] flex items-center justify-center shrink-0">
                    <span className="text-base font-bold text-[#154734]">
                      {getInitials(estudianteDetalle.nombre)}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#1A2420] leading-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {estudianteDetalle.nombre}
                    </h2>
                    <p className="text-xs text-[#6B7570] mt-0.5">Estudiante FET</p>
                  </div>
                </div>
                <button
                  onClick={() => setEstudianteDetalle(null)}
                  className="text-[#6B7570] hover:text-[#1A2420] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-xs text-[#6B7570]">
                  <span className="font-semibold text-[#1A2420]">Documento:</span> {estudianteDetalle.documento}
                </p>
                <p className="text-xs text-[#6B7570]">
                  <span className="font-semibold text-[#1A2420]">Correo:</span> {estudianteDetalle.correo}
                </p>
                <p className="text-xs text-[#6B7570]">
                  <span className="font-semibold text-[#1A2420]">Teléfono:</span> {estudianteDetalle.telefono || 'No registrado'}
                </p>
                <p className="text-xs text-[#6B7570]">
                  <span className="font-semibold text-[#1A2420]">Ruta favorita:</span> {estudianteDetalle.rutaFavorita || 'Ninguna'}
                </p>
                <div className="mt-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    estudianteDetalle.viajesMes > 0 ? 'bg-[#E4EFE7] text-[#154734]' : 'bg-gray-100 text-[#6B7570]'
                  }`}>
                    {estudianteDetalle.viajesMes > 0 ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
            </div>

            {/* Saldo destacado */}
            <div className={`mx-6 my-4 rounded-xl p-4 ${
              estadoSaldo(estudianteDetalle.saldoActual) === 'ok'
                ? 'bg-[#E4EFE7]'
                : 'bg-[#FEE9E0]'
            }`}>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7570] mb-1">Saldo actual</p>
              <p
                className="text-3xl font-bold leading-none"
                style={{
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontVariantNumeric: 'tabular-nums',
                  color: estadoSaldo(estudianteDetalle.saldoActual) === 'ok' ? '#154734' : '#E15A2E',
                }}
              >
                {formatPeso(estudianteDetalle.saldoActual)}
              </p>
              <p className="text-xs mt-1.5" style={{ color: estadoSaldo(estudianteDetalle.saldoActual) === 'ok' ? '#1F6E4A' : '#E15A2E' }}>
                Equivale a <strong>{viajesDisponibles(estudianteDetalle.saldoActual)}</strong> {viajesDisponibles(estudianteDetalle.saldoActual) === 1 ? 'viaje disponible' : 'viajes disponibles'}
              </p>
            </div>

            {/* Estadísticas */}
            <div className="px-6 mb-4 grid grid-cols-3 gap-3">
              <div className="bg-[#FAF8F4] rounded-xl p-3">
                <p className="text-[10px] font-semibold text-[#6B7570] uppercase tracking-wide mb-0.5">Viajes/mes</p>
                <p className="text-lg font-bold text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {estudianteDetalle.viajesMes || 0}
                </p>
              </div>
              <div className="bg-[#FAF8F4] rounded-xl p-3">
                <p className="text-[10px] font-semibold text-[#6B7570] uppercase tracking-wide mb-0.5">Prom./semana</p>
                <p className="text-lg font-bold text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {((estudianteDetalle.viajesMes || 0) / 4.3).toFixed(1)}
                </p>
              </div>
              <div className="bg-[#FAF8F4] rounded-xl p-3">
                <p className="text-[10px] font-semibold text-[#6B7570] uppercase tracking-wide mb-0.5">Gasto mes</p>
                <p className="text-sm font-bold text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {formatPeso((estudianteDetalle.viajesMes || 0) * TARIFA_VIAJE)}
                </p>
              </div>
            </div>

            {/* Historial de movimientos */}
            <div className="flex-1 overflow-y-auto px-6">
              <h3 className="text-xs font-bold text-[#1A2420] uppercase tracking-wide mb-3">
                Últimos movimientos
              </h3>
              {(!estudianteDetalle.transacciones || estudianteDetalle.transacciones.length === 0) ? (
                <p className="text-sm text-[#6B7570] text-center py-6">Sin movimientos registrados</p>
              ) : (
                <div className="space-y-4">
                  {agruparPorFecha(estudianteDetalle.transacciones || []).map(([fecha, txs]) => (
                    <div key={fecha}>
                      <p className="text-[10px] font-bold text-[#6B7570] uppercase tracking-wide mb-1.5">
                        {formatFecha(fecha)}
                      </p>
                      <div className="space-y-1">
                        {txs.map(tx => (
                          <div key={tx.id} className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#1A2420] leading-tight">
                                {tx.tipo === 'recarga' ? 'Recarga' : `Abordaje – ${tx.ruta}`}
                              </p>
                              {tx.nota && (
                                <p className="text-xs text-[#6B7570] mt-0.5 truncate">{tx.nota}</p>
                              )}
                            </div>
                            <span
                              className="text-sm font-bold ml-3 shrink-0"
                              style={{
                                fontFamily: 'Space Grotesk, sans-serif',
                                color: tx.tipo === 'recarga' ? '#154734' : '#1A2420',
                              }}
                            >
                              {tx.tipo === 'recarga' ? '+' : '−'}{formatPeso(tx.monto)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Acciones del panel */}
            <div className="px-6 py-4 border-t border-gray-100 grid grid-cols-2 gap-2">
              <button
                onClick={e => { abrirModal(estudianteDetalle, 'recargar', e); setEstudianteDetalle(null); }}
                className="flex items-center justify-center gap-1.5 bg-[#154734] hover:bg-[#1F6E4A] text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" /> Recargar saldo
              </button>
              <button
                onClick={e => { abrirModal(estudianteDetalle, 'descontar', e); setEstudianteDetalle(null); }}
                className="flex items-center justify-center gap-1.5 border border-gray-200 bg-white text-[#1A2420] hover:bg-gray-50 text-sm font-medium py-2.5 rounded-xl transition-colors"
              >
                <Minus className="w-4 h-4" /> Ajustar saldo
              </button>
              <button
                onClick={e => { e.stopPropagation(); setEditData({ ...estudianteDetalle }); setEstudianteDetalle(null); }}
                className="flex items-center justify-center gap-1.5 border border-gray-200 bg-white text-[#1A2420] hover:bg-gray-50 text-sm font-medium py-2.5 rounded-xl transition-colors"
              >
                Editar datos
              </button>
              <button className="flex items-center justify-center gap-1.5 text-red-500 bg-red-50 hover:bg-red-100 text-sm font-medium py-2.5 rounded-xl transition-colors">
                <UserX className="w-4 h-4" /> Desactivar
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Modal de Recarga / Ajuste ─────────────────────────────────── */}
      {modalConfig && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            {/* Header modal */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {modalConfig.tipo === 'recargar' ? 'Recargar saldo' : 'Ajustar saldo'}
                </h3>
                <button onClick={() => setModalConfig(null)} className="text-[#6B7570] hover:text-[#1A2420]">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-[#6B7570] mt-1">
                Estudiante: <strong className="text-[#1A2420]">{modalConfig.estudiante.nombre}</strong>
              </p>
              <p className="text-sm text-[#6B7570]">
                Saldo actual: <strong className="text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {formatPeso(modalConfig.estudiante.saldoActual)}
                </strong>
              </p>
            </div>

            <form onSubmit={handleConfirmarModal} className="px-6 py-5 space-y-4">
              {/* Montos rápidos (solo para recargar) */}
              {modalConfig.tipo === 'recargar' && (
                <div>
                  <label className="text-xs font-semibold text-[#6B7570] uppercase tracking-wide block mb-2">
                    Montos rápidos
                  </label>
                  <div className="flex gap-2">
                    {[10000, 20000, 50000].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMontoModal(String(m))}
                        className={`flex-1 text-sm font-semibold py-2 rounded-xl border transition-colors ${
                          montoModal === String(m)
                            ? 'bg-[#154734] text-white border-[#154734]'
                            : 'bg-white text-[#1A2420] border-gray-200 hover:border-[#154734]'
                        }`}
                      >
                        ${(m / 1000).toFixed(0)}K
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Monto */}
              <div>
                <label className="text-xs font-semibold text-[#6B7570] uppercase tracking-wide block mb-1.5">
                  Monto
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[#6B7570] text-sm">$</span>
                  <input
                    type="number"
                    required
                    min="1000"
                    step="1000"
                    value={montoModal}
                    onChange={e => setMontoModal(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 text-base font-bold text-[#1A2420] border border-gray-200 rounded-xl focus:outline-none focus:border-[#154734] focus:ring-1 focus:ring-[#154734] bg-gray-50"
                    placeholder="0"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  />
                </div>
              </div>

              {/* Vista previa saldo resultante */}
              {montoNum > 0 && (
                <div className={`rounded-xl px-4 py-3 ${
                  saldoResultante >= 0 ? 'bg-[#E4EFE7]' : 'bg-red-50'
                }`}>
                  <p className="text-xs text-[#6B7570] mb-0.5">Saldo resultante</p>
                  <p
                    className="text-xl font-bold"
                    style={{
                      fontFamily: 'Space Grotesk, sans-serif',
                      color: saldoResultante >= 0 ? '#154734' : '#ef4444',
                    }}
                  >
                    {formatPeso(saldoResultante)}
                  </p>
                  {saldoResultante >= 0 && (
                    <p className="text-xs mt-0.5" style={{ color: '#1F6E4A' }}>
                      = {viajesDisponibles(saldoResultante)} viajes disponibles
                    </p>
                  )}
                  {saldoResultante < 0 && (
                    <p className="text-xs text-red-500 mt-0.5">El saldo no puede quedar negativo</p>
                  )}
                </div>
              )}

              {/* Nota / referencia (campo obligatorio para auditoría) */}
              <div>
                <label className="text-xs font-semibold text-[#6B7570] uppercase tracking-wide block mb-1.5">
                  Nota / referencia <span className="text-[#E15A2E]">*</span>
                </label>
                <textarea
                  required
                  value={notaModal}
                  onChange={e => setNotaModal(e.target.value)}
                  rows={2}
                  placeholder="Ej: Recarga efectivo ventanilla – recibo #1042"
                  className="w-full px-4 py-2.5 text-sm text-[#1A2420] border border-gray-200 rounded-xl focus:outline-none focus:border-[#154734] focus:ring-1 focus:ring-[#154734] bg-gray-50 resize-none"
                />
                <p className="text-[10px] text-[#6B7570] mt-1">Requerido para auditoría de Bienestar.</p>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setModalConfig(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-[#1A2420] hover:bg-gray-200 font-medium rounded-xl transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingModal || (modalConfig.tipo === 'descontar' && saldoResultante < 0)}
                  className={`flex-1 py-2.5 text-white font-medium rounded-xl transition-colors disabled:opacity-60 text-sm flex items-center justify-center gap-2 ${
                    modalConfig.tipo === 'recargar' ? 'bg-[#154734] hover:bg-[#1F6E4A]' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {loadingModal ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {loadingModal ? 'Procesando...' : (modalConfig.tipo === 'recargar' ? 'Confirmar recarga' : 'Confirmar ajuste')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── Modal de Edición de Datos ──────────────────────────────────── */}
      {editData && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header modal */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Editar Estudiante
                </h3>
                <button onClick={() => setEditData(null)} className="text-[#6B7570] hover:text-[#1A2420]">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto px-6 py-5">
              <form id="edit-form" onSubmit={handleGuardarEdicion} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[#6B7570] uppercase tracking-wide block mb-1.5">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={editData.nombre}
                    onChange={e => setEditData(prev => ({ ...prev, nombre: e.target.value }))}
                    className="w-full px-4 py-2.5 text-sm text-[#1A2420] border border-gray-200 rounded-xl focus:outline-none focus:border-[#154734] focus:ring-1 focus:ring-[#154734] bg-gray-50"
                  />
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-[#6B7570] uppercase tracking-wide block mb-1.5">
                    Documento de Identidad
                  </label>
                  <input
                    type="text"
                    required
                    value={editData.documento}
                    onChange={e => setEditData(prev => ({ ...prev, documento: e.target.value }))}
                    className="w-full px-4 py-2.5 text-sm text-[#1A2420] border border-gray-200 rounded-xl focus:outline-none focus:border-[#154734] focus:ring-1 focus:ring-[#154734] bg-gray-50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#6B7570] uppercase tracking-wide block mb-1.5">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    required
                    value={editData.correo}
                    onChange={e => setEditData(prev => ({ ...prev, correo: e.target.value }))}
                    className="w-full px-4 py-2.5 text-sm text-[#1A2420] border border-gray-200 rounded-xl focus:outline-none focus:border-[#154734] focus:ring-1 focus:ring-[#154734] bg-gray-50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#6B7570] uppercase tracking-wide block mb-1.5">
                    Ruta Favorita
                  </label>
                  <select
                    value={editData.rutaFavorita || ''}
                    onChange={e => setEditData(prev => ({ ...prev, rutaFavorita: e.target.value || null }))}
                    className="w-full px-4 py-2.5 text-sm text-[#1A2420] border border-gray-200 rounded-xl focus:outline-none focus:border-[#154734] focus:ring-1 focus:ring-[#154734] bg-gray-50"
                  >
                    <option value="">Ninguna</option>
                    <option value="Ruta Norte">Ruta Norte</option>
                    <option value="Ruta Sur">Ruta Sur</option>
                    <option value="Ruta Oriente">Ruta Oriente</option>
                  </select>
                </div>
              </form>
            </div>

            {/* Botones */}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setEditData(null)}
                className="flex-1 py-2.5 bg-gray-100 text-[#1A2420] hover:bg-gray-200 font-medium rounded-xl transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="edit-form"
                disabled={loadingEdit}
                className="flex-1 py-2.5 bg-[#154734] hover:bg-[#1F6E4A] text-white font-medium rounded-xl transition-colors disabled:opacity-60 text-sm flex items-center justify-center gap-2"
              >
                {loadingEdit ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {loadingEdit ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Modal de Nuevo Estudiante ──────────────────────────────────── */}
      {createData && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Nuevo Estudiante
                </h3>
                <button onClick={() => setCreateData(null)} className="text-[#6B7570] hover:text-[#1A2420]">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto px-6 py-5">
              <form id="create-form" noValidate onSubmit={handleCrearEstudiante} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[#6B7570] uppercase tracking-wide block mb-1.5">
                    Nombre Completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Juan Pérez"
                    value={createData.nombre}
                    onChange={e => setCreateData(prev => ({ ...prev, nombre: e.target.value }))}
                    className="w-full px-4 py-2.5 text-sm text-[#1A2420] border border-gray-200 rounded-xl focus:outline-none focus:border-[#154734] focus:ring-1 focus:ring-[#154734] bg-gray-50"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`text-xs font-semibold uppercase tracking-wide block mb-1.5 ${docError ? 'text-red-500' : 'text-[#6B7570]'}`}>
                      Documento (CC) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: 1001234567"
                      value={createData.documento}
                      onChange={e => {
                        setCreateData(prev => ({ ...prev, documento: e.target.value }));
                        if (docError) setDocError(false);
                      }}
                      className={`w-full px-4 py-2.5 text-sm text-[#1A2420] border rounded-xl focus:outline-none focus:ring-1 bg-gray-50 transition-colors ${
                        docError 
                          ? 'border-red-400 focus:border-red-500 focus:ring-red-500' 
                          : 'border-gray-200 focus:border-[#154734] focus:ring-[#154734]'
                      }`}
                    />
                    {docError && (
                      <p className="text-xs text-red-500 mt-1.5 font-medium">Solo números</p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#6B7570] uppercase tracking-wide block mb-1.5">
                      Teléfono
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 3001234567"
                      value={createData.telefono}
                      onChange={e => setCreateData(prev => ({ ...prev, telefono: e.target.value }))}
                      className="w-full px-4 py-2.5 text-sm text-[#1A2420] border border-gray-200 rounded-xl focus:outline-none focus:border-[#154734] focus:ring-1 focus:ring-[#154734] bg-gray-50"
                    />
                  </div>
                </div>

                <div>
                  <label className={`text-xs font-semibold uppercase tracking-wide block mb-1.5 ${correoError ? 'text-red-500' : 'text-[#6B7570]'}`}>
                    Correo Electrónico <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="Ej: juan.perez@fet.edu.co"
                    value={createData.correo}
                    onChange={e => {
                      setCreateData(prev => ({ ...prev, correo: e.target.value }));
                      if (correoError) setCorreoError(false);
                    }}
                    className={`w-full px-4 py-2.5 text-sm text-[#1A2420] border rounded-xl focus:outline-none focus:ring-1 bg-gray-50 transition-colors ${
                      correoError 
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-500' 
                        : 'border-gray-200 focus:border-[#154734] focus:ring-[#154734]'
                    }`}
                  />
                  {correoError && (
                    <p className="text-xs text-red-500 mt-1.5 font-medium">Ingresa un correo electrónico válido</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#6B7570] uppercase tracking-wide block mb-1.5">
                    Ruta Favorita
                  </label>
                  <select
                    value={createData.rutaFavorita || ''}
                    onChange={e => setCreateData(prev => ({ ...prev, rutaFavorita: e.target.value || null }))}
                    className="w-full px-4 py-2.5 text-sm text-[#1A2420] border border-gray-200 rounded-xl focus:outline-none focus:border-[#154734] focus:ring-1 focus:ring-[#154734] bg-gray-50"
                  >
                    <option value="">Ninguna</option>
                    <option value="Ruta Norte">Ruta Norte</option>
                    <option value="Ruta Sur">Ruta Sur</option>
                    <option value="Ruta Oriente">Ruta Oriente</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#6B7570] uppercase tracking-wide block mb-1.5">
                    Contraseña Inicial <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={createData.password}
                    onChange={e => {
                      setCreateData(prev => ({ ...prev, password: e.target.value }));
                      if (pwdError) setPwdError(false);
                    }}
                    className="w-full px-4 py-2.5 text-sm text-[#1A2420] border border-gray-200 rounded-xl focus:outline-none focus:border-[#154734] focus:ring-1 focus:ring-[#154734] bg-gray-50"
                  />
                </div>

                <div>
                  <label className={`text-xs font-semibold uppercase tracking-wide block mb-1.5 ${pwdError ? 'text-red-500' : 'text-[#6B7570]'}`}>
                    Confirmar Contraseña <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Repite la contraseña"
                    value={createData.confirmPassword}
                    onChange={e => {
                      setCreateData(prev => ({ ...prev, confirmPassword: e.target.value }));
                      if (pwdError) setPwdError(false);
                    }}
                    className={`w-full px-4 py-2.5 text-sm text-[#1A2420] border rounded-xl focus:outline-none focus:ring-1 bg-gray-50 transition-colors ${
                      pwdError 
                        ? 'border-red-400 focus:border-red-500 focus:ring-red-500' 
                        : 'border-gray-200 focus:border-[#154734] focus:ring-[#154734]'
                    }`}
                  />
                  {pwdError && (
                    <p className="text-xs text-red-500 mt-1.5 font-medium">Las contraseñas no coinciden</p>
                  )}
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setCreateData(null)}
                className="flex-1 py-2.5 bg-gray-100 text-[#1A2420] hover:bg-gray-200 font-medium rounded-xl transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="create-form"
                disabled={loadingCreate}
                className="flex-1 py-2.5 bg-[#154734] hover:bg-[#1F6E4A] text-white font-medium rounded-xl transition-colors disabled:opacity-60 text-sm flex items-center justify-center gap-2"
              >
                {loadingCreate ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {loadingCreate ? 'Registrando...' : 'Registrar Estudiante'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
