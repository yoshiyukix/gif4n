require 'json'

Pod::Spec.new do |s|
  s.name           = 'Gif4n'
  s.version        = '1.0.0'
  s.summary        = 'GIF conversion native module for gif4n'
  s.description    = 'Converts video to animated GIF using AVFoundation + ImageIO'
  s.homepage       = 'https://github.com/'
  s.license        = 'MIT'
  s.author         = { 'Developer' => 'dev@example.com' }
  s.platform       = :ios, '15.0'
  s.source         = { :path => '.' }
  s.source_files   = '*.swift'
  s.swift_version  = '5.9'

  s.dependency 'ExpoModulesCore'
end
