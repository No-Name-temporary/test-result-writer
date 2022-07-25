class TestResult {
  constructor({
    title, responseStatus, responseBody, responseHeaders, results,
  }) {
    this.testName = title;
    this.responseStatus = responseStatus;
    this.responseTime = responseHeaders['request-duration'];
    this.responseBody = responseBody;
    this.responseHeaders = responseHeaders;
    this.addKeyToAssertionResults(results);
  }

  // for constant time lookup of assertion types
  addKeyToAssertionResults(results) {
    if (results) {
      const assertionResults = {};
      results.forEach((result) => {
        assertionResults[result.assertionType] = result;
      });
      this.assertionResults = assertionResults;
    }
  }
}

module.exports = TestResult;
