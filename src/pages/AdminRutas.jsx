import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Bus, LayoutDashboard, Users, User, FileText, Settings,
  CreditCard, LogOut, Bell, Plus, X, Edit2, Clock, Trash2, ArrowLeft,
  Save, AlertTriangle, ArrowRight, Smartphone, MoveLeft, MoveRight, ChevronDown
} from 'lucide-react';
import { RUTAS_MOCK, AVISOS_MOCK, NOMBRES_RUTAS } from '../data/rutasMock';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return `Hace ${Math.floor(interval)} años`;
  interval = seconds / 2592000;
  if (interval > 1) return `Hace ${Math.floor(interval)} meses`;
  interval = seconds / 86400;
  if (interval > 1) return `Hace ${Math.floor(interval)} días`;
  interval = seconds / 3600;
  if (interval > 1) return `Hace ${Math.floor(interval)} horas`;
  interval = seconds / 60;
  if (interval > 1) return `Hace ${Math.floor(interval)} minutos`;
  return `Hace unos segundos`;
};

// ─── NavItem & Sidebar ────────────────────────────────────────────────────────
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
          <NavItem icon={Users} label="Estudiantes" onClick={() => navigate('/admin/estudiantes')} />
          <NavItem icon={User} label="Conductores" onClick={() => navigate('/admin/conductores')} />
          <NavItem icon={MapPin} label="Rutas y Horarios" active onClick={() => {}} />
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
          onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login'); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function AdminRutas() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const userLocal = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!token || userLocal.rol !== 'ADMIN') navigate('/login');
  }, [navigate, token, userLocal.rol]);

  const [rutas, setRutas] = useState([]);
  const [avisos, setAvisos] = useState([]);

  useEffect(() => {
    fetch('/api/rutas/admin', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setRutas(data))
      .catch(console.error);
      
    fetch('/api/rutas/avisos', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setAvisos(data))
      .catch(console.error);
  }, [token]);

  const [editorRuta, setEditorRuta] = useState(null); // null o ruta object
  const [modalNuevaRuta, setModalNuevaRuta] = useState(false);
  const [nuevaRutaForm, setNuevaRutaForm] = useState({ nombre: '', origen: '', destino: '', paradasStr: '' });

  // ─── Estado del Formulario de Avisos ────────────────────────────────────────
  const [formAviso, setFormAviso] = useState({ id: null, rutaId: '', titulo: '', mensaje: '', activo: true });

  // ─── KPIs ───────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const activas = rutas.filter(r => r.estado === 'activa').length;
    const totalParadas = rutas.reduce((sum, r) => sum + r.horario.paradas.length, 0);
    const salidasAlDia = rutas.reduce((sum, r) => sum + r.horario.salidas.length, 0);
    const avisosVigentes = avisos.filter(a => a.activo).length;
    return { activas, totalParadas, salidasAlDia, avisosVigentes };
  }, [rutas, avisos]);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleAvisoSubmit = async (e) => {
    e.preventDefault();
    const rutaObj = rutas.find(r => r.id === Number(formAviso.rutaId));
    if (!rutaObj && formAviso.rutaId !== 'GENERAL' && formAviso.rutaId !== 'PERSONALIZADO') return alert('Selecciona una ruta válida');

    try {
      const res = await fetch('/api/rutas/admin/avisos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formAviso)
      });
      if (res.ok) {
        const data = await res.json();
        if (formAviso.id) {
          setAvisos(prev => prev.map(a => a.id === formAviso.id ? { ...formAviso, rutaId: rutaObj?.id || null, ruta: formAviso.titulo || rutaObj?.nombre || 'Aviso General', created_at: a.created_at } : a));
        } else {
          // Si es nuevo, pedimos de nuevo los avisos para tener el created_at de BD
          fetch('/api/rutas/avisos', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(res => res.json())
            .then(data => setAvisos(data));
        }
        setFormAviso({ id: null, rutaId: '', titulo: '', mensaje: '', activo: true });
        alert('Aviso guardado correctamente');
      } else {
        alert('Error al guardar el aviso');
      }
    } catch (err) {
      alert('Error de conexión');
    }
  };

  const handleEditarAviso = (aviso) => setFormAviso({ ...aviso });
  
  const handleEliminarAviso = async (id) => {
    if (window.confirm('¿Eliminar aviso?')) {
      try {
        const res = await fetch(`/api/rutas/admin/avisos/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          setAvisos(prev => prev.filter(a => a.id !== id));
        } else {
          alert('Error al eliminar');
        }
      } catch (e) {
        alert('Error de conexión');
      }
    }
  };

  const toggleEstadoRuta = (id) => {
    setRutas(prev => prev.map(r => r.id === id ? { ...r, estado: r.estado === 'activa' ? 'suspendida' : 'activa' } : r));
  };

  // ─── RENDER EDITOR DE HORARIOS ──────────────────────────────────────────────
  if (editorRuta) {
    return (
      <ScheduleEditor 
        rutaOriginal={editorRuta} 
        onBack={() => setEditorRuta(null)} 
        onSave={async (nuevaRuta) => {
          try {
            const res = await fetch(`/api/rutas/admin/${nuevaRuta.id}`, {
              method: 'PUT',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
              },
              body: JSON.stringify(nuevaRuta)
            });
            if (res.ok) {
              setRutas(prev => prev.map(r => r.id === nuevaRuta.id ? nuevaRuta : r));
              setEditorRuta(null);
            } else {
              alert('Error al guardar la ruta en el servidor');
            }
          } catch (error) {
            console.error(error);
            alert('Error de red al guardar la ruta');
          }
        }}
      />
    );
  }

  // ─── RENDER PRINCIPAL ───────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-[#FAF8F4] overflow-hidden" style={{ fontFamily: 'Manrope, sans-serif' }}>
      <Sidebar navigate={navigate} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-8 bg-[#FAF8F4] shrink-0 border-b border-gray-100">
          <div className="relative hidden md:block">
            <span className="text-sm font-semibold text-[#1A2420]">Gestión de Rutas y Horarios</span>
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

        <main className="flex-1 overflow-y-auto px-8 py-6">
          {/* Encabezado */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Rutas y Horarios
              </h1>
              <p className="text-sm text-[#6B7570] mt-0.5">
                Gestiona las rutas, paradas, horarios de salida y avisos del sistema.
              </p>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
              <p className="text-[11px] font-semibold text-[#6B7570] uppercase tracking-wide">Rutas Activas</p>
              <p className="text-2xl font-bold text-[#1A2420] mt-0.5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{kpis.activas}</p>
              <p className="text-[11px] text-[#6B7570]">de {rutas.length} totales</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
              <p className="text-[11px] font-semibold text-[#6B7570] uppercase tracking-wide">Paradas Registradas</p>
              <p className="text-2xl font-bold text-[#1A2420] mt-0.5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{kpis.totalParadas}</p>
              <p className="text-[11px] text-[#6B7570]">en todo el sistema</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
              <p className="text-[11px] font-semibold text-[#6B7570] uppercase tracking-wide">Salidas Programadas</p>
              <p className="text-2xl font-bold text-[#1A2420] mt-0.5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{kpis.salidasAlDia}</p>
              <p className="text-[11px] text-[#6B7570]">por día</p>
            </div>
            <div className={`rounded-xl border px-4 py-3 ${kpis.avisosVigentes > 0 ? 'bg-[#FEE9E0] border-orange-100' : 'bg-white border-gray-100'}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-wide ${kpis.avisosVigentes > 0 ? 'text-[#E15A2E]' : 'text-[#6B7570]'}`}>Avisos Vigentes</p>
              <p className={`text-2xl font-bold mt-0.5 ${kpis.avisosVigentes > 0 ? 'text-[#E15A2E]' : 'text-[#1A2420]'}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{kpis.avisosVigentes}</p>
              <p className={`text-[11px] ${kpis.avisosVigentes > 0 ? 'text-[#E15A2E]/70' : 'text-[#6B7570]'}`}>en la app estudiante</p>
            </div>
          </div>

          {/* Lista de Rutas */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Todas las Rutas</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[900px]">
                <thead className="bg-white">
                  <tr>
                    <th className="text-[11px] font-bold text-[#6B7570] uppercase tracking-wider pb-3 pt-4 px-6 border-b border-gray-50">Ruta</th>
                    <th className="text-[11px] font-bold text-[#6B7570] uppercase tracking-wider pb-3 pt-4 pr-6 border-b border-gray-50">Origen → Destino</th>
                    <th className="text-[11px] font-bold text-[#6B7570] uppercase tracking-wider pb-3 pt-4 pr-6 border-b border-gray-50 text-center">Paradas</th>
                    <th className="text-[11px] font-bold text-[#6B7570] uppercase tracking-wider pb-3 pt-4 pr-6 border-b border-gray-50 text-center">Salidas</th>
                    <th className="text-[11px] font-bold text-[#6B7570] uppercase tracking-wider pb-3 pt-4 pr-6 border-b border-gray-50">Ocupación (mes)</th>
                    <th className="text-[11px] font-bold text-[#6B7570] uppercase tracking-wider pb-3 pt-4 pr-6 border-b border-gray-50">Estado</th>
                    <th className="text-[11px] font-bold text-[#6B7570] uppercase tracking-wider pb-3 pt-4 pr-6 border-b border-gray-50 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rutas.map((ruta, idx) => (
                    <tr key={ruta.id} className={`hover:bg-[#FAF8F4] transition-colors ${idx !== rutas.length - 1 ? 'border-b border-gray-50' : ''}`}>
                      <td className="py-4 pl-6 pr-6">
                        <span className="text-sm font-bold text-[#1A2420]">{ruta.nombre}</span>
                      </td>
                      <td className="py-4 pr-6">
                        <div className="flex items-center gap-2 text-sm text-[#6B7570]">
                          <span className="truncate max-w-[120px]" title={ruta.origen}>{ruta.origen}</span>
                          <ArrowRight className="w-3 h-3 text-gray-300 shrink-0" />
                          <span className="truncate max-w-[120px]" title={ruta.destino}>{ruta.destino}</span>
                        </div>
                      </td>
                      <td className="py-4 pr-6 text-center">
                        <span className="text-sm font-semibold text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{ruta.horario.paradas.length}</span>
                      </td>
                      <td className="py-4 pr-6 text-center">
                        <span className="text-sm font-semibold text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{ruta.horario.salidas.length}</span>
                      </td>
                      <td className="py-4 pr-6">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden w-24">
                            <div className="h-full bg-[#1F6E4A] rounded-full" style={{ width: `${ruta.ocupacionPromedio}%` }} />
                          </div>
                          <span className="text-xs text-[#6B7570] font-medium w-7">{ruta.ocupacionPromedio}%</span>
                        </div>
                      </td>
                      <td className="py-4 pr-6">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ruta.estado === 'activa' ? 'bg-[#E4EFE7] text-[#154734]' : 'bg-gray-100 text-[#6B7570]'}`}>
                          {ruta.estado === 'activa' ? 'Activa' : 'Suspendida'}
                        </span>
                      </td>
                      <td className="py-4 pr-6 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <button onClick={() => setEditorRuta(ruta)} className="text-xs font-semibold text-[#154734] hover:underline flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> Horarios
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Avisos de Cambio */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-[#1A2420] mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Avisos para Estudiantes</h2>
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Formulario y Preview */}
              <div className="xl:col-span-1 space-y-4">
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-[#1A2420] mb-4">{formAviso.id ? 'Editar Aviso' : 'Nuevo Aviso'}</h3>
                  <form onSubmit={handleAvisoSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#6B7570] mb-1">Título del Aviso</label>
                      <select required value={formAviso.rutaId} onChange={e => {
                          const val = e.target.value;
                          setFormAviso({...formAviso, rutaId: val, titulo: val === 'GENERAL' ? 'Aviso General' : formAviso.titulo});
                        }} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#154734]">
                        <option value="">Seleccione una opción...</option>
                        <option value="GENERAL">Aviso General</option>
                        <option value="PERSONALIZADO">Título Personalizado...</option>
                        <optgroup label="Rutas Específicas">
                          {rutas.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                        </optgroup>
                      </select>
                    </div>
                    {formAviso.rutaId === 'PERSONALIZADO' && (
                      <div>
                        <label className="block text-xs font-semibold text-[#6B7570] mb-1">Título Personalizado</label>
                        <input required type="text" value={formAviso.titulo} onChange={e => setFormAviso({...formAviso, titulo: e.target.value})} placeholder="Ej. Cambio por Evento" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#154734]" />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-semibold text-[#6B7570] mb-1">Mensaje del Aviso</label>
                      <textarea required rows={3} value={formAviso.mensaje} onChange={e => setFormAviso({...formAviso, mensaje: e.target.value})} placeholder="Ej. Cambio de horario temporal..." className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#154734] resize-none" />
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={formAviso.activo} onChange={e => setFormAviso({...formAviso, activo: e.target.checked})} className="w-4 h-4 text-[#154734] rounded border-gray-300 focus:ring-[#154734] accent-[#154734]" />
                        <span className="text-sm font-medium text-[#1A2420]">Activo visible</span>
                      </label>
                      <button type="submit" className="bg-[#154734] text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-[#1F6E4A] transition-colors">
                        {formAviso.id ? 'Actualizar' : 'Publicar Aviso'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Preview Móvil */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col items-center">
                  <p className="text-xs font-bold text-[#6B7570] uppercase mb-4 self-start">Vista previa en App Estudiante</p>
                  <div className="w-[280px] h-[160px] bg-gray-50 border-4 border-gray-800 rounded-[24px] overflow-hidden relative shadow-inner p-3 flex flex-col">
                    <div className="w-10 h-1 bg-gray-800 rounded-full mx-auto mb-2" />
                    {formAviso.mensaje ? (
                      <div className="bg-white border border-[#1A2420]/10 rounded-2xl p-3 shadow-sm flex items-start gap-2.5">
                        <img src="/autobus (1).png" alt="Notificación Autobús" className="w-7 h-7 shrink-0 object-contain" />
                        <div>
                          <p className="text-[10px] font-bold text-[#1A2420] uppercase mb-0.5">
                            {formAviso.rutaId === 'PERSONALIZADO' 
                              ? (formAviso.titulo || 'Título Personalizado') 
                              : (formAviso.rutaId === 'GENERAL' 
                                ? 'Aviso General' 
                                : (rutas.find(r=>r.id==formAviso.rutaId)?.nombre || 'Ruta'))}
                          </p>
                          <p className="text-[10px] text-[#1A2420] font-medium leading-snug line-clamp-3">{formAviso.mensaje}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-xs text-gray-400 text-center px-4">
                        Escribe un mensaje para ver cómo se verá en la app móvil.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Lista de Avisos */}
              <div className="xl:col-span-2">
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden h-full">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="text-base font-bold text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Historial de Avisos</h3>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {avisos.length === 0 && <p className="text-sm text-[#6B7570] p-6 text-center">No hay avisos registrados.</p>}
                    {avisos.map(aviso => (
                      <div key={aviso.id} className="p-5 flex gap-4 transition-colors hover:bg-gray-50">
                        <img src="/autobus (1).png" alt="Autobús" className="w-11 h-11 shrink-0 object-contain" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-[#1A2420]">{aviso.ruta}</span>
                                {aviso.activo && <span className="text-[10px] font-bold bg-[#E15A2E] text-white px-2 py-0.5 rounded-full uppercase">Vigente</span>}
                                {!aviso.activo && <span className="text-[10px] font-bold bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full uppercase">Inactivo</span>}
                              </div>
                              <p className="text-sm text-[#1A2420] mb-2 pr-4">{aviso.mensaje}</p>
                              <p className="text-xs text-[#6B7570] mt-1">
                                <span className="font-medium text-[#1A2420]">{timeAgo(aviso.created_at)}</span>
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button onClick={() => handleEditarAviso(aviso)} className="p-1.5 text-gray-400 hover:text-[#154734] transition-colors" title="Editar"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => handleEliminarAviso(aviso.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Modal Nueva Ruta */}
      {modalNuevaRuta && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6">
            <h3 className="text-lg font-bold text-[#1A2420] mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Crear Nueva Ruta</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#6B7570] mb-1">Nombre de Ruta</label>
                <input type="text" value={nuevaRutaForm.nombre} onChange={e => setNuevaRutaForm({...nuevaRutaForm, nombre: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#154734]" placeholder="Ej. Ruta Centro" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#6B7570] mb-1">Origen</label>
                  <input type="text" value={nuevaRutaForm.origen} onChange={e => setNuevaRutaForm({...nuevaRutaForm, origen: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#154734]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6B7570] mb-1">Destino</label>
                  <input type="text" value={nuevaRutaForm.destino} onChange={e => setNuevaRutaForm({...nuevaRutaForm, destino: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#154734]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6B7570] mb-1">Paradas Principales (separadas por coma)</label>
                <textarea rows={2} value={nuevaRutaForm.paradasStr} onChange={e => setNuevaRutaForm({...nuevaRutaForm, paradasStr: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#154734]" placeholder="Centro, Parque, Universidad" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModalNuevaRuta(false)} className="flex-1 py-2 bg-gray-100 text-[#1A2420] font-medium rounded-xl text-sm">Cancelar</button>
              <button onClick={() => { alert('Ruta creada (simulación).'); setModalNuevaRuta(false); }} className="flex-1 py-2 bg-[#154734] text-white font-medium rounded-xl text-sm">Guardar Ruta</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── EDITOR DE HORARIOS (Componente Interno) ──────────────────────────────────
function ScheduleEditor({ rutaOriginal, onBack, onSave }) {
  // Copia profunda para edición
  const [ruta, setRuta] = useState(JSON.parse(JSON.stringify(rutaOriginal)));
  const [hasChanges, setHasChanges] = useState(false);

  const paradas = [...ruta.horario.paradas].sort((a,b) => a.orden - b.orden);
  const salidas = [...ruta.horario.salidas];

  // Actualizar hora en una celda
  const updateHora = (salidaId, paradaId, val) => {
    setRuta(prev => {
      const copy = { ...prev };
      const salida = copy.horario.salidas.find(s => s.id === salidaId);
      if (salida) {
        salida.horas[paradaId] = val;
      }
      return copy;
    });
    setHasChanges(true);
  };

  // Agregar salida (fila)
  const addSalida = () => {
    const nuevaId = Date.now();
    setRuta(prev => {
      const paradasPrev = prev.horario.paradas || [];
      const salidasPrev = prev.horario.salidas || [];
      const nuevaSalida = { id: nuevaId, numero: salidasPrev.length + 1, horas: {} };
      paradasPrev.forEach(p => nuevaSalida.horas[p.id] = '');
      
      return {
        ...prev,
        horario: {
          ...prev.horario,
          salidas: [...salidasPrev, nuevaSalida]
        }
      };
    });
    setHasChanges(true);
  };

  // Eliminar salida (fila)
  const removeSalida = (salidaId) => {
    if(!window.confirm('¿Eliminar esta salida?')) return;
    setRuta(prev => {
      const nuevasSalidas = prev.horario.salidas
        .filter(s => s.id !== salidaId)
        .map((s, idx) => ({ ...s, numero: idx + 1 }));
      return {
        ...prev,
        horario: {
          ...prev.horario,
          salidas: nuevasSalidas
        }
      };
    });
    setHasChanges(true);
  };

  // Agregar parada (columna)
  const addParada = () => {
    const nombre = prompt('Nombre de la nueva parada:');
    if (!nombre) return;
    const nuevaId = Date.now();
    setRuta(prev => {
      const paradasPrev = prev.horario.paradas || [];
      const salidasPrev = prev.horario.salidas || [];
      
      const orden = paradasPrev.length + 1;
      const nuevaParada = { id: nuevaId, nombre, orden, esDestino: false };
      
      const nuevasSalidas = salidasPrev.map(s => ({
        ...s,
        horas: {
          ...s.horas,
          [nuevaId]: ''
        }
      }));

      return {
        ...prev,
        horario: {
          ...prev.horario,
          paradas: [...paradasPrev, nuevaParada],
          salidas: nuevasSalidas
        }
      };
    });
    setHasChanges(true);
  };

  // Eliminar parada (columna)
  const removeParada = (paradaId) => {
    if(!window.confirm('¿Eliminar esta parada? Afectará todas las salidas.')) return;
    setRuta(prev => {
      const nuevasParadas = prev.horario.paradas
        .filter(p => p.id !== paradaId)
        .sort((a,b) => a.orden - b.orden)
        .map((p, idx) => ({ ...p, orden: idx + 1 }));
        
      const nuevasSalidas = prev.horario.salidas.map(s => {
        const nuevasHoras = { ...s.horas };
        delete nuevasHoras[paradaId];
        return { ...s, horas: nuevasHoras };
      });

      return {
        ...prev,
        horario: {
          ...prev.horario,
          paradas: nuevasParadas,
          salidas: nuevasSalidas
        }
      };
    });
    setHasChanges(true);
  };

  // Mover parada izq/der
  const moveParada = (paradaId, direccion) => {
    setRuta(prev => {
      const paradasCopy = [...prev.horario.paradas].map(p => ({...p}));
      paradasCopy.sort((a,b) => a.orden - b.orden);
      const idx = paradasCopy.findIndex(p => p.id === paradaId);
      if (idx < 0) return prev;
      
      if (direccion === -1 && idx > 0) {
        const temp = paradasCopy[idx].orden;
        paradasCopy[idx].orden = paradasCopy[idx-1].orden;
        paradasCopy[idx-1].orden = temp;
      } else if (direccion === 1 && idx < paradasCopy.length - 1) {
        const temp = paradasCopy[idx].orden;
        paradasCopy[idx].orden = paradasCopy[idx+1].orden;
        paradasCopy[idx+1].orden = temp;
      } else {
        return prev;
      }
      
      return {
        ...prev,
        horario: {
          ...prev.horario,
          paradas: paradasCopy
        }
      };
    });
    setHasChanges(true);
  };

  return (
    <div className="flex flex-col h-screen bg-[#FAF8F4] overflow-hidden" style={{ fontFamily: 'Manrope, sans-serif' }}>
      {/* Header del Editor */}
      <div className="h-16 flex items-center px-8 bg-white border-b border-gray-200 shrink-0 gap-4">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Horarios: {ruta.nombre}
          </h1>
          <p className="text-xs text-[#6B7570]">{ruta.origen} → {ruta.destino}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button onClick={addParada} className="flex items-center gap-1 text-sm font-semibold text-[#154734] border border-[#154734] px-4 py-2 rounded-xl hover:bg-[#E4EFE7] transition-colors">
            <Plus className="w-4 h-4" /> Agregar Parada
          </button>
        </div>
      </div>

      {/* Matriz de Edición */}
      <div className="flex-1 overflow-auto p-8 relative">
        <div className="bg-white rounded-2xl border border-gray-200 inline-block min-w-full shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="bg-gray-50 p-4 border-b border-r border-gray-200 w-24 sticky left-0 z-20">
                  <span className="text-xs font-bold text-[#6B7570] uppercase">Salidas</span>
                </th>
                {paradas.map((p, idx) => (
                  <th key={p.id} className="bg-gray-50 p-4 border-b border-r border-gray-200 min-w-[160px] align-top">
                    <div className="flex flex-col h-full justify-between gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-bold text-[#1A2420] leading-tight">{p.orden}. {p.nombre}</span>
                        {p.esDestino && <span className="text-[9px] bg-[#E15A2E] text-white px-1.5 py-0.5 rounded uppercase shrink-0">Destino</span>}
                      </div>
                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center">
                          <button disabled={idx === 0} onClick={()=>moveParada(p.id, -1)} className="p-1 text-gray-400 hover:text-[#1A2420] disabled:opacity-30"><MoveLeft className="w-3.5 h-3.5"/></button>
                          <button disabled={idx === paradas.length-1} onClick={()=>moveParada(p.id, 1)} className="p-1 text-gray-400 hover:text-[#1A2420] disabled:opacity-30"><MoveRight className="w-3.5 h-3.5"/></button>
                        </div>
                        <button onClick={()=>removeParada(p.id)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5"/></button>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {salidas.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="p-4 border-b border-r border-gray-200 bg-white sticky left-0 z-10 group-hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>#{s.numero}</span>
                      <button onClick={()=>removeSalida(s.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  </td>
                  {paradas.map(p => (
                    <td key={p.id} className="p-3 border-b border-r border-gray-200">
                      <input 
                        type="time" 
                        value={s.horas[p.id] || ''} 
                        onChange={e => updateHora(s.id, p.id, e.target.value)}
                        className="w-full bg-transparent border-none text-center text-sm font-medium text-[#1A2420] focus:ring-2 focus:ring-[#154734] rounded py-1"
                        style={{ fontFamily: 'Space Grotesk, sans-serif', fontVariantNumeric: 'tabular-nums' }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
              {/* Add row button inline */}
              <tr>
                <td colSpan={paradas.length + 1} className="p-4 bg-gray-50 text-center">
                  <button onClick={addSalida} className="text-sm font-semibold text-[#154734] hover:underline flex items-center justify-center gap-1 mx-auto">
                    <Plus className="w-4 h-4" /> Agregar Salida
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="h-24"></div> {/* spacer for bottom bar */}
      </div>

      {/* Floating Save Bar */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#1A2420] text-white p-4 flex items-center justify-between z-50 shadow-2xl animate-fade-in-up">
          <div className="flex items-center gap-3 pl-8">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            <span className="text-sm font-medium">Tienes cambios sin guardar en los horarios.</span>
          </div>
          <div className="flex gap-3 pr-8">
            <button onClick={() => { setRuta(JSON.parse(JSON.stringify(rutaOriginal))); setHasChanges(false); }} className="px-5 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors">
              Descartar
            </button>
            <button onClick={() => onSave(ruta)} className="px-5 py-2 bg-[#154734] hover:bg-[#1F6E4A] rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
              <Save className="w-4 h-4" /> Guardar Cambios
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
