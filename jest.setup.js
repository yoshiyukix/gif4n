// @testing-library/react-hooks が内部で act() を呼び出すため
// React にテスト環境として認識させて "not configured to support act" 警告を抑制する
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// @testing-library/react-hooks v8 は React 18/19 と完全互換ではないため、
// 当ライブラリに起因する既知の console.error 警告をここで抑制する。
// - "react-test-renderer is deprecated" : React 19 が出す非推奨通知
// - "An update to TestComponent inside a test was not wrapped in act" :
//   非同期フックのステート更新が act() スコープ外になる既知問題
const _origConsoleError = console.error;
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((...args) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (
      msg.includes('react-test-renderer is deprecated') ||
      msg.includes('inside a test was not wrapped in act')
    ) return;
    _origConsoleError.call(console, ...args);
  });
});
afterAll(() => {
  jest.restoreAllMocks();
});
