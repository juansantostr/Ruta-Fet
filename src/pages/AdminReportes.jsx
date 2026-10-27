import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, User, MapPin, Bus, CreditCard, FileText, Settings, LogOut, Bell,
  FileBarChart, Calendar, Download, Eye, Plus, Edit2, Trash2, FileSpreadsheet, File
} from 'lucide-react';
import { REPORTES_PROGRAMADOS, HISTORIAL_REPORTES, PREVIEW_DATA } from '../data/reportesMock';

export default function AdminReportes() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const userLocal = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!token || userLocal.rol !== 'ADMIN') navigate('/login');
  }, [navigate, token, userLocal.rol]);

  const getFechas = (rango) => {
    const hoy = new Date();
    let inicio = new Date();
    let fin = new Date();

    switch (rango) {
      case 'Hoy':
        break;
      case 'Esta semana':
        inicio.setDate(hoy.getDate() - hoy.getDay() + 1);
        break;
      case 'Este mes':
        inicio.setDate(1);
        break;
      case 'Mes anterior':
        inicio.setMonth(hoy.getMonth() - 1);
        inicio.setDate(1);
        fin.setDate(0);
        break;
      default:
        break;
    }
    return {
      inicio: inicio.toISOString().split('T')[0],
      fin: fin.toISOString().split('T')[0]
    };
  };

  const initFechas = getFechas('Este mes');
  const [formParams, setFormParams] = useState({ 
    tipo: 'Recaudo por período', 
    rango: 'Este mes', 
    inicio: initFechas.inicio, 
    fin: initFechas.fin 
  });
  const [generando, setGenerando] = useState(false);
  const [reportData, setReportData] = useState(PREVIEW_DATA);

  const handleGenerar = async () => {
    setGenerando(true);
    try {
      const res = await fetch(`/api/admin/exportar-reporte?tipo=${encodeURIComponent(formParams.tipo)}&inicio=${formParams.inicio}&fin=${formParams.fin}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al generar');
      const data = await res.json();
      
      setReportData({
        columnas: data.columnas,
        filas: data.filas,
        totales: { pasajeros: 'N/A', recaudo: 'N/A' } // Can calculate later if needed
      });

      // Crear CSV
      let csvContent = "data:text/csv;charset=utf-8," 
        + data.columnas.join(",") + "\n"
        + data.filas.map(e => e.join(",")).join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${formParams.tipo.replace(/ /g, '_')}_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert(`Reporte descargado en formato CSV.`);
    } catch (e) {
      console.error(e);
      alert('Hubo un error al generar el reporte.');
    } finally {
      setGenerando(false);
    }
  };

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
            <button onClick={() => navigate('/admin/transacciones')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left text-[#6B7570] hover:bg-gray-50 hover:text-[#1A2420]"><CreditCard className="w-4 h-4 shrink-0" /> Transacciones</button>
            <button onClick={() => {}} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left bg-[#E4EFE7] text-[#154734]"><FileText className="w-4 h-4 shrink-0" /> Reportes</button>
            <button onClick={() => navigate('/admin/configuracion')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left text-[#6B7570] hover:bg-gray-50 hover:text-[#1A2420]"><Settings className="w-4 h-4 shrink-0" /> Configuración</button>
          </div>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-8 bg-[#FAF8F4] shrink-0 border-b border-gray-100">
          <div className="relative hidden md:block">
            <span className="text-sm font-semibold text-[#1A2420]">Inteligencia de Negocio</span>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#E4EFE7] flex items-center justify-center text-[#154734]"><User className="w-4 h-4" /></div>
              <span className="text-sm font-medium text-[#1A2420] hidden lg:block">{userLocal.nombre || 'Admin'}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-8 py-6 relative space-y-8">
          
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Reportes y Exportaciones</h1>
            <p className="text-sm text-[#6B7570] mt-0.5">Genera documentos analíticos y consolidados para la administración de la universidad.</p>
          </div>

          {/* GENERADOR DE REPORTES */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col xl:flex-row overflow-hidden">
            {/* Controles */}
            <div className="p-6 xl:w-[45%] border-b xl:border-b-0 xl:border-r border-gray-100 bg-[#FAF8F4]/30">
              <h3 className="text-sm font-bold text-[#1A2420] mb-5 flex items-center gap-2">
                <FileBarChart className="w-4 h-4 text-[#154734]" /> Configurar Reporte
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#6B7570] uppercase mb-1.5">Tipo de Reporte</label>
                  <select value={formParams.tipo} onChange={e => setFormParams({...formParams, tipo: e.target.value})} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-[#1A2420] focus:outline-none focus:border-[#154734]">
                    <option>Recaudo por período</option>
                    <option>Uso por ruta</option>
                    <option>Actividad por estudiante</option>
                    <option>Desempeño de conductores</option>
                    <option>Auditoría de validaciones</option>
                    <option>Cuadre financiero</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6B7570] uppercase mb-1.5">Período de Análisis</label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {['Hoy', 'Esta semana', 'Este mes', 'Mes anterior'].map(r => (
                      <button key={r} onClick={() => { const f = getFechas(r); setFormParams({...formParams, rango: r, inicio: f.inicio, fin: f.fin}); }} className={`text-xs font-semibold py-2 rounded-lg border transition-colors ${formParams.rango === r ? 'bg-[#E4EFE7] border-[#154734]/30 text-[#154734]' : 'bg-white border-gray-200 text-[#6B7570] hover:bg-gray-50'}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="date" value={formParams.inicio} onChange={e => setFormParams({...formParams, inicio: e.target.value, rango: 'Personalizado'})} className="flex-1 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-[#1A2420] focus:outline-none focus:border-[#154734]" />
                    <span className="text-xs text-gray-400">al</span>
                    <input type="date" value={formParams.inicio} onChange={e => setFormParams({...formParams, inicio: e.target.value, rango: 'Personalizado'})} className="flex-1 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-[#1A2420] focus:outline-none focus:border-[#154734]" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6B7570] uppercase mb-1.5">Filtros Adicionales</label>
                  <select className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-[#1A2420] focus:outline-none focus:border-[#154734]">
                    <option>Todas las rutas</option>
                    <option>Ruta Norte</option>
                    <option>Ruta Sur</option>
                  </select>
                </div>

                

                <button onClick={handleGenerar} disabled={generando} className="w-full mt-2 flex items-center justify-center gap-2 bg-[#1A2420] text-white py-3 rounded-xl font-bold text-sm hover:bg-black transition-colors disabled:opacity-70">
                  {generando ? <span className="animate-pulse">Generando documento...</span> : <><Download className="w-4 h-4" /> Generar Reporte</>}
                </button>
              </div>
            </div>

            {/* Preview */}
            <div className="p-6 xl:w-[55%] bg-gray-50 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-[#1A2420] flex items-center gap-2">
                  <Eye className="w-4 h-4 text-gray-400" /> Vista Previa del Documento
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-200 px-2 py-1 rounded">Muestra de datos</span>
              </div>
              <div className="flex-1 bg-white border border-gray-200 shadow-sm p-8 flex flex-col">
                <div className="border-b-2 border-[#154734] pb-4 mb-4 flex justify-between items-end">
                  <div>
                    <h2 className="text-xl font-bold text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{formParams.tipo}</h2>
                    <p className="text-xs text-[#6B7570]">Período: {formParams.rango}</p>
                  </div>
                  <img src="/logo-page-sinfondo.png" alt="Logo" className="h-8 opacity-50 grayscale" />
                </div>
                
                <table className="w-full text-left mb-auto">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {reportData.columnas.map(col => <th key={col} className="text-[10px] font-bold text-[#6B7570] uppercase py-2">{col}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reportData.filas.map((fila, i) => (
                      <tr key={i}>
                        {fila.map((celda, j) => <td key={j} className={`text-xs py-2 ${j > 1 ? 'font-medium' : 'text-[#6B7570]'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>{celda}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-8 border-t border-gray-200 pt-4 flex justify-end">
                  <div className="w-48">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-bold text-[#6B7570] uppercase">Total Pasajeros:</span>
                      <span className="font-bold text-[#1A2420]">{reportData.totales.pasajeros}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-[#6B7570] uppercase">Recaudo Total:</span>
                      <span className="font-bold text-[#154734]">${reportData.totales.recaudo}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Reportes Programados */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Reportes Programados</h2>
              <button className="flex items-center gap-1.5 text-sm font-semibold text-[#154734] hover:underline">
                <Plus className="w-4 h-4" /> Nuevo programa
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {REPORTES_PROGRAMADOS.map(rep => (
                <div key={rep.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-start justify-between group hover:border-[#154734]/30 transition-colors">
                  <div>
                    <h4 className="text-sm font-bold text-[#1A2420] flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#1F6E4A]" /> {rep.nombre}
                    </h4>
                    <p className="text-xs text-[#6B7570] mt-1">{rep.tipo} • {rep.frecuencia}</p>
                    <p className="text-[11px] text-gray-500 mt-2">Destino: <span className="font-medium text-[#1A2420]">{rep.destino}</span></p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 text-gray-400 hover:text-[#154734]"><Edit2 className="w-4 h-4" /></button>
                    <button className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Historial */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm mb-12">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Historial de Documentos</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-[11px] font-bold text-[#6B7570] uppercase py-3 px-6">Fecha Generación</th>
                    <th className="text-[11px] font-bold text-[#6B7570] uppercase py-3 px-4">Tipo de Reporte</th>
                    <th className="text-[11px] font-bold text-[#6B7570] uppercase py-3 px-4">Período</th>
                    <th className="text-[11px] font-bold text-[#6B7570] uppercase py-3 px-4">Formato</th>
                    <th className="text-[11px] font-bold text-[#6B7570] uppercase py-3 px-4">Generado Por</th>
                    <th className="text-[11px] font-bold text-[#6B7570] uppercase py-3 px-6 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {HISTORIAL_REPORTES.slice(0, 10).map(hist => (
                    <tr key={hist.id} className="hover:bg-gray-50/50">
                      <td className="py-3 px-6 text-xs text-[#6B7570]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {new Date(hist.fecha).toLocaleDateString('es-CO')}
                      </td>
                      <td className="py-3 px-4 text-sm font-semibold text-[#1A2420]">{hist.tipo}</td>
                      <td className="py-3 px-4 text-xs text-[#6B7570]">{hist.periodo}</td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded uppercase">{hist.formato}</span>
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-[#1A2420]">{hist.generadoPor}</td>
                      <td className="py-3 px-6 text-right">
                        <button className="text-xs font-bold text-[#154734] hover:underline flex items-center gap-1 justify-end ml-auto">
                          <Download className="w-3.5 h-3.5" /> Descargar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

