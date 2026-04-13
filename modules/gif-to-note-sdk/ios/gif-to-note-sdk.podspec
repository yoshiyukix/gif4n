Pod::Spec.new do |s|
  s.name           = 'gif-to-note-sdk'
  s.version        = '1.0.0'
  s.summary        = 'GIF conversion native module for gif-to-note'
  s.homepage       = 'https://github.com/'
  s.license        = 'MIT'
  s.author         = { 'Developer' => 'dev@example.com' }
  s.platform       = :ios, '15.0'
  s.source         = { :path => '.' }
  s.source_files   = '*.swift'
  s.swift_version  = '5.9'

  # gifski static library (XCFramework)
  s.vendored_frameworks = 'vendor/gifski.xcframework'

  # Expose the gifski C header as a clang module so Swift can import it
  s.preserve_paths      = 'vendor/gifski.h', 'vendor/gifski.modulemap'
  s.pod_target_xcconfig = {
    'SWIFT_INCLUDE_PATHS'             => '$(PODS_TARGET_SRCROOT)/vendor',
    'OTHER_SWIFT_FLAGS'               => '-Xcc -fmodule-map-file=$(PODS_TARGET_SRCROOT)/vendor/gifski.modulemap',
  }

  s.dependency 'ExpoModulesCore'
end
