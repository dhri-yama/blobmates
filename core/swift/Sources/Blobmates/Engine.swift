import Foundation

/// Turns a name and options into an SVG string, exactly as the JavaScript library does.
/// The steps and their order are written down in core/spec/ALGORITHM.md.
public final class BlobmateEngine: @unchecked Sendable {
    public let parts: Parts

    public init(parts: Parts = .bundled) { self.parts = parts }

    private static let slots = ["top", "eyes", "face", "cheeks"]
    private static let gazeScale = 3.5

    // MARK: resolve

    struct Choice {
        let style: Parts.Style
        let body: Parts.Body
        let color: String
        let accColor: String
        let accessories: [String: Parts.Accessory?]
        let variant: Int
        let eyeScale: Double
        let faceY: Double
        let mouth: String
        let brow: String
    }

    private func weighted(_ rng: inout Mulberry32, _ items: [(id: String, weight: Int)]) -> String {
        let total = items.reduce(0) { $0 + $1.weight }
        var r = Int(rng.next() % UInt32(max(total, 1)))
        for item in items {
            r -= item.weight
            if r < 0 { return item.id }
        }
        return items.last?.id ?? ""
    }

    private func nonEmpty(_ text: String?) -> String? { (text?.isEmpty ?? true) ? nil : text }

    func choose(seed: String, _ o: BlobmateOptions) -> Choice {
        var rng = Mulberry32(seed: fnv1a(seed))
        // Fixed draw order; every draw happens even if unused, so adding a rule never shifts earlier draws.
        let styleDraw = weighted(&rng, parts.styles.map { (id: $0.id, weight: $0.weight) })
        let bodyDraw = rng.next(), colorDraw = rng.next(), variantDraw = rng.next()
        let scaleDraw = rng.next()
        let mouthDraw = weighted(&rng, parts.identityMouths)
        let browDraw = weighted(&rng, parts.identityBrows)
        var slotDraws: [(chance: UInt32, pick: UInt32)] = []
        for _ in Self.slots {
            let chance = rng.next() % 100
            let pick = rng.next()
            slotDraws.append((chance, pick))
        }
        let accColorDraw = rng.next()

        let styleID = o.style.flatMap { id in parts.styles.contains { $0.id == id } ? id : nil } ?? styleDraw
        let style = parts.styles.first { $0.id == styleID }!
        let pool: [Parts.Body]
        if let allowed = style.bodies { pool = parts.bodies.filter { allowed.contains($0.id) } } else { pool = parts.bodies.filter { !$0.block } }
        let body = parts.bodies.first { $0.id == o.body } ?? pool[Int(bodyDraw) % pool.count]

        let color: String
        if let named = parts.palettes.first(where: { $0.id == o.color }) { color = named.color }
        else if let pinned = nonEmpty(o.color) { color = pinned }
        else { color = parts.palettes[Int(colorDraw) % parts.palettes.count].color }

        let accPool = parts.accColors.filter { $0.lowercased() != color.lowercased() }
        let accColor = nonEmpty(o.accColor) ?? accPool[Int(accColorDraw) % accPool.count]

        let pins: [String: String?] = ["top": o.top, "eyes": o.eyes, "face": o.face, "cheeks": o.cheeks]
        var accessories: [String: Parts.Accessory?] = [:]
        for (i, slot) in Self.slots.enumerated() {
            let list = parts.accessories[slot] ?? []
            let pin = pins[slot] ?? nil
            if pin == "none" { accessories[slot] = .some(nil) }
            else if let pin, let found = list.first(where: { $0.id == pin }) { accessories[slot] = found }
            else if let pin, !pin.isEmpty { accessories[slot] = .some(nil) }
            else if Int(slotDraws[i].chance) < (parts.accChance[slot] ?? 0), !list.isEmpty { accessories[slot] = list[Int(slotDraws[i].pick) % list.count] }
            else { accessories[slot] = .some(nil) }
        }

        let mouth = o.mouth.flatMap { parts.mouths[$0] != nil ? $0 : nil } ?? mouthDraw
        let brow: String
        if let fixed = style.defaultBrow { brow = fixed }
        else if style.showsBrows { brow = o.brow.flatMap { parts.brows[$0] != nil ? $0 : nil } ?? browDraw }
        else { brow = "none" }

        return Choice(style: style, body: body, color: color, accColor: accColor, accessories: accessories,
                      variant: o.variant ?? Int(variantDraw),
                      eyeScale: o.eyeSize ?? [90.0, 100.0, 115.0][Int(scaleDraw % 3)] / 100,
                      faceY: o.faceY ?? 0, mouth: mouth, brow: brow)
    }

    public func resolve(seed: String, options o: BlobmateOptions = BlobmateOptions()) -> Resolved {
        let c = choose(seed: seed, o)
        var acc: [String: String?] = [:]
        for (slot, item) in c.accessories { acc[slot] = item?.id }
        return Resolved(style: c.style.id, body: c.body.id, color: c.color, accColor: c.accColor, accessories: acc,
                        variant: c.variant, eyeScale: c.eyeScale, faceY: c.faceY, mouth: c.mouth, brow: c.brow)
    }

    // MARK: draw

    private func positiveMod(_ a: Int, _ n: Int) -> Int { ((a % n) + n) % n }

    private func eyeSVG(_ c: Choice, key: String) -> String {
        for family in c.style.eyes {
            if let list = parts.eyes[family]?[key], !list.isEmpty { return list[positiveMod(c.variant, list.count)] }
        }
        return parts.eyes["blob"]?["open"]?.first ?? ""
    }

    private func part(_ name: String, _ svg: String?) -> String {
        guard let svg, !svg.isEmpty else { return "" }
        return "<g data-part=\"\(name)\">\(svg)</g>"
    }

