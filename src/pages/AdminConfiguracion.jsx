import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, User, MapPin, Bus, CreditCard, FileText, Settings, LogOut, Bell,
  DollarSign, Clock, ShieldCheck, Mail, Save, AlertTriangle, X
} from 'lucide-react';
import { CONFIG_INICIAL, ADMINS_MOCK, AUDIT_LOG } from '../data/configuracionMock';

export default function AdminConfiguracion() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const userLocal = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!token || userLocal.rol !== 'ADMIN') navigate('/login');
  }, [navigate, token, userLocal.rol]);

  const [activeTab, setActiveTab] = useState('tarifas');
  const [config, setConfig] = useState(CONFIG_INICIAL);
  const [initialServerConfig, setInitialServerConfig] = useState(CONFIG_INICIAL);
  const [admins, setAdmins] = useState(ADMINS_MOCK);
  const [auditLog, setAuditLog] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const [modalConfirmacion, setModalConfirmacion] = useState(false);
  const [modalAdmin, setModalAdmin] = useState(false);
  const [formAdmin, setFormAdmin] = useState({ nombre: '', documento: '', correo: '', password: '' });

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/admin/configuracion', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAdmins(data.admins);
        if (data.auditoria) setAuditLog(data.auditoria);
        if (data.configuraciones) {
          const loaded = {
            ...CONFIG_INICIAL,
            tarifa: data.configuraciones.coste_pasaje ? parseInt(data.configuraciones.coste_pasaje) : CONFIG_INICIAL.tarifa,
            maxTiempoViaje: data.configuraciones.tiempo_maximo_viaje ? parseInt(data.configuraciones.tiempo_maximo_viaje) : CONFIG_INICIAL.maxTiempoViaje,
            horarioOperacion: data.configuraciones.horario_operacion || CONFIG_INICIAL.horarioOperacion
          };
          setConfig(loaded);
          setInitialServerConfig(loaded);
        }
      }
    } catch (error) {
      console.error('Error fetching configuracion:', error);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [token]);

  const tabs = [
    { id: 'tarifas', label: 'Tarifa y Pago', icon: DollarSign },
    { id: 'operacion', label: 'Operación', icon: Clock },
    { id: 'admins', label: 'Administradores', icon: ShieldCheck },
    { id: 'audit', label: 'Registro de Actividad', icon: FileText }
  ];

  const handleConfigChange = (key, val) => {
    setConfig(prev => ({ ...prev, [key]: val }));
    setIsDirty(true);
  };

  const handleSaveClick = () => {
    // Si cambió la tarifa u otros Parámetros sensibles, mostrar modal
    if (config.tarifa !== initialServerConfig.tarifa) {
      setModalConfirmacion(true);
    } else {
      guardarCambios();
    }
  };

  const guardarCambios = async () => {
    try {
      const res = await fetch('/api/admin/configuracion', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          coste_pasaje: config.tarifa,
          tiempo_maximo_viaje: config.maxTiempoViaje,
          horario_operacion: config.horarioOperacion
        })
      });
      if (res.ok) {
        setInitialServerConfig(config);
        setIsDirty(false);
        setModalConfirmacion(false);
        alert('Configuración guardada exitosamente.');
        fetchConfig();
      } else {
        alert('Error al guardar la Configuración');
      }
    } catch (e) {
      alert('Error de conexión al guardar');
    }
  };

  const handleEliminarAdmin = async (id) => {
    if (id === 1) {
      alert('El administrador principal no puede ser eliminado.');
      return;
    }
    if (!confirm('¿Estás seguro de que deseas eliminar este administrador?')) return;
    try {
      const res = await fetch(`/api/admin/eliminar-admin/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Administrador eliminado');
        setAdmins(admins.filter(a => a.id !== id));
        fetchConfig();
      } else {
        alert('Error al eliminar');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCrearAdmin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/crear-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formAdmin)
      });
      if (res.ok) {
        alert('Administrador creado exitosamente');
        setModalAdmin(false);
        setFormAdmin({ nombre: '', documento: '', correo: '', password: '' });
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error || 'Error al crear administrador');
      }
    } catch (error) {
      console.error(error);
      alert('Error de conexin');
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
            <button onClick={() => navigate('/admin/reportes')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left text-[#6B7570] hover:bg-gray-50 hover:text-[#1A2420]"><FileText className="w-4 h-4 shrink-0" /> Reportes</button>
            <button onClick={() => {}} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left bg-[#E4EFE7] text-[#154734]"><Settings className="w-4 h-4 shrink-0" /> Configuración</button>
          </div>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-8 bg-[#FAF8F4] shrink-0 border-b border-gray-100">
          <div className="relative hidden md:block">
            <span className="text-sm font-semibold text-[#1A2420]">Parámetros del Sistema</span>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#E4EFE7] flex items-center justify-center text-[#154734]"><User className="w-4 h-4" /></div>
              <span className="text-sm font-medium text-[#1A2420] hidden lg:block">{userLocal.nombre || 'Admin'}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 relative flex gap-8">
          
          {/* Sub-sidebar interna */}
          <div className="w-64 shrink-0">
            <h1 className="text-2xl font-bold text-[#1A2420] mb-6" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Configuración</h1>
            <nav className="flex flex-col gap-1">
              {tabs.map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors text-left ${activeTab === tab.id ? 'bg-white shadow-sm text-[#154734] border border-gray-200' : 'text-[#6B7570] hover:bg-white/50'}`}
                >
                  <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-[#1F6E4A]' : 'text-gray-400'}`} />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Área de Configuración */}
          <div className="flex-1 max-w-3xl pb-24">
            
            {/* TARIFAS */}
            {activeTab === 'tarifas' && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in-up">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-base font-bold text-[#1A2420]">Tarifa y Pago</h3>
                  <p className="text-xs text-[#6B7570] mt-1">Configura el costo del servicio por cada pasaje de los estudiantes.</p>
                </div>
                <div className="divide-y divide-gray-100">
                  <div className="p-6 flex items-center justify-between gap-6">
                    <div>
                      <p className="text-sm font-semibold text-[#1A2420]">Costo por Pasaje (Tarifa Base)</p>
                      <p className="text-xs text-[#6B7570] mt-1">Valor exacto que se descontará por cada abordaje válido.</p>
                    </div>
                    <div className="relative w-40 shrink-0">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                      <input type="number" value={config.tarifa} onChange={e => handleConfigChange('tarifa', parseInt(e.target.value) || 0)} className="w-full pl-7 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-right font-bold text-[#154734] focus:outline-none focus:border-[#154734]" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* OPERACIÓN */}
            {activeTab === 'operacion' && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in-up">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-base font-bold text-[#1A2420]">Parámetros de Operación</h3>
                  <p className="text-xs text-[#6B7570] mt-1">Ajusta los tiempos del servicio y límites técnicos.</p>
                </div>
                <div className="divide-y divide-gray-100">
                  <div className="p-6 flex items-center justify-between gap-6">
                    <div>
                      <p className="text-sm font-semibold text-[#1A2420]">Tiempo Máximo de Viaje</p>
                      <p className="text-xs text-[#6B7570] mt-1">Si un viaje supera este tiempo, se marcará automáticamente con "Incidencia".</p>
                    </div>
                    <div className="flex items-center gap-2 w-32 shrink-0">
                      <input type="number" value={config.maxTiempoViaje} onChange={e => handleConfigChange('maxTiempoViaje', e.target.value)} className="w-16 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-center font-bold text-[#1A2420] focus:outline-none focus:border-[#154734]" />
                      <span className="text-xs font-semibold text-[#6B7570]">min</span>
                    </div>
                  </div>
                  <div className="p-6 flex items-center justify-between gap-6">
                    <div>
                      <p className="text-sm font-semibold text-[#1A2420]">Horario de Operación</p>
                      <p className="text-xs text-[#6B7570] mt-1">Rango donde el sistema acepta inicio de rutas.</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input type="time" value={(config.horarioOperacion || '05:00 - 22:00').split('-')[0].trim()} onChange={e => { const end = (config.horarioOperacion || '05:00 - 22:00').split('-')[1].trim(); handleConfigChange('horarioOperacion', `${e.target.value} - ${end}`) }} className="w-40 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-center font-bold text-[#1A2420] focus:outline-none focus:border-[#154734]" />
                      <span className="text-sm font-bold text-[#6B7570]">-</span>
                      <input type="time" value={(config.horarioOperacion || '05:00 - 22:00').split('-')[1].trim()} onChange={e => { const start = (config.horarioOperacion || '05:00 - 22:00').split('-')[0].trim(); handleConfigChange('horarioOperacion', `${start} - ${e.target.value}`) }} className="w-40 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-center font-bold text-[#1A2420] focus:outline-none focus:border-[#154734]" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ADMINISTRADORES */}
            {activeTab === 'admins' && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in-up">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-bold text-[#1A2420]">Usuarios Administradores</h3>
                    <p className="text-xs text-[#6B7570] mt-1">Gestiona quién tiene acceso a este panel y sus permisos.</p>
                  </div>
                  <button className="text-sm font-semibold bg-[#154734] text-white px-4 py-2 rounded-xl hover:bg-[#1F6E4A] transition-colors" onClick={() => setModalAdmin(true)}>Crear admin</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-[11px] font-bold text-[#6B7570] uppercase py-3 px-6">Usuario</th>
                        <th className="text-[11px] font-bold text-[#6B7570] uppercase py-3 px-4">Nivel de Acceso</th>
                        <th className="text-[11px] font-bold text-[#6B7570] uppercase py-3 px-4">Último Acceso</th>
                        <th className="text-[11px] font-bold text-[#6B7570] uppercase py-3 px-6 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {admins.map(a => (
                        <tr key={a.id} className="hover:bg-gray-50/50">
                          <td className="py-4 px-6">
                            <p className="text-sm font-bold text-[#1A2420]">{a.nombre}</p>
                            <p className="text-xs text-[#6B7570]">{a.correo}</p>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${a.rol === 'Administrador Total' ? 'bg-[#154734] text-white' : (a.rol === 'Solo recargas' ? 'bg-[#FEE9E0] text-[#E15A2E]' : 'bg-gray-100 text-gray-500')}`}>
                              {a.rol}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-xs text-[#6B7570] font-medium" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {new Date(a.ultimoAcceso).toLocaleString('es-CO')}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button className="text-xs font-bold text-[#154734] hover:underline mr-3">Editar</button>
                            {a.id !== 1 && <button onClick={() => handleEliminarAdmin(a.id)} className="text-xs font-bold text-red-500 hover:underline">Revocar</button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* AUDITORIA */}
            {activeTab === 'audit' && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in-up">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-base font-bold text-[#1A2420]">Registro de Actividad</h3>
                  <p className="text-xs text-[#6B7570] mt-1">Bitácora inmutable de acciones críticas (solo lectura).</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-[11px] font-bold text-[#6B7570] uppercase py-3 px-6">Fecha y Hora</th>
                        <th className="text-[11px] font-bold text-[#6B7570] uppercase py-3 px-4">Admin</th>
                        <th className="text-[11px] font-bold text-[#6B7570] uppercase py-3 px-4">Módulo</th>
                        <th className="text-[11px] font-bold text-[#6B7570] uppercase py-3 px-6">Acción Realizada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {auditLog.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="py-8 text-center text-sm text-[#6B7570]">
                            No hay acciones registradas en la bitácora aún.
                          </td>
                        </tr>
                      ) : (
                        auditLog.map(log => (
                          <tr key={log.id} className="hover:bg-gray-50/50">
                            <td className="py-3 px-6 text-xs text-[#6B7570] font-medium w-36" style={{ fontVariantNumeric: 'tabular-nums' }}>
                              {new Date(log.fecha).toLocaleString('es-CO')}
                            </td>
                            <td className="py-3 px-4 text-sm font-semibold text-[#1A2420] w-36">{log.admin}</td>
                            <td className="py-3 px-4 text-xs font-bold text-[#6B7570]">{log.modulo}</td>
                            <td className="py-3 px-6 text-sm text-[#1A2420]">{log.accion}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>

        </main>
      </div>

      {/* FLOATING SAVE BAR */}
      {isDirty && (
        <div className="fixed bottom-0 left-64 right-0 bg-[#1A2420] text-white p-4 flex items-center justify-between z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] animate-fade-in-up">
          <div className="flex items-center gap-3 pl-8">
            <span className="text-sm font-medium">Tienes cambios sin guardar en la Configuración.</span>
          </div>
          <div className="flex gap-3 pr-8">
            <button onClick={() => { setConfig(initialServerConfig); setIsDirty(false); }} className="px-5 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors">
              Descartar
            </button>
            <button onClick={handleSaveClick} className="px-5 py-2 bg-[#154734] hover:bg-[#1F6E4A] rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
              <Save className="w-4 h-4" /> Guardar Cambios
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE TARIFA */}
      {modalConfirmacion && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden p-6 relative">
            <div className="w-12 h-12 bg-[#FEE9E0] text-[#E15A2E] rounded-full flex items-center justify-center mb-4 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#1A2420] text-center" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Cambio Crítico</h3>
            <p className="text-sm text-[#6B7570] text-center mt-2 mb-6">
              estás a punto de modificar la tarifa base del pasaje a <strong className="text-[#1A2420]">${config.tarifa}</strong>. Esto afectará el recaudo de todos los viajes inmediatamente.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setModalConfirmacion(false)} className="flex-1 py-2.5 bg-gray-100 text-[#1A2420] font-medium rounded-xl text-sm hover:bg-gray-200 transition-colors">Cancelar</button>
              <button onClick={guardarCambios} className="flex-1 py-2.5 bg-[#E15A2E] text-white font-medium rounded-xl text-sm hover:bg-orange-600 transition-colors">Confirmar Cambio</button>
            </div>
          </div>
        </div>
      )}

    
      {modalAdmin && (
        <div className="fixed inset-0 z-50 bg-[#1A2420]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 flex items-center justify-between border-b border-gray-100">
              <h2 className="text-lg font-bold text-[#1A2420]">Crear Nuevo Administrador</h2>
              <button onClick={() => setModalAdmin(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleCrearAdmin} className="space-y-4">
                <div><label className="block text-xs font-semibold text-[#6B7570] mb-1">Nombre</label><input required type="text" value={formAdmin.nombre} onChange={e => setFormAdmin({...formAdmin, nombre: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#154734]" /></div>
                <div><label className="block text-xs font-semibold text-[#6B7570] mb-1">Documento</label><input required type="text" value={formAdmin.documento} onChange={e => setFormAdmin({...formAdmin, documento: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#154734]" /></div>
                <div><label className="block text-xs font-semibold text-[#6B7570] mb-1">Correo Electrónico</label><input required type="email" value={formAdmin.correo} onChange={e => setFormAdmin({...formAdmin, correo: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#154734]" /></div>
                <div><label className="block text-xs font-semibold text-[#6B7570] mb-1">Contraseña Temporal</label><input required type="text" value={formAdmin.password} onChange={e => setFormAdmin({...formAdmin, password: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#154734]" /></div>
                <button type="submit" className="w-full bg-[#154734] text-white py-3 rounded-xl font-bold hover:bg-[#1F6E4A] transition-colors mt-6">Crear Cuenta Admin</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}






