var fortune = require("../lib/fortune.js");
var expect = require("chai").expect;

suite("Fortune cookie test", () => {
  test("getFortune() should return a fortune", () => {
    expect(typeof fortune.getFortune() === "string");
  });
});
