import { ProxyUtils } from "./utils.js";

export class TestConnection {
  constructor(controller) {
    this.controller = controller;
  }

  test() {
    console.log("Running conntest.");
    // Add a proxy listener on our test URL only
    const proxyListener = this.controller.handleEvent("getRequestCallback");
    browser.proxy.onRequest.addListener(proxyListener, {
      urls: [ProxyUtils.TEST_HTTP_REQUEST],
    });

    // Send our test request
    let promise = new Promise(resolve => {
      // Throw after timeout so we don't get stuck here forever.
      setTimeout(_ => {
        console.log("Connection timeout.");
        resolve(false);
      }, ProxyUtils.CONNECTION_TIMEOUT);

      fetch(ProxyUtils.TEST_HTTP_REQUEST, {
        cache: "no-store",
        credentials: "omit",
        redirect: "manual",
      })
        .then(() => {
          resolve(true);
        })
        .catch(ex => {
          if (ex instanceof TypeError) {
            console.log("Error establishing connection.");
            resolve(false);
          }
        })
        .finally(() => {
          browser.proxy.onRequest.removeListener(proxyListener);
        });
    });

    return promise;
  }

  async verify() {
    // Run tests of both proxy and non proxy traffic to verify that the
    // proxy is actually at fault.
    console.log("Verifying if proxy is at fault.");
    const proxy = await this.test();
    let standard;
    try {
      standard = await fetch(ProxyUtils.TEST_HTTP_ALT, {
        cache: "no-store",
        credentials: "omit",
        redirect: "manual",
      });
    } catch (ex) {
      if (ex instanceof TypeError) {
        console.log("Error establishing connection.");
      }
    }

    const ok = proxy && standard && standard.ok;
    const notOk = !proxy && !standard && !standard.ok;

    // Both connections fine or both failed, either way
    // proxy is not at fault.
    if (ok || notOk) {
      return true;
    }

    console.log("Proxy is down.");
    return false;
  }
}
