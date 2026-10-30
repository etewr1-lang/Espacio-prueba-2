extends Node2D

## Fondo de prueba estático para apreciar el desplazamiento de la cámara.
## Se dibuja una vez, sin cargar imágenes ni recursos externos.

@export var star_count: int = 1400
@export var world_radius: float = 4000.0


func _ready() -> void:
    queue_redraw()


func _draw() -> void:
    var rng := RandomNumberGenerator.new()
    rng.seed = 2036

    for i in range(star_count):
        var point := Vector2(
            rng.randf_range(-world_radius, world_radius),
            rng.randf_range(-world_radius, world_radius)
        )
        var size: float = rng.randf_range(0.6, 2.5)
        var light: float = rng.randf_range(0.38, 0.95)
        draw_circle(point, size, Color(0.50, 0.89, 1.00, light))

    # Unas líneas tenues de referencia hacen perceptible la inercia.
    var grid_spacing: float = 500.0
    var grid_color := Color(0.22, 0.45, 0.64, 0.12)
    var coordinate: float = -world_radius
    while coordinate <= world_radius:
        draw_line(
            Vector2(coordinate, -world_radius),
            Vector2(coordinate, world_radius), grid_color, 1.0
        )
        draw_line(
            Vector2(-world_radius, coordinate),
            Vector2(world_radius, coordinate), grid_color, 1.0
        )
        coordinate += grid_spacing
