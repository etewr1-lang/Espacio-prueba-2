extends CharacterBody2D
class_name PlayerShip

## Control de una nave espacial top-down para Godot 4.
## CharacterBody2D.velocity está en píxeles por segundo.

@export_range(50.0, 1200.0, 10.0) var max_speed: float = 400.0
@export_range(10.0, 2000.0, 10.0) var acceleration: float = 620.0
@export_range(1.0, 1500.0, 10.0) var deceleration: float = 210.0
@export_range(0.5, 20.0, 0.5) var turn_speed: float = 8.0

## Si el dibujo de la nave apunta ARRIBA (-Y), usamos 90 grados.
## Si el dibujo apunta a la DERECHA (+X), utiliza 0 grados.
@export var sprite_facing_offset_degrees: float = 90.0

## La escena Main tiene el joystick en un CanvasLayer llamado HUD.
## Se puede modificar la ruta desde el Inspector.
@export var joystick_path: NodePath = ^"../HUD/VirtualJoystick"

@onready var camera: Camera2D = $Camera2D
@onready var joystick: VirtualJoystick = get_node_or_null(joystick_path) as VirtualJoystick


func _ready() -> void:
    # En top-down todo es un plano: no hay suelo ni gravedad.
    motion_mode = CharacterBody2D.MOTION_MODE_FLOATING

    # Cámara centrada en la nave. Evita que el mundo gire con la nave.
    camera.position = Vector2.ZERO
    camera.ignore_rotation = true
    camera.position_smoothing_enabled = false
    camera.make_current()


func _physics_process(delta: float) -> void:
    # Teclado/flechas como alternativa para probar en un ordenador.
    var direction: Vector2 = Input.get_vector(
        "ui_left", "ui_right", "ui_up", "ui_down"
    )

    # En Android, priorizamos el joystick cuando se está utilizando.
    # Su longitud está entre 0 y 1 y permite velocidad analógica.
    if joystick != null:
        var touch_direction: Vector2 = joystick.get_input_vector()
        if touch_direction.length_squared() > 0.0:
            direction = touch_direction

    if direction.length_squared() > 0.0:
        # La nave acelera gradualmente hacia la velocidad deseada.
        var target_velocity: Vector2 = direction * max_speed
        velocity = velocity.move_toward(target_velocity, acceleration * delta)
    else:
        # ¡Inercia espacial! Se sigue desplazando tras soltar el joystick.
        # Cuanto menor sea deceleration, más tiempo tardará en detenerse.
        velocity = velocity.move_toward(Vector2.ZERO, deceleration * delta)

    # move_and_slide() ya calcula el desplazamiento con el paso físico.
    # No hay que multiplicar velocity por delta al llamar al método.
    move_and_slide()

    # La nariz mira suavemente hacia donde realmente viaja la nave.
    # Evita giros erráticos cuando está prácticamente inmóvil.
    if velocity.length_squared() > 25.0:
        var desired_angle: float = velocity.angle() + deg_to_rad(
            sprite_facing_offset_degrees
        )
        rotation = lerp_angle(
            rotation, desired_angle, clampf(turn_speed * delta, 0.0, 1.0)
        )
