import CoreGraphics
import Foundation

// The live behavior of a Blobmate: mood-driven movement, blinking, gaze, roaming and the tap reaction.
// This is a port of core/js/src/runtime.js; the formulas and constants are written down in core/spec/MOTION.md and checked
// frame by frame against core/spec/motion-traces.json. It has no UI: you give it the time and it gives you a frame.

public enum MotionMode: String, Sendable {
    case none, follow, idle
}

public struct RoamOptions: Equatable, Sendable {
    /// Base walking speed in points per second. The mood scales it (excited walks faster, sleepy slower).
    public var speed: Double
    /// How long it rests at each stop, in seconds.
    public var pause: ClosedRange<Double>
    public init(speed: Double = 70, pause: ClosedRange<Double> = 0.6...2.2) { self.speed = speed; self.pause = pause }
}

public struct ReactOptions: Equatable, Sendable {
    /// Moods to pick from when poked. Default: surprised, joyful, excited, happy.
    public var moods: [String]?
    /// How long the reaction lasts, in seconds. Default 1.1.
    public var duration: Double?
    public init(moods: [String]? = nil, duration: Double? = nil) { self.moods = moods; self.duration = duration }
}

/// Where random numbers come from. The default is the system generator; tests pass a seeded one to get repeatable runs.
public protocol RandomSource {
    /// A number from 0 (included) up to 1 (not included).
    mutating func next() -> Double
}

public struct SystemRandom: RandomSource {
    public init() {}
    public mutating func next() -> Double { Double.random(in: 0..<1) }
}

/// The same generator the JavaScript tests use (mulberry32), so runs can be compared with the JS recordings.
public struct SeededRandom: RandomSource {
    var generator: Mulberry32
    public init(seed: UInt32) { generator = Mulberry32(seed: seed) }
    public mutating func next() -> Double { Double(generator.next()) / 4294967296 }
}

public struct LiveConfig: Equatable, Sendable {
    public var seed: String
    /// Pinned look (and anything else you would pass to `Blobmates.svg`). Mood, gaze and size are set by the runtime.
    public var pins: BlobmateOptions
    public var mood: String
    /// Width and height of the avatar's box, in points.
    public var size: Double
    public var motion: MotionMode
    /// Walk around inside the host. Nil keeps it in the middle.
    public var roam: RoamOptions?
    /// React to taps (`poke`). Nil means off.
    public var react: ReactOptions?
    /// Start at a random spot instead of the middle (for crowds).
    public var spawnRandom: Bool
    /// The system's reduce-motion setting: no walking, blinking or bouncing.
    public var reduceMotion: Bool

    public init(seed: String, pins: BlobmateOptions = BlobmateOptions(), mood: String = "neutral", size: Double = 120, motion: MotionMode = .follow,
                roam: RoamOptions? = nil, react: ReactOptions? = nil, spawnRandom: Bool = false, reduceMotion: Bool = false) {
        self.seed = seed; self.pins = pins; self.mood = mood; self.size = size; self.motion = motion
        self.roam = roam; self.react = react; self.spawnRandom = spawnRandom; self.reduceMotion = reduceMotion
    }
}

/// Everything needed to draw one moment: which picture, and where and how to place it.
public struct LiveFrame: Sendable {
    /// The picture to draw: `Blobmates.svg(seed:options:)` with these options.
    public var options: BlobmateOptions
    /// Top left of the avatar's box inside the host, before bounce and tremble (use it for tap hit tests).
    public var position: CGPoint
    /// Top left after bounce, tremble, hop and jump.
    public var origin: CGPoint
    /// Tilt in degrees, around the pivot.
    public var rotation: Double
    public var scale: CGSize
    /// Rotation and scale happen around this point of the box (fractions of its size): 50% across and 85% down.
    public var pivot: CGPoint
    public var size: Double
    public var isWalking: Bool

    /// Moves the picture (drawn in a box from 0,0 to size,size) to its place in the host.
    public var transform: CGAffineTransform {
        let px = pivot.x * size, py = pivot.y * size
        return CGAffineTransform(translationX: -px, y: -py)
            .concatenating(CGAffineTransform(scaleX: scale.width, y: scale.height))
            .concatenating(CGAffineTransform(rotationAngle: rotation * .pi / 180))
            .concatenating(CGAffineTransform(translationX: px + origin.x, y: py + origin.y))
    }
}

