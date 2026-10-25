import CoreGraphics
import Foundation

/// Reads the numbers in SVG path data and transform lists. Handles the compact forms SVG allows:
/// "-.5", "3.5.5" (two numbers), exponents, and arc flags written without separators ("a1 1 0 011 1").
struct NumberScanner {
    let bytes: [UInt8]
    var index = 0

    init(_ text: String) { bytes = Array(text.utf8) }

    var atEnd: Bool { index >= bytes.count }

    mutating func skipSeparators() {
        while index < bytes.count, bytes[index] == 0x20 || bytes[index] == 0x2C || bytes[index] == 0x0A || bytes[index] == 0x0D || bytes[index] == 0x09 { index += 1 }
    }

    /// The next number, or nil if there is none (a command letter or the end comes first).
    mutating func number() -> Double? {
        skipSeparators()
        let start = index
        var i = index
        if i < bytes.count, bytes[i] == UInt8(ascii: "+") || bytes[i] == UInt8(ascii: "-") { i += 1 }
        var digits = 0
        while i < bytes.count, bytes[i] >= 48, bytes[i] <= 57 { i += 1; digits += 1 }
        if i < bytes.count, bytes[i] == UInt8(ascii: ".") {
            i += 1
            while i < bytes.count, bytes[i] >= 48, bytes[i] <= 57 { i += 1; digits += 1 }
        }
        guard digits > 0 else { return nil }
        if i < bytes.count, bytes[i] == UInt8(ascii: "e") || bytes[i] == UInt8(ascii: "E") {
            var j = i + 1
            if j < bytes.count, bytes[j] == UInt8(ascii: "+") || bytes[j] == UInt8(ascii: "-") { j += 1 }
            let expStart = j
            while j < bytes.count, bytes[j] >= 48, bytes[j] <= 57 { j += 1 }
            if j > expStart { i = j }
        }
        index = i
        return Double(String(decoding: bytes[start..<i], as: UTF8.self))
    }

    /// An arc flag: a single "0" or "1".
    mutating func flag() -> Bool? {
        skipSeparators()
        guard index < bytes.count, bytes[index] == UInt8(ascii: "0") || bytes[index] == UInt8(ascii: "1") else { return nil }
        defer { index += 1 }
        return bytes[index] == UInt8(ascii: "1")
    }

    /// The next command letter, if the next thing is a letter.
    mutating func letter() -> UInt8? {
        skipSeparators()
        guard index < bytes.count else { return nil }
        let c = bytes[index]
        guard (c >= 65 && c <= 90) || (c >= 97 && c <= 122) else { return nil }
        index += 1
        return c
    }

    mutating func numbers() -> [Double] {
        var out: [Double] = []
        while let n = number() { out.append(n) }
        return out
    }
}

