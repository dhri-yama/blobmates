import CoreGraphics
import Foundation

/// A parsed fill or stroke value. `color == nil` means "none".
struct Paint {
    let color: CGColor?
}

private let namedColors: [String: (UInt8, UInt8, UInt8)] = [
    "black": (0, 0, 0), "white": (255, 255, 255), "red": (255, 0, 0), "green": (0, 128, 0), "blue": (0, 0, 255),
    "yellow": (255, 255, 0), "orange": (255, 165, 0), "purple": (128, 0, 128), "pink": (255, 192, 203), "gray": (128, 128, 128),
    "grey": (128, 128, 128), "brown": (165, 42, 42), "cyan": (0, 255, 255), "magenta": (255, 0, 255), "lime": (0, 255, 0),
    "navy": (0, 0, 128), "teal": (0, 128, 128), "maroon": (128, 0, 0), "olive": (128, 128, 0), "silver": (192, 192, 192),
    "gold": (255, 215, 0), "coral": (255, 127, 80), "salmon": (250, 128, 114), "violet": (238, 130, 238), "indigo": (75, 0, 130),
    "turquoise": (64, 224, 208), "tomato": (255, 99, 71), "beige": (245, 245, 220), "ivory": (255, 255, 240),
]

/// Hex (#rgb, #rrggbb), rgb()/rgba(), `none`, `transparent` and a few common color names.
/// Returns nil for anything else, which the caller treats like a browser does: the value is ignored.
func parsePaint(_ text: String) -> Paint? {
    let v = text.trimmingCharacters(in: .whitespaces).lowercased()
    if v == "none" || v == "transparent" { return Paint(color: nil) }
    if v.hasPrefix("#") {
        let hex = Array(v.dropFirst())
        func digit(_ c: Character) -> Int? { c.hexDigitValue }
        switch hex.count {
        case 3, 4:
            let d = hex.compactMap(digit)
            guard d.count == hex.count else { return nil }
            return Paint(color: CGColor(srgbRed: CGFloat(d[0] * 17) / 255, green: CGFloat(d[1] * 17) / 255, blue: CGFloat(d[2] * 17) / 255, alpha: d.count == 4 ? CGFloat(d[3] * 17) / 255 : 1))
        case 6, 8:
            let d = hex.compactMap(digit)
            guard d.count == hex.count else { return nil }
            let byte = { (i: Int) in CGFloat(d[i] * 16 + d[i + 1]) / 255 }
            return Paint(color: CGColor(srgbRed: byte(0), green: byte(2), blue: byte(4), alpha: d.count == 8 ? byte(6) : 1))
        default: return nil
        }
    }
    if v.hasPrefix("rgb"), let open = v.firstIndex(of: "("), let close = v.lastIndex(of: ")") {
        let parts = v[v.index(after: open)..<close].split(whereSeparator: { $0 == "," || $0 == " " || $0 == "/" }).compactMap { Double($0.replacingOccurrences(of: "%", with: "")) }
        guard parts.count >= 3 else { return nil }
        let scale = v.contains("%") ? 2.55 : 1.0
        return Paint(color: CGColor(srgbRed: CGFloat(parts[0] * scale / 255), green: CGFloat(parts[1] * scale / 255), blue: CGFloat(parts[2] * scale / 255), alpha: parts.count > 3 ? CGFloat(parts[3]) : 1))
    }
    if let c = namedColors[v] { return Paint(color: CGColor(srgbRed: CGFloat(c.0) / 255, green: CGFloat(c.1) / 255, blue: CGFloat(c.2) / 255, alpha: 1)) }
    return nil
}