public final class BlobmateRuntime {
    public private(set) var config: LiveConfig
    /// Where the pointer is, in the host's coordinates (top left origin). Set it when the pointer moves; nil if unknown.
    public var pointer: CGPoint?

    private let parts: Parts
    private var random: any RandomSource

    // Motion numbers that ease toward the current mood's.
    struct Motion { var base, bob, bobHz, squash, sway, swayHz, shake, shakeHz, roam: Double }
    private(set) var motion: Motion
    private var pos = CGPoint.zero
    private var placed = false
    private var target: CGPoint?
    private var pauseUntil = 0.0
    private var walking = 0.0           // 0...1, how much it is walking right now
    private var last: Double

    // Tap reaction.
    private var reactMood: String?
    private var reactUntil = 0.0
    private var tapAt = -1.0

    // Blinking: a wait timer plus a queue of "blink value" steps.
    private var nextBlinkAt: Double
    private struct BlinkStep { var at: Double; var value: Double; var mayDouble: Bool }
    private var blinkSteps: [BlinkStep] = []
    private var blink = 0.0

    private var currentMood: String
    // What a browser would report for the box on the previous frame; the pointer's direction is measured from its center.
    private var boxSize = 0.0
    private var applied = (tx: 0.0, ty: 0.0, rot: 0.0, sx: 1.0, sy: 1.0)

    private static let defaultReactions = ["surprised", "joyful", "excited", "happy"]
    private static let eased: [WritableKeyPath<Motion, Double>] = [\.base, \.bob, \.bobHz, \.squash, \.sway, \.swayHz, \.shake, \.shakeHz, \.roam]

    /// - Parameters:
    ///   - now: the current time in seconds (any steady clock, for example `ProcessInfo.processInfo.systemUptime`).
    public init(config: LiveConfig, now: Double, parts: Parts = .bundled, random: any RandomSource = SystemRandom()) {
        self.config = config
        self.parts = parts
        self.random = random
        last = now
        currentMood = config.mood
        let m = (parts.moodByID[config.mood] ?? parts.moodByID["neutral"]!).motion
        motion = Motion(base: m.base, bob: m.bob, bobHz: m.bobHz, squash: m.squash, sway: m.sway, swayHz: m.swayHz, shake: m.shake, shakeHz: m.shakeHz, roam: m.roam)
        let blinkRange = (parts.moodByID[config.mood] ?? parts.moodByID["neutral"]!).motion
        nextBlinkAt = now // replaced just below so the first random number is the first blink wait
        nextBlinkAt = now + rnd(blinkRange.blinkMin, blinkRange.blinkMax)
    }

    private func rnd(_ a: Double, _ b: Double) -> Double { a + random.next() * (b - a) }
    private func mood(_ id: String) -> Parts.Mood { parts.moodByID[id] ?? parts.moodByID["neutral"]! }

    /// Changes the settings (like `rt.set(...)` in JavaScript).
    public func update(_ new: LiveConfig) {
        if new.roam == nil { target = nil }
        config = new
        if reactMood == nil { currentMood = new.mood }
        boxSize = new.size
    }

    /// The tap reaction: it stops walking, jumps, and shows a short-lived mood. Works whether or not `react` is set.
    public func poke(now: Double) {
        let react = config.react ?? ReactOptions()
        let wanted = (react.moods?.isEmpty ?? true) ? Self.defaultReactions : react.moods!
        let pool = wanted.filter { parts.moodByID[$0] != nil }
        let pick = Int((random.next() * Double(pool.count)).rounded(.down))
        reactMood = pool.indices.contains(pick) ? pool[pick] : nil
        let duration = (react.duration ?? 0) == 0 ? 1.1 : react.duration!
        reactUntil = now + duration
        tapAt = now
        target = nil
        pauseUntil = max(pauseUntil, reactUntil)
    }

    // MARK: blinking

    /// Close, shut, open, done: 0.6, 1, 0.6, 0 every 45 ms. Only a first blink may be followed by a second one.
    private func blinkSequence(from t: Double, mayDouble: Bool) -> [BlinkStep] {
        [BlinkStep(at: t, value: 0.6, mayDouble: false), BlinkStep(at: t + 0.045, value: 1, mayDouble: false),
         BlinkStep(at: t + 0.09, value: 0.6, mayDouble: false), BlinkStep(at: t + 0.135, value: 0, mayDouble: mayDouble)]
    }