/// SVG path data ("M10 20 L30 40 ...") to a CoreGraphics path. Supports every command: M L H V C S Q T A Z, both cases.
func parsePathData(_ d: String) -> CGPath {
    let path = CGMutablePath()
    var s = NumberScanner(d)
    var current = CGPoint.zero
    var start = CGPoint.zero
    var lastCubic: CGPoint?   // second control point of the previous C or S, for reflection
    var lastQuad: CGPoint?    // control point of the previous Q or T
    var command: UInt8 = 0
    var started = false

    func reflect(_ p: CGPoint?, about c: CGPoint) -> CGPoint { p.map { CGPoint(x: 2 * c.x - $0.x, y: 2 * c.y - $0.y) } ?? c }

    while !s.atEnd {
        if let c = s.letter() {
            command = c
            if c == UInt8(ascii: "Z") || c == UInt8(ascii: "z") {
                path.closeSubpath()
                current = start
                lastCubic = nil; lastQuad = nil
                continue
            }
        } else if command == 0 {
            break // numbers before any command: not valid path data
        }
        let relative = command >= 97
        let upper = relative ? command - 32 : command
        let base = relative ? current : .zero

        func point() -> CGPoint? {
            guard let x = s.number(), let y = s.number() else { return nil }
            return CGPoint(x: base.x + x, y: base.y + y)
        }

        switch upper {
        case UInt8(ascii: "M"):
            guard let p = point() else { return path }
            path.move(to: p); current = p; start = p; started = true
            command = relative ? UInt8(ascii: "l") : UInt8(ascii: "L") // further pairs are line-tos
            lastCubic = nil; lastQuad = nil
        case UInt8(ascii: "L"):
            guard started, let p = point() else { return path }
            path.addLine(to: p); current = p
            lastCubic = nil; lastQuad = nil
        case UInt8(ascii: "H"):
            guard started, let x = s.number() else { return path }
            current = CGPoint(x: relative ? current.x + x : x, y: current.y)
            path.addLine(to: current)
            lastCubic = nil; lastQuad = nil
        case UInt8(ascii: "V"):
            guard started, let y = s.number() else { return path }
            current = CGPoint(x: current.x, y: relative ? current.y + y : y)
            path.addLine(to: current)
            lastCubic = nil; lastQuad = nil
        case UInt8(ascii: "C"):
            guard started, let c1 = point(), let c2 = point(), let p = point() else { return path }
            path.addCurve(to: p, control1: c1, control2: c2)
            current = p; lastCubic = c2; lastQuad = nil
        case UInt8(ascii: "S"):
            guard started, let c2 = point(), let p = point() else { return path }
            path.addCurve(to: p, control1: reflect(lastCubic, about: current), control2: c2)
            current = p; lastCubic = c2; lastQuad = nil
        case UInt8(ascii: "Q"):
            guard started, let c = point(), let p = point() else { return path }
            path.addQuadCurve(to: p, control: c)
            current = p; lastQuad = c; lastCubic = nil
        case UInt8(ascii: "T"):
            guard started, let p = point() else { return path }
            let c = reflect(lastQuad, about: current)
            path.addQuadCurve(to: p, control: c)
            current = p; lastQuad = c; lastCubic = nil
        case UInt8(ascii: "A"):
            guard started, let rx = s.number(), let ry = s.number(), let rot = s.number(), let large = s.flag(), let sweep = s.flag(), let p = point() else { return path }
            addArc(to: path, from: current, rx: rx, ry: ry, rotation: rot, large: large, sweep: sweep, end: p)
            current = p; lastCubic = nil; lastQuad = nil
        default:
            return path // unknown command
        }
    }
    return path
}

/// An SVG elliptical arc (endpoint form) as cubic Bezier segments, following the SVG spec's conversion (F.6.5).
private func addArc(to path: CGMutablePath, from p0: CGPoint, rx rxIn: Double, ry ryIn: Double, rotation: Double, large: Bool, sweep: Bool, end p1: CGPoint) {
    var rx = abs(rxIn), ry = abs(ryIn)
    if p0 == p1 { return }
    if rx == 0 || ry == 0 { path.addLine(to: p1); return }

    let phi = rotation * .pi / 180
    let cosPhi = cos(phi), sinPhi = sin(phi)
    let dx = (p0.x - p1.x) / 2, dy = (p0.y - p1.y) / 2
    let x1 = cosPhi * dx + sinPhi * dy
    let y1 = -sinPhi * dx + cosPhi * dy

    let lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry)
    if lambda > 1 { let k = lambda.squareRoot(); rx *= k; ry *= k }

    let numerator = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1
    let denominator = rx * rx * y1 * y1 + ry * ry * x1 * x1
    var coefficient = denominator == 0 ? 0 : (max(0, numerator / denominator)).squareRoot()
    if large == sweep { coefficient = -coefficient }
    let cxp = coefficient * rx * y1 / ry
    let cyp = -coefficient * ry * x1 / rx
    let cx = cosPhi * cxp - sinPhi * cyp + (p0.x + p1.x) / 2
    let cy = sinPhi * cxp + cosPhi * cyp + (p0.y + p1.y) / 2

    func angle(_ ux: Double, _ uy: Double, _ vx: Double, _ vy: Double) -> Double {
        let dot = ux * vx + uy * vy
        let len = (ux * ux + uy * uy).squareRoot() * (vx * vx + vy * vy).squareRoot()
        var a = acos(max(-1, min(1, dot / len)))
        if ux * vy - uy * vx < 0 { a = -a }
        return a
    }
    let theta1 = angle(1, 0, (x1 - cxp) / rx, (y1 - cyp) / ry)
    var delta = angle((x1 - cxp) / rx, (y1 - cyp) / ry, (-x1 - cxp) / rx, (-y1 - cyp) / ry)
    if !sweep && delta > 0 { delta -= 2 * .pi }
    if sweep && delta < 0 { delta += 2 * .pi }

    let segments = max(1, Int((abs(delta) / (.pi / 2)).rounded(.up)))
    let step = delta / Double(segments)
    let t = 4.0 / 3.0 * tan(step / 4)

    func pointAt(_ a: Double) -> CGPoint {
        CGPoint(x: cx + rx * cos(a) * cosPhi - ry * sin(a) * sinPhi, y: cy + rx * cos(a) * sinPhi + ry * sin(a) * cosPhi)
    }
    func slopeAt(_ a: Double) -> CGPoint {
        CGPoint(x: -rx * sin(a) * cosPhi - ry * cos(a) * sinPhi, y: -rx * sin(a) * sinPhi + ry * cos(a) * cosPhi)
    }
    var a = theta1
    for k in 0..<segments {
        let b = a + step
        let from = pointAt(a), to = (k == segments - 1) ? p1 : pointAt(b)
        let d1 = slopeAt(a), d2 = slopeAt(b)
        path.addCurve(to: to,
                      control1: CGPoint(x: from.x + t * d1.x, y: from.y + t * d1.y),
                      control2: CGPoint(x: to.x - t * d2.x, y: to.y - t * d2.y))
        a = b
    }
}

