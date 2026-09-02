-- Insertar datos iniciales de Rutas, Paradas y Horarios según lo acordado

-- Limpiar si hay datos viejos (opcional pero seguro para empezar de 0)
DELETE FROM horarios;
DELETE FROM paradas;
DELETE FROM rutas;

-- 1. Insertar Rutas
INSERT INTO rutas (id, nombre_ruta, origen, destino, tarifa, dias_operacion, frecuencia, duracion, estado) VALUES
(1, 'Ruta Norte', 'C.C. Único', 'Universidad FET', 10000.00, 'Lunes a viernes', 'Solo mañanas (2 viajes)', '30 min', 'ACTIVA'),
(2, 'Ruta Sur', 'Terminal de Transporte', 'Universidad FET', 10000.00, 'Lunes a viernes', 'Solo mañanas (2 viajes)', '30 min', 'ACTIVA'),
(3, 'Ruta Oriente', 'Sta. Lucía Plaza', 'Universidad FET', 10000.00, 'Lunes a viernes', 'Solo mañanas (2 viajes)', '30 min', 'ACTIVA');

-- 2. Insertar Paradas (Ruta Norte)
INSERT INTO paradas (id, ruta_id, nombre, orden) VALUES
(1, 1, 'C.C. Único', 1),
(2, 1, 'San Juan Plaza', 2),
(3, 1, 'Universidad FET', 3);

-- 3. Insertar Paradas (Ruta Sur)
INSERT INTO paradas (id, ruta_id, nombre, orden) VALUES
(4, 2, 'Terminal de Transporte', 1),
(5, 2, 'Unicentro', 2),
(6, 2, 'Universidad FET', 3);

-- 4. Insertar Paradas (Ruta Oriente)
INSERT INTO paradas (id, ruta_id, nombre, orden) VALUES
(7, 3, 'Sta. Lucía Plaza', 1),
(8, 3, 'Pq. de la Música', 2),
(9, 3, 'Universidad FET', 3);

-- 5. Insertar Horarios (Salidas)
-- Ruta Norte (Salida 1: 06:10, 06:20, 06:40)
INSERT INTO horarios (ruta_id, numero_salida, parada_id, hora) VALUES (1, 1, 1, '06:10:00'), (1, 1, 2, '06:20:00'), (1, 1, 3, '06:40:00');
-- Ruta Norte (Salida 2: 06:50, 07:00, 07:20)
INSERT INTO horarios (ruta_id, numero_salida, parada_id, hora) VALUES (1, 2, 1, '06:50:00'), (1, 2, 2, '07:00:00'), (1, 2, 3, '07:20:00');

-- Ruta Sur (Salida 1: 06:10, 06:20, 06:40)
INSERT INTO horarios (ruta_id, numero_salida, parada_id, hora) VALUES (2, 1, 4, '06:10:00'), (2, 1, 5, '06:20:00'), (2, 1, 6, '06:40:00');
-- Ruta Sur (Salida 2: 06:50, 07:00, 07:20)
INSERT INTO horarios (ruta_id, numero_salida, parada_id, hora) VALUES (2, 2, 4, '06:50:00'), (2, 2, 5, '07:00:00'), (2, 2, 6, '07:20:00');

-- Ruta Oriente (Salida 1: 06:10, 06:20, 06:40)
INSERT INTO horarios (ruta_id, numero_salida, parada_id, hora) VALUES (3, 1, 7, '06:10:00'), (3, 1, 8, '06:20:00'), (3, 1, 9, '06:40:00');
-- Ruta Oriente (Salida 2: 06:50, 07:00, 07:20)
INSERT INTO horarios (ruta_id, numero_salida, parada_id, hora) VALUES (3, 2, 7, '06:50:00'), (3, 2, 8, '07:00:00'), (3, 2, 9, '07:20:00');
