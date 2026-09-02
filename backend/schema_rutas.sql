-- ================================================================
-- Schema de horarios Sanbus FET
-- Ejecutar sobre la base de datos: ruta_escolar_fet
-- NO modifica tablas existentes (usuarios, saldos, rutas,
-- active_trips, validaciones)
-- ================================================================

-- 1. Paradas de cada ruta (columnas de la tabla de horarios)
CREATE TABLE IF NOT EXISTS paradas_ruta (
  id         INT          NOT NULL AUTO_INCREMENT,
  ruta_id    INT          NOT NULL COMMENT 'FK → rutas.id',
  nombre     VARCHAR(100) NOT NULL,
  orden      TINYINT      NOT NULL COMMENT 'Posición de izquierda a derecha',
  es_destino BOOLEAN      NOT NULL DEFAULT FALSE COMMENT 'TRUE = última parada (U. FET)',
  PRIMARY KEY (id),
  UNIQUE KEY uq_ruta_orden (ruta_id, orden),
  CONSTRAINT fk_parada_ruta FOREIGN KEY (ruta_id) REFERENCES rutas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Horarios: cada celda (ruta × salida × parada) es un registro
CREATE TABLE IF NOT EXISTS salidas_horario (
  id            INT     NOT NULL AUTO_INCREMENT,
  ruta_id       INT     NOT NULL COMMENT 'FK → rutas.id',
  parada_id     INT     NOT NULL COMMENT 'FK → paradas_ruta.id',
  numero_salida TINYINT NOT NULL COMMENT '1ª, 2ª, 3ª salida del día',
  hora_paso     TIME    NOT NULL COMMENT 'HH:MM:SS hora de paso por esta parada',
  PRIMARY KEY (id),
  UNIQUE KEY uq_salida_parada (ruta_id, numero_salida, parada_id),
  CONSTRAINT fk_sh_ruta   FOREIGN KEY (ruta_id)   REFERENCES rutas(id)        ON DELETE CASCADE,
  CONSTRAINT fk_sh_parada FOREIGN KEY (parada_id) REFERENCES paradas_ruta(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Avisos de cambios de horario (caso de uso explícito del usuario)
CREATE TABLE IF NOT EXISTS avisos_horario (
  id              INT          NOT NULL AUTO_INCREMENT,
  ruta_id         INT          NOT NULL COMMENT 'FK → rutas.id',
  mensaje         VARCHAR(300) NOT NULL,
  fecha_vigencia  DATE         NOT NULL COMMENT 'Fecha desde la que aplica el cambio',
  activo          BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_aviso_ruta FOREIGN KEY (ruta_id) REFERENCES rutas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- DATOS INICIALES
-- Asume: rutas.id = 1 (Ruta Norte), 2 (Ruta Sur), 3 (Ruta Oriente)
-- ================================================================

-- ── Paradas ──────────────────────────────────────────────────────

-- Ruta Norte
INSERT IGNORE INTO paradas_ruta (ruta_id, nombre, orden, es_destino) VALUES
  (1, 'C.C. Único',        1, FALSE),
  (1, 'San Juan Plaza',    2, FALSE),
  (1, 'Universidad FET',   3, TRUE);

-- Ruta Sur
INSERT IGNORE INTO paradas_ruta (ruta_id, nombre, orden, es_destino) VALUES
  (2, 'Terminal de Transporte', 1, FALSE),
  (2, 'C.C. Único',             2, FALSE),
  (2, 'Universidad FET',        3, TRUE);

-- Ruta Oriente
INSERT IGNORE INTO paradas_ruta (ruta_id, nombre, orden, es_destino) VALUES
  (3, 'Sta. Lucía Plaza',  1, FALSE),
  (3, 'Pq. de la Música',  2, FALSE),
  (3, 'Universidad FET',   3, TRUE);

-- ── Horarios (salidas) ────────────────────────────────────────────
-- Se usan subqueries para obtener los parada_id dinámicamente,
-- así el script es robusto frente a auto_increment distinto.

-- Ruta Norte – Salida 1
INSERT IGNORE INTO salidas_horario (ruta_id, parada_id, numero_salida, hora_paso)
  SELECT 1, id, 1, '06:10:00' FROM paradas_ruta WHERE ruta_id = 1 AND orden = 1;
INSERT IGNORE INTO salidas_horario (ruta_id, parada_id, numero_salida, hora_paso)
  SELECT 1, id, 1, '06:50:00' FROM paradas_ruta WHERE ruta_id = 1 AND orden = 2;
INSERT IGNORE INTO salidas_horario (ruta_id, parada_id, numero_salida, hora_paso)
  SELECT 1, id, 1, '07:20:00' FROM paradas_ruta WHERE ruta_id = 1 AND orden = 3;

-- Ruta Norte – Salida 2
INSERT IGNORE INTO salidas_horario (ruta_id, parada_id, numero_salida, hora_paso)
  SELECT 1, id, 2, '07:30:00' FROM paradas_ruta WHERE ruta_id = 1 AND orden = 1;
INSERT IGNORE INTO salidas_horario (ruta_id, parada_id, numero_salida, hora_paso)
  SELECT 1, id, 2, '08:10:00' FROM paradas_ruta WHERE ruta_id = 1 AND orden = 2;
INSERT IGNORE INTO salidas_horario (ruta_id, parada_id, numero_salida, hora_paso)
  SELECT 1, id, 2, '08:40:00' FROM paradas_ruta WHERE ruta_id = 1 AND orden = 3;

-- Ruta Norte – Salida 3
INSERT IGNORE INTO salidas_horario (ruta_id, parada_id, numero_salida, hora_paso)
  SELECT 1, id, 3, '09:00:00' FROM paradas_ruta WHERE ruta_id = 1 AND orden = 1;
INSERT IGNORE INTO salidas_horario (ruta_id, parada_id, numero_salida, hora_paso)
  SELECT 1, id, 3, '09:40:00' FROM paradas_ruta WHERE ruta_id = 1 AND orden = 2;
INSERT IGNORE INTO salidas_horario (ruta_id, parada_id, numero_salida, hora_paso)
  SELECT 1, id, 3, '10:10:00' FROM paradas_ruta WHERE ruta_id = 1 AND orden = 3;

-- Ruta Sur – Salida 1
INSERT IGNORE INTO salidas_horario (ruta_id, parada_id, numero_salida, hora_paso)
  SELECT 2, id, 1, '06:10:00' FROM paradas_ruta WHERE ruta_id = 2 AND orden = 1;
INSERT IGNORE INTO salidas_horario (ruta_id, parada_id, numero_salida, hora_paso)
  SELECT 2, id, 1, '06:50:00' FROM paradas_ruta WHERE ruta_id = 2 AND orden = 2;
INSERT IGNORE INTO salidas_horario (ruta_id, parada_id, numero_salida, hora_paso)
  SELECT 2, id, 1, '07:25:00' FROM paradas_ruta WHERE ruta_id = 2 AND orden = 3;

-- Ruta Sur – Salida 2
INSERT IGNORE INTO salidas_horario (ruta_id, parada_id, numero_salida, hora_paso)
  SELECT 2, id, 2, '07:35:00' FROM paradas_ruta WHERE ruta_id = 2 AND orden = 1;
INSERT IGNORE INTO salidas_horario (ruta_id, parada_id, numero_salida, hora_paso)
  SELECT 2, id, 2, '08:15:00' FROM paradas_ruta WHERE ruta_id = 2 AND orden = 2;
INSERT IGNORE INTO salidas_horario (ruta_id, parada_id, numero_salida, hora_paso)
  SELECT 2, id, 2, '08:50:00' FROM paradas_ruta WHERE ruta_id = 2 AND orden = 3;

-- Ruta Sur – Salida 3
INSERT IGNORE INTO salidas_horario (ruta_id, parada_id, numero_salida, hora_paso)
  SELECT 2, id, 3, '09:00:00' FROM paradas_ruta WHERE ruta_id = 2 AND orden = 1;
INSERT IGNORE INTO salidas_horario (ruta_id, parada_id, numero_salida, hora_paso)
  SELECT 2, id, 3, '09:40:00' FROM paradas_ruta WHERE ruta_id = 2 AND orden = 2;
INSERT IGNORE INTO salidas_horario (ruta_id, parada_id, numero_salida, hora_paso)
  SELECT 2, id, 3, '10:15:00' FROM paradas_ruta WHERE ruta_id = 2 AND orden = 3;

-- Ruta Oriente – Salida 1
INSERT IGNORE INTO salidas_horario (ruta_id, parada_id, numero_salida, hora_paso)
  SELECT 3, id, 1, '06:10:00' FROM paradas_ruta WHERE ruta_id = 3 AND orden = 1;
INSERT IGNORE INTO salidas_horario (ruta_id, parada_id, numero_salida, hora_paso)
  SELECT 3, id, 1, '06:50:00' FROM paradas_ruta WHERE ruta_id = 3 AND orden = 2;
INSERT IGNORE INTO salidas_horario (ruta_id, parada_id, numero_salida, hora_paso)
  SELECT 3, id, 1, '07:35:00' FROM paradas_ruta WHERE ruta_id = 3 AND orden = 3;

-- Ruta Oriente – Salida 2
INSERT IGNORE INTO salidas_horario (ruta_id, parada_id, numero_salida, hora_paso)
  SELECT 3, id, 2, '07:40:00' FROM paradas_ruta WHERE ruta_id = 3 AND orden = 1;
INSERT IGNORE INTO salidas_horario (ruta_id, parada_id, numero_salida, hora_paso)
  SELECT 3, id, 2, '08:20:00' FROM paradas_ruta WHERE ruta_id = 3 AND orden = 2;
INSERT IGNORE INTO salidas_horario (ruta_id, parada_id, numero_salida, hora_paso)
  SELECT 3, id, 2, '09:05:00' FROM paradas_ruta WHERE ruta_id = 3 AND orden = 3;

-- Ruta Oriente – Salida 3
INSERT IGNORE INTO salidas_horario (ruta_id, parada_id, numero_salida, hora_paso)
  SELECT 3, id, 3, '09:10:00' FROM paradas_ruta WHERE ruta_id = 3 AND orden = 1;
INSERT IGNORE INTO salidas_horario (ruta_id, parada_id, numero_salida, hora_paso)
  SELECT 3, id, 3, '09:50:00' FROM paradas_ruta WHERE ruta_id = 3 AND orden = 2;
INSERT IGNORE INTO salidas_horario (ruta_id, parada_id, numero_salida, hora_paso)
  SELECT 3, id, 3, '10:35:00' FROM paradas_ruta WHERE ruta_id = 3 AND orden = 3;

-- ── Avisos de horario ─────────────────────────────────────────────

INSERT IGNORE INTO avisos_horario (ruta_id, mensaje, fecha_vigencia, activo) VALUES
  (1,
   'Desde el 15 de septiembre, la salida de las 6:10 AM opera con retraso de 10 minutos por obras en C.C. Único.',
   '2026-09-15',
   TRUE),
  (3,
   'Desde el 20 de septiembre, la tercera salida (9:10 AM) queda suspendida temporalmente.',
   '2026-09-20',
   TRUE);
