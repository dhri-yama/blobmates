// Checks the Swift port against the shared test vectors (core/spec/vectors.json).
// Run from the repo root:  swift run BlobmatesCheck
// It is a plain program, not an XCTest target, so it needs no Xcode. It exits with a non-zero code if anything differs.
import CryptoKit
import Foundation
@testable import Blobmates

let root = URL(fileURLWithPath: #filePath)
    .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()

var failures: [String] = []
var checks = 0
func expect(_ ok: Bool, _ message: @autoclosure () -> String) {
    checks += 1
    if !ok { failures.append(message()) }
}

func sha256(_ data: Data) -> String { SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined() }

func load(_ path: String) -> Data {
    guard let data = try? Data(contentsOf: root.appendingPathComponent(path)) else { print("cannot read \(path)"); exit(2) }
    return data
}

let vectors = try! JSONSerialization.jsonObject(with: load("core/spec/vectors.json")) as! [String: Any]

// 1. The data embedded in the package is the data in core/assets/parts.json (same values, same key order).
let partsFile = load("core/assets/parts.json")
let embedded = try! JSON.parse(PartsData.json)
let fromFile = try! JSON.parse(String(decoding: partsFile, as: UTF8.self))
expect(embedded.isSame(as: fromFile), "PartsData.swift differs from core/assets/parts.json: run node core/tools/build-parts.mjs")
let partsInfo = vectors["parts"] as! [String: Any]
expect(sha256(partsFile) == partsInfo["sha256"] as! String, "vectors.json was generated from a different parts.json: run node core/tools/generate-vectors.mjs")
expect(Parts.bundled.version == partsInfo["version"] as! Int, "parts version differs")

// 2. Number formatting.
let formatting = vectors["formatting"] as! [String: Any]
for pair in formatting["num"] as! [[Any]] {
    let x = (pair[0] as! NSNumber).doubleValue, want = pair[1] as! String
    expect(jsNum(x) == want, "jsNum(\(x)) = \(jsNum(x)), want \(want)")
}
for pair in formatting["shortest"] as! [[Any]] {
    let x = (pair[0] as! NSNumber).doubleValue, want = pair[1] as! String
    expect(jsShortest(x) == want, "jsShortest(\(x)) = \(jsShortest(x)), want \(want)")
}

// 3. Seed hash and random numbers.
for entry in vectors["prng"] as! [[String: Any]] {
    let seed = entry["seed"] as! String
    let hash = UInt32(truncating: entry["fnv1a"] as! NSNumber)
    expect(fnv1a(seed) == hash, "fnv1a(\(seed.debugDescription)) = \(fnv1a(seed)), want \(hash)")
    var rng = Mulberry32(seed: hash)
    let want = (entry["draws"] as! [NSNumber]).map { UInt32(truncating: $0) }
    let got = want.map { _ in rng.next() }
    expect(got == want, "random numbers for \(seed.debugDescription) differ: \(got) vs \(want)")
}

// 4. Every picture.
func options(from d: [String: Any]) -> BlobmateOptions {
    var o = BlobmateOptions()
    o.style = d["style"] as? String
    o.body = d["body"] as? String
    o.color = d["color"] as? String
    o.variant = (d["variant"] as? NSNumber)?.intValue
    o.eyeSize = (d["eyeSize"] as? NSNumber)?.doubleValue
    o.faceY = (d["faceY"] as? NSNumber)?.doubleValue
    o.mouth = d["mouth"] as? String
    o.brow = d["brow"] as? String
    o.top = d["top"] as? String
    o.eyes = d["eyes"] as? String
    o.face = d["face"] as? String
    o.cheeks = d["cheeks"] as? String
    o.accColor = d["accColor"] as? String
    o.mood = d["mood"] as? String
    if let g = d["gaze"] as? [NSNumber], g.count == 2 { o.gaze = Gaze(x: g[0].doubleValue, y: g[1].doubleValue) }
    o.blink = (d["blink"] as? NSNumber)?.doubleValue
    o.overlayFrame = (d["overlayFrame"] as? NSNumber)?.intValue
    o.shape = (d["shape"] as? String).flatMap(Shape.init(rawValue:))   // unknown names mean "no crop", like JavaScript
    o.bg = d["bg"] as? String
    o.size = (d["size"] as? NSNumber)?.doubleValue
    return o
}

let cases = vectors["cases"] as! [[String: Any]]
var pictureFailures = 0
for c in cases {
    let name = "\(c["group"] as! String)/\(c["id"] as! String)"
    let seed = c["seed"] as! String
    let o = options(from: c["options"] as! [String: Any])
    let svg = Blobmates.svg(seed: seed, options: o)
    let ok = sha256(Data(svg.utf8)) == c["sha256"] as! String
    if !ok {
        pictureFailures += 1
        if let want = c["svg"] as? String {
            let a = Array(svg.utf8), b = Array(want.utf8)
            let at = zip(a, b).enumerated().first { $0.element.0 != $0.element.1 }?.offset ?? min(a.count, b.count)
            let lo = max(0, at - 40)
            failures.append("\(name): first difference at byte \(at)\n    got:  …\(String(decoding: a[lo..<min(a.count, at + 60)], as: UTF8.self))\n    want: …\(String(decoding: b[lo..<min(b.count, at + 60)], as: UTF8.self))")
        } else {
            failures.append("\(name): picture differs (length \(svg.utf8.count), want \(c["length"] as! Int))")
        }
    }
    checks += 1
    // What the seed chose, so a mismatch above can be traced to the step that went wrong.
    let want = c["resolved"] as! [String: Any]
    let r = Blobmates.resolve(seed: seed, options: o)
    for (label, got, expected) in [("style", r.style, want["style"] as! String), ("body", r.body, want["body"] as! String),
                                   ("color", r.color, want["color"] as! String), ("accColor", r.accColor, want["accColor"] as! String),
                                   ("mouth", r.mouth, want["mouth"] as! String), ("brow", r.brow, want["brow"] as! String)] {
        if got != expected && !ok { failures.append("\(name): resolved \(label) = \(got), want \(expected)") }
    }
}

print("checked \(cases.count) pictures, \(checks) checks in total")
if failures.isEmpty {
    print("OK: the Swift port matches the shared vectors exactly.")
} else {
    print("FAILED: \(failures.count) problem(s), \(pictureFailures) picture(s) differ")
    for f in failures.prefix(25) { print(" - \(f)") }
    exit(1)
}
