import SwiftUI

/// A still Blobmate. It is drawn as vectors, so it stays sharp at any size. For one that moves, see `LiveBlobmateView`.
///
///     BlobmateView(seed: "sagar", size: 64)
///     BlobmateView(seed: "sagar", size: 96, options: BlobmateOptions(mood: "happy", shape: .circle))
public struct BlobmateView: View {
    private let seed: String
    private let options: BlobmateOptions
    private let size: CGFloat?
    private let label: String?

    /// - Parameters:
    ///   - size: width and height in points. Leave nil to fill the space you give it (it stays square).
    ///   - label: the accessibility description. Defaults to "<seed> avatar".
    public init(seed: String, size: CGFloat? = nil, options: BlobmateOptions = BlobmateOptions(), label: String? = nil) {
        self.seed = seed
        self.options = options
        self.size = size
        self.label = label
    }

    public var body: some View {
        let scene = SceneCache.shared.scene(for: Blobmates.svg(seed: seed, options: options))
        Canvas { context, canvasSize in
            guard let scene else { return }
            context.withCGContext { cg in scene.draw(in: cg, rect: CGRect(origin: .zero, size: canvasSize)) }
        }
        .aspectRatio(1, contentMode: .fit)
        .frame(width: size, height: size)
        .accessibilityElement()
        .accessibilityLabel(label ?? "\(seed) avatar")
        .accessibilityAddTraits(.isImage)
    }
}
