export const ProxyUtils = {
  PROXY_STATE_ONLINE: "online", // The proxy is online when last tested.
  PROXY_STATE_OFFLINE: "offline", // The proxy is offline when last tested.
  PROXY_STATE_INITIALISING: "init", // The proxy is initialising.
  PROXY_STATE_CONNTEST: "connTest", // The proxy connection is being tested.
  PROXY_STATE_DISABLED: "disabled", // The proxy has been disabled.
  CONNECTION_REFUSED: "NS_ERROR_PROXY_CONNECTION_REFUSED", // The connection to the proxy has been refused.
  TEST_HTTP_REQUEST: "http://example.com/", // Test URL to verify the proxy is online.
  TEST_HTTP_ALT: "https://example.com/", // Alternate test URL.
  CONNECTION_TIMEOUT: 5000, // 5s
};
