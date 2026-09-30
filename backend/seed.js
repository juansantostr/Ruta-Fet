const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '12345',
  database: 'ruta_escolar_fet'
};

const nombresEstudiantes = [
  'Carlos Ramirez', 'Maria Gonzalez', 'Juan Perez', 'Ana Martinez', 'Luis Fernandez',
  'Laura Lopez', 'Jorge Torres', 'Sofia Ruiz', 'Diego Diaz', 'Valentina Castro',
  'Andres Ortiz', 'Camila Morales', 'Mateo Silva', 'Isabella Vargas', 'Sebastian Rojas'
];

const nombresConductores = [
  'Pedro Mendoza', 'Roberto Sanchez', 'Armando Aguilar'
];

async function run() {
  const connection = await mysql.createConnection(dbConfig);
  try {
    console.log('Iniciando simulacion...');

    // 1. Limpiar usuarios (sólo ESTUDIANTE y CONDUCTOR, dejar ADMIN)
    await connection.query("DELETE FROM usuarios WHERE rol IN ('ESTUDIANTE', 'CONDUCTOR')");
    console.log('Usuarios de prueba anteriores eliminados.');

    const hash = await bcrypt.hash('123456', 10);

    // 2. Insertar Estudiantes
    const studentIds = [];
    for (let i = 0; i < nombresEstudiantes.length; i++) {
      const doc = '1000' + String(i).padStart(4, '0');
      const email = `estudiante${i}@fet.edu.co`;
      const [res] = await connection.query(
        "INSERT INTO usuarios (nombre, correo, password, rol, documento) VALUES (?, ?, ?, 'ESTUDIANTE', ?)",
        [nombresEstudiantes[i], email, hash, doc]
      );
      studentIds.push(res.insertId);
      
      // Crear saldo 0
      await connection.query("INSERT INTO saldos (estudiante_id, saldo_actual) VALUES (?, 0)", [res.insertId]);
    }

    // 3. Insertar Conductores
    const driverIds = [];
    const driverNames = [];
    for (let i = 0; i < nombresConductores.length; i++) {
      const doc = '2000' + String(i).padStart(4, '0');
      const email = `conductor${i}@fet.edu.co`;
      const [res] = await connection.query(
        "INSERT INTO usuarios (nombre, correo, password, rol, documento) VALUES (?, ?, ?, 'CONDUCTOR', ?)",
        [nombresConductores[i], email, hash, doc]
      );
      driverIds.push(res.insertId);
      driverNames.push(nombresConductores[i]);
    }

    // Obtener Rutas
    const [rutas] = await connection.query("SELECT id, nombre_ruta FROM rutas");
    if (rutas.length === 0) {
      console.log("NO HAY RUTAS. Por favor crealas primero.");
      process.exit(1);
    }

    // 4. Simulación de 7 Días
    const hoy = new Date();
    
    for (let d = 7; d >= 0; d--) {
      const currentDate = new Date(hoy);
      currentDate.setDate(hoy.getDate() - d);
      
      const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
      if (isWeekend) continue; // Menos o nula actividad en fines de semana
      
      const dateStr = currentDate.toISOString().split('T')[0];

      // a. Recargas del dia (aleatorio para algunos estudiantes)
      for (const stId of studentIds) {
        if (Math.random() > 0.7) { // 30% chance de recarga
          const montoRecarga = [20000, 50000, 100000][Math.floor(Math.random() * 3)];
          const horaRecarga = `${dateStr} 0${Math.floor(Math.random()*2 + 7)}:${Math.floor(Math.random()*50+10)}:00`;
          
          await connection.query(
            "UPDATE saldos SET saldo_actual = saldo_actual + ? WHERE estudiante_id = ?",
            [montoRecarga, stId]
          );
          await connection.query(
            "INSERT INTO transacciones (usuario_id, tipo, monto, descripcion, fecha) VALUES (?, 'RECARGA', ?, 'Recarga en efectivo en caja', ?)",
            [stId, montoRecarga, horaRecarga]
          );
        }
      }

      // b. Viajes del dia (1 mañana, 1 tarde por conductor)
      for (let i = 0; i < driverIds.length; i++) {
        const dName = driverNames[i];
        const ruta = rutas[i % rutas.length]; // asignar ruta al conductor

        const turnos = [
          { start: '06:00:00', end: '06:45:00' },
          { start: '17:00:00', end: '17:45:00' }
        ];

        for (const turno of turnos) {
          const startTimeStr = `${dateStr} ${turno.start}`;
          const endTimeStr = `${dateStr} ${turno.end}`;
          
          // Crear active_trip history
          const passengers = Math.floor(Math.random() * 10) + 5; // 5 to 14 pasajeros
          const [tripRes] = await connection.query(
            "INSERT INTO active_trips (driver_name, route_name, passengers_count, status, start_time, stage, driver_id, ruta_id) VALUES (?, ?, ?, 'completed', ?, 'boarding', ?, ?)",
            [dName, ruta.nombre_ruta, passengers, startTimeStr, driverIds[i], ruta.id]
          );
          
          // Escoger estudiantes aleatorios para este viaje
          const shuffledStudents = [...studentIds].sort(() => 0.5 - Math.random());
          const tripStudents = shuffledStudents.slice(0, passengers);

          for (const stId of tripStudents) {
            // Verificar saldo
            const [[saldoRows]] = await connection.query("SELECT saldo_actual FROM saldos WHERE estudiante_id = ?", [stId]);
            let saldo = parseFloat(saldoRows.saldo_actual || 0);

            if (saldo >= 10000) {
              const h = turno.start.startsWith('06') ? 6 : 17;
              const abordajeTime = `${dateStr} ${String(h).padStart(2,'0')}:${Math.floor(Math.random()*40+10)}:00`;
              
              // Cobrar
              await connection.query("UPDATE saldos SET saldo_actual = saldo_actual - 10000 WHERE estudiante_id = ?", [stId]);
              await connection.query(
                "INSERT INTO transacciones (usuario_id, tipo, monto, descripcion, fecha) VALUES (?, 'GASTO', 10000, 'Abordaje de ruta', ?)",
                [stId, abordajeTime]
              );
              // Validacion
              const token = 'simulacion-' + Math.random().toString(36).substring(7);
              await connection.query(
                "INSERT INTO validaciones (estudiante_id, conductor_id, ruta_id, monto_descontado, qr_token, fecha_abordaje) VALUES (?, ?, ?, 10000, ?, ?)",
                [stId, driverIds[i], ruta.id, token, abordajeTime]
              );
            }
          }
        }
      }
    }
    
    console.log('¡Simulacion completada exitosamente!');

  } catch (error) {
    console.error(error);
  } finally {
    await connection.end();
  }
}

run();
