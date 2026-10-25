import SwiftUI
#if canImport(AppKit)
import AppKit
#endif

/// Lets your code poke a `LiveBlobmateView`, for example when something succeeds:
///
///     @State private var blobmate = BlobmateController()
///     LiveBlobmateView(seed: "sagar", react: ReactOptions(), controller: blobmate)
///     Button("Done") { blobmate.poke() }
public final class BlobmateController {
    fileprivate weak var model: LiveModel?
    public init() {}
    /// Makes it jump and show a short-lived face (the same as tapping it).
    public func poke() { model?.poke(now: LiveModel.now) }
}

/// Holds the runtime between frames. A plain class: it changes every frame, so it must not trigger SwiftUI updates itself.
final class LiveModel: ObservableObject {
    var runtime: BlobmateRuntime?
    var config: LiveConfig?
    var lastFrame: LiveFrame?
    var localPointer: CGPoint?
    #if canImport(AppKit)
    weak var hostView: NSView?
    #endif

    static var now: Double { Date().timeIntervalSinceReferenceDate }

    func sync(_ new: LiveConfig, now: Double) {
        if let runtime, config != new { runtime.update(new) } else if runtime == nil { runtime = BlobmateRuntime(config: new, now: now) }
        config = new
    }

    func poke(now: Double) { runtime?.poke(now: now) }

    /// Where the pointer is, in the view's own coordinates (top left origin).
    func pointer() -> CGPoint? {
        #if canImport(AppKit)
        // The pointer anywhere on screen, like the web version follows it anywhere on the page. No permission is needed.
        if let view = hostView, let window = view.window {
            let inView = view.convert(window.convertPoint(fromScreen: NSEvent.mouseLocation), from: nil)
            return CGPoint(x: inView.x, y: view.isFlipped ? inView.y : view.bounds.height - inView.y)
        }
        #endif
        return localPointer
    }

    func frame(now: Double, host: CGSize) -> LiveFrame? {
        guard let runtime else { return nil }
        runtime.pointer = pointer()
        let f = runtime.step(now: now, host: host)
        lastFrame = f
        return f
    }

    func tap(at point: CGPoint, now: Double) {
        guard let frame = lastFrame, config?.react != nil else { return }
        if CGRect(origin: frame.position, size: CGSize(width: frame.size, height: frame.size)).contains(point) { poke(now: now) }
    }
}

#if canImport(AppKit)
/// An invisible view behind the avatar, used to find out where the pointer is relative to it.
private struct HostReader: NSViewRepresentable {
    let model: LiveModel
    func makeNSView(context: Context) -> NSView { let v = NSView(); model.hostView = v; return v }
    func updateNSView(_ view: NSView, context: Context) { model.hostView = view }
}
#endif

/// A Blobmate that is alive: it blinks, its eyes follow the pointer, it moves with its mood, and it can walk around and react to taps.
///
///     LiveBlobmateView(seed: "sagar", mood: "happy")
///     LiveBlobmateView(seed: "sagar", mood: "excited", roam: RoamOptions(speed: 60), react: ReactOptions())   // fills the space, walks about
///
/// Without `roam` it is `size` by `size`. With `roam` it fills the space it is given, so give it a frame.
/// It stops moving when the system's "Reduce motion" setting is on.
public struct LiveBlobmateView: View {
    private let seed: String
    private let size: CGFloat
    private let mood: String
    private let pins: BlobmateOptions
    private let motion: MotionMode
    private let roam: RoamOptions?
    private let react: ReactOptions?
    private let spawnRandom: Bool
    private let label: String?
    private let controller: BlobmateController?

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    // StateObject, not State: the State macro needs a plugin that only full Xcode ships.
    @StateObject private var model = LiveModel()

    public init(seed: String, size: CGFloat = 120, mood: String = "neutral", pins: BlobmateOptions = BlobmateOptions(), motion: MotionMode = .follow,
                roam: RoamOptions? = nil, react: ReactOptions? = nil, spawnRandom: Bool = false, label: String? = nil, controller: BlobmateController? = nil) {
        self.seed = seed; self.size = size; self.mood = mood; self.pins = pins; self.motion = motion
        self.roam = roam; self.react = react; self.spawnRandom = spawnRandom; self.label = label; self.controller = controller
    }

    private var config: LiveConfig {
        LiveConfig(seed: seed, pins: pins, mood: mood, size: Double(size), motion: motion, roam: roam, react: react,
                   spawnRandom: spawnRandom, reduceMotion: reduceMotion)
    }

    public var body: some View {
        let model = self.model
        let config = self.config
        controller?.model = model
        let idle = motion == .none && roam == nil && react == nil
        return GeometryReader { geo in
            TimelineView(.animation(minimumInterval: nil, paused: idle)) { timeline in
                Canvas { context, canvasSize in
                    let now = timeline.date.timeIntervalSinceReferenceDate
                    model.sync(config, now: now)
                    guard let frame = model.frame(now: now, host: canvasSize),
                          let scene = SceneCache.shared.scene(for: Blobmates.svg(seed: seed, options: frame.options)) else { return }
                    context.withCGContext { cg in
                        cg.saveGState()
                        cg.concatenate(frame.transform)
                        scene.draw(in: cg, rect: CGRect(x: 0, y: 0, width: frame.size, height: frame.size))
                        cg.restoreGState()
                    }
                }
            }
            #if canImport(AppKit)
            .background(HostReader(model: model))
            #endif
            .contentShape(Rectangle())
            .onContinuousHover { phase in
                if case .active(let point) = phase { model.localPointer = point } else { model.localPointer = nil }
            }
            .gesture(DragGesture(minimumDistance: 0).onEnded { value in model.tap(at: value.startLocation, now: LiveModel.now) })
        }
        .frame(width: roam == nil ? size : nil, height: roam == nil ? size : nil)
        .frame(maxWidth: roam == nil ? nil : .infinity, maxHeight: roam == nil ? nil : .infinity)
        .accessibilityElement()
        .accessibilityLabel(label ?? "\(seed) avatar")
        .accessibilityAddTraits(react == nil ? .isImage : .isButton)
        .accessibilityAction { if react != nil { model.poke(now: LiveModel.now) } }
    }
}
