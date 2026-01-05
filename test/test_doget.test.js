
import { DSAPIContext, DSAPIClient } from '../src/index.js';

describe('doGet integration test', () => {
  it('should perform doGet request', async () => {
    const appCode = process.env.DS_APP_CODE || '9c499056245d4915b77b8500e7d1b805';
    const baseUrl = process.env.DS_BASE_URL || 'https://test-data-api.dianshudata.com';
    const apiId = process.env.DS_API_ID || '8Sr4FxTgp561675MWRmQzhaA9QWkJKFPHXjGsL6vgQZ5';

    const ctx = new DSAPIContext(appCode, baseUrl);
    const client = new DSAPIClient(apiId, ctx);

    const dto = { queryParams: [ { paramName: 'filters[is_valid]', paramValue: '1' } ] };
    
    try {
      const result = await client.doGet(dto);
      console.log('doGet result:', result);
      console.log('doGet typeof/result JSON:', typeof result, JSON.stringify(result));
      expect(result).toBeDefined();
    } catch (e) {
      console.error('doGet error:', e && e.message ? e.message : e);
      throw e;
    }
  });
});
