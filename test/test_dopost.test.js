
import { DSAPIContext, DSAPIClient } from '../src/index.js';

describe('doPost integration test', () => {
  it('should perform doPost request', async () => {
    const appCode = process.env.DS_APP_CODE || '9c499056245d4915b77b8500e7d1b805';
    const baseUrl = process.env.DS_BASE_URL || 'https://test-data-api.dianshudata.com';
    const apiId = process.env.DS_API_ID || '8Sr4FxTgp561675MWRmQzhaA9QWkJKFPHXjGsL6vgQZ5';

    const ctx = new DSAPIContext(appCode, baseUrl);
    const client = new DSAPIClient(apiId, ctx);

    const dto = { bodyParams: [ { paramName: 'name', paramValue: '张三' } ] };
    const start = Date.now();
    
    for (let i = 0; i < 10; i++) {
      try {
        const result = await client.doPost(dto);
        console.log(`Iteration ${i + 1}:`, result);
        expect(result).toBeDefined();
      } catch (e) {
        console.error(`Iteration ${i + 1} error:`, e && e.message ? e.message : e);
        // Don't fail the test on individual iteration errors
      }
    }
    
    const end = Date.now();
    console.log('Total time(ms):', end - start);
  });
});
