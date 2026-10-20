import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  Bus, User, Scan, LogOut, CheckCircle, XCircle, 
  ChevronRight, ChevronsRight, RotateCcw, Users, ShieldAlert, AlertTriangle, 
  HelpCircle, MessageSquare, PhoneCall, Sparkles, Navigation, Info, MapPin
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function SlideToAction({ label, sublabel, bgColor = '#E15A2E', icon: Icon = ChevronsRight, onConfirm, disabled = false }) {
  const trackRef = useRef(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const startXRef = useRef(0);
  const maxDragRef = useRef(200);

  const THUMB_SIZE = 44;
  const PADDING = 4;

  useEffect(() => {
    setDragX(0);
    setIsCompleted(false);
    setIsDragging(false);
  }, [label, bgColor]);

  const handleStart = (clientX) => {
    if (disabled || isCompleted) return;
    if (trackRef.current) {
      maxDragRef.current = Math.max(80, trackRef.current.clientWidth - THUMB_SIZE - PADDING * 2);
    }
    setIsDragging(true);
    startXRef.current = clientX - dragX;
  };

  const handleMove = (clientX) => {
    if (!isDragging || disabled || isCompleted) return;
    const nextX = Math.min(Math.max(0, clientX - startXRef.current), maxDragRef.current);
    setDragX(nextX);
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragX >= maxDragRef.current * 0.78) {
      setDragX(maxDragRef.current);
      setIsCompleted(true);
      setTimeout(() => {
        onConfirm?.();
        setDragX(0);
        setIsCompleted(false);
      }, 280);
    } else {
      setDragX(0);
    }
  };

  useEffect(() => {
    if (!isDragging) return;
    const onMouseMove = (e) => handleMove(e.clientX);
    const onMouseUp = () => handleEnd();
    const onTouchMove = (e) => {
      if (e.touches && e.touches[0]) handleMove(e.touches[0].clientX);
    };
    const onTouchEnd = () => handleEnd();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  });

  const progress = maxDragRef.current > 0 ? Math.min(1, dragX / maxDragRef.current) : 0;

  return (
    <div
      ref={trackRef}
      className="relative w-full rounded-2xl select-none overflow-hidden shadow-md"
      style={{
        height: `${THUMB_SIZE + PADDING * 2}px`,
        backgroundColor: bgColor,
        opacity: disabled ? 0.6 : 1,
        touchAction: 'pan-y',
      }}
    >
      {/* Rastro de progreso al deslizar */}
      <div
        className="absolute inset-y-0 left-0 bg-black/15 pointer-events-none"
        style={{
          width: `${dragX + THUMB_SIZE / 2 + PADDING}px`,
          transition: isDragging ? 'none' : 'width 0.25s ease-out',
        }}
      />

      {/* Texto central guía */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center pl-12 pr-3 pointer-events-none text-center"
        style={{
          opacity: Math.max(0.15, 1 - progress * 1.15),
          transition: isDragging ? 'none' : 'opacity 0.25s ease',
        }}
      >
        <span className="text-white font-bold text-[13px] leading-tight tracking-wide" style={{ fontFamily: 'Manrope, sans-serif' }}>
          {label}
        </span>
        {sublabel && (
          <span className="text-white/80 text-[10px] font-medium mt-0.5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {sublabel}
          </span>
        )}
      </div>

      {/* Botón deslizable (Thumb) */}
      <div
        onMouseDown={(e) => handleStart(e.clientX)}
        onTouchStart={(e) => e.touches?.[0] && handleStart(e.touches[0].clientX)}
        className="absolute top-1 left-1 rounded-xl bg-white flex items-center justify-center shadow-md cursor-grab active:cursor-grabbing z-10"
        style={{
          width: `${THUMB_SIZE}px`,
          height: `${THUMB_SIZE}px`,
          transform: `translateX(${dragX}px)`,
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        <Icon className="w-5 h-5 stroke-[2.2]" style={{ color: bgColor }} />
      </div>
    </div>
  );
}

export default function ConductorDashboard() {
  const [activeTab, setActiveTab] = useState('inicio');
  const [selectedRoute, setSelectedRoute] = useState('Ruta Norte');
  const [tripSentido, setTripSentido] = useState('hacia_fet'); // 'hacia_fet' | 'desde_fet'
  const [routeStarted, setRouteStarted] = useState(false);
  const [routeStage, setRouteStage] = useState('C.C. Único');
  const [isMoving, setIsMoving] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);
  const [passengerCount, setPassengerCount] = useState(0);

  // Scan states
  const [scanResult, setScanResult] = useState(null); // 'success' | 'error' | null
  const [scanMessage, setScanMessage] = useState('');
  const [studentInfo, setStudentInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [isClosingResult, setIsClosingResult] = useState(false);

  // Subvistas del Perfil del Conductor ('report' | 'guide' | null)
  const [profileSubView, setProfileSubView] = useState(null);
  const [expandedGuideIdx, setExpandedGuideIdx] = useState(0);

  const scannerRef = useRef(null);
  const isProcessingRef = useRef(false);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  // Listado de rutas disponibles para selección
  const routesList = [
    { 
      id: 1, 
      name: 'Ruta Norte', 
      detail: 'C.C. Único • Campus FET', 
      detailReverse: 'Campus FET • C.C. Único',
      schedule: '6:30 AM - 7:30 AM',
      stops: ['C.C. Único', 'San Juan Plaza', 'Universidad FET']
    },
    { 
      id: 2, 
      name: 'Ruta Sur', 
      detail: 'Terminal Neiva • Campus FET', 
      detailReverse: 'Campus FET • Terminal Neiva',
      schedule: '6:45 AM - 7:45 AM',
      stops: ['Terminal de Transporte', 'Unicentro', 'Universidad FET']
    },
    { 
      id: 3, 
      name: 'Ruta Oriente', 
      detail: 'Sta. Lucía Plaza • Campus FET', 
      detailReverse: 'Campus FET • Sta. Lucía Plaza',
      schedule: '7:00 AM - 8:00 AM',
      stops: ['Sta. Lucía Plaza', 'Pq. de la Música', 'Universidad FET']
    },
  ];

  const getOrderedStops = (routeName, sentido = tripSentido) => {
    const base = routesList.find(r => r.name === routeName)?.stops || [];
    return sentido === 'desde_fet' ? [...base].reverse() : [...base];
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!token || user.rol !== 'CONDUCTOR') {
      navigate('/login');
      return;
    }

    const checkActiveTrip = async () => {
      try {
        const res = await fetch(`/api/trips/driver/${user.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.active) {
            const activeSentido = data.trip.sentido || 'hacia_fet';
            const orderedStops = getOrderedStops(data.trip.route_name, activeSentido);
            const firstStop = orderedStops[0] || 'C.C. Único';
            const currentStage = (data.trip.stage && data.trip.stage !== 'boarding' && data.trip.stage !== 'En espera')
              ? data.trip.stage
              : firstStop;
            setRouteStarted(true);
            setSelectedRoute(data.trip.route_name);
            setPassengerCount(data.trip.passengers_count);
            setRouteStage(currentStage);
            setIsMoving(Boolean(data.trip.is_moving));
            setAlertMessage(data.trip.alert_message || null);
            setTripSentido(activeSentido);
          }
        }
      } catch (err) {
        console.error('Error fetching active trip:', err);
      }
    };

    checkActiveTrip();
  }, [navigate, token, user.rol, user.id]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  // Inicializar o limpiar el escáner cuando esté en ESTADO B y en tab 'inicio'
  useEffect(() => {
    if (activeTab !== 'inicio' || !routeStarted || showResultModal) {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(() => {}).finally(() => {
            scannerRef.current.clear();
          });
        } else {
          scannerRef.current.clear();
        }
        scannerRef.current = null;
      }
      return;
    }

    let isSubscribed = true;
    const timer = setTimeout(() => {
      const readerElem = document.getElementById("reader");
      if (!readerElem || !isSubscribed) return;

      try {
        const scanner = new Html5Qrcode("reader");
        scannerRef.current = scanner;

        scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          async (decodedText) => {
            if (!isSubscribed) return;
            await handleValidation(decodedText);
          },
          () => {
            // Ignorar frames sin código QR
          }
        ).catch((err) => {
          console.error("Error al iniciar cámara:", err);
        });
      } catch (err) {
        console.error("Error al instanciar escáner:", err);
      }
    }, 150);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(() => {}).finally(() => {
            if (scannerRef.current) scannerRef.current.clear();
          });
        } else {
          scannerRef.current.clear();
        }
        scannerRef.current = null;
      }
    };
  }, [activeTab, routeStarted, showResultModal]);

  const handleValidation = async (qrData) => {
    if (isProcessingRef.current || loading) return;
    isProcessingRef.current = true;
    setLoading(true);

    if (scannerRef.current && typeof scannerRef.current.pause === 'function') {
      try { scannerRef.current.pause(true); } catch(e) { console.warn("Could not pause scanner", e); }
    }

    try {
      const currentRouteObj = routesList.find(r => r.name === selectedRoute) || routesList[0];

      const res = await fetch('/api/trips/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          qrData, 
          conductorId: user.id,
          rutaId: currentRouteObj.id 
        })
      });

      const data = await res.json();
      
      if (res.ok) {
        setScanResult('success');
        setScanMessage(data.message || '¡Pasaje Aprobado!');
        setStudentInfo(data.estudiante || { nombre: 'Estudiante FET' });
        setPassengerCount(prev => prev + 1);
      } else {
        setScanResult('error');
        setScanMessage(data.error || 'Pasaje inválido o sin saldo suficiente');
        setStudentInfo(null);
      }
    } catch (err) {
      setScanResult('error');
      setScanMessage('Error de conexión con el servidor');
      setStudentInfo(null);
    } finally {
      setShowResultModal(true);
      setLoading(false);
    }
  };

  const handleCloseResultModal = () => {
    setIsClosingResult(true);
    setTimeout(() => {
      setShowResultModal(false);
      setIsClosingResult(false);
      setScanResult(null);
      setScanMessage('');
      setStudentInfo(null);
      isProcessingRef.current = false;
    }, 300);
  };

  const handleStartRoute = async () => {
    const selected = routesList.find(r => r.name === selectedRoute);
    const rutaId = selected ? selected.id : 1;

    try {
      const res = await fetch('/api/trips/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conductorId: user.id, rutaId, sentido: tripSentido })
      });
      if (res.ok) {
        const resData = await res.json();
        const orderedStops = getOrderedStops(selectedRoute, tripSentido);
        const firstStop = orderedStops[0] || 'C.C. Único';
        setRouteStarted(true);
        setRouteStage(resData.stage || firstStop);
        setIsMoving(false);
        setAlertMessage(null);
        setPassengerCount(0);
        setScanResult(null);
      } else {
        const errorData = await res.json();
        alert('Error al iniciar ruta: ' + errorData.error);
      }
    } catch (error) {
      console.error(error);
      alert('Error de red al iniciar ruta');
    }
  };

  const handleStageChange = async (newStage) => {
    setRouteStage(newStage);
    setIsMoving(false); // Al llegar a la nueva parada, se detiene
    
    try {
      const res = await fetch('/api/trips/update-stage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conductorId: user?.id, stage: newStage, isMoving: false })
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleToggleMoving = async () => {
    const newIsMoving = !isMoving;
    setIsMoving(newIsMoving);
    
    try {
      await fetch('/api/trips/update-stage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conductorId: user?.id, stage: routeStage, isMoving: newIsMoving })
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleStepBack = async () => {
    const stopsList = getOrderedStops(selectedRoute, tripSentido);
    const currentIndex = stopsList.indexOf(routeStage);

    // Si estaba en movimiento hacia la siguiente parada, vuelve a estar detenido en la parada actual
    if (isMoving) {
      setIsMoving(false);
      try {
        await fetch('/api/trips/update-stage', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conductorId: user?.id, stage: routeStage, isMoving: false })
        });
      } catch (error) {
        console.error(error);
      }
      return;
    }

    // Si estaba detenido en una parada posterior a la primera, regresa a la parada anterior (detenido)
    if (currentIndex > 0) {
      const prevStop = stopsList[currentIndex - 1];
      setRouteStage(prevStop);
      setIsMoving(false);
      try {
        await fetch('/api/trips/update-stage', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conductorId: user?.id, stage: prevStop, isMoving: false })
        });
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleAlertChange = async (msg) => {
    try {
      const res = await fetch('/api/trips/update-alert', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conductorId: user.id, alertMessage: msg })
      });
      if (res.ok) {
        setAlertMessage(msg);
      }
    } catch (error) {
      console.error(error);
      alert('Error al actualizar la alerta');
    }
  };

  const handleEndRoute = async () => {
    const confirmEnd = window.confirm(`¿Deseas finalizar el recorrido de ${selectedRoute}? Total pasajeros: ${passengerCount}`);
    if (!confirmEnd) return;

    try {
      await fetch('/api/trips/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conductorId: user.id })
      });
      
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(() => {}).finally(() => {
            scannerRef.current.clear();
          });
        } else {
          scannerRef.current.clear();
        }
        scannerRef.current = null;
      }
      setRouteStarted(false);
      setPassengerCount(0);
      setAlertMessage(null);
      setScanResult(null);
    } catch (error) {
      console.error(error);
      alert('Error al finalizar ruta');
    }
  };

  const handleLogout = () => {
    if (scannerRef.current) {
      if (scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {}).finally(() => {
          scannerRef.current.clear();
        });
      } else {
        scannerRef.current.clear();
      }
      scannerRef.current = null;
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto relative font-sans shadow-xl overflow-hidden" style={{ backgroundColor: '#FAF8F4' }}>
      {/* Fondo superior verde solo en la pestaña de inicio */}
      {activeTab === 'inicio' && (
        <div className="absolute top-0 left-0 right-0 h-40 pointer-events-none z-0" style={{ backgroundColor: '#154734' }} />
      )}

      {/* Top Header (oculto en Perfil para evitar redundancia) */}
      {activeTab === 'inicio' && (
        <div className="px-5 pt-8 pb-4 relative z-10">
          <header className="flex items-center justify-between">
            <div 
              onClick={() => setActiveTab('perfil')}
              className="flex items-center gap-3 cursor-pointer"
              title="Ir a mi perfil"
            >
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden" style={{ border: '1.5px solid rgba(255,255,255,0.2)' }}>
                <User className="w-5 h-5" style={{ color: '#154734' }} />
              </div>
              <div className="flex flex-col text-white">
                <p className="text-[10px] font-medium tracking-widest uppercase" style={{ fontFamily: 'Space Grotesk, sans-serif', opacity: 0.8 }}>Panel de Conductor</p>
                <span className="font-bold text-lg leading-none mt-0.5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {user.nombre ? user.nombre.split(' ')[0] : 'Conductor'}
                </span>
              </div>
            </div>
          </header>
        </div>
      )}

      {/* Contenido Principal */}
      <div className={`flex-1 overflow-y-auto pb-28 px-5 ${activeTab === 'perfil' ? 'pt-6' : 'pt-2'} relative z-10`}>
        {activeTab === 'inicio' && (
          <div className="mt-2 animate-slide-in">
            {!routeStarted ? (
              /* ================= ESTADO A: Selección e Inicio de Ruta ================= */
              <div key="estado-a" className="space-y-4 animate-fade-in">
                <div className="bg-white rounded-[32px] p-6 text-center" style={{ border: '1.5px solid rgba(21,71,52,0.12)', boxShadow: '0 4px 16px rgba(21,71,52,0.06)' }}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: '#E4EFE7' }}>
                    <Bus className="w-7 h-7 stroke-[1.5]" style={{ color: '#154734' }} />
                  </div>
                  <h2 className="text-xl font-bold mb-1" style={{ color: '#1A2420', fontFamily: 'Space Grotesk, sans-serif' }}>Iniciar Servicio</h2>
                  <p className="text-xs max-w-xs mx-auto mb-6" style={{ color: '#6B7570', fontFamily: 'Manrope, sans-serif' }}>
                    Selecciona la ruta que vas a operar para activar la cámara y el registro de pasajes.
                  </p>

                  {/* Selector de Ruta (Radio Cards) */}
                  <div className="space-y-3 text-left mb-6">
                    {/* Selector de Sentido del Recorrido */}
                    <div className="mb-5">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[#154734]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                          Sentido del Recorrido
                        </label>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: tripSentido === 'hacia_fet' ? '#FEE9E0' : '#E4EFE7', color: tripSentido === 'hacia_fet' ? '#E15A2E' : '#154734' }}>
                          {tripSentido === 'hacia_fet' ? 'Tarifa: Ida + Vuelta' : 'Tarifa: Vuelta / Pase'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 bg-[#FAF8F4] p-1.5 rounded-2xl border border-gray-200">
                        <button
                          type="button"
                          onClick={() => setTripSentido('hacia_fet')}
                          className="py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1"
                          style={{
                            backgroundColor: tripSentido === 'hacia_fet' ? '#154734' : 'transparent',
                            color: tripSentido === 'hacia_fet' ? '#FFFFFF' : '#6B7570',
                            boxShadow: tripSentido === 'hacia_fet' ? '0 2px 8px rgba(21,71,52,0.25)' : 'none'
                          }}
                        >
                          <span>Hacia la FET</span>
                          <span className="text-[9px] font-medium opacity-80">(Ida y Vuelta Oblig.)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTripSentido('desde_fet')}
                          className="py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1"
                          style={{
                            backgroundColor: tripSentido === 'desde_fet' ? '#154734' : 'transparent',
                            color: tripSentido === 'desde_fet' ? '#FFFFFF' : '#6B7570',
                            boxShadow: tripSentido === 'desde_fet' ? '0 2px 8px rgba(21,71,52,0.25)' : 'none'
                          }}
                        >
                          <span>Salida de la U</span>
                          <span className="text-[9px] font-medium opacity-80">(Solo Vuelta / Pase $0)</span>
                        </button>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold mb-3" style={{ color: '#1A2420', fontFamily: 'Space Grotesk, sans-serif' }}>
                      Rutas Disponibles
                    </h3>
                    {routesList.map((ruta) => {
                      const isSelected = selectedRoute === ruta.name;
                      return (
                        <div
                          key={ruta.id}
                          onClick={() => setSelectedRoute(ruta.name)}
                          className="p-4 rounded-2xl transition-all cursor-pointer flex items-center justify-between"
                          style={{ 
                            backgroundColor: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                            border: `1.5px solid ${isSelected ? '#154734' : 'rgba(21,71,52,0.1)'}`,
                            boxShadow: isSelected ? '0 2px 8px rgba(21,71,52,0.08)' : 'none'
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: isSelected ? '#E4EFE7' : '#F3F4F6' }}>
                              <Navigation className="w-4 h-4 stroke-[1.5]" style={{ color: isSelected ? '#154734' : '#9CA3AF' }} />
                            </div>
                            <div>
                              <p className="text-sm font-bold" style={{ color: '#1A2420', fontFamily: 'Manrope, sans-serif' }}>{ruta.name}</p>
                              <p className="text-xs" style={{ color: '#6B7570' }}>
                                {tripSentido === 'desde_fet' ? ruta.detailReverse : ruta.detail}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-semibold tabular-nums" style={{ color: '#6B7570', fontFamily: 'Space Grotesk, sans-serif' }}>
                              {ruta.schedule}
                            </span>
                            <div className="w-5 h-5 rounded-full border shrink-0 flex items-center justify-center transition-colors" style={{ 
                              borderColor: isSelected ? '#154734' : '#D1D5DB',
                              backgroundColor: isSelected ? '#154734' : 'transparent'
                            }}>
                              {isSelected && <div className="w-2 h-2 rounded-full bg-white shrink-0" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Botón de Acción Principal */}
                  <button
                    onClick={handleStartRoute}
                    className="w-full text-white font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
                    style={{ backgroundColor: '#154734', fontFamily: 'Manrope, sans-serif', boxShadow: '0 4px 12px rgba(21,71,52,0.2)' }}
                  >
                    <Scan className="w-5 h-5 stroke-[1.5]" /> Iniciar Ruta
                  </button>
                </div>

                {/* Tarjeta Informativa Adicional */}
                <div className="rounded-2xl p-4 flex items-center gap-3" style={{ border: '1.5px dashed rgba(21,71,52,0.2)' }}>
                  <Info className="w-5 h-5 shrink-0 stroke-[1.5]" style={{ color: '#6B7570' }} />
                  <p className="text-xs leading-relaxed" style={{ color: '#6B7570', fontFamily: 'Manrope, sans-serif' }}>
                    Al iniciar, el sistema validará cada código QR en tiempo real descontando automáticamente el saldo del estudiante.
                  </p>
                </div>
              </div>
            ) : (
              /* ================= ESTADO B: Ruta en Curso y Escáner Activo ================= */
              <div key="estado-b" className="space-y-4 animate-fade-in">
                {/* Header Informativo de Ruta */}
                <div className="bg-white rounded-[24px] p-4 flex items-center justify-between" style={{ border: '1.5px solid rgba(21,71,52,0.12)', boxShadow: '0 2px 8px rgba(21,71,52,0.06)' }}>
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: '#1F6E4A' }}></span>
                      <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: '#154734' }}></span>
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-widest block" style={{ color: '#6B7570', fontFamily: 'Space Grotesk, sans-serif' }}>Recorrido activo</span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: tripSentido === 'hacia_fet' ? '#FEE9E0' : '#E4EFE7', color: tripSentido === 'hacia_fet' ? '#E15A2E' : '#154734' }}>
                          {tripSentido === 'hacia_fet' ? 'Hacia la FET' : 'Salida de la U'}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold" style={{ color: '#1A2420', fontFamily: 'Manrope, sans-serif' }}>{selectedRoute}</h3>
                    </div>
                  </div>
                </div>

                {/* Flujo Unidireccional: Mapa de Paradas, Estado y Barra Deslizante Anti-errores */}
                {(() => {
                  const stopsList = getOrderedStops(selectedRoute, tripSentido);
                  const currentIndex = Math.max(0, stopsList.indexOf(routeStage));
                  const isLastStop = currentIndex === stopsList.length - 1;
                  const nextStop = isLastStop ? null : stopsList[currentIndex + 1];
                  const canStepBack = isMoving || currentIndex > 0;

                  return (
                    <div className="bg-white rounded-[24px] p-5 shadow-sm mt-3" style={{ border: '1.5px solid rgba(21,71,52,0.12)' }}>
                      {/* 1. Mini-Stepper Horizontal de las 3 Paradas */}
                      <div className="mb-5 px-1">
                        <div className="flex items-center justify-between relative">
                          {/* Línea de fondo */}
                          <div className="absolute left-6 right-6 top-3.5 h-1 bg-gray-200 rounded-full z-0" />
                          {/* Línea de progreso activa */}
                          <div
                            className="absolute left-6 top-3.5 h-1 rounded-full z-0 transition-all duration-300"
                            style={{
                              backgroundColor: '#154734',
                              width: stopsList.length > 1
                                ? `calc(${((currentIndex + (isMoving ? 0.5 : 0)) / (stopsList.length - 1)) * 100}% - 3rem)`
                                : '0%'
                            }}
                          />

                          {stopsList.map((stop, idx) => {
                            const isPast = idx < currentIndex || (idx === currentIndex && isMoving);
                            const isCurrent = idx === currentIndex && !isMoving;
                            const isNextTarget = isMoving && idx === currentIndex + 1;
                            const shortName = stop === 'Universidad FET' ? 'U. FET' : stop === 'Terminal de Transporte' ? 'Terminal' : stop;

                            return (
                              <div key={stop} className="relative z-10 flex flex-col items-center w-24">
                                <div
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                                  style={{
                                    backgroundColor: isCurrent ? '#154734' : isPast ? '#1F6E4A' : isNextTarget ? '#FEE9E0' : '#F3F4F6',
                                    color: (isCurrent || isPast) ? '#FFFFFF' : isNextTarget ? '#E15A2E' : '#9CA3AF',
                                    border: isNextTarget ? '2px dashed #E15A2E' : isCurrent ? '3px solid #E4EFE7' : '2px solid #FFFFFF',
                                    boxShadow: isCurrent ? '0 0 0 2px #154734' : 'none',
                                    fontFamily: 'Space Grotesk, sans-serif'
                                  }}
                                >
                                  {isPast ? '✓' : idx + 1}
                                </div>
                                <span
                                  className="text-[11px] mt-1.5 text-center leading-tight truncate max-w-full px-1"
                                  style={{
                                    fontFamily: 'Manrope, sans-serif',
                                    fontWeight: (isCurrent || isNextTarget) ? 800 : 600,
                                    color: isCurrent ? '#154734' : isNextTarget ? '#E15A2E' : '#6B7570'
                                  }}
                                >
                                  {shortName}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 2. Cartel Grande de Estado Actual (Alto Contraste para Adultos Mayores) */}
                      <div
                        className="rounded-2xl p-4 text-center mb-4 transition-colors"
                        style={{
                          backgroundColor: isMoving ? '#FFF7ED' : '#F0F7F3',
                          border: `1.5px solid ${isMoving ? 'rgba(225,90,46,0.28)' : 'rgba(21,71,52,0.18)'}`
                        }}
                      >
                        <span
                          className="text-xs font-extrabold uppercase tracking-wider block mb-1"
                          style={{ color: isMoving ? '#E15A2E' : '#154734', fontFamily: 'Space Grotesk, sans-serif' }}
                        >
                          {isMoving
                            ? 'BUS EN CAMINO HACIA:'
                            : isLastStop
                            ? 'ÚLTIMA PARADA ALCANZADA:'
                            : 'PARADO SUBIENDO PASAJEROS EN:'}
                        </span>
                        <h2
                          className="text-2xl font-extrabold text-[#1A2420] leading-tight"
                          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                        >
                          {isMoving ? nextStop : routeStage}
                        </h2>
                      </div>

                      {/* 3. Barra Deslizante Anti-Clics Erróneos (Slide to Action) */}
                      {!isLastStop ? (
                        isMoving ? (
                          <>
                            <SlideToAction
                              label={`Desliza al llegar a ${nextStop}`}
                              sublabel="Arrastra el botón blanco hasta el final →"
                              bgColor="#154734"
                              icon={MapPin}
                              onConfirm={() => handleStageChange(nextStop)}
                            />
                            <p className="text-xs text-center mt-2.5 text-[#6B7570] font-medium leading-relaxed">
                              Desliza el cuadro blanco a la derecha <b>solo cuando hayas frenado</b> en {nextStop}.
                            </p>
                          </>
                        ) : (
                          <>
                            <SlideToAction
                              label={`Desliza para salir a ${nextStop}`}
                              sublabel="Arrastra el botón blanco hasta el final →"
                              bgColor="#E15A2E"
                              icon={ChevronsRight}
                              onConfirm={handleToggleMoving}
                            />
                            <p className="text-xs text-center mt-2.5 text-[#6B7570] font-medium leading-relaxed">
                              Desliza a la derecha cuando termines de subir pasajeros y <b>arranques el bus</b>.
                            </p>
                          </>
                        )
                      ) : (
                        <>
                          <SlideToAction
                            label="Desliza para Finalizar Ruta"
                            sublabel="Terminar recorrido y apagar cámara →"
                            bgColor="#B91C1C"
                            icon={CheckCircle}
                            onConfirm={handleEndRoute}
                          />
                          <p className="text-xs text-center mt-2.5 text-[#6B7570] font-medium leading-relaxed">
                            Has llegado al destino final. Desliza para cerrar el recorrido.
                          </p>
                        </>
                      )}

                      {/* 4. Botón Salvavidas: Volver al paso anterior si se equivocó */}
                      {canStepBack && (
                        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-center">
                          <button
                            type="button"
                            onClick={handleStepBack}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[#6B7570] hover:text-[#1A2420] hover:bg-gray-100 active:scale-95 transition-all"
                            style={{ fontFamily: 'Manrope, sans-serif' }}
                          >
                            <RotateCcw className="w-3.5 h-3.5 stroke-[2.2]" />
                            ¿Lo deslizaste por error? Volver al paso anterior
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Avisos Rápidos */}
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => handleAlertChange('Sale en 5 min')}
                    className="py-2 text-xs font-bold rounded-xl transition-all border"
                    style={{
                      fontFamily: 'Manrope, sans-serif',
                      backgroundColor: alertMessage === 'Sale en 5 min' ? '#FEE9E0' : '#FFFFFF',
                      color: alertMessage === 'Sale en 5 min' ? '#E15A2E' : '#6B7570',
                      borderColor: alertMessage === 'Sale en 5 min' ? 'rgba(225,90,46,0.25)' : 'rgba(21,71,52,0.12)'
                    }}
                  >
                    5 min
                  </button>
                  <button 
                    onClick={() => handleAlertChange('Sale en 10 min')}
                    className="py-2 text-xs font-bold rounded-xl transition-all border"
                    style={{
                      fontFamily: 'Manrope, sans-serif',
                      backgroundColor: alertMessage === 'Sale en 10 min' ? '#FEE9E0' : '#FFFFFF',
                      color: alertMessage === 'Sale en 10 min' ? '#E15A2E' : '#6B7570',
                      borderColor: alertMessage === 'Sale en 10 min' ? 'rgba(225,90,46,0.25)' : 'rgba(21,71,52,0.12)'
                    }}
                  >
                    10 min
                  </button>
                  <button 
                    onClick={() => handleAlertChange(null)}
                    className="py-2 text-xs font-bold rounded-xl bg-white transition-all"
                    style={{ color: '#6B7570', border: '1.5px solid rgba(21,71,52,0.12)', fontFamily: 'Manrope, sans-serif' }}
                  >
                    Quitar aviso
                  </button>
                </div>

                {/* Visor del Escáner QR */}
                {!isMoving ? (
                  <div className="bg-[#1A2420] rounded-[32px] w-full aspect-square flex items-center justify-center relative overflow-hidden shadow-lg mt-4" style={{ border: '2px solid rgba(21,71,52,0.4)' }}>
                    {/* Visor de Cámara */}
                    <div id="reader" className="w-full h-full relative overflow-hidden"></div>
                    <style>{`
                      #reader { border: none !important; width: 100% !important; height: 100% !important; }
                      #reader video { 
                        width: 100% !important; 
                        height: 100% !important; 
                        object-fit: cover !important; 
                        border-radius: 2rem !important; 
                      }
                      /* Ocultar interfaz por defecto si apareciera */
                      #reader__dashboard_section_csr,
                      #reader__dashboard_section_swaplink {
                        display: none !important;
                      }
                    `}</style>

                    {/* Guía / Marco de enfoque visual en las esquinas */}
                    <div className="absolute inset-0 pointer-events-none p-10 flex flex-col justify-between z-10">
                      <div className="flex justify-between">
                        <div className="w-10 h-10 border-t-[3px] border-l-[3px] rounded-tl-xl shadow-sm" style={{ borderColor: '#E4EFE7' }} />
                        <div className="w-10 h-10 border-t-[3px] border-r-[3px] rounded-tr-xl shadow-sm" style={{ borderColor: '#E4EFE7' }} />
                      </div>
                      <div className="flex justify-between">
                        <div className="w-10 h-10 border-b-[3px] border-l-[3px] rounded-bl-xl shadow-sm" style={{ borderColor: '#E4EFE7' }} />
                        <div className="w-10 h-10 border-b-[3px] border-r-[3px] rounded-br-xl shadow-sm" style={{ borderColor: '#E4EFE7' }} />
                      </div>
                    </div>

                    {/* Leyenda inferior sutil */}
                    <div className="absolute bottom-4 inset-x-0 text-center z-10 pointer-events-none">
                      <span className="text-[11px] font-medium px-4 py-1.5 rounded-full backdrop-blur-md" style={{ backgroundColor: 'rgba(26,36,32,0.7)', color: '#E4EFE7', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.04em' }}>
                        Apunta la cámara al código QR
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-[32px] w-full aspect-square flex flex-col items-center justify-center text-center shadow-lg mt-4 p-8" style={{ border: '1.5px dashed rgba(21,71,52,0.2)' }}>
                    <Bus className="w-16 h-16 text-[#154734] mb-4 opacity-50" />
                    <h3 className="text-lg font-bold text-[#1A2420] mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      Cámara Apagada (En Movimiento)
                    </h3>
                    <p className="text-sm text-[#6B7570] leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      Por tu seguridad, el escáner se apaga automáticamente mientras el bus está en movimiento hacia la siguiente parada.
                    </p>
                  </div>
                )}

                {/* Tarjeta Contador de Pasajeros Abordados */}
                <div className="bg-white rounded-2xl p-4 flex items-center justify-between" style={{ border: '1.5px solid rgba(21,71,52,0.12)', boxShadow: '0 2px 8px rgba(21,71,52,0.05)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#E4EFE7' }}>
                      <Users className="w-5 h-5 stroke-[1.5]" style={{ color: '#154734' }} />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#6B7570', fontFamily: 'Space Grotesk, sans-serif' }}>Total abordados</p>
                      <p className="text-2xl font-bold tabular-nums leading-none mt-0.5" style={{ color: '#1A2420', fontFamily: 'Space Grotesk, sans-serif' }}>
                        {passengerCount}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Botón de Cierre: Finalizar Ruta */}
                <div className="pt-2">
                  <button
                    onClick={handleEndRoute}
                    className="w-full bg-white font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-colors active:scale-95"
                    style={{ border: '1.5px solid rgba(220,38,38,0.2)', color: '#DC2626', fontFamily: 'Manrope, sans-serif' }}
                  >
                    <LogOut className="w-4 h-4 stroke-[1.5]" /> Finalizar Ruta
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'perfil' && (
          /* ================= VISTA DE PERFIL DEL CONDUCTOR ================= */
          <div className="mt-2 animate-slide-in space-y-4">
            {profileSubView === null ? (
              <>
                {/* 1. Encabezado del Perfil (User Header Card) */}
                <div className="rounded-[24px] p-5 relative overflow-hidden" style={{ backgroundColor: '#154734', boxShadow: '0 4px 20px rgba(21,71,52,0.22)' }}>
                  <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg width="100%" height="2"><line x1="0" y1="1" x2="100%" y2="1" stroke="rgba(255,255,255,0.06)" strokeWidth="2" strokeDasharray="6 5" /></svg>
                  </div>
                  <div className="relative z-10 flex flex-col">
                    <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{user.nombre || "Conductor Oficial"}</h2>
                    <span className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>Operador FET • Licencia C2 • ID: {user.id || '104'}</span>
                    <div className="mt-3">
                      <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full inline-block" style={{ backgroundColor: '#E4EFE7', color: '#154734', fontFamily: 'Manrope, sans-serif' }}>
                        Conductor Autorizado
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Bloque 1: Vehículo y Turno */}
                <h3 className="text-[11px] font-semibold uppercase tracking-widest mx-1 mt-6 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#6B7570', letterSpacing: '0.08em' }}>
                  Vehículo y Asignación
                </h3>
                <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1.5px solid rgba(21,71,52,0.10)', boxShadow: '0 2px 8px rgba(21,71,52,0.05)' }}>
                  <div className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#E4EFE7' }}>
                        <Bus className="w-4 h-4 stroke-[1.5]" style={{ color: '#154734' }} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold" style={{ color: '#1A2420', fontFamily: 'Manrope, sans-serif' }}>Bus Asignado</span>
                        <span className="text-xs" style={{ color: '#6B7570' }}>Móvil FET #04 • Placa: FET-104</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#E4EFE7', color: '#1F6E4A' }}>
                      Activo
                    </span>
                  </div>
                  <div className="mx-4"><svg width="100%" height="1"><line x1="0" y1="0.5" x2="100%" y2="0.5" stroke="rgba(21,71,52,0.10)" strokeWidth="1" strokeDasharray="4 4" /></svg></div>
                  <div className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#E4EFE7' }}>
                        <Navigation className="w-4 h-4 stroke-[1.5]" style={{ color: '#154734' }} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold" style={{ color: '#1A2420', fontFamily: 'Manrope, sans-serif' }}>Turno Actual</span>
                        <span className="text-xs" style={{ color: '#6B7570' }}>Jornada Mañana • 6:00 AM - 2:00 PM</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 stroke-[1.5]" style={{ color: '#6B7570' }} />
                  </div>
                </div>

                {/* 3. Bloque 2: Soporte y Ayuda */}
                <h3 className="text-[11px] font-semibold uppercase tracking-widest mx-1 mt-6 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#6B7570', letterSpacing: '0.08em' }}>
                  Soporte y Ayuda
                </h3>
                <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1.5px solid rgba(21,71,52,0.10)', boxShadow: '0 2px 8px rgba(21,71,52,0.05)' }}>
                  
                  <div
                    onClick={() => setProfileSubView('guide')}
                    className="p-3.5 flex items-center justify-between transition-colors hover:bg-[#FAF8F4] active:bg-[#E4EFE7]/40 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#E4EFE7' }}>
                        <HelpCircle className="w-4 h-4 stroke-[1.5]" style={{ color: '#154734' }} />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-sm font-semibold" style={{ color: '#1A2420', fontFamily: 'Manrope, sans-serif' }}>Guía de uso para conductores</span>
                        <span className="text-[11px]" style={{ color: '#6B7570' }}>Paso a paso sobre cómo operar la ruta y el escáner</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 stroke-[1.5] shrink-0" style={{ color: '#6B7570' }} />
                  </div>
                </div>

                {/* 4. Botón de Cierre de Sesión y Versión */}
                <div className="pt-4 mb-8">
                  <button 
                    onClick={handleLogout}
                    className="w-full bg-white font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-colors active:scale-95"
                    style={{ border: '1.5px solid rgba(220,38,38,0.2)', color: '#DC2626', fontFamily: 'Manrope, sans-serif' }}
                  >
                    <LogOut className="w-4 h-4 stroke-[1.5]" /> Cerrar Sesión
                  </button>
                </div>

                <p className="text-[11px] text-center pb-6" style={{ color: 'rgba(26,36,32,0.3)', fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.04em' }}>
                  SANBUS CONDUCTOR v1.0.4 • 2026
                </p>
              </>
            ) : profileSubView === 'guide' ? (
              /* ================= SUBVISTA: GUÍA DE USO PARA CONDUCTORES ================= */
              <div className="animate-fade-in pb-8">
                <div className="pb-4 flex items-center gap-3">
                  <button
                    onClick={() => setProfileSubView(null)}
                    className="p-2 rounded-full transition-colors hover:bg-black/5"
                    style={{ backgroundColor: '#E4EFE7' }}
                  >
                    <ChevronRight className="w-5 h-5 rotate-180 stroke-[1.5]" style={{ color: '#154734' }} />
                  </button>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6B7570]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      Manual Operativo · Sanbus
                    </p>
                    <h1 className="text-lg font-bold leading-tight" style={{ fontFamily: 'Space Grotesk, sans-serif', color: '#1A2420' }}>
                      Guía de Uso para Conductores
                    </h1>
                  </div>
                </div>

                {/* Resumen rápido destacado */}
                <div
                  className="p-4 rounded-2xl mb-4"
                  style={{ backgroundColor: '#E4EFE7', border: '1.5px solid rgba(21,71,52,0.15)' }}
                >
                  <p className="text-xs font-bold text-[#154734] mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    Bienvenido al sistema Sanbus FET
                  </p>
                  <p className="text-xs text-[#1A2420]/80 leading-relaxed" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Esta guía explica paso a paso cómo iniciar tu recorrido, cobrar pasajes con la cámara y avisar a los estudiantes en qué parada vas.
                  </p>
                </div>

                {/* Pasos desplegables / tarjetas claras */}
                <div className="space-y-3">
                  {[
                    {
                      step: '1. Elegir el Sentido y la Ruta',
                      body: 'Antes de arrancar, elige arriba si vas "Hacia la FET" (recogiendo estudiantes en la ciudad hacia la universidad, cobrando tarifa de ida y vuelta) o "Salida de la U" (saliendo del campus hacia la ciudad, donde las paradas se invierten automáticamente y los estudiantes usan su Pase de Regreso a $0). Luego toca la ruta asignada y presiona "Iniciar Ruta".'
                    },
                    {
                      step: '2. Subir Pasajeros y Escanear Códigos QR',
                      body: 'Al iniciar la ruta, el bus aparece detenido en la primera parada y la cámara se enciende automáticamente. Pídele a cada estudiante que muestre su código QR en el celular y apúntalo al recuadro. Si sale pantalla VERDE ("¡Pasaje Válido!"), puede subir. Si sale ROJA ("Saldo insuficiente" o "QR ya utilizado"), no se le descontó pasaje.'
                    },
                    {
                      step: '3. Cómo usar la Barra Deslizante para Avanzar',
                      body: 'Para evitar toques por accidente mientras conduces, el botón principal funciona deslizando el cuadro blanco de izquierda a derecha hasta el final. Cuando termines de subir pasajeros y arranques el bus, desliza la barra naranja ("Desliza para salir a..."). Mientras el bus está en movimiento, la cámara se apaga sola por tu seguridad.'
                    },
                    {
                      step: '4. Marcar Llegada a la Siguiente Parada',
                      body: 'Cuando llegues y frenes en la siguiente parada, desliza la barra verde ("Desliza al llegar a..."). Esto volverá a encender la cámara para que suban más estudiantes y les avisará en sus celulares que ya estás detenido en esa estación.'
                    },
                    {
                      step: '5. ¿Deslizaste la barra por equivocación?',
                      body: 'No te preocupes. Justo debajo de la barra deslizante encontrarás el botón "¿Lo deslizaste por error? Volver al paso anterior". Al tocarlo, regresarás inmediatamente a la parada o estado anterior sin perder la cuenta de pasajeros.'
                    },
                    {
                      step: '6. Enviar Avisos Rápidos (5 min / 10 min)',
                      body: 'Si estás próximo a salir o hay un pequeño retraso, puedes tocar los botones "5 min" o "10 min". Esto pondrá una etiqueta de aviso en tiempo real en la aplicación de todos los estudiantes. Toca "Quitar aviso" para borrarlo.'
                    },
                    {
                      step: '7. Finalizar el Recorrido',
                      body: 'Cuando llegues a la última parada del recorrido y bajen los pasajeros, desliza la barra roja ("Desliza para Finalizar Ruta") o presiona el botón "Finalizar Ruta" abajo del todo. Esto apagará la cámara y guardará el registro del viaje.'
                    }
                  ].map((item, idx) => {
                    const isOpen = expandedGuideIdx === idx;
                    return (
                      <div
                        key={idx}
                        className="bg-white rounded-2xl overflow-hidden transition-all"
                        style={{ border: '1.5px solid rgba(21,71,52,0.10)', boxShadow: '0 2px 8px rgba(21,71,52,0.04)' }}
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedGuideIdx(isOpen ? null : idx)}
                          className="w-full px-4 py-3.5 flex items-center justify-between text-left"
                        >
                          <span className="text-sm font-bold text-[#1A2420] pr-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
                            {item.step}
                          </span>
                          <ChevronRight
                            className="w-4 h-4 shrink-0 transition-transform duration-200"
                            style={{ color: '#154734', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
                          />
                        </button>
                        {isOpen && (
                          <div
                            className="px-4 pb-4 pt-2 text-xs leading-relaxed text-[#6B7570] border-t border-gray-100"
                            style={{ fontFamily: 'Manrope, sans-serif' }}
                          >
                            {item.body}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setProfileSubView(null)}
                  className="w-full mt-5 text-white font-semibold text-sm py-3.5 rounded-2xl transition-all active:scale-95"
                  style={{ backgroundColor: '#154734', fontFamily: 'Manrope, sans-serif' }}
                >
                  Entendido, volver al perfil
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* 1. Barra de Navegación Inferior (Navbar alineada con el estudiante) */}
      <div className="fixed bottom-0 left-0 w-full z-50 flex justify-center">
        <nav
          className="w-full max-w-md rounded-t-[28px] py-3 px-16 flex items-center justify-between pointer-events-auto"
          style={{ backgroundColor: '#FFFFFF', boxShadow: '0 -1px 0 rgba(21,71,52,0.08), 0 -8px 24px rgba(21,71,52,0.06)' }}
        >
          <button 
            onClick={() => {
              setActiveTab('inicio');
              setProfileSubView(null);
            }} 
            className="flex flex-col items-center gap-1 transition-all"
          >
            <Scan 
              className={`w-6 h-6 transition-all ${activeTab === 'inicio' ? 'stroke-[2]' : 'stroke-[1.5]'}`} 
              style={{ color: activeTab === 'inicio' ? '#154734' : '#6B7570' }} 
            />
            {activeTab === 'inicio' && (
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#154734' }} />
            )}
          </button>

          <button 
            onClick={() => {
              setActiveTab('perfil');
              setProfileSubView(null);
            }} 
            className="flex flex-col items-center gap-1 transition-all"
          >
            <User 
              className={`w-6 h-6 transition-all ${activeTab === 'perfil' ? 'stroke-[2]' : 'stroke-[1.5]'}`} 
              style={{ color: activeTab === 'perfil' ? '#154734' : '#6B7570' }} 
            />
            {activeTab === 'perfil' && (
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#154734' }} />
            )}
          </button>
        </nav>
      </div>

      {/* Modal Result (Bottom Sheet) para Conductor */}
      {showResultModal && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <div
            onClick={handleCloseResultModal}
            className={`fixed inset-0 bg-black/60 backdrop-blur-sm ${isClosingResult ? 'animate-fade-out' : 'animate-fade-in'}`}
          />

          <div
            className={`rounded-t-[32px] p-8 w-full max-w-md mx-auto shadow-2xl z-10 relative flex flex-col items-center text-center ${isClosingResult ? 'animate-slide-down' : 'animate-slide-up'} ${
              scanResult === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {/* Drag handle */}
            <div className="w-12 h-1.5 rounded-full mx-auto mb-8 bg-white/30" />

            {/* Icono animado */}
            <div className={`w-28 h-28 mb-6 rounded-full flex items-center justify-center bg-white ${
              scanResult === 'success' ? 'text-emerald-600 shadow-[0_0_40px_rgba(255,255,255,0.3)] animate-[bounce_1s_ease-in-out_infinite]' : 'text-red-600 shadow-[0_0_40px_rgba(255,255,255,0.3)]'
            }`}>
              {scanResult === 'success' ? (
                <CheckCircle className="w-16 h-16" />
              ) : (
                <XCircle className="w-16 h-16" />
              )}
            </div>

            {/* Mensaje principal */}
            <h3 className="font-bold text-3xl mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {scanMessage}
            </h3>

            {/* Subtítulo (Estudiante) */}
            {studentInfo && (
              <p className="text-lg font-medium opacity-90 mb-8" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {studentInfo.nombre || 'Estudiante FET'}
              </p>
            )}
            
            {/* Si no hay estudiante (error general), agregamos un margen para mantener la estructura */}
            {!studentInfo && <div className="h-10 mb-5" />}

            {/* Botón de acción */}
            <button
              onClick={handleCloseResultModal}
              className="w-full bg-white font-bold text-lg py-4 rounded-2xl transition-transform active:scale-95 text-black shadow-lg"
              style={{ fontFamily: 'Manrope, sans-serif', color: scanResult === 'success' ? '#047857' : '#B91C1C' }}
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {/* Estilos para el video dentro del contenedor del lector html5-qrcode */}
      <style>{`
        #reader {
          border: none !important;
          width: 100% !important;
          height: 100% !important;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        #reader video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 1.5rem !important;
        }
        #reader img {
          display: none !important;
        }
        #reader__scan_region {
          background: transparent !important;
        }
        #reader__dashboard_section_csr button,
        #reader__dashboard_section_swaplink {
          background-color: #008748 !important;
          color: white !important;
          border: none !important;
          padding: 6px 14px !important;
          border-radius: 12px !important;
          font-size: 11px !important;
          margin: 4px !important;
        }
      `}</style>
    </div>
  );
}
