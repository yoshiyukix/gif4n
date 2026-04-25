/**
 * MediaLibrary の URI に含まれるフラグメント識別子（`#`以降）を除去して正規化する。
 * AVFoundation 等がフラグメント付き URI を正しく処理できないケースへの対処。
 */
export function normalizeMediaLibraryUri(uri: string): string {
  const hashIndex = uri.indexOf('#');
  return hashIndex >= 0 ? uri.slice(0, hashIndex) : uri;
}
