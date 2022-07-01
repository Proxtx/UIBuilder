export const loadComponent = async (options) => {
  !options.urlPrefix && (options.urlPrefix = "");
  let template = await getFile(
    options.urlPrefix + options.template,
    options.version
  );

  let styles = [];
  for (let i of options.styles)
    styles.push(await getFile(options.urlPrefix + i, options.version));

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
            for (let i in options.styles) {
              let style = document.createElement("style");
              style.innerHTML = styles[i];
              this.shadowRoot.appendChild(style);
            }
          })();

        import(options.urlPrefix + options.component).then(
          async (componentImport) => {
            this.component = await new componentImport.Component({
              shadowDom: this.shadowRoot,
              component: this,
              document,
            });

            this.existingAttributeCallbackEmitter();

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

      existingAttributeCallbackEmitter() {
        for (let attribute of this.attributes)
          this.component?.attributeChangedCallback?.(
            attribute.name,
            null,
            attribute.value
          );
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

  options.version = options.pack.version;

  if (options.customStyleSheets) {
    for (let i of Object.keys(components)) {
      components[i].styles = [
        ...components[i].styles,
        ...options.customStyleSheets,
      ];
    }
  }
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

const loadFile = (url) => {
  let filesRaw = localStorage.getItem("files");
  if (!filesRaw) return { success: false };
  let files = JSON.parse(filesRaw);
  if (!files[url]) {
    return { success: false };
  }
  return { success: true, file: files[url] };
};

const saveFile = (url, data, version) => {
  let filesRaw = localStorage.getItem("files");
  if (!filesRaw) filesRaw = "{}";
  let files = JSON.parse(filesRaw);
  files[url] = {
    data,
    version,
  };
  localStorage.setItem("files", JSON.stringify(files));
};

const getFile = async (url, version) => {
  let cachedFile = loadFile(url);
  if (cachedFile.success && version && version == cachedFile.file.version)
    return cachedFile.file.data;
  let text = await (await fetch(url)).text();
  saveFile(url, text, version);
  return text;
};
