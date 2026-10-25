import CoreGraphics
import Foundation

/// A parsed picture, ready to draw many times: paths are already built, colors already read.
final class Scene {
    struct Shape {
        var path: CGPath
        var fill: CGColor?
        var stroke: CGColor?
        var strokeWidth: CGFloat
        var cap: CGLineCap
        var join: CGLineJoin
        var opacity: CGFloat
        var transform: CGAffineTransform?
    }

    final class Group {
        var transform: CGAffineTransform?
        var opacity: CGFloat = 1
        var clip: CGPath?
        var part: String?
        var children: [Item] = []
    }

    enum Item {
        case shape(Shape)
        case group(Group)
    }

    var viewBox = CGRect(x: 0, y: 0, width: 100, height: 100)
    var items: [Item] = []
    /// Elements or attributes this reader does not know. Empty for everything our builder writes (the check program asserts that).
    var unsupported: Set<String> = []
}

private struct Style {
    var fill: CGColor? = CGColor(srgbRed: 0, green: 0, blue: 0, alpha: 1)
    var stroke: CGColor?
    var strokeWidth: CGFloat = 1
    var cap: CGLineCap = .butt
    var join: CGLineJoin = .miter

    /// Fill, stroke and line settings are inherited from the parent unless the element sets its own.
    mutating func apply(_ e: SVGElement, _ scene: Scene) {
        if let v = e.attributes["fill"] { if let paint = parsePaint(v) { fill = paint.color } else { scene.unsupported.insert("fill=\(v)") } }
        if let v = e.attributes["stroke"] { if let paint = parsePaint(v) { stroke = paint.color } else { scene.unsupported.insert("stroke=\(v)") } }
        if let v = e.attributes["stroke-width"], let w = Double(v) { strokeWidth = CGFloat(w) }
        if let v = e.attributes["stroke-linecap"] { cap = v == "round" ? .round : v == "square" ? .square : .butt }
        if let v = e.attributes["stroke-linejoin"] { join = v == "round" ? .round : v == "bevel" ? .bevel : .miter }
    }
}

// MARK: building a Scene from the SVG text

private let knownAttributes: Set<String> = ["fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "opacity", "transform", "clip-path",
                                            "data-part", "d", "cx", "cy", "r", "rx", "ry", "x", "y", "width", "height", "points", "id", "viewBox", "xmlns"]

func buildScene(from text: String) throws -> Scene {
    let root = try parseSVG(text)
    let scene = Scene()
    guard root.name == "svg" else { throw SVGParseError(description: "the root element is <\(root.name)>, not <svg>") }
    var clips: [String: CGPath] = [:]
    collectClips(root, into: &clips)

    if let vb = root.attributes["viewBox"] {
        var s = NumberScanner(vb)
        let n = s.numbers()
        if n.count == 4 { scene.viewBox = CGRect(x: n[0], y: n[1], width: n[2], height: n[3]) }
    }
    var style = Style()
    style.apply(root, scene)
    scene.items = root.children.compactMap { compile($0, style, clips, scene) }
    return scene
}

private func collectClips(_ e: SVGElement, into clips: inout [String: CGPath]) {
    if e.name == "clipPath", let id = e.attributes["id"] {
        let path = CGMutablePath()
        for child in e.children { if let p = shapePath(child) { path.addPath(p) } }
        clips[id] = path
    }
    for child in e.children { collectClips(child, into: &clips) }
}

private func number(_ e: SVGElement, _ name: String, _ fallback: Double = 0) -> Double { e.attributes[name].flatMap { Double($0) } ?? fallback }

/// The outline of a basic shape or path element, or nil if the element is not a shape.
private func shapePath(_ e: SVGElement) -> CGPath? {
    switch e.name {
    case "path": return parsePathData(e.attributes["d"] ?? "")
    case "circle":
        let r = number(e, "r")
        return CGPath(ellipseIn: CGRect(x: number(e, "cx") - r, y: number(e, "cy") - r, width: 2 * r, height: 2 * r), transform: nil)
    case "ellipse":
        let rx = number(e, "rx"), ry = number(e, "ry")
        return CGPath(ellipseIn: CGRect(x: number(e, "cx") - rx, y: number(e, "cy") - ry, width: 2 * rx, height: 2 * ry), transform: nil)
    case "rect":
        let rect = CGRect(x: number(e, "x"), y: number(e, "y"), width: number(e, "width"), height: number(e, "height"))
        var rx = e.attributes["rx"].flatMap { Double($0) }, ry = e.attributes["ry"].flatMap { Double($0) }
        if rx == nil { rx = ry }
        if ry == nil { ry = rx }
        guard let rxv = rx, let ryv = ry, rxv > 0, ryv > 0 else { return CGPath(rect: rect, transform: nil) }
        return CGPath(roundedRect: rect, cornerWidth: min(rxv, rect.width / 2), cornerHeight: min(ryv, rect.height / 2), transform: nil)
    case "polygon":
        var s = NumberScanner(e.attributes["points"] ?? "")
        let n = s.numbers()
        guard n.count >= 4 else { return nil }
        let path = CGMutablePath()
        path.move(to: CGPoint(x: n[0], y: n[1]))
        var i = 2
        while i + 1 < n.count { path.addLine(to: CGPoint(x: n[i], y: n[i + 1])); i += 2 }
        path.closeSubpath()
        return path
    default: return nil
    }
}

private func compile(_ e: SVGElement, _ parent: Style, _ clips: [String: CGPath], _ scene: Scene) -> Scene.Item? {
    for key in e.attributes.keys where !knownAttributes.contains(key) { scene.unsupported.insert("\(e.name)@\(key)") }
    var style = parent
    style.apply(e, scene)
    let opacity = CGFloat(max(0, min(1, number(e, "opacity", 1))))
    let transform = e.attributes["transform"].map(parseTransform)

    switch e.name {
    case "clipPath", "defs", "title", "desc": return nil
    case "g":
        let group = Scene.Group()
        group.transform = transform
        group.opacity = opacity
        group.part = e.attributes["data-part"]
        if let ref = e.attributes["clip-path"] {
            if ref.hasPrefix("url(#"), ref.hasSuffix(")"), let clip = clips[String(ref.dropFirst(5).dropLast())] { group.clip = clip } else { scene.unsupported.insert("clip-path=\(ref)") }
        }
        group.children = e.children.compactMap { compile($0, style, clips, scene) }
        return .group(group)
    case "path", "circle", "ellipse", "rect", "polygon":
        guard let path = shapePath(e) else { return nil }
        return .shape(Scene.Shape(path: path, fill: style.fill, stroke: style.stroke, strokeWidth: style.strokeWidth, cap: style.cap, join: style.join,
                                  opacity: opacity, transform: transform))
    default:
        scene.unsupported.insert("<\(e.name)>")
        return nil
    }
}

// MARK: cache

/// Reading a picture is much slower than drawing it, and a live avatar redraws constantly, so scenes are kept by their SVG text.
final class SceneCache: @unchecked Sendable {
    static let shared = SceneCache()
    private let cache = NSCache<NSString, SceneBox>()
    private final class SceneBox { let scene: Scene; init(_ s: Scene) { scene = s } }

    init() { cache.countLimit = 512 }

    func scene(for svg: String) -> Scene? {
        let key = svg as NSString
        if let hit = cache.object(forKey: key) { return hit.scene }
        guard let scene = try? buildScene(from: svg) else { return nil }
        cache.setObject(SceneBox(scene), forKey: key)
        return scene
    }
}
