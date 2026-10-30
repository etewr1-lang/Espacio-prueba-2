# Conquista Espacial 🚀

Primera versión jugable de un **juego para celular** con naves espaciales. Está desarrollado con **HTML5 Canvas, CSS y JavaScript**, sin librerías externas. El repositorio comenzó como `Espacio-prueba-2`.

## Funciones de la versión 0.1

- Control táctil tipo joystick a la izquierda y botón **DISPARAR** a la derecha.
- Enemigos de distintos tipos, meteoritos y proyectiles enemigos a partir de la tercera ola.
- Sistema de escudo, puntos, récord local y recuperación de vida.
- Nuevas olas cada 12 enemigos eliminados, con una mejora seleccionable: ataque, motor o escudo.
- Sonidos opcionales, vibración cuando recibes daño, pausa automática al cambiar de pestaña.
- PWA básica: manifiesto y caché para jugar sin conexión tras cargar el sitio una vez.
- Compatible con teclado para pruebas en PC: **WASD/flechas**, **espacio**, **P** o **Esc**.

## Cómo probarlo

Abre `index.html` en un navegador moderno para una prueba rápida. Para probar la **instalación PWA y el modo sin conexión**, inicia un servidor local en la raíz:

```bash
python3 -m http.server 8000
```

Visita `http://localhost:8000` desde el PC. Si quieres jugar desde tu celular en la misma red Wi-Fi, visita `http://IP_LOCAL_DE_TU_PC:8000`. Para que el service worker se active en el teléfono, publica el proyecto en HTTPS (por ejemplo, GitHub Pages).

### Publicar el juego en GitHub Pages

1. En el repositorio entra en **Settings → Pages**.
2. En **Build and deployment**, selecciona **Deploy from a branch**.
3. Selecciona la rama `main`, carpeta `/ (root)` y guarda.
4. Este repositorio es público y permite activar GitHub Pages. Una vez publicado, el juego debería estar disponible en https://etewr1-lang.github.io/Espacio-prueba-2/. El sitio puede tardar unos minutos en estar disponible.

**Importante:** este repositorio es público. Cualquiera puede ver los archivos del juego.

## Estructura

```text
index.html            Interfaz, pantallas y botones
styles.css            Diseño adaptable para celulares
game.js               Mecánicas y renderizado Canvas
manifest.webmanifest  Configuración PWA
sw.js                 Caché offline
icon.svg              Ícono del juego
```

## Próximos pasos

- Diseñar historia, misiones y jefes.
- Añadir distintos niveles, tienda de mejoras y nave configurable.
- Probar la instalación en teléfonos Android e iPhone y mejorar accesibilidad.
- Si se desea un APK, integrar el juego con un contenedor Android como Capacitor y probarlo en dispositivos reales.

Este proyecto es un prototipo inicial; no incluye todavía compilación nativa Android ni publicación en Google Play.
