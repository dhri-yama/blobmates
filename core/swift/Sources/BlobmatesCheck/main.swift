// Checks the Swift port against the shared test vectors (core/spec/vectors.json).
// Run from the repo root:  swift run BlobmatesCheck
// It is a plain program, not an XCTest target, so it needs no Xcode. It exits with a non-zero code if anything differs.
import CryptoKit
import CoreGraphics
import Foundation
import ImageIO
import SwiftUI
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

// 5. Reading and drawing every picture.
final class TagCounter: NSObject, XMLParserDelegate {
    var counts: [String: Int] = [:]
    func parser(_ parser: XMLParser, didStartElement name: String, namespaceURI: String?, qualifiedName: String?, attributes: [String: String]) {
        counts[name, default: 0] += 1
    }
}
func countTags(_ e: SVGElement, _ into: inout [String: Int]) {
    into[e.name, default: 0] += 1
    for child in e.children { countTags(child, &into) }
}

var unsupportedSeen: Set<String> = []
var blankPictures = 0
for c in cases {
    let name = "\(c["group"] as! String)/\(c["id"] as! String)"
    let o = options(from: c["options"] as! [String: Any])
    let svg = Blobmates.svg(seed: c["seed"] as! String, options: o)
    do {
        let tree = try parseSVG(svg)
        var mine: [String: Int] = [:]
        countTags(tree, &mine)
        let counter = TagCounter()
        let xml = XMLParser(data: Data(svg.utf8)); xml.delegate = counter
        expect(xml.parse(), "\(name): Apple's XML parser rejects the picture")
        expect(mine == counter.counts, "\(name): element counts differ from Apple's XML parser: \(mine) vs \(counter.counts)")
        let scene = try buildScene(from: svg)
        unsupportedSeen.formUnion(scene.unsupported)
    } catch {
        failures.append("\(name): cannot read the picture: \(error)")
    }
    checks += 1
    // Draw it small and make sure something visible came out.
    if let image = Blobmates.cgImage(seed: c["seed"] as! String, options: o, pixels: 48), let data = image.dataProvider?.data as Data? {
        let visible = stride(from: 3, to: data.count, by: 4).reduce(0) { $0 + (data[$1] > 0 ? 1 : 0) }
        if visible < 50 { blankPictures += 1; failures.append("\(name): the drawn picture is nearly blank (\(visible) visible pixels)") }
    } else {
        failures.append("\(name): could not draw the picture")
    }
}
// The vectors include one deliberately invalid color name ("notacolor"); like a browser, the reader ignores it.
let unexpected = unsupportedSeen.filter { !$0.hasSuffix("=notacolor") }
expect(unexpected.isEmpty, "the SVG reader met things it does not support: \(unexpected.sorted())")

// PNG export produces a real PNG of the requested size.
if let png = Blobmates.pngData(seed: "sagar", options: BlobmateOptions(mood: "happy", shape: .circle), pixels: 128) {
    expect(Array(png.prefix(8)) == [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], "pngData does not start with the PNG signature")
    let source = CGImageSourceCreateWithData(png as CFData, nil)
    let decoded = source.flatMap { CGImageSourceCreateImageAtIndex($0, 0, nil) }
    expect(decoded?.width == 128 && decoded?.height == 128, "pngData decodes to \(decoded?.width ?? 0) x \(decoded?.height ?? 0), want 128 x 128")
} else {
    failures.append("pngData returned nothing")
}

