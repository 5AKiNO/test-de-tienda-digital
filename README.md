# The Otaño Brothers - Tienda Digital

Una plataforma web moderna y responsiva diseñada para la venta de productos. El sistema funciona como un catálogo interactivo que permite a los usuarios armar un carrito de compras y finalizar el pedido directamente vía **WhatsApp**.

![Estado del Proyecto](https://img.shields.io/badge/Estado-Activo-brightgreen)
![Versión](https://img.shields.io/badge/Versión-0.39-blue)

## Características Principales

* Interfaz oscura con acentos neón (Estilo Gamer/Tech), adaptada a móviles (Mobile-First)
* El Carrito de Compras y la Lista de Favoritos (Wishlist) se guardan en el `localStorage` del navegador (no se pierden al recargar)
* Genera automáticamente un mensaje detallado con el pedido y el total, y redirige al chat de la tienda
* **Búsqueda y Filtrado**:
    * Buscador en tiempo real
    * Filtros dinámicos por Categoría y Subcategoría (Marcas)
* Modal emergente con selección de duración (1 mes, 3 meses, 1 año) que actualiza el precio automáticamente
* **Optimización**:
    * Sistema de **Caché** propio (5 minutos) para reducir llamadas a la API
    * Carga diferida de imágenes (`lazy loading`)
    * Skeleton loading mientras cargan los datos
* Sección de ofertas destacadas con slider (Swiper.js)

## Tecnologías Usadas

* **Frontend**: HTML5, CSS3 (Variables, Flexbox, Grid), JavaScript (ES6+ Vanilla)
* **Librerías**:
    * [Swiper.js](https://swiperjs.com/) (Carrusel de ofertas)
    * [FontAwesome](https://fontawesome.com/) (Iconos)
* **Backend**: Google Apps Script (JSON API) conectado a Google Sheets
* **Imágenes**: Cloudinary (Optimización y CDN)

## Estructura del Proyecto

```text
├── index.html          # Estructura principal
├── style.css           # Estilos, variables CSS, animaciones y media queries
├── script.js           # Lógica de negocio, conexión API, carrito y renderizado
├── productos.csv       # (Referencia) Listado de productos base
└── CotizacionPrecios.csv # (Referencia) Estructura de costos y precios
````

## Instalación y Configuración

1.  **Clonar o Descargar**: Descarga los archivos del proyecto en tu carpeta local
2.  **Abrir**: Simplemente abre el archivo `index.html` en tu navegador. No requiere un servidor Node.js local, aunque se recomienda usar *Live Server* de VS Code para desarrollo

### Configuración del script.js

Para adaptar la tienda a tu negocio, edita las constantes al inicio de `script.js`:

```javascript
//script.js
//URL de tu API (Google Apps Script que devuelve el JSON de productos)
const API_URL = "TU_URL_DE_GOOGLE_APPS_SCRIPT"; 
// Tu nombre de usuario en Cloudinary (para optimizar imágenes)
const CLOUDINARY_CLOUD_NAME = "tu_cloud_name"; 
// Tu número de WhatsApp (con código de país, sin el +) para recibir pedidos
const PHONE_NUMBER = "595984835708"; 
// Tiempo que duran los datos en memoria antes de volver a pedir a la API
const CACHE_TIME = 5 * 60 * 1000; // 5 minutos
```

## API

El sistema espera recibir un **Array de Objetos JSON** desde la `API_URL`. Basado en tu archivo `productos.csv`, el formato JSON debe ser similar a este:

```json
[
  {
    "id": "ST-001",
    "nombre": "Netflix Perfil Extra - 1 Mes",
    "categoria": "Streaming",
    "precio_normal": 42000,
    "precio_oferta": 40250,
    "en_oferta": "SI",
    "imagen": "Netflix1mes.jpg",
    "stock": "SI"
  },
]
```

## Personalización de Estilos

El diseño se controla mediante variables CSS en `style.css`. Se puede cambiar los colores principales fácilmente editando el `:root`:

```css
/* Ejemplo */
:root {
    --bg-main: #0a0a0a;
    --c-orange: #ff9100;
    --c-lime: #76ff03;
    --c-red: #ff3d00;
    --font-retro: "MolleCustom";
}
```

## Funcionalidades

  * Permite añadir productos desde el grid principal o desde el detalle
  * Calcula el total en tiempo real
  * Permite eliminar items individuales

Al finalizar la compra, el sistema construye un enlace `wa.me` con un mensaje pre-formateado:
> *"¡Hola The Otaño Brothers\! 👋 Quiero realizar el siguiente pedido: ▪️ Netflix - Gs. 40.000 ... Total: Gs. 40.000. Método: Transferencia"*

Haciendo clic en la foto de perfil del header, se despliega una animación estilo "Instagram Stories" para visualizar el logo en grande
