#!/bin/sh

set -e

# Xcode Cloud: Run pod install before building
# This is required because /Pods is gitignored

echo "--- ci_pre_xcodebuild: Installing CocoaPods dependencies ---"

# Install Homebrew if not available
if ! command -v brew &>/dev/null; then
  echo "Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Install Node.js if not available
if ! command -v node &>/dev/null; then
  echo "Installing Node.js..."
  brew install node
fi

# Install CocoaPods if not available
if ! command -v pod &>/dev/null; then
  echo "Installing CocoaPods..."
  brew install cocoapods
fi

# Move to the repo root and install pnpm dependencies
cd "$CI_PRIMARY_REPOSITORY_PATH"
echo "Installing pnpm dependencies..."
corepack enable
pnpm install --frozen-lockfile

# Run pod install
echo "Running pod install..."
cd ios
pod install

echo "--- ci_pre_xcodebuild: Done ---"