// 6. Drawing regression guard: the pictures must still look like the fingerprints in core/spec/render-grids.json
// (tolerant: no cell may differ by 2 or more levels, and colors may move by at most 3).
func fingerprint(_ image: CGImage) -> (grid: String, rgb: [Int]) {
    guard let data = image.dataProvider?.data as Data? else { return ("", [0, 0, 0]) }
    var grid = "", r = 0.0, g = 0.0, b = 0.0, n = 0.0
    for cellY in 0..<24 { for cellX in 0..<24 {
        var alpha = 0.0
        for y in 0..<4 { for x in 0..<4 {
            let i = (cellY * 4 + y) * image.bytesPerRow + (cellX * 4 + x) * 4
            let a = Double(data[i + 3]); alpha += a
            if a > 128 { r += Double(data[i]) * 255 / a; g += Double(data[i + 1]) * 255 / a; b += Double(data[i + 2]) * 255 / a; n += 1 }
        } }
        grid += String(Int((alpha / 16 / 255 * 9).rounded()))
    } }
    return (grid, [r, g, b].map { Int(($0 / max(n, 1)).rounded()) })
}
let renderRef = try! JSONSerialization.jsonObject(with: load("core/spec/render-grids.json")) as! [String: Any]
let refGrids = renderRef["grids"] as! [String: [String: Any]]
for (id, ref) in refGrids {
    guard let c = cases.first(where: { ($0["id"] as! String) == id }) else { failures.append("render-grids.json mentions \(id), which is not in vectors.json"); continue }
    var o = options(from: c["options"] as! [String: Any]); o.size = 96
    guard let image = Blobmates.cgImage(seed: c["seed"] as! String, options: o, pixels: 96) else { failures.append("\(id): could not draw"); continue }
    let got = fingerprint(image)
    let want = (ref["grid"] as! String, (ref["rgb"] as! [NSNumber]).map(\.intValue))
    let worst = zip(Array(got.grid.utf8), Array(want.0.utf8)).map { abs(Int($0) - Int($1)) }.max() ?? 99
    expect(got.grid.count == 576 && worst < 2, "\(id): the drawing no longer matches its fingerprint (largest cell difference \(worst))")
    expect(zip(got.rgb, want.1).allSatisfy { abs($0 - $1) <= 3 }, "\(id): the average color changed: \(got.rgb) vs \(want.1)")
}

// 7. Live behavior: replay the scenarios recorded from the JS runtime (core/spec/motion-traces.json) and compare every frame.
let traceFile = try! JSONSerialization.jsonObject(with: load("core/spec/motion-traces.json")) as! [String: Any]
expect((traceFile["parts"] as! [String: Any])["sha256"] as! String == partsInfo["sha256"] as! String, "motion-traces.json was recorded with different parts data: run node core/tools/generate-motion-traces.mjs")

func roamOptions(_ any: Any?) -> RoamOptions? {
    guard let d = any as? [String: Any] else { return nil }
    var r = RoamOptions()
    if let v = (d["speed"] as? NSNumber)?.doubleValue, v != 0 { r.speed = v }
    if let p = d["pause"] as? [NSNumber], p.count == 2 { r.pause = p[0].doubleValue...p[1].doubleValue }
    return r
}
func reactOptions(_ any: Any?) -> ReactOptions? {
    if let b = any as? Bool { return b ? ReactOptions() : nil }   // `true` (JSON booleans arrive as NSNumber, handled below)
    if let n = any as? NSNumber { return n.boolValue ? ReactOptions() : nil }
    guard let d = any as? [String: Any] else { return nil }
    return ReactOptions(moods: d["moods"] as? [String], duration: (d["duration"] as? NSNumber)?.doubleValue)
}

