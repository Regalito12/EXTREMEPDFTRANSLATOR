# PDF Translator - Inglés a Español

Una aplicación web completa para traducir documentos PDF de inglés a español de forma gratuita.

## 🚀 Características

- **Subida de PDFs**: Arrastrar y soltar archivos PDF de cualquier tamaño (hasta 50MB)
- **Extracción automática**: Extrae texto de PDFs automáticamente usando pdf-parse
- **Traducción gratuita**: Integra con LibreTranslate API para traducciones gratuitas
- **Generación de PDF**: Crea un nuevo PDF con el texto traducido usando PDFKit
- **Interfaz moderna**: Diseño responsive con Tailwind CSS
- **Progreso en tiempo real**: Barra de progreso que muestra extracción → traducción → generación
- **Vista previa**: Muestra texto original y traducido lado a lado
- **Descarga directa**: Botón para descargar el PDF traducido

## 🛠️ Tecnologías Utilizadas

### Backend
- **Node.js** con **Express.js**
- **pdf-parse**: Para extraer texto de PDFs
- **PDFKit**: Para generar PDFs traducidos
- **Axios**: Para llamadas a la API de traducción
- **Multer**: Para manejo de archivos subidos
- **UUID**: Para generar IDs únicos de proceso

### Frontend
- **HTML5** con **Tailwind CSS**
- **Vanilla JavaScript** (ES6+)
- **Font Awesome**: Para iconos

### API de Traducción
- **LibreTranslate**: API gratuita y de código abierto

## 📋 Requisitos

- Node.js 14+ instalado
- npm o yarn
- Conexión a internet (para la API de traducción)

## 🚀 Instalación y Configuración

### 1. Clonar o descargar el proyecto

```bash
# Si tienes git
git clone <url-del-repositorio>
cd pdf-translator

# O simplemente extrae los archivos en una carpeta
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Iniciar el servidor

```bash
# Modo desarrollo (con nodemon para recarga automática)
npm run dev

# O modo producción
npm start
```

### 4. Abrir en el navegador

Ve a `http://localhost:3000` en tu navegador web.

## 📁 Estructura del Proyecto

```
pdf-translator/
├── backend/
│   ├── server.js              # Servidor principal de Express
│   ├── routes/
│   │   ├── upload.js          # Endpoints para subida de archivos
│   │   └── process.js         # Endpoints para procesamiento
│   ├── utils/
│   │   ├── pdfExtractor.js    # Utilidad para extraer texto de PDFs
│   │   ├── translator.js      # Integración con LibreTranslate
│   │   └── pdfGenerator.js    # Generación de PDFs traducidos
│   └── uploads/               # Directorio temporal para archivos
├── frontend/
│   ├── index.html             # Interfaz de usuario principal
│   ├── app.js                 # Lógica del frontend
│   └── assets/                # Archivos estáticos (imágenes, etc.)
├── package.json               # Dependencias y scripts
├── README.md                  # Este archivo
└── plan.md                    # Documentación técnica del proyecto
```

## 🔧 Configuración Avanzada

### Variables de Entorno

Puedes configurar la API de LibreTranslate creando un archivo `.env`:

```env
LIBRETRANSLATE_URL=https://libretranslate.com/translate
PORT=3000
```

### API de Traducción Personalizada

Si quieres usar tu propia instancia de LibreTranslate:

1. Instala LibreTranslate en tu servidor
2. Configura la variable `LIBRETRANSLATE_URL` apuntando a tu instancia

## 🌐 Despliegue

### Opción 1: Vercel (Recomendado - Gratuito)

1. **Frontend**: Sube la carpeta `frontend` a Vercel
2. **Backend**: Despliega el backend en Railway o Render
3. Configura las variables de entorno

### Opción 2: Heroku

```bash
# Instalar Heroku CLI
# Crear app en Heroku
heroku create tu-app-pdf-translator
git push heroku main
```

### Opción 3: Servidor Local/Dedicado

```bash
# Instalar PM2 para producción
npm install -g pm2
pm2 start backend/server.js --name "pdf-translator"
pm2 startup
pm2 save
```

## 🐛 Solución de Problemas

### Error: "No se pudo extraer texto del PDF"
- El PDF podría ser una imagen escaneada
- Verifica que el PDF contenga texto seleccionable
- Para PDFs escaneados, necesitarías OCR (Tesseract.js)

### Error: "Error al traducir el texto"
- Verifica tu conexión a internet
- La API de LibreTranslate podría estar temporalmente fuera de servicio
- Considera usar una instancia local de LibreTranslate

### Error: "Archivo demasiado grande"
- El límite actual es 50MB
- Puedes aumentar el límite en `backend/routes/upload.js`

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Haz fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🙏 Agradecimientos

- [LibreTranslate](https://libretranslate.com/) por la API de traducción gratuita
- [PDFKit](https://pdfkit.org/) por la generación de PDFs
- [Tailwind CSS](https://tailwindcss.com/) por el framework CSS
- [Font Awesome](https://fontawesome.com/) por los iconos

## 📞 Soporte

Si encuentras algún problema o tienes preguntas:

1. Revisa la sección de solución de problemas
2. Abre un issue en el repositorio
3. Contacta al desarrollador

---

**Desarrollado con ❤️ para facilitar la traducción de documentos**