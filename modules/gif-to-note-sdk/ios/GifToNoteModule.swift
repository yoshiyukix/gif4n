import ExpoModulesCore
import AVFoundation
@_implementationOnly import gifski

// ─────────────────────────────────────────────────────────────
// GifToNote Expo Native Module (iOS)
//
// 機能:
//   - AVAssetImageGenerator で指定範囲のフレームを抽出
//   - gifski C API で高品質 GIF アニメーションを生成
//     (Floyd-Steinberg ディザリング + フレームごとカラーパレット最適化)
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
    var outputWidth = UInt32(params.outputWidth)
    var outputHeight = outputWidth
    if let videoTrack = asset.tracks(withMediaType: .video).first {
      let natural = videoTrack.naturalSize.applying(videoTrack.preferredTransform)
      let w = abs(natural.width), h = abs(natural.height)
      if w > 0 {
        let computed = UInt32((h / w * CGFloat(outputWidth)).rounded())
        // gifski は幅/高さが 0 の場合にクラッシュするため最低 1 を保証
        outputHeight = max(1, computed)
      }
    }
    // gifski は幅が 0 の場合にクラッシュするため最低 1 を保証
    outputWidth = max(1, outputWidth)

    // 出力先の一時ファイル
    let outputURL = FileManager.default.temporaryDirectory
      .appendingPathComponent("gif_\(UUID().uuidString).gif")
    let outputPath = outputURL.path

    // gifski インスタンス生成
    var settings = GifskiSettings(
      width: 0,   // 0 = フレームサイズをそのまま使用
      height: 0,
      quality: 90,
      fast: false,
      repeat: 0   // 無限ループ
    )
    guard let handle = gifski_new(&settings) else {
      throw NSError(domain: "GifToNote", code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "gifski の初期化に失敗しました"])
    }

    // gifski_finish は必ずハンドルを解放するため、エラー・キャンセル時も呼ぶ
    var thrownError: Error? = nil
    var cancelled = false

    // 出力ファイルを gifski に設定（frames 追加前に呼ぶ必要がある）
    let setOutputResult = outputPath.withCString { cPath in
      gifski_set_file_output(handle, cPath)
    }
    if setOutputResult != GIFSKI_OK {
      gifski_finish(handle)
      throw NSError(domain: "GifToNote", code: 2,
                    userInfo: [NSLocalizedDescriptionKey: "gifski 出力先の設定に失敗しました (code=\(setOutputResult.rawValue))"])
    }

    // フレーム抽出器
    let generator = AVAssetImageGenerator(asset: asset)
    generator.appliesPreferredTrackTransform = true
    generator.maximumSize = CGSize(width: Int(outputWidth), height: Int(outputHeight))
    generator.requestedTimeToleranceBefore = .zero
    generator.requestedTimeToleranceAfter = CMTime(
      seconds: 1.0 / Double(params.fps),
      preferredTimescale: 600
    )

    let frameDuration = duration / Double(frameCount)

    for i in 0..<frameCount {
      // キャンセル確認
      guard isActive(params.sessionId) else {
        cancelled = true
        break
      }

      let timeSec = params.startSec + Double(i) * frameDuration
      let time = CMTime(seconds: timeSec, preferredTimescale: 600)
      var actualTime = CMTime.zero

      let cgImage: CGImage
      do {
        cgImage = try generator.copyCGImage(at: time, actualTime: &actualTime)
      } catch {
        NSLog("[GifToNote] copyCGImage failed at %.2fs frame %d/%d: %@", timeSec, i + 1, frameCount, error.localizedDescription)
        thrownError = error
        break
      }

      // CGImage → RGBA バイト列（gifski は uncorrelated RGBA/sRGB を期待）
      // 事前計算値ではなく copyCGImage が実際に返した画像サイズを使う
      let w = cgImage.width
      let h = cgImage.height
      guard w > 0 && h > 0 else {
        NSLog("[GifToNote] cgImage has invalid size %dx%d at frame %d", w, h, i)
        thrownError = NSError(domain: "GifToNote", code: 3,
                              userInfo: [NSLocalizedDescriptionKey: "copyCGImage が無効な画像サイズを返しました (\(w)x\(h))"])
        break
      }
      let bytesPerRow = w * 4
      var pixelBuffer = [UInt8](repeating: 0, count: h * bytesPerRow)

      let colorSpace = CGColorSpaceCreateDeviceRGB()
      guard let ctx = CGContext(
        data: &pixelBuffer,
        width: w,
        height: h,
        bitsPerComponent: 8,
        bytesPerRow: bytesPerRow,
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
      ) else {
        NSLog("[GifToNote] CGContext creation failed for size %dx%d at frame %d", w, h, i)
        thrownError = NSError(domain: "GifToNote", code: 3,
                              userInfo: [NSLocalizedDescriptionKey: "CGContext の作成に失敗しました"])
        break
      }
      ctx.draw(cgImage, in: CGRect(x: 0, y: 0, width: w, height: h))

      // premultiplied alpha → straight alpha（gifski は uncorrelated RGBA を期待）
      // 動画フレームは alpha=255 が大半なので実質 no-op
      for px in stride(from: 0, to: pixelBuffer.count, by: 4) {
        let a = pixelBuffer[px + 3]
        if a > 0 && a < 255 {
          let af = Float(a) / 255.0
          pixelBuffer[px]     = UInt8(min(255, Int((Float(pixelBuffer[px]) / af).rounded())))
          pixelBuffer[px + 1] = UInt8(min(255, Int((Float(pixelBuffer[px + 1]) / af).rounded())))
          pixelBuffer[px + 2] = UInt8(min(255, Int((Float(pixelBuffer[px + 2]) / af).rounded())))
        }
      }

      let pts = Double(i) / Double(params.fps)
      let addResult = pixelBuffer.withUnsafeBytes { ptr in
        gifski_add_frame_rgba(
          handle,
          UInt32(i),
          UInt32(w),
          UInt32(h),
          ptr.bindMemory(to: UInt8.self).baseAddress!,
          pts
        )
      }

      if addResult != GIFSKI_OK {
        thrownError = NSError(domain: "GifToNote", code: 4,
                              userInfo: [NSLocalizedDescriptionKey: "gifski フレーム追加に失敗しました (code=\(addResult.rawValue))"])
        break
      }

      // 進捗イベントを JS へ送信
      let progress = Double(i + 1) / Double(frameCount)
      sendEvent("onProgress", ["sessionId": params.sessionId, "progress": progress])
    }

    // エンコード完了待ち（必ず呼ぶ。ハンドルがここで解放される）
    let finishResult = gifski_finish(handle)

    if cancelled {
      throw NSError(domain: "AbortError", code: 0,
                    userInfo: [NSLocalizedDescriptionKey: "cancelled"])
    }
    if let err = thrownError {
      throw err
    }
    if finishResult != GIFSKI_OK {
      throw NSError(domain: "GifToNote", code: 5,
                    userInfo: [NSLocalizedDescriptionKey: "gifski エンコード完了に失敗しました (code=\(finishResult.rawValue))"])
    }

    return outputURL.absoluteString
  }
}
