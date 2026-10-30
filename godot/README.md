# Conquista Espacial — versión Godot 4 (Android)

Esta carpeta contiene un **proyecto Godot independiente y abrible**.
No sustituye el juego HTML5 de la raíz del repositorio, que sigue publicado en GitHub Pages.

## Abrir el prototipo

1. Descarga el repositorio (GitHub **Code → Download ZIP**) y descomprímelo.
2. Instala **Godot 4.3 o posterior** (versión estándar/GDScript; no hace falta .NET).
3. Abre el administrador de proyectos de Godot, pulsa **Importar** y selecciona `godot/project.godot`.
4. Pulsa **F6** para ejecutar solo `Main.tscn` cuando esté abierta, o **F5** para ejecutar el proyecto.
5. En PC, mueve la nave con las **flechas**, o arrastra con el ratón el joystick (se emula pantalla táctil en `project.godot`).
6. En Android, abre el proyecto en el editor Godot para Android, o expórtalo desde un equipo con Godot y plantillas de exportación Android.

No hay APK generado todavía. Para exportarlo a Android: **Proyecto → Exportar → Añadir Android → Exportar proyecto**. Prepara las plantillas de exportación y el SDK si tu versión del editor lo requiere.

## Jerarquía de nodos

```text
Main (Node2D)                         scenes/Main.tscn
├── Starfield (Node2D)                scripts/Starfield.gd
├── PlayerShip (CharacterBody2D)      scenes/PlayerShip.tscn
│   ├── Sprite2D                      art/ship.svg
│   ├── CollisionShape2D             CircleShape2D
│   └── Camera2D                      centrada, sin rotación
└── HUD (CanvasLayer)
    ├── VirtualJoystick (Control)     scripts/VirtualJoystick.gd
    │   ├── Base (TextureRect)        art/joystick_base.svg
    │   └── Knob (TextureRect)        art/joystick_knob.svg
    └── Hint (Label)
```

## Movimiento e inercia

- `PlayerShip.gd`: lee `Input.get_vector` para PC y `VirtualJoystick.get_input_vector()` para Android. `velocity.move_toward` acelera y desacelera gradualmente y `move_and_slide()` aplica colisiones. `lerp_angle` gira suavemente hacia la dirección de la velocidad.
- `VirtualJoystick.gd`: escucha `InputEventScreenTouch` e `InputEventScreenDrag`; sigue solamente el índice del dedo que inició dentro del control. La dirección tiene longitud entre 0 y 1. El segundo dedo puede usarse para disparar en una mejora futura.
- `Camera2D`: hija de `PlayerShip`, mantiene al jugador en el centro. `ignore_rotation=true` evita girar toda la pantalla.
- `HUD`: al estar dentro de `CanvasLayer`, no se desplaza con la cámara.

## Ajustes de sensación de vuelo

En la escena de `PlayerShip`, selecciona el nodo raíz y edita en Inspector:

| Parámetro | Inicial | Efecto |
| --- | ---: | --- |
| Max Speed | 400 | Velocidad máxima (px/s) |
| Acceleration | 620 | Qué tan rápido acelera |
| Deceleration | 210 | Cuán lentamente frena al soltar |
| Turn Speed | 8 | Rapidez de giro hacia velocidad |
| Sprite Facing Offset Degrees | 90 | 90 si el dibujo apunta arriba, 0 si apunta derecha |

En `VirtualJoystick`, ajusta `Radius` y `Dead Zone` desde Inspector.
El script está configurado para una base de 216×216 y botón de 70×70.

## Crear los nodos manualmente desde cero

1. Crea una escena `CharacterBody2D` con nombre `PlayerShip`.
2. Dentro, añade `Sprite2D` (la imagen de la nave), `CollisionShape2D` (CircleShape2D radio 24) y `Camera2D` como hijos directos.
3. Asigna `PlayerShip.gd` al nodo raíz. Mantén `Camera2D.enabled = true` e `ignore_rotation = true`.
4. En una escena `Main` de tipo `Node2D`, instancia `PlayerShip`.
5. Añade un `CanvasLayer` llamado `HUD`. Dentro, crea un `Control` llamado `VirtualJoystick`, y dentro de este `TextureRect` con nombres exactos `Base` y `Knob`.
6. Asigna las texturas a ambos `TextureRect`, aplica `VirtualJoystick.gd` al Control y ancla el Control a la esquina inferior izquierda (tamaño 216×216, margen inferior 40).
7. Verifica que el `joystick_path` del jugador es `../HUD/VirtualJoystick`. Al jugar, arrastra la palanca.

### Notas

- El proyecto nativo de Godot **no se ejecuta directamente** al abrir la URL de GitHub Pages: hace falta exportarlo a web o Android desde Godot.
- La versión actual es un **prototipo de movimiento** (sin disparos, enemigos ni menú del juego Godot). La versión HTML5 original conserva esas funcionalidades.
