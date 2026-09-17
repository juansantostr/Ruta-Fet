import React, { useState, useEffect, useRef } from "react";
import { Search, ArrowRight } from "lucide-react";
import SplitText from "./SplitText";

export function PlaceholdersAndVanishInput({
  placeholders = [
    "Buscar rutas (ej. Ruta Norte)...",
    "Buscar paradas (ej. C.C. Único)...",
    "Buscar horarios o servicios...",
  ],
  onChange,
  onSubmit,
}) {
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const [value, setValue] = useState("");
  const [animating, setAnimating] = useState(false);

  const canvasRef = useRef(null);
  const inputRef = useRef(null);
  const particlesRef = useRef([]);

  // Alternar placeholders con mayor tiempo de espera (5.5 segundos)
  useEffect(() => {
    if (placeholders.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [placeholders]);

  // Animación de partículas al enviar (desintegración de texto)
  const vanishAndSubmit = () => {
    if (!value.trim() || animating) return;

    setAnimating(true);
    const canvas = canvasRef.current;
    if (!canvas) {
      setValue("");
      setAnimating(false);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setValue("");
      setAnimating(false);
      return;
    }

    const rect = inputRef.current.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Dibujar texto en el canvas para extraer los píxeles
    const computedStyle = getComputedStyle(inputRef.current);
    const fontSize = parseFloat(computedStyle.fontSize) || 14;
    ctx.font = `${fontSize}px ${computedStyle.fontFamily || 'sans-serif'}`;
    ctx.fillStyle = computedStyle.color || "#1f2937";
    ctx.textBaseline = "middle";
    ctx.fillText(value, 0, canvas.height / 2);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixelData = imageData.data;
    const particles = [];

    // Generar partículas a partir de los píxeles no transparentes
    for (let y = 0; y < canvas.height; y += 2) {
      for (let x = 0; x < canvas.width; x += 2) {
        const index = (y * canvas.width + x) * 4;
        const alpha = pixelData[index + 3];
        if (alpha > 40) {
          particles.push({
            x,
            y,
            r: Math.random() * 1.5 + 0.5,
            color: `rgba(${pixelData[index]}, ${pixelData[index + 1]}, ${pixelData[index + 2]}, ${alpha / 255})`,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 1.2) * 3,
            alpha: 1,
          });
        }
      }
    }

    particlesRef.current = particles;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setValue(""); // Vaciar input para dar lugar al canvas

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particlesRef.current.forEach((p) => {
        if (p.alpha > 0) {
          alive = true;
          p.x += p.vx;
          p.y += p.vy;
          p.alpha -= 0.08;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fill();
        }
      });

      ctx.globalAlpha = 1;

      if (alive) {
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setAnimating(false);
      }
    };

    animate();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) onSubmit(e);
    vanishAndSubmit();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-[#1A2420]/10 py-2 px-4 flex items-center gap-3 mt-6 mb-2 relative overflow-hidden"
      style={{ boxShadow: '0 1px 4px rgba(26,36,32,0.06)' }}
    >
      <Search className="text-[#6B7570] w-4 h-4 shrink-0 stroke-[1.5]" />
      <div className="relative w-full flex items-center">
        {/* Placeholder animado con SplitText letra por letra */}
        {!value && (
          <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none select-none z-0">
            <SplitText
              key={placeholders[currentPlaceholder]}
              text={placeholders[currentPlaceholder]}
              className="text-sm text-[#6B7570] font-normal"
              delay={18}
              duration={0.25}
              from={{ opacity: 0, y: 10 }}
              to={{ opacity: 1, y: 0 }}
            />
          </div>
        )}

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (onChange) onChange(e);
          }}
          onKeyDown={handleKeyDown}
          className="bg-transparent border-none outline-none w-full text-sm text-[#1A2420] font-normal py-1 pr-2 relative z-10"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none z-20"
        />
      </div>

      <button
        type="submit"
        disabled={!value.trim()}
        className={`p-1.5 rounded-full transition-all duration-300 shrink-0 relative z-10 ${
          value.trim()
            ? "bg-[#154734] text-white cursor-pointer opacity-100 scale-100"
            : "bg-gray-100 text-gray-300 opacity-0 scale-75 pointer-events-none"
        }`}
      >
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  );
}

