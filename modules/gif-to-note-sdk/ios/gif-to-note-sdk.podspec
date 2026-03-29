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

  s.dependency 'ExpoModulesCore'
end
