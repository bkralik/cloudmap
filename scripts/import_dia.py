import argparse
import json
import math
import textwrap
import xml.etree.ElementTree as ET

NS = {"dia": "http://www.lysator.liu.se/~alla/dia/"}


def parse_point(value):
    if not value:
        return None
    parts = [p.strip() for p in value.split(",")]
    if len(parts) != 2:
        return None
    return float(parts[0]), float(parts[1])


def scale_point(point, scale):
    if not point:
        return None
    return point[0] * scale, point[1] * scale


def get_attr_node(obj, name):
    return obj.find(f"dia:attribute[@name='{name}']", NS)


def get_point(obj, name):
    node = obj.find(f"dia:attribute[@name='{name}']/dia:point", NS)
    if node is None:
        return None
    return parse_point(node.get("val"))


def get_real(obj, name):
    node = obj.find(f"dia:attribute[@name='{name}']/dia:real", NS)
    if node is None:
        return None
    try:
        return float(node.get("val"))
    except (TypeError, ValueError):
        return None


def get_color(obj, name):
    node = obj.find(f"dia:attribute[@name='{name}']/dia:color", NS)
    if node is None:
        return None
    return node.get("val")


def decode_dia_string(raw):
    if raw is None:
        return ""
    text = raw.replace("\r\n", "\n")
    if text.startswith("#") and text.endswith("#"):
        text = text[1:-1]
    text = textwrap.dedent(text)
    lines = text.split("\n")
    while lines and not lines[0].strip():
        lines.pop(0)
    while lines and not lines[-1].strip():
        lines.pop()
    lines = [line.rstrip() for line in lines]
    return "\n".join(lines)


def get_text(obj):
    node = obj.find(
        "dia:attribute[@name='text']"
        "/dia:composite[@type='text']"
        "/dia:attribute[@name='string']"
        "/dia:string",
        NS,
    )
    return decode_dia_string(node.text if node is not None else None)


def get_text_pos(obj):
    node = obj.find(
        "dia:attribute[@name='text']"
        "/dia:composite[@type='text']"
        "/dia:attribute[@name='pos']"
        "/dia:point",
        NS,
    )
    if node is not None:
        return parse_point(node.get("val"))
    return get_point(obj, "obj_pos")


def get_points(obj, name):
    node = get_attr_node(obj, name)
    if node is None:
        return []
    return [parse_point(p.get("val")) for p in node.findall("dia:point", NS) if p.get("val")]


def is_white(color):
    if not color:
        return False
    value = color.strip().lower()
    return value in ("#ffffff", "#fff", "#ffffffff")


def inside_ellipse(point, center, rx, ry):
    if not point or not center or not rx or not ry:
        return False
    dx = (point[0] - center[0]) / rx
    dy = (point[1] - center[1]) / ry
    return dx * dx + dy * dy <= 1.0


def nearest_by_distance(point, items, get_pos):
    best = None
    best_dist = None
    for item in items:
        pos = get_pos(item)
        if not pos:
            continue
        dx = point[0] - pos[0]
        dy = point[1] - pos[1]
        dist = dx * dx + dy * dy
        if best is None or dist < best_dist:
            best = item
            best_dist = dist
    return best


def curvature_from_mid(start, end, mid):
    dx = end[0] - start[0]
    dy = end[1] - start[1]
    length = math.hypot(dx, dy)
    if length == 0:
        return 0.0
    nx = -dy / length
    ny = dx / length
    return (mid[0] - start[0]) * nx + (mid[1] - start[1]) * ny


def curvature_from_points(points):
    if len(points) < 3:
        return 0.0
    start = points[0]
    end = points[-1]
    best = 0.0
    for mid in points[1:-1]:
        delta = curvature_from_mid(start, end, mid)
        if abs(delta) > abs(best):
            best = delta
    return best


def thickness_from_line_width(line_width, scale):
    if line_width is None:
        return 2
    value = int(round(line_width * scale))
    return max(1, min(100, value))