var motionFramesChecked = 0
for scenario in traceFile["scenarios"] as! [[String: Any]] {
    let name = scenario["name"] as! String
    let c = scenario["config"] as! [String: Any]
    let host = scenario["host"] as! [String: Any]
    let hostSize = CGSize(width: (host["w"] as! NSNumber).doubleValue, height: (host["h"] as! NSNumber).doubleValue)
    var config = LiveConfig(seed: c["seed"] as! String, pins: options(from: c["pins"] as? [String: Any] ?? [:]), mood: c["mood"] as! String,
                            size: (c["size"] as! NSNumber).doubleValue, motion: MotionMode(rawValue: c["motion"] as! String)!,
                            roam: roamOptions(c["roam"]), react: reactOptions(c["react"]), spawnRandom: (c["spawn"] as? String) == "random",
                            reduceMotion: (scenario["reduce"] as? Bool) ?? false)
    let runtime = BlobmateRuntime(config: config, now: 1.0, random: SeededRandom(seed: UInt32(truncating: scenario["randomSeed"] as! NSNumber)))
    let events = scenario["events"] as! [[String: Any]]
    let trace = scenario["trace"] as! [[Any]]
    var t = 1000.0
    var mismatches = 0
    for (i, expected) in trace.enumerated() {
        t += (i % 37 == 36) ? 70 : 1000.0 / 60
        let now = t / 1000
        for e in events where (e["frame"] as! NSNumber).intValue == i {
            switch e["type"] as! String {
            case "pointer": runtime.pointer = CGPoint(x: (e["x"] as! NSNumber).doubleValue, y: (e["y"] as! NSNumber).doubleValue)
            case "poke": runtime.poke(now: now)
            case "set":
                let patch = e["patch"] as! [String: Any]
                if let m = patch["mood"] as? String { config.mood = m }
                if patch.keys.contains("roam") { config.roam = roamOptions(patch["roam"]) }
                runtime.update(config)
            default: break
            }
        }
        let frame = runtime.step(now: now, host: hostSize)
        let svg = Blobmates.svg(seed: config.seed, options: frame.options)
        let hash = String(sha256(Data(svg.utf8)).prefix(16))
        var problems: [String] = []
        // Positions and tilt are written with 2 decimals and scales with 3, so allow one unit in the last written digit.
        func close(_ got: Double, _ want: Any, _ label: String, _ tolerance: Double) {
            guard let w = (want as? NSNumber)?.doubleValue else { return } // null: the runtime only translates in this mode
            if abs(got - w) > tolerance { problems.append("\(label) \(got) vs \(w)") }
        }
        let moving = !(config.motion == .none || config.reduceMotion)
        close(jsFixed(frame.origin.x, 2), expected[0], "x", 0.0101); close(jsFixed(frame.origin.y, 2), expected[1], "y", 0.0101)
        if moving {
            close(jsFixed(frame.rotation, 2), expected[2], "rotation", 0.0101)
            close(jsFixed(frame.scale.width, 3), expected[3], "scaleX", 0.00101); close(jsFixed(frame.scale.height, 3), expected[4], "scaleY", 0.00101)
        }
        if hash != expected[5] as! String { problems.append("picture differs (mood \(frame.options.mood ?? "?"), gaze \(String(describing: frame.options.gaze)), blink \(frame.options.blink ?? -1), overlay \(String(describing: frame.options.overlayFrame)))") }
        motionFramesChecked += 1
        checks += 1
        if !problems.isEmpty {
            mismatches += 1
            if mismatches <= 2 { failures.append("motion/\(name) frame \(i): " + problems.joined(separator: "; ")) }
        }
    }
    if mismatches > 2 { failures.append("motion/\(name): \(mismatches) of \(trace.count) frames differ") }
}
print("replayed \(motionFramesChecked) recorded motion frames")

