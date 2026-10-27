import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Bus, LayoutDashboard, Users, User, FileText, Settings,
  CreditCard, LogOut, Bell, Search, Filter, Download, ArrowRight,
  Clock, CheckCircle, AlertCircle, X, ChevronRight, Check
} from 'lucide-react';

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function AdminViajes() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const userLocal = JSON.parse(localStorage.getItem('user') || '{}');

  const [viajes, setViajes] = useState([]);
  const [filtros, setFiltros] = useState({ ruta: '', conductor: '', estado: '' });
  const [viajeDetalle, setViajeDetalle] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!token || userLocal.rol !== 'ADMIN') {
      navigate('/login');
      return;
    }

    const fetchViajes = async () => {
      try {
        const res = await fetch('/api/admin/viajes', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setViajes(data);
        }
      } catch (error) {
        console.error('Error fetching viajes:', error);
      }
    };
    fetchViajes();
  }, [navigate, token, userLocal.rol]);

  // ─── Filtros y Datos ────────────────────────────────────────────────────────
  const viajesFiltrados = useMemo(() => {
    return viajes
      .filter(v => !filtros.ruta || v.ruta === filtros.ruta)
      .filter(v => !filtros.conductor || v.conductor === filtros.conductor)
      .filter(v => !filtros.estado || v.estado === filtros.estado)
      .sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio));
  }, [viajes, filtros]);

  // KPIs
  const kpis = useMemo(() => {
    const completados = viajes.filter(v => v.estado === 'completado').length;
    const pasajeros = viajes.reduce((sum, v) => sum + v.pasajeros, 0);
    const ocupacion = viajes.length ? Math.round(pasajeros / viajes.length) : 0;
    const incidencias = viajes.filter(v => v.incidencia).length;
    return { completados, pasajeros, ocupacion, incidencias };
  }, [viajes]);

  const rutasUnicas = [...new Set(viajes.map(v => v.ruta))];
  const conductoresUnicos = [...new Set(viajes.map(v => v.conductor))];

  // Helpers
  const formatDateTime = (isoStr) => {
    const d = new Date(isoStr);
    return d.toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };
  const formatMoney = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="flex h-screen bg-[#FAF8F4] overflow-hidden" style={{ fontFamily: 'Manrope, sans-serif' }}>
      {/* Sidebar - simplificado para el ejemplo, pero completo */}
      <aside className="w-64 bg-white border-r border-gray-100 hidden md:flex flex-col h-screen shrink-0 z-10">
        <div className="h-24 flex items-center justify-center px-4 border-b border-gray-100">
          <img src="/logo-page-sinfondo.png" alt="Sanbus Logo" className="h-16 w-auto max-w-full object-contain" />
        </div>
        <nav className="flex-1 px-4 py-5 overflow-y-auto space-y-5">
          <div>
            <p className="text-[10px] font-bold tracking-widest text-[#6B7570] uppercase px-3 mb-2">General</p>
            <button onClick={() => navigate('/admin')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left text-[#6B7570] hover:bg-gray-50 hover:text-[#1A2420]">
              <LayoutDashboard className="w-4 h-4 shrink-0" /> Dashboard
            </button>
          </div>
          <div>
            <div className="h-px bg-gray-100 mb-3" />
            <p className="text-[10px] font-bold tracking-widest text-[#6B7570] uppercase px-3 mb-2">Operación</p>
            <button onClick={() => navigate('/admin/estudiantes')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left text-[#6B7570] hover:bg-gray-50 hover:text-[#1A2420]"><Users className="w-4 h-4 shrink-0" /> Estudiantes</button>
            <button onClick={() => navigate('/admin/conductores')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left text-[#6B7570] hover:bg-gray-50 hover:text-[#1A2420]"><User className="w-4 h-4 shrink-0" /> Conductores</button>
            <button onClick={() => navigate('/admin/rutas')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left text-[#6B7570] hover:bg-gray-50 hover:text-[#1A2420]"><MapPin className="w-4 h-4 shrink-0" /> Rutas y Horarios</button>
            <button onClick={() => {}} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left bg-[#E4EFE7] text-[#154734]"><Bus className="w-4 h-4 shrink-0" /> Viajes</button>
          </div>
          <div>
            <div className="h-px bg-gray-100 mb-3" />
            <p className="text-[10px] font-bold tracking-widest text-[#6B7570] uppercase px-3 mb-2">Finanzas y Sistema</p>
            <button onClick={() => navigate('/admin/transacciones')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left text-[#6B7570] hover:bg-gray-50 hover:text-[#1A2420]"><CreditCard className="w-4 h-4 shrink-0" /> Transacciones</button>
            <button onClick={() => navigate('/admin/reportes')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left text-[#6B7570] hover:bg-gray-50 hover:text-[#1A2420]"><FileText className="w-4 h-4 shrink-0" /> Reportes</button>
            <button onClick={() => navigate('/admin/configuracion')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left text-[#6B7570] hover:bg-gray-50 hover:text-[#1A2420]"><Settings className="w-4 h-4 shrink-0" /> Configuración</button>
          </div>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-8 bg-[#FAF8F4] shrink-0 border-b border-gray-100">
          <div className="relative hidden md:block">
            <span className="text-sm font-semibold text-[#1A2420]">Auditoría de Viajes</span>
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

        <main className="flex-1 overflow-y-auto px-8 py-6 relative">
          {/* Encabezado */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Historial de Viajes
              </h1>
              <p className="text-sm text-[#6B7570] mt-0.5">Auditoría operativa y detalle de validaciones por recorrido.</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 flex items-center gap-2 text-sm font-medium text-[#1A2420]">
                <Clock className="w-4 h-4 text-gray-400" /> Últimos 30 días
              </div>
              <button className="flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-[#1A2420] text-sm font-medium px-4 py-2 rounded-xl transition-colors">
                <Download className="w-4 h-4" /> Exportar
              </button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
              <p className="text-[11px] font-semibold text-[#6B7570] uppercase tracking-wide">Viajes Completados</p>
              <p className="text-2xl font-bold text-[#1A2420] mt-0.5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{kpis.completados}</p>
              <p className="text-[11px] text-[#6B7570]">en el período seleccionado</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
              <p className="text-[11px] font-semibold text-[#6B7570] uppercase tracking-wide">Pasajeros Transportados</p>
              <p className="text-2xl font-bold text-[#1A2420] mt-0.5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{new Intl.NumberFormat().format(kpis.pasajeros)}</p>
              <p className="text-[11px] text-[#6B7570]">validaciones exitosas</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
              <p className="text-[11px] font-semibold text-[#6B7570] uppercase tracking-wide">Ocupación Promedio</p>
              <p className="text-2xl font-bold text-[#1A2420] mt-0.5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{kpis.ocupacion}</p>
              <p className="text-[11px] text-[#6B7570]">pasajeros por viaje</p>
            </div>
            <div className={`rounded-xl border px-4 py-3 shadow-sm ${kpis.incidencias > 0 ? 'bg-[#FEE9E0] border-orange-100' : 'bg-white border-gray-100'}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-wide ${kpis.incidencias > 0 ? 'text-[#E15A2E]' : 'text-[#6B7570]'}`}>Con Incidencias</p>
              <p className={`text-2xl font-bold mt-0.5 ${kpis.incidencias > 0 ? 'text-[#E15A2E]' : 'text-[#1A2420]'}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{kpis.incidencias}</p>
              <p className={`text-[11px] ${kpis.incidencias > 0 ? 'text-[#E15A2E]/70' : 'text-[#6B7570]'}`}>retrasos o fallos</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="Buscar por ID..." className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#154734]" />
            </div>
            <select value={filtros.ruta} onChange={(e) => setFiltros({ ...filtros, ruta: e.target.value })} className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-[#1A2420] focus:outline-none">
              <option value="">Todas las rutas</option>
              {rutasUnicas.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={filtros.conductor} onChange={(e) => setFiltros({ ...filtros, conductor: e.target.value })} className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-[#1A2420] focus:outline-none">
              <option value="">Todos los conductores</option>
              {conductoresUnicos.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filtros.estado} onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })} className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-[#1A2420] focus:outline-none">
              <option value="">Todos los estados</option>
              <option value="completado">Completados</option>
              <option value="en_curso">En curso</option>
            </select>
            {(filtros.ruta || filtros.conductor || filtros.estado) && (
              <button onClick={() => setFiltros({ ruta: '', conductor: '', estado: '' })} className="text-sm font-medium text-[#E15A2E] hover:underline px-2">Limpiar</button>
            )}
          </div>

          {/* Tabla */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm relative">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[950px]">
                <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="text-[11px] font-bold text-[#6B7570] uppercase tracking-wider py-3 px-6">ID / Fecha de Inicio</th>
                    <th className="text-[11px] font-bold text-[#6B7570] uppercase tracking-wider py-3 pr-6">Ruta</th>
                    <th className="text-[11px] font-bold text-[#6B7570] uppercase tracking-wider py-3 pr-6">Conductor</th>
                    <th className="text-[11px] font-bold text-[#6B7570] uppercase tracking-wider py-3 pr-6 text-right">Pasajeros</th>
                    <th className="text-[11px] font-bold text-[#6B7570] uppercase tracking-wider py-3 pr-6 text-right">Recaudo</th>
                    <th className="text-[11px] font-bold text-[#6B7570] uppercase tracking-wider py-3 pr-6 text-center">Duración</th>
                    <th className="text-[11px] font-bold text-[#6B7570] uppercase tracking-wider py-3 pr-6">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {viajesFiltrados.map((viaje) => (
                    <tr 
                      key={viaje.id} 
                      onClick={() => setViajeDetalle(viaje)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-2">
                          {viaje.incidencia && <AlertCircle className="w-4 h-4 text-[#E15A2E]" title="Incidencia registrada" />}
                          <div>
                            <p className="text-xs font-bold text-[#1A2420]">{viaje.id}</p>
                            <p className="text-[13px] text-[#6B7570]" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatDateTime(viaje.fechaInicio)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-6 text-sm font-semibold text-[#1A2420]">{viaje.ruta}</td>
                      <td className="py-3 pr-6 text-sm text-[#1A2420]">{viaje.conductor}</td>
                      <td className="py-3 pr-6 text-sm font-bold text-[#1A2420] text-right" style={{ fontFamily: 'Space Grotesk, sans-serif', fontVariantNumeric: 'tabular-nums' }}>
                        {viaje.pasajeros}
                      </td>
                      <td className="py-3 pr-6 text-sm font-bold text-[#154734] text-right" style={{ fontFamily: 'Space Grotesk, sans-serif', fontVariantNumeric: 'tabular-nums' }}>
                        {formatMoney(viaje.recaudo)}
                      </td>
                      <td className="py-3 pr-6 text-sm text-[#6B7570] text-center" style={{ fontVariantNumeric: 'tabular-nums' }}>{viaje.duracion}</td>
                      <td className="py-3 pr-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${viaje.estado === 'completado' ? 'bg-[#154734]' : 'bg-[#E15A2E] animate-pulse'}`} />
                            <span className={`text-xs font-semibold ${viaje.estado === 'completado' ? 'text-[#154734]' : 'text-[#E15A2E]'}`}>
                              {viaje.estado === 'completado' ? 'Completado' : 'En curso'}
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#154734] transition-colors" />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {viajesFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-sm text-[#6B7570]">No se encontraron viajes con estos filtros.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-[#6B7570] font-medium">
              <span>Mostrando {viajesFiltrados.length} viajes</span>
              <div className="flex gap-1">
                <button className="px-3 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100">Anterior</button>
                <button className="px-3 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100">Siguiente</button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Slide-in Detail Panel */}
      {viajeDetalle && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40 transition-opacity" onClick={() => setViajeDetalle(null)} />
          <div className="fixed inset-y-0 right-0 w-full max-w-[500px] bg-white shadow-2xl z-50 flex flex-col transform transition-transform border-l border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-[#FAF8F4]">
              <div>
                <p className="text-xs font-bold text-[#6B7570] uppercase tracking-wider mb-1">Detalle del Viaje</p>
                <h2 className="text-xl font-bold text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{viajeDetalle.id}</h2>
              </div>
              <button onClick={() => setViajeDetalle(null)} className="p-2 text-gray-400 hover:text-[#1A2420] hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-white">
              {/* Resumen */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div>
                  <p className="text-[11px] font-semibold text-[#6B7570] uppercase">Ruta</p>
                  <p className="text-sm font-semibold text-[#1A2420] mt-0.5">{viajeDetalle.ruta}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-[#6B7570] uppercase">Conductor</p>
                  <p className="text-sm font-semibold text-[#1A2420] mt-0.5">{viajeDetalle.conductor}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-[#6B7570] uppercase">Inicio</p>
                  <p className="text-sm font-semibold text-[#1A2420] mt-0.5" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatDateTime(viajeDetalle.fechaInicio)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-[#6B7570] uppercase">Recaudo Total</p>
                  <p className="text-sm font-bold text-[#154734] mt-0.5" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(viajeDetalle.recaudo)}</p>
                </div>
              </div>

              {/* Libro de Auditoría (Validaciones) */}
              <div>
                <h3 className="text-sm font-bold text-[#1A2420] mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#1F6E4A]" /> Libro de Validaciones
                </h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="py-2 px-4 text-[10px] font-bold text-[#6B7570] uppercase">Hora Exacta</th>
                        <th className="py-2 px-4 text-[10px] font-bold text-[#6B7570] uppercase">Estudiante</th>
                        <th className="py-2 px-4 text-[10px] font-bold text-[#6B7570] uppercase text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {viajeDetalle.validaciones.map(val => (
                        <tr key={val.id} className="hover:bg-gray-50">
                          <td className="py-2 px-4 text-xs font-medium text-[#6B7570]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {new Date(val.hora).toLocaleTimeString('es-CO')}
                          </td>
                          <td className="py-2 px-4 text-xs font-semibold text-[#1A2420]">{val.estudiante}</td>
                          <td className="py-2 px-4 text-xs font-bold text-[#154734] text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {formatMoney(val.monto)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
