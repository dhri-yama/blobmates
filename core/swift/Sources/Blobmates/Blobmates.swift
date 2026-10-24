/// The ready-to-use entry point, bound to the bundled parts.
///
///     let svg = Blobmates.svg(seed: "sagar", options: BlobmateOptions(mood: "happy", size: 96))
///
/// The same name always gives the same picture, on every device and in the JavaScript version too.
public enum Blobmates {
    public static let engine = BlobmateEngine(parts: .bundled)

    /// The picture as an SVG string.
    public static func svg(seed: String, options: BlobmateOptions = BlobmateOptions()) -> String {
        engine.svg(seed: seed, options: options)
    }

    /// What the name chose (with your pins applied), without drawing.
    public static func resolve(seed: String, options: BlobmateOptions = BlobmateOptions()) -> Resolved {
        engine.resolve(seed: seed, options: options)
    }

    /// Ids you can pass as options.
    public static var moods: [String] { engine.parts.moods.map(\.id) }
    public static var bodies: [String] { engine.parts.bodies.map(\.id) }
    public static var accessories: [String: [String]] { engine.parts.accessories.mapValues { $0.map(\.id) } }
    public static var partsVersion: Int { engine.parts.version }
}