    private func runBlinkTimers(upTo now: Double) {
        while true {
            let step = blinkSteps.first
            if nextBlinkAt <= now && (step == nil || nextBlinkAt <= step!.at) {
                // The wait ended: start a blink and, straight away, the next wait (measured blink to blink).
                let t = nextBlinkAt
                if config.motion != .none && !config.reduceMotion {
                    blinkSteps.append(contentsOf: blinkSequence(from: t, mayDouble: true))
                    blinkSteps.sort { $0.at < $1.at }
                }
                let m = mood(config.mood).motion
                nextBlinkAt = t + rnd(m.blinkMin, m.blinkMax)
            } else if let step, step.at <= now {
                blinkSteps.removeFirst()
                blink = step.value
                if step.mayDouble, random.next() < 0.25 {
                    let t = step.at + 0.12
                    blinkSteps.append(contentsOf: blinkSequence(from: t, mayDouble: false))
                    blinkSteps.sort { $0.at < $1.at }
                }
            } else {
                break
            }
        }
    }

    // MARK: one frame

    /// Advances to time `now` (seconds) and returns what to draw. `host` is the area the avatar lives in.
    public func step(now: Double, host: CGSize) -> LiveFrame {
        runBlinkTimers(upTo: now)

        let dt = min(0.05, now - last)
        last = now
        let reacting = reactMood != nil && now < reactUntil
        if !reacting { reactMood = nil }
        currentMood = reacting ? reactMood! : config.mood
        let target = mood(currentMood).motion
        let k = min(1, dt * 5)
        let goal = Motion(base: target.base, bob: target.bob, bobHz: target.bobHz, squash: target.squash, sway: target.sway, swayHz: target.swayHz, shake: target.shake, shakeHz: target.shakeHz, roam: target.roam)
        for key in Self.eased { motion[keyPath: key] += (goal[keyPath: key] - motion[keyPath: key]) * k }

        let size = config.size
        let maxX = max(0, host.width - size), maxY = max(0, host.height - size)
        let minY = min(maxY, size * 0.12) // headroom so walking hops never leave the host
        let roaming = config.roam != nil && config.motion != .none && !config.reduceMotion
        var vx = 0.0, vy = 0.0, speed = 0.0

        if !placed && host.width > 0 {
            let x = config.spawnRandom ? rnd(0, maxX) : maxX / 2
            let y = config.spawnRandom ? rnd(minY, maxY) : maxY / 2
            pos = CGPoint(x: x, y: y)
            placed = true
        }

        if roaming, let area = config.roam {
            if self.target == nil && now >= pauseUntil {
                let tx = rnd(0, maxX), ty = rnd(minY, maxY)
                self.target = CGPoint(x: tx, y: ty)
            }
            if let goalPoint = self.target {
                let dx = goalPoint.x - pos.x, dy = goalPoint.y - pos.y, d = hypot(dx, dy)
                speed = (area.speed == 0 ? 70 : area.speed) * motion.roam
                if d < 2 {
                    self.target = nil
                    pauseUntil = now + rnd(area.pause.lowerBound, area.pause.upperBound)
                    speed = 0
                } else {
                    let stepLength = min(d, speed * dt)
                    pos.x += dx / d * stepLength
                    pos.y += dy / d * stepLength
                    vx = dx / d; vy = dy / d
                }
            }
        } else {
            // Not roaming: drift back to the middle of the host.
            self.target = nil
            pos.x += (maxX / 2 - pos.x) * min(1, dt * 4)
            pos.y += (maxY / 2 - pos.y) * min(1, dt * 4)
        }
        pos.x = max(0, min(maxX, pos.x)); pos.y = max(minY, min(maxY, pos.y))
        walking += ((speed > 0 ? 1 : 0) - walking) * min(1, dt * 8)

        // Gaze: along the walking direction, else toward the pointer, else wandering (idle), else the mood's own.
        let t = now
        var overlayFrame: Int?
        let current = mood(currentMood)
        if !current.overlay.isEmpty, let ov = parts.overlays[current.overlay], !ov.frames.isEmpty, config.motion != .none, !config.reduceMotion {
            overlayFrame = Int((t * ov.fps).rounded(.down)) % ov.frames.count
        }
        var gaze: (Double, Double)?
        if walking > 0.3 {
            gaze = (vx, vy)
        } else if config.motion == .follow, let pointer {
            let c = boxCenter()
            let dx = pointer.x - c.x, dy = pointer.y - c.y
            let d = hypot(dx, dy) == 0 ? 1 : hypot(dx, dy)
            let f = min(1, d / 220)
            gaze = (dx / d * f, dy / d * f)
        } else if config.motion == .idle {
            gaze = (sin(t * 0.9), cos(t * 0.6) * 0.6)
        }
        // Quantize to multiples of 1/8 (Math.round in JavaScript rounds halves up) so the picture only changes when it visibly does.
        if let g = gaze { gaze = (((g.0 * 8) + 0.5).rounded(.down) / 8, ((g.1 * 8) + 0.5).rounded(.down) / 8) }
        boxSize = size // the picture is (re)drawn after the pointer direction was measured

        var o = config.pins
        o.mood = currentMood
        o.gaze = gaze.map { Gaze(x: $0.0, y: $0.1) }
        o.blink = blink
        o.overlayFrame = overlayFrame
        o.size = size

        var origin = pos
        var rotation = 0.0
        var scale = CGSize(width: 1, height: 1)
        if config.motion == .none || config.reduceMotion {
            applied = (jsFixed(pos.x, 2), jsFixed(pos.y, 2), 0, 1, 1)
        } else {
            let tau = 2 * Double.pi
            let up = 0.5 - 0.5 * cos(tau * motion.bobHz * t)
            let hop = abs(sin(Double.pi * (1.6 + motion.roam) * t))
            let sq = motion.squash * (2 * up - 1) - 0.08 * walking * (1 - hop)
            let jx = motion.shake * (sin(tau * motion.shakeHz * t) + 0.5 * sin(tau * motion.shakeHz * 1.7 * t + 1))
            let jy = motion.shake * 0.6 * sin(tau * motion.shakeHz * 1.3 * t + 2)
            let lean = walking * vx * 7
            let tt = tapAt < 0 ? 99 : now - tapAt
            let wob = tt < 1.2 ? exp(-5 * tt) * cos(tt * 22) * 0.2 : 0
            let jump = tt < 0.45 ? size * 0.2 * sin(Double.pi * tt / 0.45) : 0
            origin = CGPoint(x: pos.x + jx, y: pos.y + jy - motion.bob * up - walking * size * 0.1 * hop - jump)
            rotation = motion.sway * sin(tau * motion.swayHz * t) + lean
            scale = CGSize(width: motion.base * (1 - sq * 0.6) * (1 + wob), height: motion.base * (1 + sq) * (1 - wob))
            applied = (jsFixed(origin.x, 2), jsFixed(origin.y, 2), jsFixed(rotation, 2), jsFixed(scale.width, 3), jsFixed(scale.height, 3))
        }

        return LiveFrame(options: o, position: pos, origin: origin, rotation: rotation, scale: scale, pivot: CGPoint(x: 0.5, y: 0.85), size: size, isWalking: walking > 0.3)
    }

