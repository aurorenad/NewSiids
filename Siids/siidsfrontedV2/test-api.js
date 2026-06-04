import apiClient from './src/api/client.js';

async function testPost() {
  try {
    const res = await apiClient.post('/reports', {
      caseId: 1,
      title: 'Test',
      subject: 'Test',
      body: 'Test',
      attachments: []
    });
    console.log("Success:", res.status);
  } catch(e) {
    console.error("Error:", e.response?.status || e);
  }
}

testPost();
