import Foundation

// Numbers that end up inside the SVG text must be written exactly as JavaScript writes them, or the text (and every
// hash in core/spec/vectors.json) differs even though the picture looks the same. See core/spec/ALGORITHM.md, section 6.

/// JavaScript's `String(x)` for the numbers we use: whole numbers without ".0", others in their shortest form.
/// (Exponent notation for huge or tiny numbers is not supported; valid input never reaches it.)
func jsShortest(_ x: Double) -> String {
    if x == 0 { return "0" } // also covers -0
    if x == x.rounded(), abs(x) < 1e15 { return String(Int64(x)) }
    return "\(x)" // Swift prints the shortest text that reads back as the same number, like JavaScript
}

/// JavaScript's `String(+x.toFixed(2))`: at most 2 decimals, no trailing zeros, no "-0".
/// `toFixed` rounds an exact tie up (2.625 -> 2.63). printf-style `%.2f` rounds ties to even (2.62), so it cannot be used.
/// The exact decimal expansion of the number is read from `%.60f`; the third decimal digit then decides the rounding.
func jsNum(_ x: Double) -> String {
    guard x.isFinite else { return "NaN" }
    let text = String(format: "%.60f", abs(x))
    let halves = text.split(separator: ".", maxSplits: 1)
    guard halves.count == 2, let whole = Int64(halves[0]) else { return jsShortest(x) }
    let digits = Array(halves[1].utf8).map { Int64($0) - 48 }
    var cents = whole * 100 + digits[0] * 10 + digits[1]
    if digits[2] >= 5 { cents += 1 }
    if cents == 0 { return "0" }
    return (x < 0 ? "-" : "") + jsShortest(Double(cents) / 100)
}
