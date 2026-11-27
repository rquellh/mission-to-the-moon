// Contact sheets from a video: frames every `step` seconds from `start` to `end`,
// each drawn `tileW` pixels wide with its time, `cols` x `rows` per sheet.
// Usage: swift sheets.swift <video> <outDir> <prefix> <start> <end> <step> <tileW> <cols> <rows> [cropX,cropY,cropW,cropH as fractions, origin top-left]
import AVFoundation
import AppKit

let args = CommandLine.arguments
let input = URL(fileURLWithPath: args[1])
let outDir = URL(fileURLWithPath: args[2])
let prefix = args[3]
let start = Double(args[4])!
let end = Double(args[5])!
let step = Double(args[6])!
let tileW = Int(args[7])!
let cols = Int(args[8])!
let rows = Int(args[9])!
var crop = CGRect(x: 0, y: 0, width: 1, height: 1)
if args.count > 10 {
  let p = args[10].split(separator: ",").map { Double($0)! }
  crop = CGRect(x: p[0], y: p[1], width: p[2], height: p[3])
}

try? FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)
let asset = AVURLAsset(url: input)
let gen = AVAssetImageGenerator(asset: asset)
gen.appliesPreferredTrackTransform = true
gen.requestedTimeToleranceBefore = .zero
gen.requestedTimeToleranceAfter = .zero

var times: [Double] = []
var t = start
while t <= end + 1e-9 { times.append(t); t += step }

let gap = 6
let labelH = 22
var sheet = 0
var index = 0
while index < times.count {
  let chunk = Array(times[index..<min(times.count, index + cols * rows)])
  index += chunk.count
  var images: [(Double, CGImage)] = []
  for time in chunk {
    if let image = try? gen.copyCGImage(at: CMTime(seconds: time, preferredTimescale: 600), actualTime: nil) {
      let r = CGRect(x: crop.minX * Double(image.width), y: crop.minY * Double(image.height),
                     width: crop.width * Double(image.width), height: crop.height * Double(image.height))
      if let cut = image.cropping(to: r) { images.append((time, cut)) }
    }
  }
  guard let first = images.first else { continue }
  let tileH = Int(Double(tileW) * Double(first.1.height) / Double(first.1.width))
  let usedRows = Int(ceil(Double(images.count) / Double(cols)))
  let w = cols * tileW + (cols + 1) * gap
  let h = usedRows * (tileH + labelH) + (usedRows + 1) * gap
  let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: w, pixelsHigh: h, bitsPerSample: 8,
                             samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                             colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
  NSColor(white: 0.2, alpha: 1).setFill()
  NSRect(x: 0, y: 0, width: w, height: h).fill()
  for (k, (time, image)) in images.enumerated() {
    let col = k % cols
    let row = k / cols
    let x = gap + col * (tileW + gap)
    let yTop = gap + row * (tileH + labelH + gap)
    let y = h - yTop - labelH - tileH
    NSGraphicsContext.current!.cgContext.interpolationQuality = .high
    NSGraphicsContext.current!.cgContext.draw(image, in: CGRect(x: x, y: y, width: tileW, height: tileH))
    let label = String(format: "%.2f s", time) as NSString
    label.draw(at: NSPoint(x: x + 4, y: h - yTop - labelH + 3),
               withAttributes: [.font: NSFont.boldSystemFont(ofSize: 15), .foregroundColor: NSColor.white])
  }
  NSGraphicsContext.restoreGraphicsState()
  let name = String(format: "%@-%02d.jpg", prefix, sheet)
  let data = rep.representation(using: .jpeg, properties: [.compressionFactor: 0.8])!
  try! data.write(to: outDir.appendingPathComponent(name))
  print("\(name): \(String(format: "%.2f", chunk.first!)) to \(String(format: "%.2f", chunk.last!)) s, \(w)x\(h)")
  sheet += 1
}