/// An SVG transform list ("translate(50 50) scale(.88) rotate(30 10 10)") as one matrix.
/// The list is written outermost first, so the last item is applied to the points first.
func parseTransform(_ text: String) -> CGAffineTransform {
    var result = CGAffineTransform.identity
    var s = NumberScanner(text)
    while let c = s.letterRun() {
        s.skipSeparators()
        guard s.index < s.bytes.count, s.bytes[s.index] == UInt8(ascii: "(") else { break }
        s.index += 1
        let n = s.numbers()
        s.skipSeparators()
        if s.index < s.bytes.count, s.bytes[s.index] == UInt8(ascii: ")") { s.index += 1 }

        var t = CGAffineTransform.identity
        switch c {
        case "translate": t = CGAffineTransform(translationX: n.first ?? 0, y: n.count > 1 ? n[1] : 0)
        case "scale": t = CGAffineTransform(scaleX: n.first ?? 1, y: n.count > 1 ? n[1] : (n.first ?? 1))
        case "rotate":
            let a = (n.first ?? 0) * .pi / 180
            t = CGAffineTransform(rotationAngle: a)
            if n.count >= 3 { t = CGAffineTransform(translationX: -n[1], y: -n[2]).concatenating(t).concatenating(CGAffineTransform(translationX: n[1], y: n[2])) }
        case "matrix" where n.count == 6: t = CGAffineTransform(a: n[0], b: n[1], c: n[2], d: n[3], tx: n[4], ty: n[5])
        case "skewX": t = CGAffineTransform(a: 1, b: 0, c: tan((n.first ?? 0) * .pi / 180), d: 1, tx: 0, ty: 0)
        case "skewY": t = CGAffineTransform(a: 1, b: tan((n.first ?? 0) * .pi / 180), c: 0, d: 1, tx: 0, ty: 0)
        default: break
        }
        result = t.concatenating(result) // apply this item before everything written to its left
    }
    return result
}

extension NumberScanner {
    /// A run of letters such as "translate".
    mutating func letterRun() -> String? {
        skipSeparators()
        let start = index
        while index < bytes.count, (bytes[index] >= 65 && bytes[index] <= 90) || (bytes[index] >= 97 && bytes[index] <= 122) { index += 1 }
        return index > start ? String(decoding: bytes[start..<index], as: UTF8.self) : nil
    }
}
