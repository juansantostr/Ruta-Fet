import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Bus, LayoutDashboard, Users, User, FileText, Settings,
  CreditCard, LogOut, Bell, Search, Download, ArrowUpRight, ArrowDownRight,
  Calculator, X, AlertTriangle, ShieldCheck
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MESES_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const formatMoney = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
const formatFechaSolo = (isoStr) => {
  const d = new Date(isoStr);
  return `${d.getDate()} de ${MESES_ES[d.getMonth()]} ${d.getFullYear()}`;
};
const formatHoraSolo = (isoStr) => {
  return new Date(isoStr).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
};

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function AdminTransacciones() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const userLocal = JSON.parse(localStorage.getItem('user') || '{}');

  const [transacciones, setTransacciones] = useState([]);
  const [kpisDb, setKpisDb] = useState({ recargado: 0, consumido: 0, ajustes: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!token || userLocal.rol !== 'ADMIN') navigate('/login');
    const fetchTransacciones = async () => {
      try {
        const res = await fetch(`/api/admin/transacciones?page=${currentPage}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setTransacciones(data.transacciones || []);
          setKpisDb(data.estadisticas || { recargado: 0, consumido: 0, ajustes: 0 });
          setTotalPages(data.totalPages || 1);
        }
      } catch (error) {
        console.error('Error fetching transacciones:', error);
      }
    };
    fetchTransacciones();
  }, [navigate, token, userLocal.rol, currentPage]);

  // KPIs
  const kpis = useMemo(() => {
    return {
      recargado: kpisDb.recargado,
      consumido: kpisDb.consumido,
      saldoNeto: kpisDb.recargado - kpisDb.consumido,
      ajustes: kpisDb.ajustes
    };
  }, [kpisDb]);

  const [filtros, setFiltros] = useState({ tipo: '', admin: '', search: '' });
  const [modalCuadre, setModalCuadre] = useState(false);
  const [cuadreForm, setCuadreForm] = useState({ fecha: new Date().toISOString().split('T')[0], efectivoFisico: '' });

  // ─── Procesamiento de Datos ──────────────────────────────────────────────────
  const txFiltradas = useMemo(() => {
    return transacciones
      .filter(tx => !filtros.tipo || tx.tipo === filtros.tipo)
      .filter(tx => !filtros.admin || tx.ejecutadoPor === filtros.admin)
      .filter(tx => !filtros.search || tx.estudiante.nombre.toLowerCase().includes(filtros.search.toLowerCase()) || tx.estudiante.documento.includes(filtros.search))
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [transacciones, filtros]);

  // Agrupar por fecha
  const txAgrupadas = useMemo(() => {
    const grupos = {};
    txFiltradas.forEach(tx => {
      const d = new Date(tx.fecha);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if (!grupos[key]) grupos[key] = { fechaStr: formatFechaSolo(tx.fecha), txs: [] };
      grupos[key].txs.push(tx);
    });
    // Ordenar llaves de mayor a menor fecha
    return Object.keys(grupos).sort().reverse().map(k => grupos[k]);
  }, [txFiltradas]);



  const adminsUnicos = [...new Set(transacciones.map(t => t.ejecutadoPor))];

  // Datos para Gráfica (últimos 7 días para simplicidad visual)
  const chartData = useMemo(() => {
    const dias = {};
    const hoy = new Date('2026-09-15T12:00:00Z');
    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoy);
      d.setDate(d.getDate() - i);
      const key = `${d.getDate()} ${MESES_ES[d.getMonth()]}`;
      dias[key] = { recargas: 0, consumos: 0, label: key };
    }
    transacciones.forEach(tx => {
      const d = new Date(tx.fecha);
      const key = `${d.getDate()} ${MESES_ES[d.getMonth()]}`;
      if (dias[key]) {
        if (tx.tipo === 'recarga') dias[key].recargas += tx.monto;
        if (tx.tipo === 'abordaje') dias[key].consumos += Math.abs(tx.monto);
      }
    });
    return Object.values(dias);
  }, [transacciones]);

  // Calcular totales para cuadre de caja
  const cuadreStats = useMemo(() => {
    const dStr = cuadreForm.fecha;
    const txDia = transacciones.filter(tx => tx.fecha.startsWith(dStr) && tx.tipo === 'recarga');
    const totalSistema = txDia.reduce((sum, tx) => sum + tx.monto, 0);
    const desglose = {};
    txDia.forEach(tx => {
      if(!desglose[tx.ejecutadoPor]) desglose[tx.ejecutadoPor] = 0;
      desglose[tx.ejecutadoPor] += tx.monto;
    });
    const fisico = parseFloat(cuadreForm.efectivoFisico.replace(/\D/g, '')) || 0;
    const diferencia = fisico - totalSistema;
    return { totalSistema, desglose, diferencia, count: txDia.length };
  }, [transacciones, cuadreForm.fecha, cuadreForm.efectivoFisico]);

  return (
    <div className="flex h-screen bg-[#FAF8F4] overflow-hidden" style={{ fontFamily: 'Manrope, sans-serif' }}>
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 hidden md:flex flex-col h-screen shrink-0 z-10">
        <div className="h-24 flex items-center justify-center px-4 border-b border-gray-100">
          <img src="/logo-page-sinfondo.png" alt="Sanbus Logo" className="h-16 w-auto max-w-full object-contain" />
        </div>
        <nav className="flex-1 px-4 py-5 overflow-y-auto space-y-5">
          <div>
            <p className="text-[10px] font-bold tracking-widest text-[#6B7570] uppercase px-3 mb-2">General</p>
            <button onClick={() => navigate('/admin')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left text-[#6B7570] hover:bg-gray-50 hover:text-[#1A2420]"><LayoutDashboard className="w-4 h-4 shrink-0" /> Dashboard</button>
          </div>
          <div>
            <div className="h-px bg-gray-100 mb-3" />
            <p className="text-[10px] font-bold tracking-widest text-[#6B7570] uppercase px-3 mb-2">Operación</p>
            <button onClick={() => navigate('/admin/estudiantes')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left text-[#6B7570] hover:bg-gray-50 hover:text-[#1A2420]"><Users className="w-4 h-4 shrink-0" /> Estudiantes</button>
            <button onClick={() => navigate('/admin/conductores')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left text-[#6B7570] hover:bg-gray-50 hover:text-[#1A2420]"><User className="w-4 h-4 shrink-0" /> Conductores</button>
            <button onClick={() => navigate('/admin/rutas')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left text-[#6B7570] hover:bg-gray-50 hover:text-[#1A2420]"><MapPin className="w-4 h-4 shrink-0" /> Rutas y Horarios</button>
            <button onClick={() => navigate('/admin/viajes')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left text-[#6B7570] hover:bg-gray-50 hover:text-[#1A2420]"><Bus className="w-4 h-4 shrink-0" /> Viajes</button>
          </div>
          <div>
            <div className="h-px bg-gray-100 mb-3" />
            <p className="text-[10px] font-bold tracking-widest text-[#6B7570] uppercase px-3 mb-2">Finanzas y Sistema</p>
            <button onClick={() => {}} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left bg-[#E4EFE7] text-[#154734]"><CreditCard className="w-4 h-4 shrink-0" /> Transacciones</button>
            <button onClick={() => navigate('/admin/reportes')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left text-[#6B7570] hover:bg-gray-50 hover:text-[#1A2420]"><FileText className="w-4 h-4 shrink-0" /> Reportes</button>
            <button onClick={() => navigate('/admin/configuracion')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left text-[#6B7570] hover:bg-gray-50 hover:text-[#1A2420]"><Settings className="w-4 h-4 shrink-0" /> Configuración</button>
          </div>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-8 bg-[#FAF8F4] shrink-0 border-b border-gray-100">
          <div className="relative hidden md:block">
            <span className="text-sm font-semibold text-[#1A2420]">Control Financiero</span>
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
                Transacciones
              </h1>
              <p className="text-sm text-[#6B7570] mt-0.5">Control de saldo, recargas en efectivo y ajustes.</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button className="flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-[#1A2420] text-sm font-medium px-4 py-2 rounded-xl transition-colors">
                <Download className="w-4 h-4" /> Exportar
              </button>
              <button onClick={() => setModalCuadre(true)} className="flex items-center gap-2 bg-[#154734] hover:bg-[#1F6E4A] text-white text-sm font-medium px-5 py-2 rounded-xl transition-colors">
                <Calculator className="w-4 h-4" /> Cuadre de Caja
              </button>
            </div>
          </div>

          {/* KPIs y Gráfica */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#1A2420] mb-4">Flujo de Saldo (Últimos 7 días)</h3>
              </div>
              <div className="h-40 flex items-end justify-between gap-2 px-2 mt-auto">
                {chartData.map((d, i) => {
                  const maxVal = Math.max(...chartData.map(c => Math.max(c.recargas, c.consumos)), 1);
                  const hRecarga = (d.recargas / maxVal) * 100;
                  const hConsumo = (d.consumos / maxVal) * 100;
                  return (
                    <div key={i} className="flex flex-col items-center gap-2 flex-1 group relative">
                      <div className="flex items-end gap-1 w-full h-28 justify-center">
                        <div className="w-1/3 max-w-[12px] bg-[#1F6E4A] rounded-t-sm transition-all group-hover:opacity-90" style={{ height: `${hRecarga}%` }} />
                        <div className="w-1/3 max-w-[12px] bg-[#E4EFE7] rounded-t-sm transition-all group-hover:bg-gray-300" style={{ height: `${hConsumo}%` }} />
                      </div>
                      <span className="text-[9px] font-semibold text-[#6B7570] whitespace-nowrap">{d.label}</span>
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#1A2420] text-white text-[10px] py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                        <p className="font-bold text-white mb-0.5">{d.label}</p>
                        <p className="text-[#E4EFE7]">Recargas: {formatMoney(d.recargas)}</p>
                        <p className="text-gray-300">Consumos: {formatMoney(d.consumos)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-50 text-xs text-[#6B7570] font-medium">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[#1F6E4A]" /> Recargas (Entradas)</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[#E4EFE7]" /> Consumos (Salidas)</div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex-1 flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><ArrowUpRight className="w-16 h-16" /></div>
                <p className="text-xs font-bold text-[#6B7570] uppercase tracking-wide">Total Recargado</p>
                <p className="text-3xl font-bold text-[#154734] mt-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{formatMoney(kpis.recargado)}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex-1 flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><ArrowDownRight className="w-16 h-16" /></div>
                <p className="text-xs font-bold text-[#6B7570] uppercase tracking-wide">Consumido en Viajes</p>
                <p className="text-2xl font-bold text-[#1A2420] mt-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{formatMoney(kpis.consumido)}</p>
              </div>
              <div className={`rounded-xl border p-4 shadow-sm flex-1 flex flex-col justify-center ${kpis.ajustes > 0 ? 'bg-[#FEE9E0] border-orange-100' : 'bg-white border-gray-100'}`}>
                <p className={`text-xs font-bold uppercase tracking-wide ${kpis.ajustes > 0 ? 'text-[#E15A2E]' : 'text-[#6B7570]'}`}>Ajustes Manuales</p>
                <p className={`text-2xl font-bold mt-1 ${kpis.ajustes > 0 ? 'text-[#E15A2E]' : 'text-[#1A2420]'}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{kpis.ajustes}</p>
                <p className={`text-xs mt-1 ${kpis.ajustes > 0 ? 'text-[#E15A2E]/80' : 'text-[#6B7570]'}`}>correcciones realizadas</p>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" value={filtros.search} onChange={(e) => setFiltros({ ...filtros, search: e.target.value })} placeholder="Buscar por estudiante o documento..." className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#154734]" />
            </div>
            <select value={filtros.tipo} onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })} className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-[#1A2420] focus:outline-none">
              <option value="">Todos los tipos</option>
              <option value="recarga">Recargas</option>
              <option value="abordaje">Abordajes</option>
              <option value="ajuste">Ajustes</option>
            </select>
            <select value={filtros.admin} onChange={(e) => setFiltros({ ...filtros, admin: e.target.value })} className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-[#1A2420] focus:outline-none">
              <option value="">Cualquier autor</option>
              {adminsUnicos.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            {(filtros.tipo || filtros.admin || filtros.search) && (
              <button onClick={() => setFiltros({ tipo: '', admin: '', search: '' })} className="text-sm font-medium text-[#E15A2E] hover:underline px-2">Limpiar</button>
            )}
          </div>

          {/* Tabla */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm relative mb-12">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[1000px] border-collapse">
                <thead className="bg-white border-b border-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="text-[11px] font-bold text-[#6B7570] uppercase tracking-wider py-3 px-6 w-32">Hora</th>
                    <th className="text-[11px] font-bold text-[#6B7570] uppercase tracking-wider py-3 pr-6 w-32">Tipo</th>
                    <th className="text-[11px] font-bold text-[#6B7570] uppercase tracking-wider py-3 pr-6">Estudiante</th>
                    <th className="text-[11px] font-bold text-[#6B7570] uppercase tracking-wider py-3 pr-6 text-right w-32">Monto</th>
                    <th className="text-[11px] font-bold text-[#6B7570] uppercase tracking-wider py-3 pr-6 text-right w-32">Saldo Result.</th>
                    <th className="text-[11px] font-bold text-[#6B7570] uppercase tracking-wider py-3 px-6">Ejecutado Por</th>
                    <th className="text-[11px] font-bold text-[#6B7570] uppercase tracking-wider py-3 pr-6">Referencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {txAgrupadas.map(grupo => (
                    <React.Fragment key={grupo.fechaStr}>
                      {/* Cabecera de Día */}
                      <tr className="bg-gray-50/50">
                        <td colSpan={7} className="px-6 py-2 border-y border-gray-100">
                          <span className="text-[11px] font-bold text-[#1A2420] uppercase tracking-wider">{grupo.fechaStr}</span>
                        </td>
                      </tr>
                      {/* Filas del día */}
                      {grupo.txs.map(tx => {
                        const esIngreso = tx.monto > 0;
                        const esAjuste = tx.tipo === 'ajuste';
                        const colorLinea = tx.tipo === 'recarga' ? 'bg-[#154734]' : (tx.tipo === 'ajuste' ? 'bg-[#E15A2E]' : 'bg-gray-300');
                        return (
                          <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors group relative">
                            <td className="py-3 pl-6 pr-4 relative">
                              <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${colorLinea}`} />
                              <span className="text-xs font-semibold text-[#6B7570]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                {formatHoraSolo(tx.fecha)}
                              </span>
                            </td>
                            <td className="py-3 pr-6">
                              <span className="text-xs font-bold text-[#1A2420] capitalize">{tx.tipo}</span>
                            </td>
                            <td className="py-3 pr-6">
                              <p className="text-sm font-semibold text-[#1A2420]">{tx.estudiante.nombre}</p>
                              <p className="text-xs text-[#6B7570]">CC: {tx.estudiante.documento}</p>
                            </td>
                            <td className="py-3 pr-6 text-right">
                              <span className={`text-sm font-bold ${esIngreso && !esAjuste ? 'text-[#154734]' : (esAjuste ? 'text-[#E15A2E]' : 'text-[#1A2420]')}`} style={{ fontFamily: 'Space Grotesk, sans-serif', fontVariantNumeric: 'tabular-nums' }}>
                                {esIngreso ? '+' : ''}{formatMoney(tx.monto)}
                              </span>
                            </td>
                            <td className="py-3 pr-6 text-right">
                              <span className="text-sm font-semibold text-[#6B7570]" style={{ fontFamily: 'Space Grotesk, sans-serif', fontVariantNumeric: 'tabular-nums' }}>
                                {formatMoney(tx.saldoResultante)}
                              </span>
                            </td>
                            <td className="py-3 px-6">
                              <div className="flex items-center gap-2">
                                {tx.ejecutadoPor === 'Sistema' ? (
                                  <span className="text-xs font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded uppercase">Sistema</span>
                                ) : (
                                  <span className="text-sm font-medium text-[#1A2420]">{tx.ejecutadoPor}</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 pr-6">
                              <span className="text-xs text-[#6B7570] italic">{tx.nota || '—'}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                  {txAgrupadas.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-sm text-[#6B7570]">No se encontraron transacciones.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 border-t border-gray-100 bg-white rounded-b-2xl flex items-center justify-between text-xs text-[#6B7570] font-medium">
              <span>Mostrando {txFiltradas.length} transacciones (Página {currentPage} de {totalPages || 1})</span>
              <div className="flex gap-1">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                  Anterior
                </button>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Modal Cuadre de Caja */}
      {modalCuadre && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden p-6 relative">
            <button onClick={() => setModalCuadre(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 hover:text-[#1A2420] rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#E4EFE7] text-[#154734] rounded-full flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Cuadre de Caja Físico</h3>
                <p className="text-xs text-[#6B7570]">Verificación de efectivo recaudado por recargas.</p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-[#6B7570] uppercase mb-1">Fecha a cuadrar</label>
                <input type="date" value={cuadreForm.fecha} onChange={e => setCuadreForm({...cuadreForm, fecha: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-[#154734]" />
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-xs font-bold text-[#6B7570] uppercase mb-3 border-b border-gray-200 pb-2">Total Registrado en Sistema (Recargas)</p>
                <p className="text-2xl font-bold text-[#1A2420] mb-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{formatMoney(cuadreStats.totalSistema)}</p>
                
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-[#6B7570] uppercase">Desglose por Administrador ({cuadreStats.count} txs)</p>
                  {Object.entries(cuadreStats.desglose).length === 0 && <p className="text-xs text-gray-400">No hay recargas este día.</p>}
                  {Object.entries(cuadreStats.desglose).map(([admin, monto]) => (
                    <div key={admin} className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#1A2420]">{admin}</span>
                      <span className="font-bold text-[#6B7570]">{formatMoney(monto)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#154734] uppercase mb-1">Efectivo Contado Físicamente</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                  <input 
                    type="text" 
                    placeholder="Ej. 150000"
                    value={cuadreForm.efectivoFisico} 
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      setCuadreForm({...cuadreForm, efectivoFisico: val ? new Intl.NumberFormat('es-CO').format(val) : ''});
                    }} 
                    className="w-full pl-8 pr-4 py-3 bg-white border-2 border-[#154734]/20 rounded-xl text-lg font-bold text-[#1A2420] focus:outline-none focus:border-[#154734] transition-colors" 
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  />
                </div>
              </div>

              {cuadreForm.efectivoFisico && (
                <div className={`flex items-center justify-between p-4 rounded-xl border ${cuadreStats.diferencia === 0 ? 'bg-[#E4EFE7] border-[#154734]/20 text-[#154734]' : 'bg-[#FEE9E0] border-[#E15A2E]/20 text-[#E15A2E]'}`}>
                  <div className="flex items-center gap-2">
                    {cuadreStats.diferencia !== 0 && <AlertTriangle className="w-5 h-5" />}
                    <span className="text-sm font-bold uppercase tracking-wide">
                      {cuadreStats.diferencia === 0 ? 'Cuadre Perfecto' : (cuadreStats.diferencia > 0 ? 'Sobrante detectado' : 'Faltante detectado')}
                    </span>
                  </div>
                  <span className="text-xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {cuadreStats.diferencia > 0 ? '+' : ''}{formatMoney(cuadreStats.diferencia)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setModalCuadre(false)} className="flex-1 py-2.5 bg-gray-100 text-[#1A2420] font-medium rounded-xl text-sm hover:bg-gray-200 transition-colors">Cancelar</button>
              <button disabled={!cuadreForm.efectivoFisico} className="flex-1 py-2.5 bg-[#154734] text-white font-medium rounded-xl text-sm disabled:opacity-50 hover:bg-[#1F6E4A] transition-colors">Registrar Cuadre</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
