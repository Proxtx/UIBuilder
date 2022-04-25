export const handler = function ({ shadowDom }) {
  this.hasAttribute("name") &&
    (shadowDom.getElementById("name").innerText = this.getAttribute("name"));
};

export const test = () => {
  alert("wow");
};
