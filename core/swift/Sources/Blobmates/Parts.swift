import Foundation

/// The art and mood data (core/assets/parts.json), read into typed values.
/// Anything the seed walks in order (`styles`, the weighted lists) keeps its file order.
public struct Parts {
    struct Style {
        let id: String
        let weight: Int
        let eyes: [String]          // eye families to try, in order
        let showsBrows: Bool
        let defaultBrow: String?
        let bodies: [String]?       // restricts the pool of bodies (the block style)
    }

    struct Palette { let id: String; let color: String }

    struct Body {
        let id: String
        let svg: String
        let back: String
        let front: String
        let fx: Double
        let fy: Double
        let fs: Double
        let lid: String
        let block: Bool
    }

    struct Accessory { let id: String; let front: String; let back: String }

    struct Motion {
        let base, bob, bobHz, squash, sway, swayHz, shake, shakeHz, roam: Double
        let blinkMin, blinkMax: Double
    }

    struct Mood {
        let id: String
        let eye: String
        let brow: String
        let mouth: String
        let gaze: (Double, Double)?
        let overlay: String
        let motion: Motion
    }

    struct Overlay { let fps: Double; let still: Int; let frames: [String] }

    public let version: Int
    let styles: [Style]
    let palettes: [Palette]
    let bodies: [Body]
    let eyes: [String: [String: [String]]]   // family -> key -> variants
    let brows: [String: String]
    let mouths: [String: String]
    let identityBrows: [(id: String, weight: Int)]
    let identityMouths: [(id: String, weight: Int)]
    let moods: [Mood]
    let moodByID: [String: Mood]
    let overlays: [String: Overlay]
    let accessories: [String: [Accessory]]   // slot -> items
    let accColors: [String]
    let accChance: [String: Int]

    public init(json text: String) throws {
        try self.init(json: try JSON.parse(text))
    }

    init(json root: JSON) throws {
        func need(_ j: JSON?, _ what: String) throws -> JSON {
            guard let j else { throw JSON.ParseError(description: "parts data is missing \(what)") }
            return j
        }
        func strings(_ j: JSON?) -> [String] { (j?.array ?? []).compactMap(\.string) }
        func weighted(_ j: JSON?) -> [(id: String, weight: Int)] {
            (j?.array ?? []).compactMap { pair in
                guard let p = pair.array, p.count == 2, let id = p[0].string, let w = p[1].int else { return nil }
                return (id, w)
            }
        }

        version = try need(root["version"], "version").int ?? 0

        styles = try need(root["styles"], "styles").members!.map { key, v in
            Style(id: key, weight: v["weight"]?.int ?? 1, eyes: strings(v["eyes"]), showsBrows: v["brows"]?.bool ?? false,
                  defaultBrow: v["defaultBrow"]?.string, bodies: v["bodies"].map { strings($0) })
        }
        palettes = (try need(root["palettes"], "palettes").array ?? []).map { Palette(id: $0["id"]?.string ?? "", color: $0["color"]?.string ?? "") }
        bodies = (try need(root["bodies"], "bodies").array ?? []).map {
            Body(id: $0["id"]?.string ?? "", svg: $0["svg"]?.string ?? "", back: $0["back"]?.string ?? "", front: $0["front"]?.string ?? "",
                 fx: $0["fx"]?.double ?? 0, fy: $0["fy"]?.double ?? 0, fs: $0["fs"]?.double ?? 0, lid: $0["lid"]?.string ?? "", block: $0["block"]?.bool ?? false)
        }

        var eyes: [String: [String: [String]]] = [:]
        for (family, keys) in try need(root["eyes"], "eyes").members ?? [] {
            var byKey: [String: [String]] = [:]
            for (key, variants) in keys.members ?? [] { byKey[key] = strings(variants) }
            eyes[family] = byKey
        }
        self.eyes = eyes

        func table(_ j: JSON?) -> [String: String] {
            Dictionary(uniqueKeysWithValues: (j?.members ?? []).map { ($0.key, $0.value.string ?? "") })
        }
        brows = table(root["brows"])
        mouths = table(root["mouths"])
        identityBrows = weighted(root["identityBrows"])
        identityMouths = weighted(root["identityMouths"])

        let moods: [Mood] = try need(root["moods"], "moods").members!.map { key, v in
            let m = v["motion"]
            let blink = (m?["blink"]?.array ?? []).compactMap(\.double)
            let gaze = v["gaze"]?.array?.compactMap(\.double)
            return Mood(id: key, eye: v["eye"]?.string ?? "open", brow: v["brow"]?.string ?? "", mouth: v["mouth"]?.string ?? "",
                        gaze: gaze.flatMap { $0.count == 2 ? ($0[0], $0[1]) : nil }, overlay: v["overlay"]?.string ?? "",
                        motion: Motion(base: m?["base"]?.double ?? 1, bob: m?["bob"]?.double ?? 0, bobHz: m?["bobHz"]?.double ?? 0.3,
                                       squash: m?["squash"]?.double ?? 0, sway: m?["sway"]?.double ?? 0, swayHz: m?["swayHz"]?.double ?? 0.3,
                                       shake: m?["shake"]?.double ?? 0, shakeHz: m?["shakeHz"]?.double ?? 18, roam: m?["roam"]?.double ?? 1,
                                       blinkMin: blink.first ?? 2, blinkMax: blink.last ?? 4.5))
        }
        self.moods = moods
        moodByID = Dictionary(uniqueKeysWithValues: moods.map { ($0.id, $0) })

        var overlays: [String: Overlay] = [:]
        for (key, v) in root["overlays"]?.members ?? [] {
            overlays[key] = Overlay(fps: v["fps"]?.double ?? 1, still: v["still"]?.int ?? 0, frames: strings(v["frames"]))
        }
        self.overlays = overlays

        var accessories: [String: [Accessory]] = [:]
        for (slot, list) in root["accessories"]?.members ?? [] {
            accessories[slot] = (list.array ?? []).map { Accessory(id: $0["id"]?.string ?? "", front: $0["front"]?.string ?? "", back: $0["back"]?.string ?? "") }
        }
        self.accessories = accessories
        accColors = strings(root["accColors"])
        var chance: [String: Int] = [:]
        for (slot, v) in root["accChance"]?.members ?? [] { chance[slot] = v.int ?? 0 }
        accChance = chance
    }

    /// The data that ships with the package.
    public static let bundled: Parts = {
        do { return try Parts(json: PartsData.json) } catch { fatalError("Blobmates: bundled parts data is invalid: \(error)") }
    }()
}
