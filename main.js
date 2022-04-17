export const createComponent = async (options) => {
  options.libs.parse = new options.libs.Parser().parse;
};
