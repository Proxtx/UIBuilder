export const loadComponent = async (options) => {
  let template = await (await fetch(options.template)).text();

  customElements.define(
    options.name,
    class extends HTMLElement {
      constructor() {
        super();
        let templateElement = document.createElement("template");
        templateElement.innerHTML = template;

        const shadow = this.attachShadow({ mode: "open" });
        shadow.appendChild(templateElement.content.cloneNode(true));

        if (options.styles)
          (async () => {
            for (let i of options.styles) {
              let style = document.createElement("style");
              style.textContent = await (await fetch(i)).text();
              this.shadowRoot.appendChild(style);
            }
          })();

        import(options.component).then((component) => {
          component.handler.bind(this)({
            shadowDom: this.shadowRoot,
            component: this,
            document,
          });

          this.component = component;
        });
      }
    }
  );
};

export const loadPack = async (options) => {
  let pack = await (await fetch(options.pack)).json();
  applyPack({ ...options, ...{ pack } });
};

export const applyPack = async (options) => {
  let components = options.pack.components;
  for (let i of Object.keys(components)) {
    let component = components[i];
    await loadComponent({ ...{ pack }, ...component });
  }
};
