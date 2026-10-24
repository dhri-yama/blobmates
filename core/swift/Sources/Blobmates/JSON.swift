import Foundation

/// A small JSON reader that keeps the order of object keys, which Foundation's `JSONSerialization` does not.
/// The seed logic walks the `styles` object in file order, so that order is part of the data.
enum JSON {
    case null
    case bool(Bool)
    case number(Double)
    case string(String)
    case array([JSON])
    case object([(key: String, value: JSON)])

    struct ParseError: Error, CustomStringConvertible {
        let description: String
    }

    static func parse(_ text: String) throws -> JSON {
        var parser = Parser(bytes: Array(text.utf8))
        let value = try parser.value()
        parser.skipSpace()
        guard parser.index == parser.bytes.count else { throw ParseError(description: "extra text after the JSON value") }
        return value
    }

    // MARK: reading

    subscript(key: String) -> JSON? {
        guard case .object(let members) = self else { return nil }
        return members.first { $0.key == key }?.value
    }

    var string: String? { if case .string(let s) = self { return s } else { return nil } }
    var double: Double? { if case .number(let d) = self { return d } else { return nil } }
    var int: Int? { if case .number(let d) = self, d == d.rounded() { return Int(d) } else { return nil } }
    var bool: Bool? { if case .bool(let b) = self { return b } else { return nil } }
    var array: [JSON]? { if case .array(let a) = self { return a } else { return nil } }
    var members: [(key: String, value: JSON)]? { if case .object(let m) = self { return m } else { return nil } }

    /// Same value, same key order, same everything. Used to prove the embedded data equals core/assets/parts.json.
    func isSame(as other: JSON) -> Bool {
        switch (self, other) {
        case (.null, .null): return true
        case (.bool(let a), .bool(let b)): return a == b
        case (.number(let a), .number(let b)): return a == b
        case (.string(let a), .string(let b)): return a == b
        case (.array(let a), .array(let b)):
            return a.count == b.count && zip(a, b).allSatisfy { $0.isSame(as: $1) }
        case (.object(let a), .object(let b)):
            return a.count == b.count && zip(a, b).allSatisfy { $0.key == $1.key && $0.value.isSame(as: $1.value) }
        default: return false
        }
    }
}

private struct Parser {
    let bytes: [UInt8]
    var index = 0

    init(bytes: [UInt8]) { self.bytes = bytes }

    mutating func skipSpace() {
        while index < bytes.count, [0x20, 0x0A, 0x0D, 0x09].contains(bytes[index]) { index += 1 }
    }

    func fail(_ message: String) -> JSON.ParseError { JSON.ParseError(description: "\(message) at byte \(index)") }

    mutating func value() throws -> JSON {
        skipSpace()
        guard index < bytes.count else { throw fail("unexpected end") }
        switch bytes[index] {
        case UInt8(ascii: "{"): return try object()
        case UInt8(ascii: "["): return try array()
        case UInt8(ascii: "\""): return .string(try string())
        case UInt8(ascii: "t"): try literal("true"); return .bool(true)
        case UInt8(ascii: "f"): try literal("false"); return .bool(false)
        case UInt8(ascii: "n"): try literal("null"); return .null
        default: return try number()
        }
    }

    mutating func literal(_ word: String) throws {
        for byte in word.utf8 {
            guard index < bytes.count, bytes[index] == byte else { throw fail("bad literal") }
            index += 1
        }
    }

    mutating func number() throws -> JSON {
        let start = index
        while index < bytes.count, "+-0123456789.eE".utf8.contains(bytes[index]) { index += 1 }
        guard index > start, let d = Double(String(decoding: bytes[start..<index], as: UTF8.self)) else { throw fail("bad number") }
        return .number(d)
    }

    mutating func object() throws -> JSON {
        index += 1
        var members: [(key: String, value: JSON)] = []
        skipSpace()
        if index < bytes.count, bytes[index] == UInt8(ascii: "}") { index += 1; return .object(members) }
        while true {
            skipSpace()
            guard index < bytes.count, bytes[index] == UInt8(ascii: "\"") else { throw fail("expected a key") }
            let key = try string()
            skipSpace()
            guard index < bytes.count, bytes[index] == UInt8(ascii: ":") else { throw fail("expected ':'") }
            index += 1
            members.append((key, try value()))
            skipSpace()
            guard index < bytes.count else { throw fail("unterminated object") }
            if bytes[index] == UInt8(ascii: ",") { index += 1; continue }
            if bytes[index] == UInt8(ascii: "}") { index += 1; return .object(members) }
            throw fail("expected ',' or '}'")
        }
    }

    mutating func array() throws -> JSON {
        index += 1
        var items: [JSON] = []
        skipSpace()
        if index < bytes.count, bytes[index] == UInt8(ascii: "]") { index += 1; return .array(items) }
        while true {
            items.append(try value())
            skipSpace()
            guard index < bytes.count else { throw fail("unterminated array") }
            if bytes[index] == UInt8(ascii: ",") { index += 1; continue }
            if bytes[index] == UInt8(ascii: "]") { index += 1; return .array(items) }
            throw fail("expected ',' or ']'")
        }
    }

    mutating func hex4() throws -> UInt32 {
        guard index + 4 <= bytes.count, let v = UInt32(String(decoding: bytes[index..<index + 4], as: UTF8.self), radix: 16) else { throw fail("bad \\u escape") }
        index += 4
        return v
    }

    mutating func string() throws -> String {
        index += 1 // opening quote
        var out: [UInt8] = []
        while index < bytes.count {
            let b = bytes[index]
            index += 1
            if b == UInt8(ascii: "\"") { return String(decoding: out, as: UTF8.self) }
            guard b == UInt8(ascii: "\\") else { out.append(b); continue }
            guard index < bytes.count else { break }
            let e = bytes[index]
            index += 1
            switch e {
            case UInt8(ascii: "\""): out.append(0x22)
            case UInt8(ascii: "\\"): out.append(0x5C)
            case UInt8(ascii: "/"): out.append(0x2F)
            case UInt8(ascii: "b"): out.append(0x08)
            case UInt8(ascii: "f"): out.append(0x0C)
            case UInt8(ascii: "n"): out.append(0x0A)
            case UInt8(ascii: "r"): out.append(0x0D)
            case UInt8(ascii: "t"): out.append(0x09)
            case UInt8(ascii: "u"):
                var code = try hex4()
                if (0xD800...0xDBFF).contains(code), index + 1 < bytes.count, bytes[index] == UInt8(ascii: "\\"), bytes[index + 1] == UInt8(ascii: "u") {
                    index += 2
                    let low = try hex4()
                    code = 0x10000 + ((code - 0xD800) << 10) + (low - 0xDC00)
                }
                out.append(contentsOf: Array(String(Unicode.Scalar(code) ?? "\u{FFFD}").utf8))
            default: throw fail("bad escape")
            }
        }
        throw fail("unterminated string")
    }
}
