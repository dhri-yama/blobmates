/// FNV-1a over the UTF-8 bytes of the seed, as an unsigned 32-bit integer. See core/spec/ALGORITHM.md.
func fnv1a(_ text: String) -> UInt32 {
    var h: UInt32 = 0x811c9dc5
    for byte in text.utf8 { h = (h ^ UInt32(byte)) &* 0x01000193 }
    return h
}

/// mulberry32: each call to `next()` gives the next unsigned 32-bit number. All arithmetic wraps.
struct Mulberry32 {
    var state: UInt32

    init(seed: UInt32) { state = seed }

    mutating func next() -> UInt32 {
        state = state &+ 0x6d2b79f5
        var t = (state ^ (state >> 15)) &* (1 | state)
        t = (t &+ ((t ^ (t >> 7)) &* (61 | t))) ^ t
        return t ^ (t >> 14)
    }
}
