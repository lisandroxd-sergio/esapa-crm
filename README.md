# ESAPA CRM — Guía de configuración

## ¿Qué hace este sistema?
1. Formulario para registrar participantes del sorteo de becas
2. Guarda automáticamente los datos en Google Sheets
3. Abre WhatsApp con un mensaje personalizado listo para enviar
4. Chatbot de ayuda integrado

---

## PASO 1 — Configurar Google Sheets

### 1.1 Crear la planilla
1. Abrí [Google Sheets](https://sheets.google.com)
2. Creá una nueva planilla y llamala **"ESAPA - Sorteo Becas"**
3. En la primera fila, ponés estos encabezados (exactamente así):

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| Timestamp | Nombre | Teléfono | Fecha | Curso | Notas |

### 1.2 Crear el script (backend)
1. En la planilla, hacé clic en **Extensiones → Apps Script**
2. Borrá todo el código que aparece y pegá este:

```javascript
function doPost(e) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Headers si la planilla está vacía
  if (hoja.getLastRow() === 0) {
    hoja.appendRow(["Timestamp", "Nombre", "Teléfono", "Fecha", "Curso", "Notas"]);
  }

  const datos = JSON.parse(e.postData.contents);
  
  hoja.appendRow([
    datos.timestamp || new Date().toISOString(),
    datos.nombre    || "",
    datos.telefono  || "",
    datos.fecha     || "",
    datos.curso     || "",
    datos.notas     || "",
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Permite peticiones desde el navegador (CORS)
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok" }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. Hacé clic en **Guardar** (ícono de diskette o Ctrl+S)
4. Nombrá el proyecto "ESAPA CRM"

### 1.3 Publicar el script como API
1. Hacé clic en **Implementar → Nueva implementación**
2. En "Tipo", elegí **Aplicación web**
3. Completá así:
   - Descripción: `API ESAPA CRM v1`
   - Ejecutar como: **Yo (tu cuenta)**
   - Quién puede acceder: **Cualquier usuario**
4. Hacé clic en **Implementar**
5. **Copiá la URL** que aparece (empieza con `https://script.google.com/macros/s/...`)

### 1.4 Pegar la URL en el código
1. Abrí el archivo `js/app.js`
2. Buscá esta línea:
   ```
   GOOGLE_SCRIPT_URL: "https://script.google.com/macros/s/TU_URL_AQUI/exec",
   ```
3. Reemplazá `TU_URL_AQUI` con la URL que copiaste
4. Guardá el archivo

---

## PASO 2 — Publicar en GitHub Pages (gratis)

### 2.1 Crear cuenta en GitHub
Si no tenés, creá una en [github.com](https://github.com) (es gratis).

### 2.2 Subir el proyecto
1. Creá un nuevo repositorio en GitHub
   - Nombre: `esapa-crm`
   - Visibilidad: **Public** (necesario para GitHub Pages gratis)
2. Subí los archivos: `index.html`, `css/style.css`, `js/app.js`
   - Podés arrastrarlos directo desde el navegador
   - O usar Git desde VSCode (recomendado)

### 2.3 Activar GitHub Pages
1. En tu repositorio, hacé clic en **Settings**
2. En el menú lateral, **Pages**
3. En "Source", elegí **Deploy from a branch**
4. Branch: `main`, Folder: `/ (root)`
5. Hacé clic en **Save**
6. En 1-2 minutos, tu sitio estará en: `https://TU-USUARIO.github.io/esapa-crm`

---

## PASO 3 — Personalizar el mensaje de WhatsApp

En `js/app.js`, buscá `WSP_MENSAJE` y editá el texto como quieras.
Podés usar:
- `{nombre}` → se reemplaza por el nombre del participante
- `{curso}` → se reemplaza por el curso elegido

---

## PASO 4 — Agregar o quitar cursos

En `index.html`, buscá el `<select id="curso">` y editá las opciones:
```html
<option value="Nombre del curso">Nombre del curso</option>
```

---

## Estructura de archivos
```
esapa-crm/
├── index.html       ← Formulario y estructura
├── css/
│   └── style.css    ← Diseño y estilos
├── js/
│   └── app.js       ← Lógica, validación, WhatsApp, chatbot
└── README.md        ← Esta guía
```

---

## Modo demo (sin Sheets)
Si la URL del script no está configurada, el sistema funciona en **modo demo**: simula el guardado y de todas formas abre WhatsApp. Perfecto para mostrar el prototipo.

---

## Próximos pasos sugeridos
- [ ] Panel de administración para ver todos los registros
- [ ] Login con Google para los empleados
- [ ] Estadísticas (cursos más solicitados, registros por fecha)
- [ ] Búsqueda de participantes ya registrados
- [ ] Notificaciones cuando hay un registro nuevo
