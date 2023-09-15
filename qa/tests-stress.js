var loadtest = require("loadtest");
var expect = require("chai").expect;

suite("Stress tests", () => {
  test("Homepage should handle 100 request in a second", (done) => {
    var options = {
      url: "http://localhost:3000",
      concurrency: 4,
      maxRequests: 100,
    };
    loadtest.loadTest(options, (err, result) => {
      expect(!err);
      expect(result.totalTimeSeconds < 1);
      done();
    });
  });
});
