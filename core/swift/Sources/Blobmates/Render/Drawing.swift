import CoreGraphics
import Foundation
import ImageIO

// MARK: drawing a Scene

extension Scene {
    /// Draws into `ctx`, which must have its origin at the top left with y pointing down (a SwiftUI Canvas, a flipped NSImage,
    /// a UIKit context). The picture is scaled to fill `rect`.
    func draw(in ctx: CGContext, rect: CGRect) {
        ctx.saveGState()
        ctx.translateBy(x: rect.minX, y: rect.minY)
        ctx.scaleBy(x: rect.width / viewBox.width, y: rect.height / viewBox.height)
        ctx.translateBy(x: -viewBox.minX, y: -viewBox.minY)
        ctx.clip(to: viewBox)
        for item in items { Scene.draw(item, in: ctx) }
        ctx.restoreGState()
    }

    private static func draw(_ item: Item, in ctx: CGContext) {
        switch item {
        case .group(let g):
            ctx.saveGState()
            if let t = g.transform { ctx.concatenate(t) }
            if let clip = g.clip { ctx.addPath(clip); ctx.clip() }
            let layered = g.opacity < 1
            if layered { ctx.setAlpha(g.opacity); ctx.beginTransparencyLayer(auxiliaryInfo: nil) }
            for child in g.children { draw(child, in: ctx) }
            if layered { ctx.endTransparencyLayer() }
            ctx.restoreGState()
        case .shape(let s):
            guard s.fill != nil || (s.stroke != nil && s.strokeWidth > 0) else { return }
            ctx.saveGState()
            if let t = s.transform { ctx.concatenate(t) }
            ctx.setAlpha(s.opacity)
            ctx.addPath(s.path)
            if let fill = s.fill { ctx.setFillColor(fill) }
            if let stroke = s.stroke, s.strokeWidth > 0 {
                ctx.setStrokeColor(stroke)
                ctx.setLineWidth(s.strokeWidth)
                ctx.setLineCap(s.cap)
                ctx.setLineJoin(s.join)
                ctx.setMiterLimit(4)
            }
            switch (s.fill != nil, s.stroke != nil && s.strokeWidth > 0) {
            case (true, true): ctx.drawPath(using: .fillStroke)
            case (true, false): ctx.drawPath(using: .fill)
            case (false, true): ctx.drawPath(using: .stroke)
            default: break
            }
            ctx.restoreGState()
        }
    }
}

// MARK: public drawing API

extension Blobmates {
    /// Draws a Blobmate into a Core Graphics context.
    ///
    /// - Parameters:
    ///   - isFlipped: `true` (the default) when the context has its origin at the top left with y down, as in SwiftUI,
    ///     UIKit and flipped AppKit drawing. Pass `false` for a plain AppKit or bitmap context (origin bottom left).
    public static func draw(seed: String, options: BlobmateOptions = BlobmateOptions(), in context: CGContext, rect: CGRect, isFlipped: Bool = true) {
        guard let scene = SceneCache.shared.scene(for: svg(seed: seed, options: options)) else { return }
        draw(scene: scene, in: context, rect: rect, isFlipped: isFlipped)
    }

    static func draw(scene: Scene, in context: CGContext, rect: CGRect, isFlipped: Bool) {
        if isFlipped {
            scene.draw(in: context, rect: rect)
        } else {
            context.saveGState()
            context.translateBy(x: rect.minX, y: rect.maxY)
            context.scaleBy(x: 1, y: -1)
            scene.draw(in: context, rect: CGRect(origin: .zero, size: rect.size))
            context.restoreGState()
        }
    }

    /// A bitmap of the picture, `pixels` wide and tall, with a transparent background (unless `options.bg` is set).
    public static func cgImage(seed: String, options: BlobmateOptions = BlobmateOptions(), pixels: Int = 256) -> CGImage? {
        guard pixels > 0, let space = CGColorSpace(name: CGColorSpace.sRGB),
              let ctx = CGContext(data: nil, width: pixels, height: pixels, bitsPerComponent: 8, bytesPerRow: 0, space: space,
                                  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return nil }
        ctx.setShouldAntialias(true)
        ctx.interpolationQuality = .high
        draw(seed: seed, options: options, in: ctx, rect: CGRect(x: 0, y: 0, width: pixels, height: pixels), isFlipped: false)
        return ctx.makeImage()
    }

    /// The picture as PNG data, for files, sharing, notifications or places that cannot show SVG (emails, chat apps).
    public static func pngData(seed: String, options: BlobmateOptions = BlobmateOptions(), pixels: Int = 512) -> Data? {
        guard let image = cgImage(seed: seed, options: options, pixels: pixels) else { return nil }
        let data = NSMutableData()
        guard let destination = CGImageDestinationCreateWithData(data, "public.png" as CFString, 1, nil) else { return nil }
        CGImageDestinationAddImage(destination, image, nil)
        return CGImageDestinationFinalize(destination) ? data as Data : nil
    }
}

#if canImport(AppKit)
import AppKit

extension Blobmates {
    /// An `NSImage` of the picture. It stays sharp at any size (it is drawn as vectors each time it is shown).
    /// Handy for `NSImageView`, menu items, `NSStatusItem` buttons and `NSAlert` icons.
    public static func nsImage(seed: String, options: BlobmateOptions = BlobmateOptions(), size: CGFloat = 64) -> NSImage {
        let scene = SceneCache.shared.scene(for: svg(seed: seed, options: options))
        return NSImage(size: NSSize(width: size, height: size), flipped: true) { rect in
            guard let scene, let ctx = NSGraphicsContext.current?.cgContext else { return false }
            scene.draw(in: ctx, rect: rect)
            return true
        }
    }
}
#endif

#if canImport(UIKit)
import UIKit

extension Blobmates {
    /// A `UIImage` of the picture.
    public static func uiImage(seed: String, options: BlobmateOptions = BlobmateOptions(), size: CGFloat = 64) -> UIImage {
        let scene = SceneCache.shared.scene(for: svg(seed: seed, options: options))
        return UIGraphicsImageRenderer(size: CGSize(width: size, height: size)).image { renderer in
            scene?.draw(in: renderer.cgContext, rect: CGRect(x: 0, y: 0, width: size, height: size))
        }
    }
}
#endif
