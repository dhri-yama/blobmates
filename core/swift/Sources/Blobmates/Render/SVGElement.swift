import Foundation

/// One element of the SVG text, e.g. `<circle cx="50" .../>`.
final class SVGElement {
    let name: String
    var attributes: [String: String]
    var children: [SVGElement] = []

    init(name: String, attributes: [String: String]) {
        self.name = name
        self.attributes = attributes
    }
}

struct SVGParseError: Error, CustomStringConvertible {
    let description: String
}

/// A small XML reader for the SVG our own builder writes: elements with quoted attributes, no text content.
/// It also skips comments and `<?xml ?>` headers, and understands the five basic entities.
func parseSVG(_ text: String) throws -> SVGElement {
    let b = Array(text.utf8)
    var i = 0
    var stack: [SVGElement] = []
    var root: SVGElement?

    func fail(_ message: String) -> SVGParseError { SVGParseError(description: "\(message) at byte \(i)") }
    func isSpace(_ c: UInt8) -> Bool { c == 0x20 || c == 0x0A || c == 0x0D || c == 0x09 }
    func isNameChar(_ c: UInt8) -> Bool { !isSpace(c) && c != UInt8(ascii: "=") && c != UInt8(ascii: ">") && c != UInt8(ascii: "/") && c != UInt8(ascii: "<") }

    func decode(_ bytes: ArraySlice<UInt8>) -> String {
        let s = String(decoding: bytes, as: UTF8.self)
        guard s.contains("&") else { return s }
        return s.replacingOccurrences(of: "&lt;", with: "<").replacingOccurrences(of: "&gt;", with: ">")
            .replacingOccurrences(of: "&quot;", with: "\"").replacingOccurrences(of: "&apos;", with: "'")
            .replacingOccurrences(of: "&amp;", with: "&")
    }

    func skip(until marker: [UInt8]) throws {
        while i + marker.count <= b.count {
            if Array(b[i..<i + marker.count]) == marker { i += marker.count; return }
            i += 1
        }
        throw fail("unterminated markup")
    }

    while i < b.count {
        guard b[i] == UInt8(ascii: "<") else { i += 1; continue } // text between tags is not used
        i += 1
        guard i < b.count else { throw fail("unexpected end") }
        if b[i] == UInt8(ascii: "!") || b[i] == UInt8(ascii: "?") {
            if i + 2 < b.count, b[i + 1] == UInt8(ascii: "-"), b[i + 2] == UInt8(ascii: "-") { try skip(until: Array("-->".utf8)) } else { try skip(until: [UInt8(ascii: ">")]) }
            continue
        }
        if b[i] == UInt8(ascii: "/") { // closing tag
            while i < b.count, b[i] != UInt8(ascii: ">") { i += 1 }
            i += 1
            guard !stack.isEmpty else { throw fail("closing tag without an opening one") }
            stack.removeLast()
            continue
        }
        let nameStart = i
        while i < b.count, isNameChar(b[i]) { i += 1 }
        let name = String(decoding: b[nameStart..<i], as: UTF8.self)
        var attributes: [String: String] = [:]
        var selfClosing = false
        while true {
            while i < b.count, isSpace(b[i]) { i += 1 }
            guard i < b.count else { throw fail("unterminated tag <\(name)") }
            if b[i] == UInt8(ascii: "/") { selfClosing = true; i += 1; continue }
            if b[i] == UInt8(ascii: ">") { i += 1; break }
            let keyStart = i
            while i < b.count, isNameChar(b[i]) { i += 1 }
            let key = String(decoding: b[keyStart..<i], as: UTF8.self)
            guard !key.isEmpty else { throw fail("bad attribute in <\(name)") }
            while i < b.count, isSpace(b[i]) { i += 1 }
            guard i < b.count, b[i] == UInt8(ascii: "=") else { attributes[key] = ""; continue }
            i += 1
            while i < b.count, isSpace(b[i]) { i += 1 }
            guard i < b.count, b[i] == UInt8(ascii: "\"") || b[i] == UInt8(ascii: "'") else { throw fail("attribute \(key) needs quotes") }
            let quote = b[i]
            i += 1
            let valueStart = i
            while i < b.count, b[i] != quote { i += 1 }
            guard i < b.count else { throw fail("unterminated attribute \(key)") }
            attributes[key] = decode(b[valueStart..<i])
            i += 1
        }
        let element = SVGElement(name: name, attributes: attributes)
        if let parent = stack.last { parent.children.append(element) } else if root == nil { root = element }
        if !selfClosing { stack.append(element) }
    }
    guard let root else { throw fail("no element found") }
    return root
}
