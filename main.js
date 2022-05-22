export const loadComponent = async (options) => {
  let template = await (await fetch(options.template)).text();

  customElements.define(
    options.name,
    class extends HTMLElement {
      component;

      constructor() {
        super();
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
              link.href = i;
              this.shadowRoot.appendChild(link);
            }
          })();

        import(options.component).then(async (componentImport) => {
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
        });
      }

      attributeChangeCallback(name, oldValue, newValue) {
        if (this.component && this.component.attributeChangeCallback)
          this.component.attributeChangeCallback(name, oldValue, newValue);
      }
    }
  );
};

export const loadPack = async (packUrl, options) => {
  let pack = await (await fetch(packUrl)).json();
  applyPack({ ...options, ...{ pack } });
};

export const applyPack = async (options) => {
  let components = options.pack.components;
  for (let i of Object.keys(components)) {
    let component = components[i];
    await loadComponent({ ...{ options }, ...component });
  }
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
};
