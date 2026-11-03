const fs = require('fs');
let c = fs.readFileSync('src/pages/AdminConfiguracion.jsx', 'utf8');

c = c.replace(/const res = await fetch\(\/api\/admin\/eliminar-admin\/, \{/, "const res = await fetch(`/api/admin/eliminar-admin/${id}`, {");
c = c.replace(/headers: \{ 'Authorization': "Bearer "\}/, "headers: { 'Authorization': `Bearer ${token}` }");
c = c.replace(/headers: \{ 'Authorization': "Bearer \$\{token\}" \}/, "headers: { 'Authorization': `Bearer ${token}` }");

fs.writeFileSync('src/pages/AdminConfiguracion.jsx', c, 'utf8');
