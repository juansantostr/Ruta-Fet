import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, CreditCard } from 'lucide-react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  
  // Login State
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  
  // Register State
  const [regData, setRegData] = useState({ nombre: '', documento: '', correo: '', password: '', confirmPassword: '' });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegChange = (e) => {
    setRegData({ ...regData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      const userRol = data.user.rol ? data.user.rol.toUpperCase() : '';
      if (userRol === 'ESTUDIANTE') navigate('/estudiante');
      else if (userRol === 'CONDUCTOR') navigate('/conductor');
      else navigate('/admin');
    } catch (err) {
      if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
        console.warn('Backend no disponible. Usando sesión de prueba.');
        localStorage.setItem('token', 'mock_token_123');
        localStorage.setItem('user', JSON.stringify({ id: 99, nombre: 'Estudiante Prueba', rol: 'ESTUDIANTE' }));
        navigate('/estudiante');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (regData.password !== regData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        nombre: regData.nombre,
        documento: regData.documento,
        correo: regData.correo,
        password: regData.password
      };

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrarse');

      alert('Registro exitoso. Ahora puedes iniciar sesión.');
      setIsLogin(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleView = () => {
    setError('');
    setIsLogin(!isLogin);
  };

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto relative font-sans shadow-xl bg-white overflow-x-hidden">
      {/* Bloque Superior (Header con degradado) */}
      <div 
        className="h-[45vh] min-h-[350px] bg-cover bg-center relative flex flex-col items-center pt-2 flex-shrink-0"
        style={{ backgroundImage: "url('/fet-img.jpg')" }}
      >
        {/* Degradado intermedio */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-white/50 to-white"></div>
        
        {/* Logo centrado al límite superior */}
        <img 
          src="/logo-page-sinfondo.png" 
          alt="Sanbus Logo" 
          className="relative z-10 w-40 h-auto object-contain drop-shadow-md"
        />
      </div>

      {/* Bloque Inferior (Formulario Integrado) */}
      <div className="flex-1 bg-white px-6 pb-4 flex flex-col relative z-20">
        
        {/* Encabezado del Formulario */}
        <div className="w-full max-w-sm mx-auto px-2 text-center mb-10 -mt-28 relative z-30">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-snug drop-shadow-sm">
            Tu transporte universitario al alcance de tu mano
          </h1>
          <p className="text-sm text-gray-600 mt-2">
            Gestiona tu saldo, rutas y pasajes digitales en un solo lugar.
          </p>
        </div>

        {/* Contenedor Animado de los Formularios */}
        <div className="relative w-full max-w-sm mx-auto overflow-hidden">
          <div 
            className="flex w-[200%] transition-transform duration-500 ease-in-out items-start"
            style={{ transform: isLogin ? 'translateX(0)' : 'translateX(-50%)' }}
          >
            
            {/* FORMULARIO LOGIN */}
            <div className={`w-1/2 flex-shrink-0 flex flex-col px-2 ${!isLogin ? 'max-h-0 overflow-hidden' : ''}`}>
              <form className="flex flex-col" onSubmit={handleLogin}>
                <div className="space-y-6">
                  <div className="flex flex-col group">
                    <label className="flex items-center text-sm font-bold text-gray-600 mb-2">
                      <Mail className="text-gray-400 mr-2 w-5 h-5" /> Correo electrónico
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={correo}
                        onChange={(e) => setCorreo(e.target.value)}
                        className="peer appearance-none bg-transparent border-b border-gray-200 w-full text-gray-800 py-2 px-1 text-base leading-tight focus:outline-none transition-colors"
                      />
                      <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-emerald-600 transition-all duration-500 ease-out peer-focus:w-full"></span>
                    </div>
                  </div>

                  <div className="flex flex-col group">
                    <label className="flex items-center text-sm font-bold text-gray-600 mb-2">
                      <Lock className="text-gray-400 mr-2 w-5 h-5" /> Contraseña
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="peer appearance-none bg-transparent border-b border-gray-200 w-full text-gray-800 py-2 px-1 text-base leading-tight focus:outline-none transition-colors"
                      />
                      <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-emerald-600 transition-all duration-500 ease-out peer-focus:w-full"></span>
                    </div>
                  </div>
                </div>

                {error && isLogin && (
                  <div className="text-red-500 text-sm font-medium text-center mt-4">
                    {error}
                  </div>
                )}

                <div className="text-right mt-4 mb-2">
                  <a href="#" className="text-sm font-bold text-gray-500 hover:text-emerald-700">
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>

                <div className="mt-8 pb-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-lg font-bold text-white bg-emerald-800 hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-700 transition-all active:scale-95 disabled:opacity-70"
                  >
                    {loading ? 'Ingresando...' : 'Iniciar sesión'}
                  </button>
                </div>
              </form>

              <div className="text-center mt-2 pb-2">
                <p className="text-sm text-gray-500">
                  ¿No tienes una cuenta?{' '}
                  <button onClick={toggleView} type="button" className="font-bold text-emerald-800 hover:text-emerald-900 transition-colors">
                    Regístrate aquí
                  </button>
                </p>
              </div>
            </div>

            {/* FORMULARIO REGISTRO */}
            <div className={`w-1/2 flex-shrink-0 flex flex-col px-2 ${isLogin ? 'max-h-0 overflow-hidden' : ''}`}>
              <form className="flex flex-col space-y-6" onSubmit={handleRegister}>
                <div className="space-y-4">
                  <div className="flex flex-col group">
                    <label className="flex items-center text-sm font-bold text-gray-600 mb-1">
                      <User className="text-gray-400 mr-2 w-4 h-4" /> Nombre Completo
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="nombre"
                        required
                        value={regData.nombre}
                        onChange={handleRegChange}
                        className="peer appearance-none bg-transparent border-b border-gray-200 w-full text-gray-800 py-1.5 px-1 text-base leading-tight focus:outline-none transition-colors"
                      />
                      <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-emerald-600 transition-all duration-500 ease-out peer-focus:w-full"></span>
                    </div>
                  </div>

                  <div className="flex flex-col group">
                    <label className="flex items-center text-sm font-bold text-gray-600 mb-1">
                      <CreditCard className="text-gray-400 mr-2 w-4 h-4" /> Documento (Cédula)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="documento"
                        required
                        value={regData.documento}
                        onChange={handleRegChange}
                        className="peer appearance-none bg-transparent border-b border-gray-200 w-full text-gray-800 py-1.5 px-1 text-base leading-tight focus:outline-none transition-colors"
                      />
                      <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-emerald-600 transition-all duration-500 ease-out peer-focus:w-full"></span>
                    </div>
                  </div>

                  <div className="flex flex-col group">
                    <label className="flex items-center text-sm font-bold text-gray-600 mb-1">
                      <Mail className="text-gray-400 mr-2 w-4 h-4" /> Correo electrónico
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        name="correo"
                        required
                        value={regData.correo}
                        onChange={handleRegChange}
                        className="peer appearance-none bg-transparent border-b border-gray-200 w-full text-gray-800 py-1.5 px-1 text-base leading-tight focus:outline-none transition-colors"
                      />
                      <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-emerald-600 transition-all duration-500 ease-out peer-focus:w-full"></span>
                    </div>
                  </div>

                  <div className="flex flex-col group">
                    <label className="flex items-center text-sm font-bold text-gray-600 mb-1">
                      <Lock className="text-gray-400 mr-2 w-4 h-4" /> Contraseña
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        name="password"
                        required
                        value={regData.password}
                        onChange={handleRegChange}
                        className="peer appearance-none bg-transparent border-b border-gray-200 w-full text-gray-800 py-1.5 px-1 text-base leading-tight focus:outline-none transition-colors"
                      />
                      <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-emerald-600 transition-all duration-500 ease-out peer-focus:w-full"></span>
                    </div>
                  </div>

                  <div className="flex flex-col group">
                    <label className="flex items-center text-sm font-bold text-gray-600 mb-1">
                      <Lock className="text-gray-400 mr-2 w-4 h-4" /> Confirmar Contraseña
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        name="confirmPassword"
                        required
                        value={regData.confirmPassword}
                        onChange={handleRegChange}
                        className="peer appearance-none bg-transparent border-b border-gray-200 w-full text-gray-800 py-1.5 px-1 text-base leading-tight focus:outline-none transition-colors"
                      />
                      <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-emerald-600 transition-all duration-500 ease-out peer-focus:w-full"></span>
                    </div>
                  </div>
                </div>

                {error && !isLogin && (
                  <div className="text-red-500 text-sm font-medium text-center">
                    {error}
                  </div>
                )}

                <div className="mt-8 pb-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-lg font-bold text-white bg-emerald-800 hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-700 transition-all active:scale-95 disabled:opacity-70"
                  >
                    {loading ? 'Registrando...' : 'Crear cuenta'}
                  </button>
                </div>
              </form>

              <div className="text-center mt-2 pb-2">
                <p className="text-sm text-gray-500">
                  ¿Ya tienes una cuenta?{' '}
                  <button onClick={toggleView} type="button" className="font-bold text-emerald-800 hover:text-emerald-900 transition-colors">
                    Inicia Sesión
                  </button>
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