    /// The center of the box a browser reports for the avatar: its size, moved, scaled and rotated about the pivot, as of the previous frame.
    private func boxCenter() -> CGPoint {
        let w = boxSize, h = boxSize
        let ox = 0.5 * w, oy = 0.85 * h, a = applied.rot * Double.pi / 180
        var xs: [Double] = [], ys: [Double] = []
        for (px, py) in [(0.0, 0.0), (w, 0.0), (w, h), (0.0, h)] {
            let x = (px - ox) * applied.sx, y = (py - oy) * applied.sy
            xs.append(ox + x * cos(a) - y * sin(a) + applied.tx)
            ys.append(oy + x * sin(a) + y * cos(a) + applied.ty)
        }
        let left = xs.min()!, top = ys.min()!
        return CGPoint(x: left + (xs.max()! - left) / 2, y: top + (ys.max()! - top) / 2)
    }

    // MARK: for tests

    var debugMood: String { currentMood }
    var debugBlink: Double { blink }
}

/// JavaScript's `Number(x.toFixed(digits))`: round to `digits` decimals with ties going up, as a number.
func jsFixed(_ x: Double, _ digits: Int) -> Double {
    guard x.isFinite else { return x }
    let text = String(format: "%.60f", abs(x))
    let halves = text.split(separator: ".", maxSplits: 1)
    guard halves.count == 2, let whole = Int64(halves[0]) else { return x }
    let fraction = Array(halves[1].utf8).map { Int64($0) - 48 }
    var scaled = whole
    for i in 0..<digits { scaled = scaled * 10 + fraction[i] }
    if fraction[digits] >= 5 { scaled += 1 }
    let value = Double(scaled) / pow(10, Double(digits))
    return x < 0 ? -value : value
}