def main():
    parser = argparse.ArgumentParser(description="Import Dia diagram into Cloudmap JSON model.")
    parser.add_argument("input", help="Path to .dia file")
    parser.add_argument("-o", "--output", help="Output JSON path (defaults to stdout)")
    parser.add_argument("--line-scale", type=float, default=20.0, help="Line width scale (dia units -> px)")
    parser.add_argument(
        "--coord-scale",
        type=float,
        default=1.0,
        help="Scale for all coordinates and sizes (dia units -> model units)",
    )
    args = parser.parse_args()

    tree = ET.parse(args.input)
    root = tree.getroot()

    objects = root.findall(".//dia:object", NS)

    ap_items = []
    area_items = []
    text_items = []
    dia_to_ap = {}
    dia_to_area = {}

    def add_ap(dia_id, center, rx, ry, label):
        ap_id = f"ap-{len(ap_items) + 1}"
        ap_items.append(
            {
                "id": ap_id,
                "dia_id": dia_id,
                "center": center,
                "rx": rx,
                "ry": ry,
                "name": label.strip() if label else "",
                "areaId": None,
                "routers": [],
            }
        )
        dia_to_ap[dia_id] = ap_id

    def add_area(dia_id, center, rx, ry, label):
        area_id = f"area-{len(area_items) + 1}"
        area_items.append(
            {
                "id": area_id,
                "dia_id": dia_id,
                "center": center,
                "rx": rx,
                "ry": ry,
                "name": label.strip() if label else "",
                "pointIds": [],
            }
        )
        dia_to_area[dia_id] = area_id

    coord_scale = args.coord_scale
    line_scale = args.line_scale

    for obj in objects:
        obj_type = obj.get("type")
        obj_id = obj.get("id")

        if obj_type == "Standard - Text":
            text = get_text(obj)
            pos = scale_point(get_text_pos(obj), coord_scale)
            if text and pos:
                text_items.append({"text": text, "pos": pos, "used": False})
            continue

        if obj_type in ("Network - Cloud", "Flowchart - Ellipse", "Standard - Ellipse"):
            corner = get_point(obj, "elem_corner") or get_point(obj, "obj_pos")
            corner = scale_point(corner, coord_scale)
            width = get_real(obj, "elem_width")
            height = get_real(obj, "elem_height")
            if width is not None:
                width *= coord_scale
            if height is not None:
                height *= coord_scale
            if not corner or width is None or height is None:
                continue
            center = (corner[0] + width / 2.0, corner[1] + height / 2.0)
            rx = width / 2.0
            ry = height / 2.0
            label = get_text(obj)

            if obj_type == "Network - Cloud":
                fill = get_color(obj, "fill_colour")
                if is_white(fill):
                    add_area(obj_id, center, rx, ry, label)
                else:
                    add_ap(obj_id, center, rx, ry, label)
            else:
                add_ap(obj_id, center, rx, ry, label)

    for text_item in text_items:
        point = text_item["pos"]
        candidates = [
            ap
            for ap in ap_items
            if not ap["name"] and inside_ellipse(point, ap["center"], ap["rx"], ap["ry"])
        ]
        if candidates:
            chosen = nearest_by_distance(point, candidates, lambda ap: ap["center"])
            if chosen:
                chosen["name"] = text_item["text"]
                text_item["used"] = True

    for text_item in text_items:
        if text_item["used"]:
            continue
        point = text_item["pos"]
        candidates = [
            area
            for area in area_items
            if not area["name"] and inside_ellipse(point, area["center"], area["rx"], area["ry"])
        ]
        if candidates:
            chosen = nearest_by_distance(point, candidates, lambda area: area["center"])
            if chosen:
                chosen["name"] = text_item["text"]
                text_item["used"] = True

    for ap in ap_items:
        if not ap["name"]:
            ap["name"] = f"AP-{ap_items.index(ap) + 1:02d}"

    for area in area_items:
        if not area["name"]:
            area["name"] = f"Area-{area_items.index(area) + 1}"

    for ap in ap_items:
        point = ap["center"]
        containing = [
            area
            for area in area_items
            if inside_ellipse(point, area["center"], area["rx"], area["ry"])
        ]
        if containing:
            containing.sort(key=lambda area: area["rx"] * area["ry"])
            chosen = containing[0]
            ap["areaId"] = chosen["id"]
            chosen["pointIds"].append(ap["id"])

    connection_types = []
    type_map = {}
    connections = []

    def get_or_create_type(color, thickness):
        key = f"{color}|{thickness}"
        existing = type_map.get(key)
        if existing:
            return existing
        type_id = f"type-{len(connection_types) + 1}"
        connection_types.append(
            {
                "id": type_id,
                "name": f"Imported {color} {thickness}px",
                "type": "metalic",
                "speed": "",
                "color": color,
                "thickness": thickness,
            }
        )
        type_map[key] = type_id
        return type_id

    def resolve_connections(obj):
        conn_node = obj.find("dia:connections", NS)
        if conn_node is None:
            return None, None
        handles = conn_node.findall("dia:connection", NS)
        handle_map = {c.get("handle"): c.get("to") for c in handles}
        return handle_map.get("0"), handle_map.get("1")

    def ap_from_dia_id(dia_id):
        return dia_to_ap.get(dia_id)

    def ap_from_point(point):
        chosen = nearest_by_distance(point, ap_items, lambda ap: ap["center"])
        return chosen["id"] if chosen else None

    line_types = {
        "Standard - Line",
        "Standard - Arc",
        "Standard - PolyLine",
        "Standard - BezierLine",
    }

    for obj in objects:
        if obj.get("type") not in line_types:
            continue

        obj_type = obj.get("type")
        start_id, end_id = resolve_connections(obj)
        from_id = ap_from_dia_id(start_id) if start_id else None
        to_id = ap_from_dia_id(end_id) if end_id else None

        if obj_type in ("Standard - Line", "Standard - Arc"):
            points = get_points(obj, "conn_endpoints")
        elif obj_type == "Standard - PolyLine":
            points = get_points(obj, "poly_points")
        else:
            points = get_points(obj, "bez_points")
        points = [scale_point(point, coord_scale) for point in points]

        if (from_id is None or to_id is None) and len(points) >= 2:
            if from_id is None:
                from_id = ap_from_point(points[0])
            if to_id is None:
                to_id = ap_from_point(points[-1])

        if not from_id or not to_id or from_id == to_id:
            continue

        if obj_type == "Standard - Arc":
            curvature = (get_real(obj, "curve_distance") or 0.0) * coord_scale
        elif obj_type in ("Standard - PolyLine", "Standard - BezierLine"):
            curvature = curvature_from_points(points)
        else:
            curvature = 0.0

        color = get_color(obj, "line_color") or get_color(obj, "arc_color") or "#3f4a3a"
        line_width = get_real(obj, "line_width")
        thickness = thickness_from_line_width(line_width, line_scale)
        type_id = get_or_create_type(color, thickness)

        connections.append(
            {
                "id": f"conn-{len(connections) + 1}",
                "fromId": from_id,
                "toId": to_id,
                "curvature": curvature,
                "description": "",
                "typeId": type_id,
            }
        )

    model = {
        "connectionTypes": connection_types,
        "accessPoints": [
            {
                "id": ap["id"],
                "name": ap["name"],
                "x": ap["center"][0],
                "y": ap["center"][1],
                "areaId": ap["areaId"],
                "routers": [],
            }
            for ap in ap_items
        ],
        "areas": [
            {
                "id": area["id"],
                "name": area["name"],
                "x": area["center"][0],
                "y": area["center"][1],
                "rx": area["rx"],
                "ry": area["ry"],
                "jitter": 0.12,
                "pointIds": area["pointIds"],
            }
            for area in area_items
        ],
        "connections": connections,
    }

    output = json.dumps(model, ensure_ascii=False, indent=2)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as handle:
            handle.write(output)
            handle.write("\n")
    else:
        print(output)


if __name__ == "__main__":
    main()
