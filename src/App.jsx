import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QrCode, Bus, Home, User, CreditCard, Info, History, Bell, LogOut, Search, Calendar, LifeBuoy, ChevronRight, ChevronDown, Download, HelpCircle, MessageSquare, ShieldCheck, X, ArrowUpRight, Plus, Star, ChevronUp, AlertTriangle, Ticket, Check } from 'lucide-react';
import Login from './pages/Login';
import ConductorDashboard from './pages/ConductorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminEstudiantes from './pages/AdminEstudiantes';
import AdminConductores from './pages/AdminConductores';
import AdminRutas from './pages/AdminRutas';
import AdminViajes from './pages/AdminViajes';
import AdminTransacciones from './pages/AdminTransacciones';
import AdminReportes from './pages/AdminReportes';
import AdminConfiguracion from './pages/AdminConfiguracion';
import QRCode from 'react-qr-code';
import { PlaceholdersAndVanishInput } from './components/PlaceholdersAndVanishInput';
import './index.css';

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

function StudentDashboard() {
  const [activeTab, setActiveTab] = useState('inicio');
  const [timeRange, setTimeRange] = useState('Semana');
  const [showQR, setShowQR] = useState(false);
  const [isClosingQR, setIsClosingQR] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [isClosingRecharge, setIsClosingRecharge] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [isClosingSupport, setIsClosingSupport] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [profileForm, setProfileForm] = useState({ nombre: '', telefono: '' });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [supportSubView, setSupportSubView] = useState(null); // 'faq' | 'report' | 'terms' | null
  const [expandedFaqIndex, setExpandedFaqIndex] = useState(0);
  const [qrDataString, setQrDataString] = useState('');
  const [currentQrToken, setCurrentQrToken] = useState(null);
  const [isQRPaid, setIsQRPaid] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Dashboard states
  const [rutaFavorita, setRutaFavorita] = useState('N/A');
  const [graficaSemanal, setGraficaSemanal] = useState([0,0,0,0,0,0,0]);

  const navigate = useNavigate();
  
  const [activeTrips, setActiveTrips] = useState([]);
  const [expandedTripId, setExpandedTripId] = useState(null);
  // Rutas: favorita (localStorage, temporal) y acordeón
  const [favoriteRouteId, setFavoriteRouteId] = useState(() => localStorage.getItem('favoriteRouteId') || null);
  const [expandedRouteId, setExpandedRouteId] = useState(null);
  // Reloj en tiempo real para cuenta regresiva
  const [now, setNow] = useState(() => new Date());
  
  const [balance, setBalance] = useState(0);
  const [configuraciones, setConfiguraciones] = useState({ coste_pasaje: 10000 });
  const [tienePaseRegreso, setTienePaseRegreso] = useState(false);
  const [paseRegreso, setPaseRegreso] = useState(null);
  const [user, setUser] = useState({ nombre: 'Estudiante', id: null });
  const [transactions, setTransactions] = useState([]);
  const [routesData, setRoutesData] = useState([]);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetch('/api/rutas/full')
      .then(res => res.json())
      .then(data => setRoutesData(data))
      .catch(console.error);

    fetch('/api/estudiantes/dashboard', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (data.usuario) {
          setUser(data.usuario);
          setBalance(data.saldo_actual);
          setTransactions(data.transacciones || []);
          if (data.ruta_favorita) setRutaFavorita(data.ruta_favorita);
          if (data.grafica_semanal) setGraficaSemanal(data.grafica_semanal);
          if (data.configuraciones) setConfiguraciones(data.configuraciones);
          if (data.tiene_pase_regreso !== undefined) {
            setTienePaseRegreso(data.tiene_pase_regreso);
            setPaseRegreso(data.pase_regreso);
          }
        }
      })
      .catch(console.error);
  }, [token]);

  useEffect(() => {
    const fetchActiveTrips = async () => {
      try {
        const res = await fetch('/api/trips/active', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setActiveTrips(data);
        }
      } catch (err) {
        console.error('Error fetching active trips', err);
      }
    };
    
    // Fetch initial
    fetchActiveTrips();
    
    // Poll every 5 seconds for real-time updates
    const intervalId = setInterval(fetchActiveTrips, 5000);
    return () => clearInterval(intervalId);
  }, [token]);

  const handleOpenNotifications = () => {
    setShowNotifications(true);
  };

  const handleCloseNotifications = () => {
    setShowNotifications(false);
  };

  const handleOpenRechargeModal = () => {
    setShowRechargeModal(true);
    setIsClosingRecharge(false);
  };

  const handleCloseRechargeModal = () => {
    setIsClosingRecharge(true);
    setTimeout(() => {
      setShowRechargeModal(false);
      setIsClosingRecharge(false);
    }, 320);
  };

  const handleOpenSupportModal = () => {
    setShowSupportModal(true);
    setIsClosingSupport(false);
  };

  const handleCloseSupportModal = () => {
    setIsClosingSupport(true);
    setTimeout(() => {
      setShowSupportModal(false);
      setIsClosingSupport(false);
    }, 320);
  };

  const handleOpenProfileEdit = () => {
    setProfileForm({ nombre: user.nombre || '', telefono: user.telefono || '' });
    setShowProfileEdit(true);
  };

  const handleCloseProfileEdit = () => {
    setShowProfileEdit(false);
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const res = await fetch('/api/estudiantes/perfil', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileForm)
      });
      if (res.ok) {
        setUser(prev => ({ ...prev, nombre: profileForm.nombre, telefono: profileForm.telefono }));
        const currentLS = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...currentLS, nombre: profileForm.nombre, telefono: profileForm.telefono }));
        handleCloseProfileEdit();
      } else {
        alert('Error al guardar perfil');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    } finally {
      setIsSavingProfile(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!token) {
      navigate('/login');
      return;
    }
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    if (userData.nombre) setUser(userData);

    // Fetch real balance
    fetchBalance();
  }, [navigate, token]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  // Reloj en tiempo real — actualiza cada 30s para la cuenta regresiva
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Helpers: ruta favorita con persistencia en localStorage (temporal)
  const handleToggleFavoriteRoute = async (routeId) => {
    const next = favoriteRouteId === routeId ? null : routeId;
    setFavoriteRouteId(next);
    if (next) localStorage.setItem('favoriteRouteId', next);
    else localStorage.removeItem('favoriteRouteId');

    try {
      await fetch('/api/estudiantes/ruta-favorita', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rutaId: next })
      });
    } catch (err) {
      console.error('Error guardando ruta favorita', err);
    }
  };

  const handleToggleRouteExpand = (routeId) => {
    setExpandedRouteId(prev => prev === routeId ? null : routeId);
  };

  const fetchBalance = async () => {
    try {
      const res = await fetch('/api/estudiantes/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.saldo_actual);
        setTransactions(data.transacciones || []);
        if (data.ruta_favorita) setRutaFavorita(data.ruta_favorita);
        if (data.grafica_semanal) setGraficaSemanal(data.grafica_semanal);
        if (data.configuraciones) setConfiguraciones(data.configuraciones);
        if (data.tiene_pase_regreso !== undefined) {
          setTienePaseRegreso(data.tiene_pase_regreso);
          setPaseRegreso(data.pase_regreso);
        }
        if (data.usuario) {
          setUser(prev => ({ ...prev, ...data.usuario }));
          // Update localStorage user just in case
          const currentLS = JSON.parse(localStorage.getItem('user') || '{}');
          localStorage.setItem('user', JSON.stringify({ ...currentLS, ...data.usuario }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleGenerateQR = () => {
    if (tienePaseRegreso || balance >= configuraciones.coste_pasaje) {
      // Generar token único para evitar doble cobro
      const token = window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
      
      const qrPayload = JSON.stringify({
        u: user.id,
        token: token,
        t: Date.now()
      });
      setQrDataString(qrPayload);
      setCurrentQrToken(token);
      setIsQRPaid(false);
      setShowQR(true);
      setIsClosingQR(false);
    } else {
      alert(`Saldo insuficiente. Necesitas al menos ${configuraciones.coste_pasaje.toLocaleString("es-CO")}`);
    }
  };

  // Efecto para hacer polling del estado del QR
  useEffect(() => {
    let intervalId;
    if (showQR && currentQrToken && !isQRPaid && !isClosingQR) {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch(`/api/validaciones/verificar/${currentQrToken}`);
          const data = await res.json();
          if (res.ok && data.pagado) {
            setIsQRPaid(true);
            // Ocultar modal automáticamente después de mostrar éxito
            setTimeout(() => {
              handleCloseQR();
            }, 3000);
          }
        } catch (err) {
          console.error("Error al verificar token:", err);
        }
      }, 1500);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [showQR, currentQrToken, isQRPaid, isClosingQR]);

  // Cuando se cierra el modal, animamos su salida y luego actualizamos
  const handleCloseQR = () => {
    setIsClosingQR(true);
    setTimeout(() => {
      setShowQR(false);
      setIsClosingQR(false);
      setIsQRPaid(false);
      setCurrentQrToken(null);
      fetchBalance();
    }, 320); // Tiempo para que termine la animación
  };

  const nextDepartures = [
    { route: 'Ruta Norte', time: '7:00 AM', station: 'Parada: Bienestar FET', status: 'success' },
    { route: 'Ruta Sur', time: '7:15 AM', station: 'Parada: Portería Principal', status: 'warning', delay: '15 min delay' },
  ]

  return (
    <div className="min-h-screen bg-[#FAF8F4] flex flex-col max-w-md mx-auto relative overflow-hidden" style={{ fontFamily: 'Manrope, sans-serif' }}>

      {/* Top Section */}
      <div className="px-5 pt-6 pb-2 relative z-10">
        {/* Navbar Superior */}
        <header className="flex items-center justify-between">
          <div 
            onClick={() => setActiveTab('inicio')}
            className="flex items-center gap-3 cursor-pointer"
            title="Ir al inicio"
          >
            <div className="w-9 h-9 rounded-full bg-[#E4EFE7] flex items-center justify-center shrink-0" style={{ border: '1.5px solid #154734/20' }}>
              <User className="w-4 h-4 text-[#154734] stroke-[1.5]" />
            </div>
            <div className="flex flex-col leading-none">
              <p className="text-xs text-[#6B7570] font-medium mb-0.5">Bienvenido de nuevo</p>
              <span className="font-semibold text-[#1A2420] text-base leading-none" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {user.nombre.split(' ')[0]}
              </span>
            </div>
          </div>
          <button 
            onClick={handleOpenNotifications}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-[#1A2420]/10 text-[#154734] hover:bg-[#E4EFE7] transition-colors" 
            title="Notificaciones"
            style={{ boxShadow: '0 1px 3px rgba(26,36,32,0.06)' }}
          >
            <Bell className="w-4 h-4 stroke-[1.5]" />
          </button>
        </header>

        {/* Search Bar */}
        <PlaceholdersAndVanishInput
          placeholders={[
            "Buscar ruta o parada...",
            "Ruta Norte, Ruta Sur...",
            "Horarios de salida FET...",
          ]}
        />

        {/* Balance Card — Boarding Pass Style */}
        {activeTab === 'inicio' && (
          <div className="mt-4 relative">
            {/* Main card */}
            <div
              className="rounded-2xl px-6 pt-5 pb-5 relative overflow-visible ticket-notch"
              style={{ backgroundColor: '#154734', boxShadow: '0 4px 24px rgba(21,71,52,0.25)' }}
            >
              {/* Dashed route line decoration — subtle, behind content */}
              <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg width="100%" height="2" xmlns="http://www.w3.org/2000/svg">
                  <line x1="0" y1="1" x2="100%" y2="1" stroke="rgba(255,255,255,0.07)" strokeWidth="2" strokeDasharray="6 5" />
                </svg>
              </div>

              {/* Label */}
              <p className="text-[11px] font-medium tracking-widest uppercase text-white/50 mb-1">
                Saldo disponible
              </p>

              {/* Balance number — Space Grotesk, large, tabular */}
              <div className="flex items-start gap-1 mb-1">
                <span className="text-white/70 font-medium mt-1.5" style={{ fontSize: '22px', fontFamily: 'Space Grotesk, sans-serif' }}>$</span>
                <span
                  className="text-white font-bold tabular-nums leading-none"
                  style={{ fontSize: '52px', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '-1.5px' }}
                >
                  {balance.toLocaleString('es-CO')}
                </span>
              </div>

              {/* Dashed divider — ticket perforation line */}
              <div className="relative my-4 mx-0">
                <svg width="100%" height="2">
                  <line x1="0" y1="1" x2="100%" y2="1" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeDasharray="5 4" />
                </svg>
              </div>

              {/* CTA Button — color corporativo unificado */}
              <button
                onClick={handleGenerateQR}
                className="w-full bg-[#E15A2E] hover:bg-[#c94b22] text-white font-semibold text-sm rounded-2xl shadow-md py-3.5 flex items-center justify-center gap-2 transition-all active:scale-95"
                style={{
                  fontFamily: 'Manrope, sans-serif',
                  boxShadow: '0 2px 12px rgba(225,90,46,0.35)'
                }}
              >
                {tienePaseRegreso ? (
                  <>
                    <Ticket className="w-4 h-4 stroke-[2]" />
                    Mostrar Pase de Regreso (QR)
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4 stroke-[2]" />
                    Generar QR
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-28 px-5 pt-2 relative z-10">
        {activeTab === 'inicio' && (
          <>
            {/* Quick Actions — Recargar primary, Soporte ghost */}
            <div className="flex gap-3 mb-5">
              {/* Recargar Saldo — primary */}
              <button
                onClick={handleOpenRechargeModal}
                className="flex-1 flex items-center gap-2.5 py-3 px-4 rounded-2xl transition-all active:scale-95"
                style={{ backgroundColor: '#154734', boxShadow: '0 2px 8px rgba(21,71,52,0.20)' }}
              >
                <CreditCard className="w-4 h-4 text-white/80 stroke-[1.5] shrink-0" />
                <span className="text-sm font-semibold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>Recargar Saldo</span>
              </button>

              {/* Soporte — ghost/outline */}
              <button
                onClick={handleOpenSupportModal}
                className="flex items-center gap-2 py-3 px-4 rounded-2xl border border-[#1A2420]/12 bg-white transition-all active:scale-95 hover:bg-[#E4EFE7] hover:border-[#154734]/20"
                style={{ boxShadow: '0 1px 3px rgba(26,36,32,0.06)' }}
              >
                <LifeBuoy className="w-4 h-4 text-[#154734] stroke-[1.5] shrink-0" />
                <span className="text-sm font-medium text-[#1A2420]" style={{ fontFamily: 'Manrope, sans-serif' }}>Soporte</span>
              </button>
            </div>

            {/* Próximas Salidas */}
            <div className="mb-24">
              <h3
                className="text-sm font-semibold mb-3 tracking-wide uppercase"
                style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#6B7570', letterSpacing: '0.06em' }}
              >
                Próximas Salidas
              </h3>

              {activeTrips.length === 0 ? (
                <div className="border border-dashed border-gray-300 rounded-2xl p-6 text-center bg-white">
                  <Bus className="w-8 h-8 mx-auto mb-2 text-[#154734] opacity-30 stroke-[1.5]" />
                  <p className="text-sm font-semibold text-[#1A2420]">Sin salidas activas por ahora</p>
                  <p className="text-xs text-[#6B7570] mt-1 leading-relaxed">
                    Aquí verás los buses en ruta en tiempo real.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeTrips.map(trip => (
                    <div
                      key={trip.id}
                      className="bg-white overflow-hidden rounded-[24px]"
                      style={{ border: '1.5px solid rgba(21,71,52,0.12)', boxShadow: '0 2px 8px rgba(21,71,52,0.07)' }}
                    >
                      {/* Collapsed pill header */}
                      <div
                        className="px-4 py-3 flex items-center justify-between cursor-pointer w-full"
                        onClick={() => setExpandedTripId(expandedTripId === trip.id ? null : trip.id)}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#E4EFE7' }}>
                            <Bus className="w-4 h-4 stroke-[1.5]" style={{ color: '#154734' }} />
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[#1A2420] text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                {trip.route_name}
                              </span>
                              <span
                                className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                                style={{
                                  backgroundColor: trip.sentido === 'desde_fet' ? '#E4EFE7' : '#FAF8F4',
                                  color: '#154734',
                                  border: '1px solid rgba(21,71,52,0.15)'
                                }}
                              >
                                {trip.sentido === 'desde_fet' ? 'Salida de la U' : 'Hacia la FET'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {trip.alert_message && (
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: '#FEE9E0', color: '#E15A2E' }}
                            >
                              {trip.alert_message}
                            </span>
                          )}
                          <span className="text-xs font-medium text-[#6B7570]">
                            {trip.passengers_count} a bordo
                          </span>
                          <ChevronDown
                            className="w-4 h-4 transition-transform duration-300 stroke-[1.5]"
                            style={{ color: '#6B7570', transform: expandedTripId === trip.id ? 'rotate(180deg)' : 'rotate(0deg)' }}
                          />
                        </div>
                      </div>

                      {/* Expanded content */}
                      <div
                        className={`transition-all duration-300 ease-in-out ${expandedTripId === trip.id ? 'max-h-[500px] opacity-100 overflow-y-auto' : 'max-h-0 opacity-0 overflow-hidden'}`}
                        style={{ scrollbarWidth: 'thin' }}
                      >
                        <div className="px-4 pb-4">
                          {/* Dashed divider */}
                          <svg width="100%" height="2" className="mb-3">
                            <line x1="0" y1="1" x2="100%" y2="1" stroke="rgba(21,71,52,0.12)" strokeWidth="1.5" strokeDasharray="5 4" />
                          </svg>

                          {/* Conductor row */}
                          <div className="flex items-center gap-2 mb-4">
                            <User className="w-3.5 h-3.5 stroke-[1.5] shrink-0" style={{ color: '#6B7570' }} />
                            <span className="text-xs text-[#6B7570]">
                              Conductor: <span className="font-semibold text-[#1A2420]">{trip.driver_name}</span>
                            </span>
                          </div>

                          {/* Route stepper */}
                          <div className="bg-white rounded-b-2xl overflow-x-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#E4EFE7 transparent' }}>
                            <div className="p-4 relative min-w-[280px]">
                              {/* Línea vertical continua a la izquierda */}
                              <div className="absolute left-[24px] top-[40px] bottom-[20px] w-[2px] -translate-x-1/2 bg-[#1A2420] z-0"></div>

                              <div className="flex flex-col gap-1.5">
                                {(() => {
                                  const baseStops = routesData.find(r => r.name === trip.route_name)?.paradas || [];
                                  const rawStops = trip.sentido === 'desde_fet' ? [...baseStops].reverse() : [...baseStops];
                                  
                                  const tripStops = rawStops.map(stopName => {
                                    let displayName = stopName;
                                    // Formateo visual de nombres para que se vean más limpios en la UI
                                    if (stopName === 'C.C. Único') displayName = 'Unico';
                                    if (stopName === 'Universidad FET') displayName = 'Universidad';
                                    
                                    return {
                                      originalName: stopName,
                                      name: displayName
                                    };
                                  });
                                  
                                  let activeIndex = tripStops.findIndex(s => s.originalName === trip.stage);
                                  if (activeIndex === -1 && !trip.stage) activeIndex = 0;
                                  if (activeIndex === -1) activeIndex = 0; // fallback

                                  return tripStops.map((stop, idx) => {
                                    const isActive = idx === activeIndex;
                                    const isDone = idx <= activeIndex;
                                    
                                    // Valores simulados para la maqueta visual
                                    const mockTime = `${8 + idx}:00 AM`;
                                    
                                    const showHeader = idx === 0 ? "En recorrido" : null;

                                    // Lógica de subtítulo dinámico
                                    let dynamicSubtitle = null;
                                    if (isActive) {
                                      const isLastStop = idx === tripStops.length - 1;
                                      
                                      if (isLastStop) {
                                        dynamicSubtitle = "Ruta finalizada";
                                      } else {
                                        // Usamos el estado real is_moving de la base de datos
                                        const isBoarding = !trip.is_moving; 
                                        
                                        if (isBoarding) {
                                          dynamicSubtitle = "Pasajeros abordando";
                                        } else {
                                          const nextStop = tripStops[idx + 1];
                                          if (nextStop) {
                                            dynamicSubtitle = `En recorrido hacia ${nextStop.name}`;
                                          }
                                        }
                                      }
                                    }

                                    return (
                                      <div key={idx} className="flex flex-col">
                                        {showHeader && (
                                          <div className="text-xs font-bold text-[#1A2420] mt-3 mb-1 ml-[32px]">
                                            {showHeader}
                                          </div>
                                        )}
                                        <div className="relative flex items-center z-10 py-1.5">
                                          {/* Nodo */}
                                          <div className="w-4 flex flex-col items-center justify-center shrink-0">
                                            {isDone ? (
                                              <div className="bg-[#1A2420] w-3.5 h-3.5 rounded-full z-10" />
                                            ) : (
                                              <div className="bg-white border-2 border-[#1A2420] w-3.5 h-3.5 rounded-full z-10" />
                                            )}
                                          </div>
                                          
                                          {/* 2 Columnas a la derecha */}
                                          <div className="ml-4 flex flex-1 items-center">
                                            {/* Columna 1: Hora */}
                                            <div className="w-16 text-[11px] text-[#6B7570] shrink-0" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                              {mockTime}
                                            </div>
                                            
                                            {/* Columna 2: Estado/Parada */}
                                            <div className="flex-1 flex flex-col justify-center">
                                              <div className="flex items-center gap-2">
                                                <span 
                                                  className={`text-[13px] ${isActive ? 'font-bold text-[#1A2420]' : (isDone ? 'font-semibold text-[#1A2420]' : 'font-medium text-[#6B7570]')}`}
                                                  style={{ fontFamily: 'Manrope, sans-serif' }}
                                                >
                                                  {stop.name}
                                                </span>
                                                {trip.alert_message && isActive && (
                                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FEE9E0', color: '#E15A2E' }}>
                                                    {trip.alert_message}
                                                  </span>
                                                )}
                                              </div>
                                              {dynamicSubtitle && (
                                                <span className="text-[10px] text-[#154734] font-medium mt-0.5" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                                  {dynamicSubtitle}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'rutas' && (() => {
          // ─────────────────────────────────────────────────────────────────
          // DATOS ESTÁTICOS DE HORARIOS (fuente de verdad hasta conectar API)
          // Estructura: cada ruta tiene paradas[] y salidas[]
          // salidas[] = array de filas del horario; cada fila tiene horas[]
          //   en el mismo orden que paradas[]
          // ─────────────────────────────────────────────────────────────────
          const ROUTES_DATA = routesData.length > 0 ? routesData : [];

          // ── Ordenar: favorita primero ────────────────────────────────────
          const sortedData = [...ROUTES_DATA].sort((a, b) => {
            if (a.id === favoriteRouteId) return -1;
            if (b.id === favoriteRouteId) return 1;
            return 0;
          });

          // ── Pestaña activa: por defecto la favorita o la primera ─────────
          // Usamos expandedRouteId repropuesto como "selectedRouteTab"
          // Si no hay ninguna seleccionada, usamos la primera (favorita o norte)
          const selectedTabId = expandedRouteId || sortedData[0]?.id || 'norte';
          const selectedRoute = ROUTES_DATA.find(r => r.id === selectedTabId) || ROUTES_DATA[0];

          // ── Helper: determinar si una salida ya pasó o es la próxima ─────
          // Usa la hora de la primera parada (columna origen)
          const getSalidaStatus = (horasArr) => {
            const validHoraStr = horasArr.find(h => h && h.trim() !== '' && h !== '--');
            if (!validHoraStr) return 'past';
            
            const [h, m] = validHoraStr.split(':').map(Number);
            const t = new Date(now);
            t.setHours(h, m, 0, 0);
            if (t < now) return 'past';
            return 'upcoming';
          };

          // Calcular cuál salida es "la próxima" para resaltarla
          let nextSalidaNum = null;
          for (const salida of selectedRoute.salidas) {
            const status = getSalidaStatus(salida.horas);
            if (status === 'upcoming') { nextSalidaNum = salida.num; break; }
          }

          return (
            <div className="pb-28 animate-slide-in">

              {/* ── HEADER ── */}
              <div className="px-5 pt-2 mb-5">
                <p
                  className="text-[11px] font-medium tracking-widest uppercase text-[#6B7570] mb-1"
                  style={{ fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.08em' }}
                >
                  Sanbus FET
                </p>
                <h1
                  className="font-bold text-[#1A2420] leading-tight mb-1"
                  style={{ fontSize: '22px', fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  Horarios Oficiales
                </h1>
                <p className="text-xs text-[#6B7570]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Consulta los horarios y cambios vigentes de cada ruta
                </p>
              </div>

              {/* ── PESTAÑAS DE RUTA (underline tabs) ──────────────────────── */}
              <div className="px-5 mb-1">
                <div
                  className="flex gap-0 overflow-x-auto"
                  style={{ scrollbarWidth: 'none', borderBottom: '1.5px solid #E5E7EB' }}
                >
                  {sortedData.map((route) => {
                    const isActive = selectedTabId === route.id;
                    const isFav = favoriteRouteId === route.id;
                    return (
                      <button
                        key={route.id}
                        onClick={() => setExpandedRouteId(route.id)}
                        className="flex items-center gap-1.5 px-4 py-3 shrink-0 relative transition-colors"
                        style={{ outline: 'none' }}
                      >
                        <span
                          style={{
                            fontFamily: 'Space Grotesk, sans-serif',
                            fontSize: '13px',
                            fontWeight: isActive ? 600 : 400,
                            color: isActive ? '#154734' : '#6B7570',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {route.name}
                        </span>
                        {isFav && (
                          <Star
                            className="w-3 h-3 shrink-0"
                            style={{ color: '#154734', fill: '#154734' }}
                          />
                        )}
                        {/* Línea activa abajo */}
                        {isActive && (
                          <span
                            className="absolute bottom-0 left-0 right-0"
                            style={{ height: '2.5px', backgroundColor: '#154734', borderRadius: '2px 2px 0 0' }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── ENCABEZADO DE RUTA SELECCIONADA ────────────────────────── */}
              <div className="px-5 py-4">
                {/* Nombre + estrella */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2
                      className="font-semibold text-[#1A2420]"
                      style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px' }}
                    >
                      {selectedRoute.name}
                    </h2>
                    <p className="text-xs text-[#6B7570] mt-0.5" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      {selectedRoute.origen} → {selectedRoute.destino}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleFavoriteRoute(selectedRoute.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors"
                    style={{
                      border: '1px solid',
                      borderColor: favoriteRouteId === selectedRoute.id ? '#154734' : '#E5E7EB',
                      backgroundColor: favoriteRouteId === selectedRoute.id ? '#E4EFE7' : 'transparent',
                    }}
                    aria-label={favoriteRouteId === selectedRoute.id ? 'Quitar favorita' : 'Marcar favorita'}
                  >
                    <Star
                      className="w-3.5 h-3.5"
                      style={{
                        color: favoriteRouteId === selectedRoute.id ? '#154734' : '#9CA3AF',
                        fill: favoriteRouteId === selectedRoute.id ? '#154734' : 'none',
                      }}
                    />
                    <span
                      className="text-[11px] font-medium"
                      style={{
                        fontFamily: 'Manrope, sans-serif',
                        color: favoriteRouteId === selectedRoute.id ? '#154734' : '#6B7570',
                      }}
                    >
                      {favoriteRouteId === selectedRoute.id ? 'Favorita' : 'Favorita'}
                    </span>
                  </button>
                </div>

                {/* Metadatos en cuadrícula 3 columnas */}
                <div className="grid grid-cols-3 gap-x-4 gap-y-3">
                  {[
                    { label: 'PRIMERA SALIDA', value: selectedRoute.salidas[0]?.horas[0] },
                    { label: 'ÚLTIMA SALIDA', value: selectedRoute.salidas[selectedRoute.salidas.length - 1]?.horas[0] },
                    { label: 'DURACIÓN', value: selectedRoute.duracion },
                    { label: 'FRECUENCIA', value: selectedRoute.frecuencia },
                    { label: 'DÍAS', value: selectedRoute.diasOperacion },
                    { label: 'TARIFA', value: selectedRoute.tarifa },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p
                        className="text-[9px] font-semibold uppercase tracking-wider mb-0.5"
                        style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#9CA3AF', letterSpacing: '0.07em' }}
                      >
                        {label}
                      </p>
                      <p
                        className="text-sm font-semibold text-[#1A2420]"
                        style={{ fontFamily: 'Manrope, sans-serif' }}
                      >
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Divisor fino */}
              <div className="mx-5" style={{ height: '1px', backgroundColor: '#E5E7EB' }} />

              {/* ── TABLA DE HORARIOS ────────────────────────────────────── */}
              <div className="px-5 pt-4 pb-2">
                <p
                  className="text-[10px] font-semibold uppercase tracking-wider text-black mb-3"
                  style={{ fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.08em' }}
                >
                  Cuadro de salidas
                </p>

                {/* Contenedor con scroll horizontal, primera col sticky */}
                <div
                  className="overflow-x-auto rounded-lg"
                  style={{ scrollbarWidth: 'thin', scrollbarColor: '#E4EFE7 transparent' }}
                >
                  <table
                    className="w-full border-collapse"
                    style={{ minWidth: `${60 + selectedRoute.paradas.length * 90}px` }}
                    aria-label={`Horario de ${selectedRoute.name}`}
                  >
                    <thead>
                      <tr>
                        {/* Encabezado de la columna "Salida #" — sticky */}
                        <th
                          scope="col"
                          className="text-left py-2 pr-3"
                          style={{
                            position: 'sticky',
                            left: 0,
                            backgroundColor: '#FAF8F4',
                            zIndex: 10,
                            fontFamily: 'Space Grotesk, sans-serif',
                            fontSize: '9px',
                            fontWeight: 600,
                            color: '#154734',
                            textTransform: 'uppercase',
                            letterSpacing: '0.07em',
                            whiteSpace: 'nowrap',
                            borderBottom: '1.5px solid #E5E7EB',
                          }}
                        >
                          Salida
                        </th>
                        {/* Encabezados de parada */}
                        {selectedRoute.paradas.map((parada, pIdx) => {
                          const isDestino = pIdx === selectedRoute.paradas.length - 1;
                          return (
                            <th
                              key={pIdx}
                              scope="col"
                              className="text-right py-2 px-3"
                              style={{
                                fontFamily: 'Space Grotesk, sans-serif',
                                fontSize: '9px',
                                fontWeight: 600,
                                color: '#154734',
                                textTransform: 'uppercase',
                                letterSpacing: '0.07em',
                                whiteSpace: 'nowrap',
                                minWidth: '80px',
                                borderBottom: '1.5px solid #E5E7EB',
                              }}
                            >
                              {parada}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRoute.salidas.map((salida, sIdx) => {
                        const isPast = getSalidaStatus(salida.horas) === 'past';
                        const isNext = salida.num === nextSalidaNum;
                        const isEven = sIdx % 2 === 0;

                        return (
                          <tr
                            key={salida.num}
                            style={{
                              backgroundColor: isNext
                                ? '#E4EFE7'
                                : isEven
                                ? 'transparent'
                                : 'rgba(245,245,240,0.6)',
                              opacity: 1,
                            }}
                          >
                            {/* Número de salida — sticky */}
                            <td
                              className="py-3 pr-3"
                              style={{
                                position: 'sticky',
                                left: 0,
                                backgroundColor: isNext
                                  ? '#E4EFE7'
                                  : isEven
                                  ? '#FAF8F4'
                                  : 'rgba(245,245,240,0.97)',
                                zIndex: 9,
                                fontFamily: 'Space Grotesk, sans-serif',
                                fontSize: '11px',
                                fontWeight: isNext ? 700 : 500,
                                color: isNext ? '#154734' : '#1A2420',
                                whiteSpace: 'nowrap',
                                borderBottom: '1px solid #F3F4F6',
                              }}
                            >
                              {isNext && (
                                <span
                                  className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle"
                                  style={{ backgroundColor: '#154734', marginBottom: '1px' }}
                                />
                              )}
                              Salida {salida.num}
                            </td>

                            {/* Horas por parada */}
                            {salida.horas.map((hora, hIdx) => {
                              const isDestino = hIdx === salida.horas.length - 1;
                              return (
                                <td
                                  key={hIdx}
                                  className="py-3 px-3 text-right tabular-nums"
                                  style={{
                                    fontFamily: 'Space Grotesk, sans-serif',
                                    fontSize: '13px',
                                    fontWeight: isNext ? (isDestino ? 700 : 600) : 500,
                                    color: isNext
                                      ? isDestino ? '#154734' : '#1A2420'
                                      : isDestino ? '#154734' : '#1A2420',
                                    borderBottom: '1px solid #F3F4F6',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {hora && hora.trim() !== '' ? hora : '--'}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Leyenda discreta */}
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: '#E4EFE7' }} />
                    <span className="text-[10px] text-[#6B7570]" style={{ fontFamily: 'Manrope, sans-serif' }}>Próxima salida</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm inline-block opacity-40" style={{ backgroundColor: '#9CA3AF' }} />
                    <span className="text-[10px] text-[#6B7570]" style={{ fontFamily: 'Manrope, sans-serif' }}>Ya pasó</span>
                  </div>
                </div>
              </div>

              {/* Divisor fino */}
              <div className="mx-5 mt-2 mb-4" style={{ height: '1px', backgroundColor: '#E5E7EB' }} />

              {/* ── AVISOS DE CAMBIOS DE HORARIO ────────────────────────── */}
              <div className="px-5 mb-24">
                <p
                  className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] mb-3"
                  style={{ fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.08em' }}
                >
                  Cambios y avisos de horario
                </p>

                {selectedRoute.avisos.filter(a => a.activo).length === 0 ? (
                  <p className="text-sm text-[#9CA3AF]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Sin cambios de horario programados.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {selectedRoute.avisos
                      .filter(a => a.activo)
                      .map((aviso) => (
                        <div
                          key={aviso.id}
                          className="rounded-xl px-4 py-3"
                          style={{ backgroundColor: '#FEE9E0' }}
                        >
                          <p
                            className="text-[10px] font-semibold uppercase tracking-wider mb-1"
                            style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#E15A2E', letterSpacing: '0.07em' }}
                          >
                            {aviso.titulo ? `${aviso.titulo} • ` : ''}{timeAgo(aviso.created_at)}
                          </p>
                          <p
                            className="text-sm leading-snug"
                            style={{ fontFamily: 'Manrope, sans-serif', color: '#92400E' }}
                          >
                            {aviso.mensaje}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </div>

            </div>
          );
        })()}

        {activeTab === 'historial' && (

          <div className="pb-28 animate-slide-in">

            {/* ── HEADER ── */}
            <div className="px-5 pt-2 mb-4">
              <p className="text-[11px] font-medium tracking-widest uppercase text-[#6B7570] mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.08em' }}>
                Mi cuenta
              </p>
              <h1 className="font-bold text-[#1A2420] leading-tight" style={{ fontSize: '22px', fontFamily: 'Space Grotesk, sans-serif' }}>
                Historial y Métricas
              </h1>
            </div>

            {/* ── SELECTOR DE RANGO ── */}
            <div
              className="flex p-1 rounded-xl mx-5 mb-4"
              style={{ backgroundColor: '#E4EFE7' }}
            >
              {['Día', 'Semana', 'Mes'].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className="flex-1 py-1.5 text-xs rounded-lg transition-all"
                  style={{
                    fontFamily: 'Manrope, sans-serif',
                    fontWeight: timeRange === range ? 700 : 500,
                    color: timeRange === range ? '#154734' : '#6B7570',
                    backgroundColor: timeRange === range ? '#FFFFFF' : 'transparent',
                    boxShadow: timeRange === range ? '0 1px 3px rgba(21,71,52,0.12)' : 'none',
                  }}
                >
                  {range}
                </button>
              ))}
            </div>

            {/* ── TARJETA DE GASTO (estilo recibo/comprobante) ── */}
            <div
              className="mx-5 mb-4 rounded-2xl bg-white p-5"
              style={{ border: '1.5px dashed rgba(21,71,52,0.20)', boxShadow: '0 2px 8px rgba(21,71,52,0.05)' }}
            >
              {/* Top row: label + trend badge */}
              <div className="flex items-center justify-between mb-1">
                <p
                  className="text-[10px] font-semibold tracking-widest uppercase"
                  style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#6B7570', letterSpacing: '0.08em' }}
                >
                  Gasto {timeRange === 'Día' ? 'hoy' : timeRange === 'Semana' ? 'esta semana' : 'este mes'}
                </p>
                {/* Badge: ámbar si gasto sube, verde si baja — semántica correcta */}
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{
                    backgroundColor: '#FEF3C7',
                    color: '#92400E',
                  }}
                >
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M4 7V1M4 1L1.5 3.5M4 1L6.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  +12% vs. sem. anterior
                </span>
              </div>

              {/* Amount — large tabular Space Grotesk */}
              <div className="flex items-start gap-0.5 mb-4">
                <span className="text-[#6B7570] font-medium mt-1" style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px' }}>$</span>
                <span
                  className="font-bold text-[#1A2420] tabular-nums leading-none"
                  style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '40px', letterSpacing: '-1px' }}
                >
                  {(() => {
                    const gastos = transactions.filter(t => t.tipo === 'GASTO').reduce((acc, t) => acc + parseFloat(t.monto), 0);
                    return gastos.toLocaleString('es-CO');
                  })()}
                </span>
                <span className="text-[#6B7570] text-xs font-medium mt-auto mb-1.5 ml-1" style={{ fontFamily: 'Manrope, sans-serif' }}>COP</span>
              </div>

              {/* Chart dashed divider */}
              <div className="mb-3">
                <svg width="100%" height="1"><line x1="0" y1="0.5" x2="100%" y2="0.5" stroke="rgba(21,71,52,0.10)" strokeWidth="1" strokeDasharray="4 4" /></svg>
              </div>

              {/* Bar chart — brand palette */}
              <div className="grid grid-cols-7 gap-2 items-end h-28 px-1">
                {[
                  { day: 'L', index: 0 },
                  { day: 'M', index: 1 },
                  { day: 'M', index: 2 },
                  { day: 'J', index: 3 },
                  { day: 'V', index: 4 },
                  { day: 'S', index: 5 },
                  { day: 'D', index: 6 },
                ].map((item) => {
                  const maxVal = Math.max(...graficaSemanal, 10000); // 10000 is min height threshold
                  const heightPercent = `${(graficaSemanal[item.index] / maxVal) * 100}%`;
                  
                  return (
                  <div key={item.index} className="flex flex-col items-center h-full w-full">
                    <div
                      className="rounded-full h-full w-full relative flex items-end justify-center overflow-hidden"
                      style={{ backgroundColor: '#E4EFE7' }}
                    >
                      <div
                        className="rounded-full w-full transition-all duration-500"
                        style={{ height: heightPercent, backgroundColor: '#1F6E4A' }}
                      />
                    </div>
                    <span
                      className="text-[10px] text-center mt-1.5"
                      style={{ color: '#6B7570', fontFamily: 'Space Grotesk, sans-serif', fontWeight: 500 }}
                    >
                      {item.day}
                    </span>
                  </div>
                  );
                })}
              </div>
            </div>

            {/* ── MÉTRICAS SECUNDARIAS ── */}
            <div className="grid grid-cols-2 gap-3 mx-5 mb-5">
              <div
                className="bg-white p-4 rounded-2xl"
                style={{ border: '1.5px dashed rgba(21,71,52,0.18)' }}
              >
                <p
                  className="text-[10px] font-semibold uppercase tracking-widest mb-1.5"
                  style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#6B7570', letterSpacing: '0.07em' }}
                >
                  Viajes
                </p>
                <p className="font-bold text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '20px' }}>
                  {transactions.filter(t => t.tipo === 'GASTO').length}
                </p>
                <p className="text-xs text-[#6B7570]" style={{ fontFamily: 'Manrope, sans-serif' }}>abordajes</p>
              </div>
              <div
                className="bg-white p-4 rounded-2xl"
                style={{ border: '1.5px dashed rgba(21,71,52,0.18)' }}
              >
                <p
                  className="text-[10px] font-semibold uppercase tracking-widest mb-1.5"
                  style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#6B7570', letterSpacing: '0.07em' }}
                >
                  Ruta favorita
                </p>
                <p className="font-bold text-[#1A2420]" style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', lineHeight: '1.2' }}>{rutaFavorita}</p>
              </div>
            </div>

            {/* ── ÚLTIMOS MOVIMIENTOS ── */}
            <div className="mx-5 mb-2 flex items-center justify-between">
              <h3
                className="text-sm font-semibold"
                style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1A2420' }}
              >
                Últimos Movimientos
              </h3>
              {/* PDF button — pill táctil */}
              <button
                className="flex items-center gap-1.5 py-1.5 px-3 rounded-full transition-colors hover:bg-[#E4EFE7]"
                style={{ border: '1.5px solid rgba(21,71,52,0.18)', fontFamily: 'Manrope, sans-serif' }}
              >
                <Download className="w-3.5 h-3.5 stroke-[1.5]" style={{ color: '#154734' }} />
                <span className="text-xs font-semibold" style={{ color: '#154734' }}>Descargar PDF</span>
              </button>
            </div>

            {/* Movement list — ledger agrupado por fecha */}
            {(() => {
              const grouped = {};
              transactions.forEach(t => {
                const dateKey = t.fecha.split('T')[0]; // simple ISO date
                if (!grouped[dateKey]) grouped[dateKey] = [];
                grouped[dateKey].push({
                  id: t.id,
                  desc: t.descripcion || (t.tipo === 'RECARGA' ? 'Recarga de saldo' : 'Abordaje'),
                  time: t.fecha_corta.split(' ')[1] || '',
                  amount: t.tipo === 'RECARGA' ? parseFloat(t.monto) : -parseFloat(t.monto),
                  type: t.tipo === 'RECARGA' ? 'recarga' : 'gasto'
                });
              });
              const movementGroups = Object.keys(grouped).map(k => ({ label: k, items: grouped[k] }));
              return (
                <div className="mx-5 mb-24">
                  {movementGroups.map((group, gIdx) => (
                    <div key={group.label}>
                      {/* Encabezado de grupo */}
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-4 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        {group.label}
                      </h4>

                      {/* Filas del grupo */}
                      {group.items.map((item, iIdx) => (
                        <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                          {/* Left side: Icon and Info */}
                          <div className="flex items-center gap-3">
                            {/* Ícono circular */}
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                item.type === 'recarga' ? 'bg-emerald-50' : 'bg-gray-100'
                              }`}
                            >
                              {item.type === 'recarga' ? (
                                <Plus className="w-5 h-5 text-emerald-600" />
                              ) : (
                                <ArrowUpRight className="w-5 h-5 text-gray-600" />
                              )}
                            </div>
                            
                            {/* Textos */}
                            <div className="flex flex-col gap-0.5">
                              <span
                                className="text-sm font-medium text-gray-900"
                                style={{ fontFamily: 'Manrope, sans-serif' }}
                              >
                                {item.desc}
                              </span>
                              <span
                                className="text-xs text-gray-400"
                                style={{ fontFamily: 'Manrope, sans-serif' }}
                              >
                                {item.time}
                              </span>
                            </div>
                          </div>

                          {/* Monto */}
                          <span
                            className="text-sm font-medium tabular-nums"
                            style={{
                              fontFamily: 'Space Grotesk, sans-serif',
                              color: item.amount > 0 ? '#059669' : '#111827',
                            }}
                          >
                            {item.amount > 0
                              ? `+$${item.amount.toLocaleString('es-CO')}`
                              : `-$${Math.abs(item.amount).toLocaleString('es-CO')}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              );
            })()}

          </div>
        )}

        {activeTab === 'perfil' && (
          <div className="pb-28 animate-slide-in">
            {!showProfileEdit && !supportSubView ? (
              <>
                {/* ── 1. CARNÉ DE ESTUDIANTE (Boarding Pass Style) ── */}
                <div className="mx-5 mt-2 mb-5 relative">
                  <div
                    className="rounded-2xl px-5 pt-5 pb-0 relative overflow-visible ticket-notch"
                    style={{ backgroundColor: '#154734', boxShadow: '0 4px 20px rgba(21,71,52,0.22)' }}
                  >
                    {/* Subtle dashed background line */}
                    <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg width="100%" height="2"><line x1="0" y1="1" x2="100%" y2="1" stroke="rgba(255,255,255,0.06)" strokeWidth="2" strokeDasharray="6 5" /></svg>
                    </div>

                    {/* Top row: avatar + name/ID */}
                    <div className="flex items-center gap-4 relative z-10">
                      {/* Avatar */}
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 font-bold text-lg"
                        style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: '#fff', fontFamily: 'Space Grotesk, sans-serif', border: '2px solid rgba(255,255,255,0.18)' }}
                      >
                        {user.nombre ? user.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'JP'}
                      </div>
                      {/* Name + ID */}
                      <div className="flex flex-col">
                        <p className="text-[10px] font-medium tracking-widest uppercase text-white/50 mb-0.5">Estudiante FET</p>
                        <h2
                          className="font-bold text-white leading-tight"
                          style={{ fontSize: '18px', fontFamily: 'Space Grotesk, sans-serif' }}
                        >
                          {user.nombre || 'Juan Pérez'}
                        </h2>
                        <span className="text-[11px] text-white/50 mt-0.5">ID: {user.id || '202684'}</span>
                      </div>
                    </div>

                    {/* Dashed ticket perforación line */}
                    <div className="relative my-4 z-10">
                      <svg width="100%" height="2">
                        <line x1="0" y1="1" x2="100%" y2="1" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeDasharray="5 4" />
                      </svg>
                    </div>

                    {/* Bottom row: Verified badge */}
                    <div className="flex items-center gap-2 pb-5 z-10 relative">
                      <span
                        className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full"
                        style={{ backgroundColor: 'rgba(228,239,231,0.18)', color: '#E4EFE7', border: '1px solid rgba(228,239,231,0.25)' }}
                      >
                        <ShieldCheck className="w-3 h-3 stroke-[2]" />
                        Verificado
                      </span>
                      <span className="text-[10px] text-white/35 ml-auto">SANBUS · {new Date().getFullYear()}</span>
                    </div>
                  </div>
                </div>

                {/* ── 2. CUENTA Y PREFERENCIAS ── */}
                <h3
                  className="text-[10px] font-semibold mb-2 mx-5 tracking-widest uppercase"
                  style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#9CA3AF', letterSpacing: '0.10em' }}
                >
                  Cuenta y Preferencias
                </h3>
                <div
                  className="mx-5 mb-5 rounded-2xl overflow-hidden bg-white"
                  style={{ border: '1.5px solid rgba(21,71,52,0.10)', boxShadow: '0 2px 8px rgba(21,71,52,0.04)' }}
                >
                  {/* Row: Información Personal */}
                  <div
                    onClick={handleOpenProfileEdit}
                    className="px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#F8FAF9] active:bg-[#F0F7F3] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 shrink-0 stroke-[1.5]" style={{ color: '#6B7570' }} />
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold text-[#1A2420]" style={{ fontFamily: 'Manrope, sans-serif' }}>Información personal</span>
                        <span className="text-[11px]" style={{ color: '#9CA3AF', fontFamily: 'Manrope, sans-serif' }}>Nombre, correo y teléfono</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 stroke-[1.5] shrink-0" style={{ color: '#CBD5E1' }} />
                  </div>

                  
                </div>

                {/* ── 3. SOPORTE Y AYUDA ── */}
                <h3
                  className="text-[10px] font-semibold mb-2 mx-5 tracking-widest uppercase"
                  style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#9CA3AF', letterSpacing: '0.10em' }}
                >
                  Soporte y Ayuda
                </h3>
                <div
                  className="mx-5 mb-5 rounded-2xl overflow-hidden bg-white"
                  style={{ border: '1.5px solid rgba(21,71,52,0.10)', boxShadow: '0 2px 8px rgba(21,71,52,0.04)' }}
                >
                  {/* Row: Centro de Ayuda */}
                  <div
                    onClick={() => setSupportSubView('faq')}
                    className="px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#F8FAF9] active:bg-[#F0F7F3] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <HelpCircle className="w-4 h-4 shrink-0 stroke-[1.5]" style={{ color: '#6B7570' }} />
                      <span className="text-sm font-semibold text-[#1A2420]" style={{ fontFamily: 'Manrope, sans-serif' }}>Centro de ayuda y Preguntas Frecuentes</span>
                    </div>
                    <ChevronRight className="w-4 h-4 stroke-[1.5] shrink-0" style={{ color: '#CBD5E1' }} />
                  </div>

                  {/* Divisor sólido */}
                  <div className="ml-[52px] mr-0" style={{ height: '1px', backgroundColor: 'rgba(21,71,52,0.06)' }} />

                  

                  {/* Row: Términos */}
                  <div
                    onClick={() => setSupportSubView('terms')}
                    className="px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-[#F8FAF9] active:bg-[#F0F7F3] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-4 h-4 shrink-0 stroke-[1.5]" style={{ color: '#6B7570' }} />
                      <span className="text-sm font-semibold text-[#1A2420]" style={{ fontFamily: 'Manrope, sans-serif' }}>Términos y Políticas de Privacidad</span>
                    </div>
                    <ChevronRight className="w-4 h-4 stroke-[1.5] shrink-0" style={{ color: '#CBD5E1' }} />
                  </div>
                </div>

                {/* ── 4. CERRAR SESIÓN ── */}
                <div className="px-5 mb-4">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl transition-colors hover:bg-red-100/70"
                    style={{
                      backgroundColor: '#FEF2F2',
                      color: '#DC2626',
                      fontFamily: 'Manrope, sans-serif',
                      fontWeight: 600,
                      fontSize: '14px',
                      border: '1.5px solid rgba(220,38,38,0.12)',
                    }}
                  >
                    <LogOut className="w-4 h-4 stroke-[1.5]" />
                    Cerrar Sesión
                  </button>
                </div>

                {/* ── 5. VERSIÓN — Talón del tiquete ── */}
                <div className="px-5 mb-24">
                  <svg width="100%" height="1" className="mb-3">
                    <line x1="0" y1="0.5" x2="100%" y2="0.5" stroke="rgba(26,36,32,0.12)" strokeWidth="1" strokeDasharray="5 5" />
                  </svg>
                  <p className="text-[11px] text-center" style={{ color: 'rgba(26,36,32,0.25)', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.04em' }}>
                    SANBUS v1.0.4 · 2026
                  </p>
                </div>
              </>
            ) : showProfileEdit ? (
              <div className="animate-fade-in">
                {/* Header with back button */}
                <div className="px-5 pt-8 pb-4 flex items-center gap-3">
                  <button onClick={handleCloseProfileEdit} className="p-2 rounded-full transition-colors hover:bg-black/5" style={{ backgroundColor: '#E4EFE7' }}>
                    <ChevronRight className="w-5 h-5 rotate-180 stroke-[1.5]" style={{ color: '#154734' }} />
                  </button>
                  <h1 className="text-xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1A2420' }}>Información Personal</h1>
                </div>

                <div className="px-5 mt-2 space-y-5 mb-8">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#6B7570' }}>Nombre Completo</label>
                    <input 
                      type="text" 
                      value={profileForm.nombre}
                      onChange={(e) => setProfileForm({...profileForm, nombre: e.target.value})}
                      className="w-full rounded-2xl px-4 py-3.5 text-sm outline-none transition-all"
                      style={{ backgroundColor: '#FFFFFF', border: '1.5px solid rgba(21,71,52,0.12)', color: '#1A2420', fontFamily: 'Manrope, sans-serif', boxShadow: '0 2px 8px rgba(21,71,52,0.02)' }}
                      onFocus={(e) => e.target.style.borderColor = '#154734'}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(21,71,52,0.12)'}
                      placeholder="Tu nombre"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#6B7570' }}>Teléfono</label>
                    <input 
                      type="tel" 
                      value={profileForm.telefono}
                      onChange={(e) => setProfileForm({...profileForm, telefono: e.target.value})}
                      className="w-full rounded-2xl px-4 py-3.5 text-sm outline-none transition-all"
                      style={{ backgroundColor: '#FFFFFF', border: '1.5px solid rgba(21,71,52,0.12)', color: '#1A2420', fontFamily: 'Manrope, sans-serif', boxShadow: '0 2px 8px rgba(21,71,52,0.02)' }}
                      onFocus={(e) => e.target.style.borderColor = '#154734'}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(21,71,52,0.12)'}
                      placeholder="Tu teléfono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#6B7570' }}>Correo Electrónico <span className="normal-case tracking-normal opacity-70">(No editable)</span></label>
                    <input 
                      type="email" 
                      value={user.correo || 'correo@fet.edu.co'}
                      disabled
                      className="w-full rounded-2xl px-4 py-3.5 text-sm cursor-not-allowed"
                      style={{ backgroundColor: 'rgba(21,71,52,0.04)', border: '1.5px solid rgba(21,71,52,0.08)', color: '#6B7570', fontFamily: 'Manrope, sans-serif' }}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#6B7570' }}>Cédula / Documento <span className="normal-case tracking-normal opacity-70">(No editable)</span></label>
                    <input 
                      type="text" 
                      value={user.documento || 'No registrado'}
                      disabled
                      className="w-full rounded-2xl px-4 py-3.5 text-sm cursor-not-allowed"
                      style={{ backgroundColor: 'rgba(21,71,52,0.04)', border: '1.5px solid rgba(21,71,52,0.08)', color: '#6B7570', fontFamily: 'Manrope, sans-serif' }}
                    />
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="px-5 flex flex-col gap-3">
                  <button 
                    onClick={handleSaveProfile} 
                    className="w-full text-white font-semibold text-sm py-3.5 rounded-2xl transition-colors flex justify-center items-center active:scale-95"
                    style={{ backgroundColor: '#154734', fontFamily: 'Manrope, sans-serif', boxShadow: '0 4px 12px rgba(21,71,52,0.2)' }}
                    disabled={isSavingProfile}
                  >
                    {isSavingProfile ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      'Guardar Cambios'
                    )}
                  </button>
                  <button 
                    onClick={handleCloseProfileEdit} 
                    className="w-full bg-white font-semibold text-sm py-3.5 rounded-2xl transition-colors active:scale-95 hover:bg-gray-50"
                    style={{ border: '1.5px solid rgba(21,71,52,0.12)', color: '#1A2420', fontFamily: 'Manrope, sans-serif' }}
                    disabled={isSavingProfile}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : supportSubView === 'faq' ? (
              /* ── SUBVISTA: CENTRO DE AYUDA Y PREGUNTAS FRECUENTES ── */
              <div className="animate-fade-in">
                <div className="px-5 pt-4 pb-4 flex items-center gap-3">
                  <button onClick={() => setSupportSubView(null)} className="p-2 rounded-full transition-colors hover:bg-black/5" style={{ backgroundColor: '#E4EFE7' }}>
                    <ChevronRight className="w-5 h-5 rotate-180 stroke-[1.5]" style={{ color: '#154734' }} />
                  </button>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6B7570]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Soporte Sanbus</p>
                    <h1 className="text-lg font-bold leading-tight" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1A2420' }}>Preguntas Frecuentes</h1>
                  </div>
                </div>

                <div className="px-5 mt-2 space-y-3 mb-6">
                  {[
                    {
                      q: '¿Cómo recargo mi saldo para viajar?',
                      a: 'Las recargas se realizan de forma presencial en la oficina de Bienestar Universitario (Edificio Central FET) de lunes a viernes entre 8:00 AM y 5:00 PM, únicamente en efectivo. El saldo se acredita al instante en tu cuenta.'
                    },
                    {
                      q: '¿Cómo funciona el Pase de Regreso ($0)?',
                      a: 'Cuando abordas el bus hacia la universidad (sentido Hacia la FET), se descuenta la tarifa completa que cubre ida y vuelta. Automáticamente se activa un Pase de Regreso válido durante el mismo día para que regreses en cualquier ruta de salida sin cobro adicional.'
                    },
                    {
                      q: '¿Qué pasa si genero un código QR y no abordo el bus?',
                      a: 'No te preocupes. El saldo únicamente se descuenta en el instante en que el conductor escanea y valida tu código QR al subir al vehículo. Si cierras el código sin escanearlo, tu saldo permanece intacto.'
                    },
                    {
                      q: '¿Puedo pagar el pasaje de un compañero con mi cuenta?',
                      a: 'No. El código QR e identificación digital son personales e intransferibles para cada estudiante matriculado. Cada pasajero debe presentar su propio código desde su cuenta.'
                    },
                    {
                      q: '¿Dónde veo si un bus viene con retraso o ya salió?',
                      a: 'En la pestaña de Inicio ("Próximas Salidas") puedes ver todos los buses que están operando en tiempo real, en qué parada se encuentran y si el conductor ha emitido algún aviso de salida próxima.'
                    }
                  ].map((item, idx) => {
                    const isOpen = expandedFaqIndex === idx;
                    return (
                      <div
                        key={idx}
                        className="bg-white rounded-2xl overflow-hidden transition-all"
                        style={{ border: '1.5px solid rgba(21,71,52,0.10)', boxShadow: '0 2px 8px rgba(21,71,52,0.04)' }}
                      >
                        <button
                          onClick={() => setExpandedFaqIndex(isOpen ? null : idx)}
                          className="w-full px-4 py-3.5 flex items-center justify-between text-left"
                        >
                          <span className="text-sm font-bold text-[#1A2420] pr-3" style={{ fontFamily: 'Manrope, sans-serif' }}>{item.q}</span>
                          <ChevronDown
                            className="w-4 h-4 shrink-0 transition-transform duration-200"
                            style={{ color: '#154734', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                          />
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-4 pt-1 text-xs leading-relaxed text-[#6B7570] border-t border-gray-100" style={{ fontFamily: 'Manrope, sans-serif' }}>
                            {item.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mx-5 p-4 rounded-2xl bg-[#E4EFE7]/60 border border-[#154734]/15 flex items-center justify-between mb-6">
                  <div>
                    <p className="text-xs font-bold text-[#154734]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>¿Aún tienes dudas?</p>
                    <p className="text-[11px] text-[#6B7570]">Escríbenos a bienestar@fet.edu.co</p>
                  </div>
                  <a
                    href="mailto:bienestar@fet.edu.co"
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white transition-transform active:scale-95"
                    style={{ backgroundColor: '#154734' }}
                  >
                    Contactar
                  </a>
                </div>
              </div>
            ) : supportSubView === 'terms' ? (
              /* ── SUBVISTA: TÉRMINOS Y POLÍTICAS DE PRIVACIDAD ── */
              <div className="animate-fade-in">
                <div className="px-5 pt-4 pb-4 flex items-center gap-3">
                  <button onClick={() => setSupportSubView(null)} className="p-2 rounded-full transition-colors hover:bg-black/5" style={{ backgroundColor: '#E4EFE7' }}>
                    <ChevronRight className="w-5 h-5 rotate-180 stroke-[1.5]" style={{ color: '#154734' }} />
                  </button>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6B7570]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Legal Sanbus · FET</p>
                    <h1 className="text-lg font-bold leading-tight" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1A2420' }}>Términos y Privacidad</h1>
                  </div>
                </div>

                <div className="px-5 mt-2 space-y-3 mb-6">
                  {[
                    {
                      title: '1. Uso del Servicio Institucional',
                      body: 'La plataforma Sanbus FET es de uso exclusivo para estudiantes activos, docentes y personal autorizado de la Fundación Escuela Tecnológica de Neiva (FET). El código QR generado para abordar es personal e intransferible.'
                    },
                    {
                      title: '2. Tarifas, Recargas y Pase de Regreso',
                      body: 'Las recargas de saldo se gestionan únicamente en los puntos autorizados de Bienestar Universitario. El cobro de ida hacia el campus otorga derecho al Pase de Regreso sin costo adicional válido únicamente durante el mismo día calendario.'
                    },
                    {
                      title: '3. Puntualidad y Convivencia en Ruta',
                      body: 'El estudiante debe presentarse en la parada oficial al menos 5 minutos antes del horario programado. Durante el recorrido es obligatorio mantener normas de respeto hacia el conductor y demás pasajeros, así como cuidar las instalaciones del autobús.'
                    },
                    {
                      title: '4. Protección de Datos Personales',
                      body: 'En cumplimiento de la Ley 1581 de 2012 (Habeas Data), los datos personales, historial de viajes y registros transaccionales recolectados en Sanbus se utilizan exclusivamente para la operación, control de acceso y mejora del transporte universitario, sin ser compartidos con terceros ajenos a la institución.'
                    }
                  ].map((sec, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-2xl p-4"
                      style={{ border: '1.5px solid rgba(21,71,52,0.10)', boxShadow: '0 2px 8px rgba(21,71,52,0.04)' }}
                    >
                      <h3 className="text-xs font-bold text-[#154734] mb-1.5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{sec.title}</h3>
                      <p className="text-xs text-[#6B7570] leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>{sec.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

      </div>

      {/* Fixed Bottom Navigation */}
      <div className="fixed bottom-0 left-0 w-full z-50 flex justify-center">
        <nav
          className="w-full max-w-md rounded-t-[28px] py-3 px-10 flex items-center justify-between pointer-events-auto"
          style={{ backgroundColor: '#FFFFFF', boxShadow: '0 -1px 0 rgba(21,71,52,0.08), 0 -8px 24px rgba(21,71,52,0.06)' }}
        >
          {[
            { id: 'inicio', icon: Home },
            { id: 'rutas', icon: Bus },
            { id: 'historial', icon: History },
            { id: 'perfil', icon: User },
          ].map(({ id, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setActiveTab(id);
                setSupportSubView(null);
                setShowProfileEdit(false);
              }}
              className="flex flex-col items-center gap-1 transition-all"
            >
              <Icon
                className={`w-6 h-6 transition-all ${activeTab === id ? 'stroke-[2]' : 'stroke-[1.5]'}`}
                style={{ color: activeTab === id ? '#154734' : '#6B7570' }}
              />
              {activeTab === id && (
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#154734' }} />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Modal QR (Bottom Sheet) — Boarding Pass */}
      {showQR && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <div
            onClick={handleCloseQR}
            className={`fixed inset-0 bg-black/40 backdrop-blur-sm ${isClosingQR ? 'animate-fade-out' : 'animate-fade-in'}`}
          />

          <div
            className={`rounded-t-[32px] p-6 w-full max-w-md mx-auto shadow-2xl z-10 relative ${isClosingQR ? 'animate-slide-down' : 'animate-slide-up'}`}
            style={{ backgroundColor: '#FAF8F4' }}
          >
            {/* Drag handle — verde marca translúcido */}
            <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ backgroundColor: 'rgba(21,71,52,0.18)' }} />

            {/* Label superior */}
            <p className="text-[10px] font-semibold tracking-widest uppercase text-center mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#6B7570', letterSpacing: '0.09em' }}>
              {tienePaseRegreso ? 'Pase de Regreso · Sin Costo ($0)' : 'Pase de Abordaje'}
            </p>
            <h3 className="font-bold text-center mb-5" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1A2420', fontSize: '20px' }}>
              Sanbus · FET
            </h3>

            {/* Boarding pass card */}
            <div
              className="rounded-2xl overflow-visible relative ticket-notch mb-5"
              style={{ backgroundColor: '#FFFFFF', border: '1.5px solid rgba(21,71,52,0.12)', boxShadow: '0 4px 16px rgba(21,71,52,0.10)' }}
            >
              {/* QR zone */}
              <div className="flex items-center justify-center px-8 pt-6 pb-4 min-h-[220px]">
                {isQRPaid ? (
                  <div className="flex flex-col items-center justify-center animate-fade-in">
                    <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mb-4 shadow-[0_0_25px_rgba(16,185,129,0.4)] animate-[bounce_1s_ease-in-out_infinite]">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="font-bold text-xl text-[#1A2420]">¡Pago Exitoso!</p>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl" style={{ backgroundColor: '#FAF8F4', border: '1px solid rgba(21,71,52,0.08)' }}>
                    <QRCode value={qrDataString} size={168} fgColor="#1A2420" bgColor="#FAF8F4" />
                  </div>
                )}
              </div>

              {/* Dashed perforación divider */}
              <div className="mx-5">
                <svg width="100%" height="2">
                  <line x1="0" y1="1" x2="100%" y2="1" stroke="rgba(21,71,52,0.15)" strokeWidth="1.5" strokeDasharray="5 4" />
                </svg>
              </div>

              {/* Pass metadata */}
              <div className="px-6 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-widest" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#6B7570' }}>Pasajero</p>
                    <p className="text-sm font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1A2420' }}>{user.nombre || 'Estudiante FET'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-medium uppercase tracking-widest" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#6B7570' }}>Código</p>
                    <p className="text-sm font-bold font-mono tracking-wider" style={{ color: '#154734' }}>FET-8924-X7</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-widest" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#6B7570' }}>Operador</p>
                    <p className="text-xs font-semibold" style={{ color: '#1A2420', fontFamily: 'Manrope, sans-serif' }}>Universidad FET</p>
                  </div>
                  <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: '#E4EFE7', color: '#154734', fontFamily: 'Manrope, sans-serif' }}>
                    {tienePaseRegreso ? 'Pase de Regreso ($0)' : 'Válido'}
                  </span>
                </div>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={handleCloseQR}
              className="w-full text-white font-semibold text-sm py-3.5 rounded-2xl transition-colors active:scale-95"
              style={{ backgroundColor: '#154734', fontFamily: 'Manrope, sans-serif', boxShadow: '0 2px 8px rgba(21,71,52,0.25)' }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Panel Lateral de Notificaciones (Right Drawer) */}
      <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
        <div 
          onClick={handleCloseNotifications}
          className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${
            showNotifications ? 'opacity-100 pointer-events-auto' : 'opacity-0'
          }`}
        />
        
        <div 
          className={`fixed inset-0 max-w-md mx-auto h-full w-full shadow-2xl flex flex-col justify-between p-6 z-10 transform transition-transform duration-300 ease-in-out ${
            showNotifications ? 'translate-x-0 pointer-events-auto' : 'translate-x-full'
          }`}
          style={{ backgroundColor: '#FAF8F4' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1A2420' }}>Notificaciones</h3>
            </div>
            <button 
              onClick={handleCloseNotifications}
              className="p-1.5 -mr-1.5 rounded-full transition-colors"
              style={{ color: '#6B7570' }}
              title="Cerrar notificaciones"
            >
              <X className="w-5 h-5 stroke-[1.5]" />
            </button>
          </div>

          {(() => {
            const notificacionesRaw = routesData.flatMap(r => 
              (r.avisos || []).filter(a => a.activo).map(a => ({ ...a, nombreRuta: a.titulo || r.name }))
            );
            const todasLasNotificaciones = Array.from(new Map(notificacionesRaw.map(n => [n.id, n])).values())
              .sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

            return (
              <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-3">
                {todasLasNotificaciones.length === 0 ? (
                  <div className="py-10 flex flex-col items-center justify-center text-center my-auto h-full">
                    <img 
                      src="/placeholder-noti.png" 
                      alt="Notificaciones" 
                      className="w-[380px] max-w-full h-auto object-contain mx-auto mb-4" 
                    />
                    <p className="text-sm font-bold mb-1" style={{ color: '#1A2420', fontFamily: 'Manrope, sans-serif' }}>Por ahora no tienes notificaciones</p>
                    <p className="text-xs max-w-xs leading-relaxed mx-auto" style={{ color: '#6B7570', fontFamily: 'Manrope, sans-serif' }}>
                      Te avisaremos aquí cuando haya novedades sobre tus rutas, saldo o avisos del servicio.
                    </p>
                  </div>
                ) : (
                  todasLasNotificaciones.map(n => (
                    <div key={n.id} className="bg-white rounded-2xl p-4 shadow-sm border border-[#1A2420]/10 flex items-start gap-3">
                      <img src="/autobus (1).png" alt="Notificación Autobús" className="w-11 h-11 shrink-0 object-contain" />
                      <div>
                        <p className="text-xs font-bold text-[#1A2420] uppercase mb-1">{n.nombreRuta}</p>
                        <p className="text-sm text-[#1A2420] font-medium leading-snug">{n.mensaje}</p>
                        <p className="text-[10px] text-[#6B7570] mt-2">{timeAgo(n.created_at)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            );
          })()}

          <button 
            onClick={handleCloseNotifications} 
            className="w-full text-white font-semibold text-sm py-3.5 mt-2 rounded-2xl transition-colors active:scale-95 shrink-0"
            style={{ backgroundColor: '#154734', fontFamily: 'Manrope, sans-serif', boxShadow: '0 2px 8px rgba(21,71,52,0.25)' }}
          >
            Entendido
          </button>
        </div>
      </div>

      {/* Modal Recargar Saldo (Informativo) */}
      {showRechargeModal && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <div 
            onClick={handleCloseRechargeModal}
            className={`fixed inset-0 bg-black/40 backdrop-blur-sm ${isClosingRecharge ? 'animate-fade-out' : 'animate-fade-in'}`}
          />
          
          <div
            className={`rounded-t-[32px] p-6 w-full max-w-md mx-auto shadow-2xl z-10 relative ${isClosingRecharge ? 'animate-slide-down' : 'animate-slide-up'}`}
            style={{ backgroundColor: '#FAF8F4' }}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ backgroundColor: 'rgba(21,71,52,0.18)' }} />

            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: '#E4EFE7' }}>
              <CreditCard className="w-6 h-6 stroke-[1.5]" style={{ color: '#154734' }} />
            </div>

            <h3 className="font-bold text-xl text-center mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1A2420' }}>
              Recarga de Saldo
            </h3>
            <p className="text-xs text-center max-w-xs mx-auto mb-5" style={{ color: '#6B7570', fontFamily: 'Manrope, sans-serif' }}>
              Información oficial sobre la compra y recarga de pasajes
            </p>

            <div className="rounded-2xl p-4 mb-4 text-left border" style={{ backgroundColor: '#FEE9E0', borderColor: 'rgba(225,90,46,0.25)' }}>
              <p className="text-xs font-bold mb-1 flex items-center gap-1.5" style={{ color: '#E15A2E' }}>
                <Info className="w-4 h-4 shrink-0 stroke-[2]" />
                Punto de pago presencial
              </p>
              <p className="text-xs leading-relaxed" style={{ color: '#E15A2E' }}>
                Por ahora, las recargas se realizan en la <strong>oficina de Bienestar Universitario</strong> únicamente en efectivo.
              </p>
            </div>

            <div className="rounded-2xl p-4 mb-6 text-left space-y-2 bg-white" style={{ border: '1.5px solid rgba(21,71,52,0.10)' }}>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: '#6B7570' }}>Lugar:</span>
                <span className="font-semibold text-right" style={{ color: '#1A2420' }}>Oficina de Bienestar<br/><span className="text-[10px] font-normal">(Edificio Central FET)</span></span>
              </div>
              <div className="flex items-center justify-between text-xs pt-2">
                <span style={{ color: '#6B7570' }}>Horario:</span>
                <span className="font-semibold text-right" style={{ color: '#1A2420' }}>Lunes a Viernes<br/><span className="text-[10px] font-normal">8:00 AM - 5:00 PM</span></span>
              </div>
              <div className="flex items-center justify-between text-xs pt-2">
                <span style={{ color: '#6B7570' }}>Medio de pago:</span>
                <span className="font-semibold" style={{ color: '#154734' }}>Únicamente en efectivo</span>
              </div>
            </div>

            <button 
              onClick={handleCloseRechargeModal} 
              className="w-full text-white font-semibold text-sm py-3.5 rounded-2xl transition-colors active:scale-95"
              style={{ backgroundColor: '#154734', fontFamily: 'Manrope, sans-serif', boxShadow: '0 2px 8px rgba(21,71,52,0.25)' }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Modal Soporte */}
      {showSupportModal && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <div 
            onClick={handleCloseSupportModal}
            className={`fixed inset-0 bg-black/40 backdrop-blur-sm ${isClosingSupport ? 'animate-fade-out' : 'animate-fade-in'}`}
          />
          
          <div
            className={`rounded-t-[32px] p-6 w-full max-w-md mx-auto shadow-2xl z-10 relative ${isClosingSupport ? 'animate-slide-down' : 'animate-slide-up'}`}
            style={{ backgroundColor: '#FAF8F4' }}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ backgroundColor: 'rgba(21,71,52,0.18)' }} />

            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: '#E4EFE7' }}>
              <HelpCircle className="w-6 h-6 stroke-[1.5]" style={{ color: '#154734' }} />
            </div>

            <h3 className="font-bold text-xl text-center mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1A2420' }}>
              Atención y Soporte
            </h3>
            <p className="text-xs text-center max-w-xs mx-auto mb-5" style={{ color: '#6B7570', fontFamily: 'Manrope, sans-serif' }}>
              ¿Tienes dudas o inconvenientes con tus rutas o pasajes?
            </p>

            <div className="space-y-3 mb-6">
              <div 
                onClick={() => {
                  handleCloseSupportModal();
                  setActiveTab('perfil');
                  setSupportSubView('faq');
                }}
                className="w-full bg-white p-3.5 rounded-2xl flex items-center justify-between transition-colors cursor-pointer"
                style={{ border: '1.5px solid rgba(21,71,52,0.10)', boxShadow: '0 2px 8px rgba(21,71,52,0.05)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#E4EFE7' }}>
                    <HelpCircle className="w-4 h-4 stroke-[1.5]" style={{ color: '#154734' }} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold" style={{ color: '#1A2420', fontFamily: 'Manrope, sans-serif' }}>Centro de Ayuda y Preguntas Frecuentes</p>
                    <p className="text-[11px]" style={{ color: '#6B7570' }}>Dudas sobre recargas, QR y pases</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 stroke-[1.5] shrink-0" style={{ color: '#6B7570' }} />
              </div>

              

              <a 
                href="mailto:bienestar@fet.edu.co"
                className="w-full bg-white p-3.5 rounded-2xl flex items-center justify-between transition-colors"
                style={{ border: '1.5px solid rgba(21,71,52,0.10)', boxShadow: '0 2px 8px rgba(21,71,52,0.05)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#E4EFE7' }}>
                    <MessageSquare className="w-4 h-4 stroke-[1.5]" style={{ color: '#154734' }} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold" style={{ color: '#1A2420', fontFamily: 'Manrope, sans-serif' }}>Correo Institucional</p>
                    <p className="text-[11px]" style={{ color: '#6B7570' }}>bienestar@fet.edu.co</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 stroke-[1.5] shrink-0" style={{ color: '#6B7570' }} />
              </a>
            </div>

            <button 
              onClick={handleCloseSupportModal} 
              className="w-full text-white font-semibold text-sm py-3.5 rounded-2xl transition-colors active:scale-95"
              style={{ backgroundColor: '#154734', fontFamily: 'Manrope, sans-serif', boxShadow: '0 2px 8px rgba(21,71,52,0.25)' }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

// ── Placeholder para secciones del sidebar aún no implementadas ──────────────
function AdminPlaceholder({ titulo, descripcion }) {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  useEffect(() => {
    if (!token || user.rol !== 'ADMIN') navigate('/login');
  }, [navigate, token, user.rol]);
  return (
    <div className="flex h-screen bg-[#FAF8F4] items-center justify-center" style={{ fontFamily: 'Manrope, sans-serif' }}>
      <div className="text-center max-w-sm px-6">
        <div className="w-14 h-14 bg-[#E4EFE7] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-[#154734]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[#1A2420] mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{titulo}</h2>
        <p className="text-sm text-[#6B7570] mb-6">{descripcion || 'Esta sección está en construcción y estará disponible próximamente.'}</p>
        <button
          onClick={() => navigate('/admin')}
          className="bg-[#154734] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1F6E4A] transition-colors"
        >
          ← Volver al Dashboard
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route path="/estudiante" element={<StudentDashboard />} />
      <Route path="/conductor" element={<ConductorDashboard />} />
      <Route path="/admin" element={<AdminDashboard />} />
      {/* Secciones del panel admin */}
      <Route path="/admin/estudiantes" element={<AdminEstudiantes />} />
      <Route path="/admin/conductores" element={<AdminConductores />} />
      <Route path="/admin/rutas" element={<AdminRutas />} />
      <Route path="/admin/viajes" element={<AdminViajes />} />
      <Route path="/admin/transacciones" element={<AdminTransacciones />} />
      <Route path="/admin/reportes" element={<AdminReportes />} />
      <Route path="/admin/configuracion" element={<AdminConfiguracion />} />
    </Routes>
  );
}

export default App;

