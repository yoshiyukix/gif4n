package com.giftonote.app

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import android.media.MediaMetadataRetriever
import android.graphics.Bitmap
import java.io.File
import java.io.FileOutputStream
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

// ─────────────────────────────────────────────────────────────
// GifToNote Expo Native Module (Android)
//
// 機能:
//   - MediaMetadataRetriever で指定範囲の動画フレームを抽出
//   - gifski NDK バインディングで GIF アニメーションを生成
//   - 進捗コールバックを JS へ送信
//   - キャンセル対応
//
// NOTE: gifski は Rust 製ライブラリ。
//   buildSrc/rust-build.gradle でビルドし、
//   app/src/main/jniLibs/ 配下に .so を配置すること。
// ─────────────────────────────────────────────────────────────

class GifToNoteModule : Module() {

  // アクティブな変換セッション管理
  private val activeSessions = ConcurrentHashMap<String, Boolean>()

  override fun definition() = ModuleDefinition {
    Name("GifToNote")

    // ─── convertToGif ─────────────────────────────────

    AsyncFunction("convertToGif") { params: ConvertParams, promise: Promise ->
      val sessionId = params.sessionId ?: UUID.randomUUID().toString()
      activeSessions[sessionId] = true

      Thread {
        try {
          val outputUri = convertToGif(
            uri = params.uri,
            startSec = params.startSec,
            endSec = params.endSec,
            outputWidth = params.outputWidth,
            fps = params.fps,
            sessionId = sessionId,
          )
          promise.resolve(outputUri)
        } catch (e: CancellationException) {
          promise.reject("AbortError", "cancelled", e)
        } catch (e: Exception) {
          promise.reject("NativeError", e.message ?: "Unknown error", e)
        } finally {
          activeSessions.remove(sessionId)
        }
      }.start()
    }

    // ─── cancelConversion ─────────────────────────────

    AsyncFunction("cancelConversion") { sessionId: String, promise: Promise ->
      activeSessions[sessionId] = false
      promise.resolve(null)
    }

    // ─── addProgressListener ──────────────────────────

    Function("addProgressListener") { _: String ->
      // 互換性スタブ — JS 側からの直接呼び出し用。進捗はイベント "onProgress" で受け取る
    }

    Events("onProgress")
  }

  // ─── 変換ロジック ─────────────────────────────────

  private fun convertToGif(
    uri: String,
    startSec: Double,
    endSec: Double,
    outputWidth: Int,
    fps: Int,
    sessionId: String,
  ): String {
    val retriever = MediaMetadataRetriever()
    retriever.setDataSource(uri)

    val duration = endSec - startSec
    val frameCount = (duration * fps).toInt()
    val frameInterval = duration / frameCount

    // 動画のアスペクト比を保持した出力サイズ
    val videoWidth = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)
      ?.toInt() ?: outputWidth
    val videoHeight = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)
      ?.toInt() ?: outputWidth
    val outputHeight = (outputWidth.toFloat() * videoHeight / videoWidth).toInt()

    // 出力ファイルの準備
    val outputFile = File.createTempFile("gif_${UUID.randomUUID()}", ".gif")
    val outputStream = FileOutputStream(outputFile)

    // gifski ネイティブ関数（JNI 経由）
    val gifskiHandle = gifskiCreate(outputWidth, outputHeight, 100.0f, 1, false)
      ?: throw RuntimeException("gifski の初期化に失敗しました")

    gifskiSetWriteCallback(gifskiHandle, outputStream)

    try {
      for (i in 0 until frameCount) {
        // キャンセル確認
        if (activeSessions[sessionId] == false) {
          gifskiFinish(gifskiHandle)
          throw CancellationException("cancelled")
        }

        val timeMicros = ((startSec + i * frameInterval) * 1_000_000).toLong()
        val bitmap = retriever.getFrameAtTime(timeMicros, MediaMetadataRetriever.OPTION_CLOSEST)
          ?: continue

        val scaledBitmap = Bitmap.createScaledBitmap(bitmap, outputWidth, outputHeight, true)
        val pixels = IntArray(outputWidth * outputHeight)
        scaledBitmap.getPixels(pixels, 0, outputWidth, 0, 0, outputWidth, outputHeight)
        bitmap.recycle()
        scaledBitmap.recycle()

        gifskiAddFrameRgba(
          gifskiHandle,
          i,
          outputWidth,
          outputHeight,
          pixels,
          (i.toFloat() / fps),
        )

        // 進捗通知
        sendEvent("onProgress", mapOf("sessionId" to sessionId, "progress" to (i + 1).toFloat() / frameCount))
      }

      gifskiFinish(gifskiHandle)
    } finally {
      retriever.release()
      outputStream.close()
    }

    return "file://${outputFile.absolutePath}"
  }

  // ─── gifski JNI バインディング ────────────────────

  private external fun gifskiCreate(
    width: Int,
    height: Int,
    quality: Float,
    once: Int,
    fast: Boolean,
  ): Long?

  private external fun gifskiAddFrameRgba(
    handle: Long,
    frameNumber: Int,
    width: Int,
    height: Int,
    pixels: IntArray,
    presentationSecs: Float,
  )

  private external fun gifskiSetWriteCallback(handle: Long, outputStream: FileOutputStream)

  private external fun gifskiFinish(handle: Long)

  companion object {
    init {
      System.loadLibrary("gifski_jni")
    }
  }
}

// ─── 補助型 ──────────────────────────────────────────

data class ConvertParams(
  val sessionId: String?,
  val uri: String,
  val startSec: Double,
  val endSec: Double,
  val outputWidth: Int,
  val fps: Int,
)

class CancellationException(message: String) : Exception(message)
