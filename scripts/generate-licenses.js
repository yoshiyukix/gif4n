#!/usr/bin/env node
/* global __dirname */
'use strict';

/**
 * generate-licenses.js
 *
 * package.json の依存パッケージのライセンス情報を収集し、
 * src/assets/licenses.json として出力します。
 *
 * 実行: node scripts/generate-licenses.js
 */

const licenseChecker = require('license-checker-rseidelsohn');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'src', 'assets', 'licenses.json');

licenseChecker.init(
  {
    start: ROOT,
    production: true,
    excludePackages: 'gif4n;gif4n-sdk',
    // ライセンス全文を含める
    customFormat: {
      name: '',
      version: '',
      licenses: '',
      licenseText: '',
    },
  },
  (err, packages) => {
    if (err) {
      // eslint-disable-next-line no-console
      console.error('ライセンス情報の取得に失敗しました:', err);
      process.exit(1);
    }

    const entries = Object.entries(packages).map(([nameVersion, info]) => {
      // nameVersion 例: "react@19.2.0"
      const atIdx = nameVersion.lastIndexOf('@');
      const name = atIdx > 0 ? nameVersion.slice(0, atIdx) : nameVersion;
      const version = atIdx > 0 ? nameVersion.slice(atIdx + 1) : '';
      return {
        name,
        version,
        license: info.licenses ?? 'Unknown',
        licenseText: info.licenseText ?? '',
      };
    });

    // 名前でソート
    entries.sort((a, b) => a.name.localeCompare(b.name));

    fs.writeFileSync(OUTPUT, JSON.stringify(entries, null, 2), 'utf8');
    // eslint-disable-next-line no-console
    console.log(`✓ ${entries.length} パッケージのライセンス情報を書き出しました: ${OUTPUT}`);
  },
);
