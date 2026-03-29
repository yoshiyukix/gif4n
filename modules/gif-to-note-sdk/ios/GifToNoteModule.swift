import ExpoModulesCore
import AVFoundation
import ImageIO
import UniformTypeIdentifiers

// ─────────────────────────────────────────────────────────────
// GifToNote Expo Native Module (iOS)
//
// 機能:
//   - AVAssetImageGenerator で指定範囲のフレームを抽出
//   - ImageIO で GIF アニメーションを生成
//   - 進捗イベントを "onProgress" として JS へ送信
//   - キャンセル対応（activeSessions で管理）
// ─────────────────────────────────────────────────────────────

public struct ConvertParams: Record {
  public init() {}
  @Field public var uri: String = ""
  @Field public var startSec: Double = 0.0
  @Field public var endSec: Double = 0.0
  @Field public var outputWidth: Int = 480
  @Field public var fps: Int = 10
  @Field public var sessionId: String = ""
}

public class GifToNoteModule: Module {
  private var activeSessions: [String: Bool] = [:]
  private let lock = NSLock()

  public func definition() -> ModuleDefinition {
    Name("GifToNote")

    Events("onProgress")

    AsyncFunction("convertToGif") { (params: ConvertParams) throws -> String in
      self.markSession(params.sessionId, active: true)
      defer { self.removeSession(params.sessionId) }
      return try self.convertVideoToGif(params: params)
    }

    AsyncFunction("cancelConversion") { (sessionId: String) in
      self.markSession(sessionId, active: false)
    }

    // 互換性スタブ — 進捗受け取りは addListener("onProgress") を使用
    Function("addProgressListener") { (_: String) in }
  }

  // MARK: - Session management

  private func markSession(_ id: String, active: Bool) {
    lock.lock(); defer { lock.unlock() }
    activeSessions[id] = active
  }

  private func removeSession(_ id: String) {
    lock.lock(); defer { lock.unlock() }
    activeSessions.removeValue(forKey: id)
  }

  private func isActive(_ id: String) -> Bool {
    lock.lock(); defer { lock.unlock() }
    return activeSessions[id] == true
  }

  // MARK: - GIF conversion

  private func convertVideoToGif(params: ConvertParams) throws -> String {
    // URI → URL
    let sourceURL: URL
    if params.uri.hasPrefix("file://") {
      guard let url = URL(string: params.uri) else {
        throw NSError(domain: "GifToNote", code: 0,
                      userInfo: [NSLocalizedDescriptionKey: "URI が無効です: \(params.uri)"])
      }
      sourceURL = url
    } else {
      sourceURL = URL(fileURLWithPath: params.uri)
    }

    let asset = AVURLAsset(url: sourceURL)
    let duration = params.endSec - params.startSec
    let frameCount = max(1, Int(duration * Double(params.fps)))

    // アスペクト比を保持した出力サイズ
    var outputHeight = params.outputWidth
    if let videoTrack = asset.tracks(withMediaType: .video).first {
      let natural = videoTrack.naturalSize.applying(videoTrack.preferredTransform)
      let w = abs(natural.width), h = abs(natural.height)
      if w > 0 {
        outputHeight = Int(h / w * CGFloat(params.outputWidth))
      }
    }

    // 出力先の一時ファイル
    let outputURL = FileManager.default.temporaryDirectory
      .appendingPathComponent("gif_\(UUID().uuidString).gif")

    guard let destination = CGImageDestinationCreateWithURL(
      outputURL as CFURL,
      UTType.gif.identifier as CFString,
      frameCount,
      nil
    ) else {
      throw NSError(domain: "GifToNote", code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "GIF destination の作成に失敗しました"])
    }

    CGImageDestinationSetProperties(
      destination,
      [kCGImagePropertyGIFDictionary: [kCGImagePropertyGIFLoopCount: 0]] as CFDictionary
    )

    // フレーム抽出器
    let generator = AVAssetImageGenerator(asset: asset)
    generator.appliesPreferredTrackTransform = true
    generator.maximumSize = CGSize(width: params.outputWidth, height: outputHeight)
    generator.requestedTimeToleranceBefore = .zero
    generator.requestedTimeToleranceAfter = CMTime(
      seconds: 1.0 / Double(params.fps),
      preferredTimescale: 600
    )

    let frameDuration = duration / Double(frameCount)
    let delayTime = 1.0 / Double(params.fps)
    let frameProps: [CFString: Any] = [
      kCGImagePropertyGIFDelayTime: NSNumber(value: delayTime),
      kCGImagePropertyGIFUnclampedDelayTime: NSNumber(value: delayTime),
    ]

    for i in 0..<frameCount {
      // キャンセル確認
      guard isActive(params.sessionId) else {
        throw NSError(domain: "AbortError", code: 0,
                      userInfo: [NSLocalizedDescriptionKey: "cancelled"])
      }

      let timeSec = params.startSec + Double(i) * frameDuration
      let time = CMTime(seconds: timeSec, preferredTimescale: 600)
      var actualTime = CMTime.zero
      let cgImage = try generator.copyCGImage(at: time, actualTime: &actualTime)

      CGImageDestinationAddImage(
        destination,
        cgImage,
        [kCGImagePropertyGIFDictionary: frameProps] as CFDictionary
      )

      // 進捗イベントを JS へ送信
      let progress = Double(i + 1) / Double(frameCount)
      sendEvent("onProgress", ["sessionId": params.sessionId, "progress": progress])
    }

    guard CGImageDestinationFinalize(destination) else {
      throw NSError(domain: "GifToNote", code: 2,
                    userInfo: [NSLocalizedDescriptionKey: "GIF の書き出しに失敗しました"])
    }

    return outputURL.absoluteString
  }
}
