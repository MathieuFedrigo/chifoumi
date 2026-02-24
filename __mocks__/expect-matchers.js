const { equals } = require("@jest/expect-utils");

const matchers = {
  customTesters: [],
  toEqual(received, expected) {
    const pass = equals(received, expected, this.customTesters);
    return {
      pass,
      message: pass
        ? () =>
            `Expected: not ${JSON.stringify(expected)}\nReceived: ${JSON.stringify(received)}`
        : () =>
            `Expected: ${JSON.stringify(expected)}\nReceived: ${JSON.stringify(received)}`,
    };
  },
};

module.exports = matchers;
module.exports.default = matchers;
