// swift-tools-version: 5.9
// Swift Package Manager needs this file at the repository root. The sources live in core/swift.
import PackageDescription

let package = Package(
    name: "Blobmates",
    platforms: [.macOS(.v13), .iOS(.v16)],
    products: [
        .library(name: "Blobmates", targets: ["Blobmates"]),
    ],
    targets: [
        .target(name: "Blobmates", path: "core/swift/Sources/Blobmates"),
        // Checks the port against core/spec/vectors.json. Run: swift run BlobmatesCheck
        // (It is a program, not a test target, so it needs no Xcode and runs anywhere Swift does.)
        .executableTarget(name: "BlobmatesCheck", dependencies: ["Blobmates"], path: "core/swift/Sources/BlobmatesCheck"),
    ]
)
