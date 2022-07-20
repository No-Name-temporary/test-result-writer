const { lambdaClient, InvokeCommand } = require('./lambdaClient');

const invokeTestAlerts = (results) => {
  const params = {
    FunctionName: 'test-alerts',
    InvocationType: 'Event',
    Payload: JSON.stringify(results),
  };
  const command = new InvokeCommand(params);
  lambdaClient.send(command);
};

module.exports = {
  invokeTestAlerts,
};
