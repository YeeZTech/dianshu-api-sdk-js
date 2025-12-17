const { DSAPIContext, DSAPIClient } = require('../src');

async function runDoGet() {
  const appCode = process.env.DS_APP_CODE || '9c499056245d4915b77b8500e7d1b805';
  const baseUrl = process.env.DS_BASE_URL || 'https://test-data-api.dianshudata.com';
  const apiId = process.env.DS_API_ID || '6uzWxqDdskvyVc4dKY7C3DNv9a6y2z1qqyvnmjMW4581';

  const ctx = new DSAPIContext(appCode, baseUrl);
  const client = new DSAPIClient(apiId, ctx);

  const dto = { queryParams: [ { paramName: 'q', paramValue: 'test' } ] };
  try {
    const result = await client.doGet(dto);
    console.log('doGet result:', result);
  } catch (e) {
    console.error('doGet error:', e && e.message ? e.message : e);
    process.exit(2);
  }
}

runDoGet();