    private func clamp(_ v: Double, _ lo: Double, _ hi: Double) -> Double { max(lo, min(hi, v)) }

    /// Shade of a body color: each channel times 78/100, rounded down. Anything but #rrggbb is returned as is.
    func shade(_ hex: String) -> String {
        let chars = Array(hex.utf8)
        guard chars.count == 7, chars[0] == UInt8(ascii: "#"), chars[1...].allSatisfy({ ($0 >= 48 && $0 <= 57) || ($0 >= 65 && $0 <= 70) || ($0 >= 97 && $0 <= 102) }) else { return hex }
        var out = "#"
        for i in stride(from: 1, to: 7, by: 2) {
            let v = Int(String(hex[hex.index(hex.startIndex, offsetBy: i)..<hex.index(hex.startIndex, offsetBy: i + 2)]), radix: 16)!
            let s = String(v * 78 / 100, radix: 16)
            out += s.count < 2 ? "0" + s : s
        }
        return out
    }

    public func svg(seed: String, options o: BlobmateOptions = BlobmateOptions()) -> String {
        let id = choose(seed: seed, o)
        let mood = o.mood.flatMap { parts.moodByID[$0] } ?? parts.moodByID["neutral"]!
        let mouth = mood.mouth.isEmpty ? id.mouth : mood.mouth
        let brow: String
        if id.style.showsBrows { brow = mood.brow.isEmpty ? id.brow : mood.brow } else { brow = "none" }

        let gaze = o.gaze.map { ($0.x, $0.y) } ?? mood.gaze ?? (0, 0)
        let gx = clamp(gaze.0, -1, 1) * Self.gazeScale, gy = clamp(gaze.1, -1, 1) * Self.gazeScale
        let blink = clamp(o.blink ?? 0, 0, 1)

        var eyes = eyeSVG(id, key: mood.eye)
        let move = " transform=\"translate(\(jsNum(gx)) \(jsNum(gy)))\""
        eyes = eyes.replacingOccurrences(of: "data-part=\"pupil-l\"", with: "data-part=\"pupil-l\"" + move)
        eyes = eyes.replacingOccurrences(of: "data-part=\"pupil-r\"", with: "data-part=\"pupil-r\"" + move)
        if blink != 0 { eyes = "<g transform=\"translate(0 46) scale(1 \(jsNum(1 - 0.9 * blink))) translate(0 -46)\">\(eyes)</g>" }

        let b = id.body
        let fs = b.fs == 0 ? 1 : b.fs
        let faceTf = "translate(\(jsShortest(50 + b.fx)) \(jsShortest(50 + b.fy + id.faceY))) scale(\(jsShortest(fs))) translate(-50 -50)"
        let acc = id.accessories
        func item(_ slot: String) -> Parts.Accessory? { acc[slot] ?? nil }

        var back = ""
        if !b.block { for slot in Self.slots { back += part("acc-\(slot)-back", item(slot)?.back) } }
        var face = "<g data-part=\"face\" transform=\"\(faceTf)\">"
        face += part("acc-cheeks", item("cheeks")?.front)
        face += "<g data-part=\"eyes\" transform=\"translate(50 46) scale(\(jsNum(id.eyeScale))) translate(-50 -46)\">\(eyes)</g>"
        face += part("acc-eyes", item("eyes")?.front)
        face += parts.brows[brow] ?? ""
        face += part("mouth", parts.mouths[mouth])
        face += part("acc-face", item("face")?.front)
        face += part("acc-top", item("top")?.front)
        face += "</g>"

        let backGroup = back.isEmpty ? "" : "<g transform=\"\(faceTf)\">\(back)</g>"
        var scene = (!b.back.isEmpty && !b.block) ? "<g data-part=\"body-back\">\(b.back)</g>" : ""
        scene += backGroup + "<g data-part=\"body\">\(b.svg)</g>"
        scene += b.front.isEmpty ? "" : "<g data-part=\"body-front\">\(b.front)</g>"
        scene += face
        let framed = b.block ? scene : "<g transform=\"translate(50 50) scale(0.88) translate(-50 -50)\">\(scene)</g>"

        let bgRect = (o.bg?.isEmpty ?? true) ? "" : "<rect width=\"100\" height=\"100\" fill=\"\(o.bg!)\"/>"
        var wrap = framed
        var topBg = bgRect
        if let shape = o.shape {
            let cid = "av" + String(fnv1a(seed), radix: 36)
            wrap = "<clipPath id=\"\(cid)\"><rect width=\"100\" height=\"100\" rx=\"\(shape.radius)\"/></clipPath><g clip-path=\"url(#\(cid))\">\(bgRect)\(framed)</g>"
            topBg = ""
        }

        var overlay = ""
        if !mood.overlay.isEmpty, let ov = parts.overlays[mood.overlay], !ov.frames.isEmpty {
            let index = o.overlayFrame.map { positiveMod($0, ov.frames.count) } ?? ov.still
            overlay = "<g data-part=\"overlay\">\(ov.frames[min(max(index, 0), ov.frames.count - 1)])</g>"
        }

        let sizeValue = (o.size ?? 0) == 0 ? 128 : o.size!
        var text = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\" width=\"\(jsShortest(sizeValue))\" height=\"\(jsShortest(sizeValue))\">\(topBg)\(wrap)\(overlay)</svg>"
        text = text.replacingOccurrences(of: "{{body}}", with: id.color)
        text = text.replacingOccurrences(of: "{{acc}}", with: id.accColor)
        text = text.replacingOccurrences(of: "{{shade}}", with: shade(id.color))
        text = text.replacingOccurrences(of: "{{lid}}", with: b.lid.isEmpty ? id.color : b.lid)
        return text
    }
}
