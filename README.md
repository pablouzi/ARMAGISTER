# Prototipo WebAR: Idle → Action → Idle

## Contenido
- `index.html`: escena A-Frame 1.8.0, WebXR y detección de superficies.
- `js/app.js`: colocación en primer toque, selección de malla y gestión de animaciones.
- `assets/personaje.glb`: debes copiar TU archivo aquí; no se incluye.

## Configurar
1. Copia tu GLB en `assets/personaje.glb`.
2. Revisa en `index.html` la escala del personaje (`scale="1 1 1"`).
3. Las animaciones deben llamarse exactamente `Idle` y `Action` (mayúsculas incluidas). Si tienen otros nombres, modifica en el HTML: `character-animations="idle: Idle; action: Action; fade: 0.2"`.
4. El origen de Blender debe ubicarse a la altura de los pies del personaje, en unidades de metros.

## Publicar y probar
1. Sube toda la carpeta a GitHub Pages, Cloudflare Pages o un hosting HTTPS.
2. Abre la URL HTTPS en Chrome para Android con ARCore / Google Play Services for AR compatible.
3. Presiona el botón AR de A-Frame. Apunta a una superficie horizontal y toca para colocar.
4. Toca directamente sobre la geometría visible del personaje para ejecutar `Action` una sola vez.
5. Al finalizar, vuelve automáticamente a `Idle`; nuevos toques durante `Action` se ignoran.

## Prueba previa en computador
Puedes servir la carpeta con `python -m http.server 8000`, ir a `http://localhost:8000` y hacer clic sobre el personaje. La detección real del suelo necesita un teléfono y WebXR AR.

## Diagnóstico
- Si faltan animaciones, revisa la consola: muestra el listado real de clips GLB.
- Si no aparece AR, confirma HTTPS, Android Chrome, permisos, soporte WebXR y ARCore.
- Si el modelo flota o atraviesa suelo, ajusta origen en Blender (preferido) o posición Y del hijo `#personaje`.
- Si no responde al toque, revisa las mallas y que el GLB tenga clips válidos.
- Puede haber diferencias en la compatibilidad de eventos XR `select` entre versiones/dispositivos: requiere prueba en equipo real.

## Bibliotecas externas
El navegador carga A-Frame 1.8.0 desde `https://aframe.io/releases/1.8.0/aframe.min.js`. Se utiliza THREE.AnimationMixer incluido en A-Frame. No se requiere `aframe-extras`.