// Optional contact sheet to look at: swift run BlobmatesCheck --sheet /path/to/sheet.png
if let flag = CommandLine.arguments.firstIndex(of: "--sheet"), flag + 1 < CommandLine.arguments.count {
    let path = CommandLine.arguments[flag + 1]
    let chosen = stride(from: 0, to: cases.count, by: 5).map { cases[$0] }.prefix(96)
    let cell = 96, columns = 12, rows = (chosen.count + columns - 1) / columns
    let space = CGColorSpace(name: CGColorSpace.sRGB)!
    let ctx = CGContext(data: nil, width: cell * columns, height: cell * rows, bitsPerComponent: 8, bytesPerRow: 0, space: space, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    ctx.setFillColor(CGColor(srgbRed: 0.97, green: 0.95, blue: 0.92, alpha: 1)); ctx.fill(CGRect(x: 0, y: 0, width: cell * columns, height: cell * rows))
    for (i, c) in chosen.enumerated() {
        let o = options(from: c["options"] as! [String: Any])
        let rect = CGRect(x: (i % columns) * cell + 4, y: (rows - 1 - i / columns) * cell + 4, width: cell - 8, height: cell - 8)
        Blobmates.draw(seed: c["seed"] as! String, options: o, in: ctx, rect: rect, isFlipped: false)
    }
    if let image = ctx.makeImage() {
        let data = NSMutableData()
        let dest = CGImageDestinationCreateWithData(data, "public.png" as CFString, 1, nil)!
        CGImageDestinationAddImage(dest, image, nil); CGImageDestinationFinalize(dest)
        try? (data as Data).write(to: URL(fileURLWithPath: path))
        print("wrote contact sheet: \(path)")
    }
}

// Optional: a coarse fingerprint of how chosen pictures look when drawn, to compare with a browser's drawing of the same SVG.
//   swift run BlobmatesCheck --grid id1,id2,...
// Each picture is drawn at 96 px, cut into 24x24 cells, and each cell is written as one digit 0-9 (how much of it is covered),
// followed by the average color of the solid pixels.
if let flag = CommandLine.arguments.firstIndex(of: "--grid"), flag + 1 < CommandLine.arguments.count {
    let wanted = Set(CommandLine.arguments[flag + 1].split(separator: ",").map(String.init))
    for c in cases where wanted.contains(c["id"] as! String) {
        let o = options(from: c["options"] as! [String: Any])
        guard let image = Blobmates.cgImage(seed: c["seed"] as! String, options: { var x = o; x.size = 96; return x }(), pixels: 96),
              let data = image.dataProvider?.data as Data? else { continue }
        var grid = "", r = 0.0, g = 0.0, b = 0.0, n = 0.0
        for cellY in 0..<24 {
            for cellX in 0..<24 {
                var alpha = 0.0
                for y in 0..<4 { for x in 0..<4 {
                    let i = (cellY * 4 + y) * image.bytesPerRow + (cellX * 4 + x) * 4
                    let a = Double(data[i + 3]); alpha += a
                    if a > 128 { r += Double(data[i]) * 255 / a; g += Double(data[i + 1]) * 255 / a; b += Double(data[i + 2]) * 255 / a; n += 1 }
                } }
                grid += String(Int((alpha / 16 / 255 * 9).rounded()))
            }
        }
        print("GRID \(c["id"] as! String) \(grid) \(Int((r / max(n, 1)).rounded())),\(Int((g / max(n, 1)).rounded())),\(Int((b / max(n, 1)).rounded()))")
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

// Optional: render the SwiftUI views offscreen to look at them: swift run BlobmatesCheck --views /path/to/views.png
if let flag = CommandLine.arguments.firstIndex(of: "--views"), flag + 1 < CommandLine.arguments.count {
    let path = CommandLine.arguments[flag + 1]
    MainActor.assumeIsolated {
        let row = HStack(spacing: 12) {
            BlobmateView(seed: "sagar", size: 96)
            BlobmateView(seed: "sagar", size: 96, options: BlobmateOptions(mood: "happy", shape: .circle, bg: "#F7F3EA"))
            BlobmateView(seed: "ada", size: 96, options: BlobmateOptions(mood: "sad", shape: .rounded, bg: "#F7F3EA"))
            LiveBlobmateView(seed: "sagar", size: 96, mood: "excited")
        }.padding(16).background(Color.white)
        let renderer = ImageRenderer(content: row)
        renderer.scale = 2
        if let image = renderer.cgImage, let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: path) as CFURL, "public.png" as CFString, 1, nil) {
            CGImageDestinationAddImage(dest, image, nil); CGImageDestinationFinalize(dest)
            print("wrote views: \(path)")
        } else { print("FAIL: could not render the views"); exit(1) }
    }
}
