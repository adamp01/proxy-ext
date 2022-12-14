import { ProxyUtils } from "./utils.js";

export class ProxyStore {
  constructor(controller) {
    this.controller = controller;
    this.modules = new Set();
    this.proxyState = ProxyUtils.PROXY_STATE_INITIALISING;
  }

  shouldProxy() {
    if (this.proxyState === ProxyUtils.PROXY_STATE_ONLINE) {
      return true;
    } else {
      false;
    }
  }

  async getProxyState() {
    if (this.proxyState === ProxyUtils.PROXY_STATE_INITIALISING) {
      const storage = await browser.storage.local.get("proxyState");
      if (storage.proxyState) {
        return storage.proxyState;
      }
    }
    return this.proxyState;
  }

  updateProxyState(proxyState) {
    // Update proxy state in controller and propogate out
    // to registered modules.
    this.proxyState = proxyState;

    browser.storage.local.set({ proxyState });

    // Inform the browserAction that our state has changed.
    this.controller.mm.sendMessage(proxyState);

    // Inform all registered modules that state has changed.
    for (let module of this.modules) {
      module.updateProxyState();
    }
  }

  registerModule(module) {
    this.modules.add(module);
  }
}
