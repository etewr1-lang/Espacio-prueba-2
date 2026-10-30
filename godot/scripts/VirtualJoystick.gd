extends Control
class_name VirtualJoystick

## Joystick virtual multitáctil para Godot 4 y Android.
## Devuelve un Vector2 con componentes -1..1 y longitud entre 0 y 1.
## Un toque pequeño mueve lentamente; al llegar al borde, longitud = 1.

signal direction_changed(direction: Vector2)

@export_range(20.0, 200.0, 1.0) var radius: float = 72.0
@export_range(0.0, 0.5, 0.01) var dead_zone: float = 0.12

@onready var knob: TextureRect = $Knob

var input_vector: Vector2 = Vector2.ZERO
var active_touch_id: int = -1


func _ready() -> void:
    # La detección se hace en _input, para seguir el dedo incluso
    # si sale del rectángulo del joystick. Los elementos no bloquean UI.
    mouse_filter = Control.MOUSE_FILTER_IGNORE
    $Base.mouse_filter = Control.MOUSE_FILTER_IGNORE
    knob.mouse_filter = Control.MOUSE_FILTER_IGNORE
    _reset_joystick()


func _input(event: InputEvent) -> void:
    if event is InputEventScreenTouch:
        if event.pressed and active_touch_id == -1:
            var point: Vector2 = _viewport_to_local(event.position)

            # Solo capturamos el dedo que inició dentro del joystick.
            if Rect2(Vector2.ZERO, size).has_point(point):
                active_touch_id = event.index
                _move_knob(point)

        elif not event.pressed and event.index == active_touch_id:
            # Soltar el dedo deja de acelerar, pero NO corta la inercia
            # de la nave: esa lógica pertenece a PlayerShip.gd.
            _reset_joystick()

    elif event is InputEventScreenDrag:
        # No confundimos el segundo dedo (por ejemplo: disparar)
        # con el dedo que controla el movimiento.
        if event.index == active_touch_id:
            _move_knob(_viewport_to_local(event.position))


func get_input_vector() -> Vector2:
    # Vector2.ZERO al estar suelto; magnitud <= 1 al moverlo.
    return input_vector


func _viewport_to_local(viewport_position: Vector2) -> Vector2:
    # La posición del toque llega en coordenadas del viewport.
    # Esto también funciona si el HUD está dentro de CanvasLayer.
    return get_global_transform_with_canvas().affine_inverse() * viewport_position


func _move_knob(point: Vector2) -> void:
    var center: Vector2 = size * 0.5

    # Limita el recorrido a la base y deja espacio al tamaño del knob.
    var maximum_radius: float = maxf(
        1.0, minf(radius, (minf(size.x, size.y) - knob.size.x) * 0.5)
    )
    var offset: Vector2 = (point - center).limit_length(maximum_radius)

    # Normalizado respecto al radio, no obligatoriamente longitud 1:
    # conservamos el porcentaje de inclinación del joystick.
    var raw_vector: Vector2 = offset / maximum_radius
    input_vector = raw_vector if raw_vector.length() >= dead_zone else Vector2.ZERO

    knob.position = center + input_vector * maximum_radius - knob.size * 0.5
    direction_changed.emit(input_vector)


func _reset_joystick() -> void:
    active_touch_id = -1
    input_vector = Vector2.ZERO
    if is_instance_valid(knob):
        knob.position = (size - knob.size) * 0.5
    direction_changed.emit(Vector2.ZERO)


func _notification(what: int) -> void:
    if what == NOTIFICATION_RESIZED and is_node_ready():
        # Mantén centrado el botón si cambia la resolución.
        _reset_joystick()
