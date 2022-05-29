export const loadComponent = async (options) => {
  !options.urlPrefix && (options.urlPrefix = "");
  let template = await (
    await fetch(options.urlPrefix + options.template)
  ).text();

  customElements.define(
    options.name,
    class extends HTMLElement {
      component;

      constructor() {
        super();
        let loadQueueResolve;
        window.uiBuilder.loadQueue.push(
          new Promise((r) => (loadQueueResolve = r))
        );
        let templateElement = document.createElement("template");
        templateElement.innerHTML = template;

        const shadow = this.attachShadow({ mode: "open" });
        shadow.appendChild(templateElement.content.cloneNode(true));

        if (options.styles)
          (async () => {
            for (let i of options.styles) {
              let link = document.createElement("link");
              link.type = "text/css";
              link.rel = "stylesheet";
              link.href = options.urlPrefix + i;
              this.shadowRoot.appendChild(link);
            }
          })();

        import(options.urlPrefix + options.component).then(
          async (componentImport) => {
            this.component = await new componentImport.Component({
              shadowDom: this.shadowRoot,
              component: this,
              document,
            });

            this.ready = true;
            let event = new Event("ready", {
              bubbles: false,
              cancelable: false,
            });
            this.dispatchEvent(event);
            loadQueueResolve();
          }
        );

        let observer = new MutationObserver(
          this.attributeChangedCallback.bind(this)
        );
        observer.observe(this, { attributeOldValue: true });
      }

      attributeChangedCallback(mutations) {
        for (let mutation of mutations) {
          if (mutation.type == "attributes") {
            this.component?.attributeChangedCallback?.(
              mutation.attributeName,
              mutation.oldValue,
              mutation.target.getAttribute(mutation.attributeName)
            );
          }
        }
      }
    }
  );
};

export const loadPack = async (packUrl, options) => {
  let pack = await (await fetch(packUrl)).json();
  await applyPack({ ...options, ...{ pack } });
};

export const applyPack = async (options) => {
  let components = options.pack.components;
  let componentsAwait = [];
  for (let i of Object.keys(components)) {
    componentsAwait.push(window.customElements.whenDefined(components[i].name));
    let component = components[i];
    await loadComponent({ ...options, ...component });
  }
  await Promise.all(componentsAwait);
  await Promise.all(uiBuilder.loadQueue);
};

export const ready = async (elem) => {
  if (elem.ready) return;
  await new Promise((r) => elem.addEventListener("ready", r));
};

window.uiBuilder = {
  ready,
  applyPack,
  loadPack,
  loadComponent,
  loadQueue: [],
};
