/// How to crop the picture.
public enum Shape: String, Sendable {
    case circle, rounded, square

    var radius: Int {
        switch self {
        case .circle: return 50
        case .rounded: return 22
        case .square: return 0
        }
    }
}

/// Where the pupils look, each from -1 to 1.
public struct Gaze: Equatable, Sendable {
    public var x: Double
    public var y: Double
    public init(x: Double, y: Double) { self.x = x; self.y = y }
}

/// Everything you can pass to draw a Blobmate. Anything you leave out is decided by the name (that is what "pinned" means).
public struct BlobmateOptions: Sendable {
    // Look (pins)
    public var style: String?
    public var body: String?
    /// A hex color like "#F4A3C9", or a palette name like "pink".
    public var color: String?
    public var variant: Int?
    public var eyeSize: Double?
    public var faceY: Double?
    public var mouth: String?
    public var brow: String?
    /// Accessories: an id, or "none".
    public var top: String?
    public var eyes: String?
    public var face: String?
    public var cheeks: String?
    public var accColor: String?

    // State (never seeded)
    public var mood: String?
    public var gaze: Gaze?
    public var blink: Double?
    public var overlayFrame: Int?

    // Output
    public var shape: Shape?
    public var bg: String?
    public var size: Double?

    public init(style: String? = nil, body: String? = nil, color: String? = nil, variant: Int? = nil, eyeSize: Double? = nil,
                faceY: Double? = nil, mouth: String? = nil, brow: String? = nil, top: String? = nil, eyes: String? = nil,
                face: String? = nil, cheeks: String? = nil, accColor: String? = nil, mood: String? = nil, gaze: Gaze? = nil,
                blink: Double? = nil, overlayFrame: Int? = nil, shape: Shape? = nil, bg: String? = nil, size: Double? = nil) {
        self.style = style; self.body = body; self.color = color; self.variant = variant; self.eyeSize = eyeSize
        self.faceY = faceY; self.mouth = mouth; self.brow = brow; self.top = top; self.eyes = eyes
        self.face = face; self.cheeks = cheeks; self.accColor = accColor; self.mood = mood; self.gaze = gaze
        self.blink = blink; self.overlayFrame = overlayFrame; self.shape = shape; self.bg = bg; self.size = size
    }
}

/// What the name chose (with your pins applied), without drawing.
public struct Resolved: Equatable, Sendable {
    public let style: String
    public let body: String
    public let color: String
    public let accColor: String
    /// Accessory id per slot ("top", "eyes", "face", "cheeks"), or nil for none.
    public let accessories: [String: String?]
    public let variant: Int
    public let eyeScale: Double
    public let faceY: Double
    public let mouth: String
    public let brow: String
}
