-- Modificaciones a la base de datos ruta_escolar_fet para el nuevo sistema

-- 1. Crear tabla de transacciones para recargas y gastos
CREATE TABLE IF NOT EXISTS transacciones (
  id INT NOT NULL AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  tipo ENUM('RECARGA', 'GASTO') NOT NULL,
  monto DECIMAL(10,2) NOT NULL,
  descripcion VARCHAR(255) NOT NULL,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. Modificar la tabla rutas para soportar origen, destino, tarifa, etc.
ALTER TABLE rutas 
  DROP COLUMN parada_principal,
  DROP COLUMN horario,
  DROP COLUMN estado,
  ADD COLUMN origen VARCHAR(100) NOT NULL,
  ADD COLUMN destino VARCHAR(100) NOT NULL,
  ADD COLUMN tarifa DECIMAL(10,2) DEFAULT 10000.00,
  ADD COLUMN dias_operacion VARCHAR(100) DEFAULT 'Lunes a viernes',
  ADD COLUMN frecuencia VARCHAR(100) DEFAULT 'Solo mañanas (2 viajes)',
  ADD COLUMN duracion VARCHAR(50) DEFAULT '30 min',
  ADD COLUMN estado VARCHAR(20) DEFAULT 'ACTIVA';

-- 3. Crear tabla de paradas por ruta
CREATE TABLE IF NOT EXISTS paradas (
  id INT NOT NULL AUTO_INCREMENT,
  ruta_id INT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  orden INT NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (ruta_id) REFERENCES rutas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 4. Crear tabla de salidas/horarios
CREATE TABLE IF NOT EXISTS horarios (
  id INT NOT NULL AUTO_INCREMENT,
  ruta_id INT NOT NULL,
  numero_salida INT NOT NULL,
  parada_id INT NOT NULL,
  hora TIME NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (ruta_id) REFERENCES rutas(id) ON DELETE CASCADE,
  FOREIGN KEY (parada_id) REFERENCES paradas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 5. Crear tabla de avisos de rutas
CREATE TABLE IF NOT EXISTS avisos (
  id INT NOT NULL AUTO_INCREMENT,
  ruta_id INT NOT NULL,
  mensaje TEXT NOT NULL,
  fecha_vigencia DATE NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (id),
  FOREIGN KEY (ruta_id) REFERENCES rutas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 6. Ajustar active_trips para que referencie IDs reales
ALTER TABLE active_trips 
  ADD COLUMN driver_id INT,
  ADD COLUMN ruta_id INT,
  ADD FOREIGN KEY (driver_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  ADD FOREIGN KEY (ruta_id) REFERENCES rutas(id) ON DELETE SET NULL;
