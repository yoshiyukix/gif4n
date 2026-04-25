// Jest用モック: react-native-webの参照をreact-nativeにリダイレクト
// jest-expo/node プリセットが react-native → react-native-web を使用するため、
// babel-plugin-react-native-web が変換した
// 'react-native-web/dist/exports/...' などのパスをすべてここで受け取り、
// 実際の react-native のエクスポートへ転送する。
module.exports = require('react-native');
