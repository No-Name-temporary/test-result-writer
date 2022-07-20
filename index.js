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

  console.log('Failed Assertions Present? ', failedTestScreener(sqsMessage.message.results));
  if (failedTestScreener(sqsMessage.message.results)) {
    try {
      invokeTestAlerts(sqsMessage.message);
    } catch (e) {
      console.error(`invocation of test-alerts lambda threw an error: ${e.message}. Continuing with DB operation...`);
    }
  }

  // TODO: move to class(es) and optimize to use way fewer database operations
  const testMetadata = await getTestByName({ testName: testResult.testName });
  const regionMetadata = await getRegionByAWSName({ awsRegionName: sqsMessage.awsRegion });
  const testRunsResult = await insertTestRunData({
    testId: testMetadata.id,
    regionId: regionMetadata.id,
  });
  const testRunId = testRunsResult.rows[0].id;
  const testAssertions = await getAssertionsByTestId({ testId: testMetadata.id });
  testAssertions.forEach((testAssertion) => {
    const assertionResult = testResult.assertionResults[testAssertion.type];
    insertAssertionResultData({
      testRunId,
      assertionId: testAssertion.id,
      actualValue: assertionResult.actualValue,
      pass: assertionResult.success,
    });
  });

  return 'success';
};
