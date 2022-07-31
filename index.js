const SqsMessage = require('./entities/SqsMessage');
const TestResult = require('./entities/TestResult');
const {
  getTestByName,
  getRegionByAWSName,
  insertTestRunData,
  getAssertionsByTestId,
  insertAssertionResultData,
} = require('./lib/db_query');
require('dotenv').config();
const { failedTestScreener } = require('./lib/failedTestScreener');
const { invokeTestAlerts } = require('./lib/aws/lambdaActions');

exports.handler = async (event) => {
  const sqsMessage = new SqsMessage(event);
  console.log('sqsMessage.message -->', sqsMessage.message);
  const testResult = new TestResult(sqsMessage.message);
  const failedTests = failedTestScreener(sqsMessage.message.results);

  console.log('Failed Assertions Present? ', failedTests);

  if (failedTests) {
    try {
      invokeTestAlerts(sqsMessage.message);
    } catch (e) {
      console.error(`invocation of test-alerts lambda threw an error: ${e.message}. Continuing with DB operation...`);
    }
  }

  // TODO: move to class(es) and optimize to use way fewer database operations
  const regionMetadata = await getRegionByAWSName({ awsRegionName: sqsMessage.awsRegion });
  const testRunsResult = await insertTestRunData({
    testId: testResult.testId,
    success: !failedTests,
    regionId: regionMetadata.id,
    responseStatus: testResult.responseStatus,
    responseTime: testResult.responseTime,
    responseBody: JSON.stringify(testResult.responseBody),
    responseHeaders: JSON.stringify(testResult.responseHeaders),
  });
  const testRunId = testRunsResult.rows[0].id;
  const testAssertions = await getAssertionsByTestId({ testId: testResult.testId });

  testAssertions.forEach((testAssertion) => {
    const assertionResult = testResult.assertionResults[testAssertion.id];
    insertAssertionResultData({
      testRunId,
      assertionId: testAssertion.id,
      actualValue: assertionResult.actualValue,
      success: assertionResult.success,
    });
  });

  return 'success';
};
