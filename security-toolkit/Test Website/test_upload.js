const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

async function testUpload() {
  const filePath = path.join(__dirname, 'virus_sample.exe');
  if (!fs.existsSync(filePath)) {
    // create dummy virus file if not exists
    fs.writeFileSync(filePath, 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*');
  }

  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));

  const headers = form.getHeaders();
  headers['Content-Length'] = await new Promise(resolve => form.getLength((err, len) => resolve(len)));

  try {
    const response = await fetch('http://127.0.0.1:3000/api/upload', {
      method: 'POST',
      body: form,
      headers: headers,
    });

    const data = await response.text();
    console.log('Status code:', response.status);
    console.log('Response body:', data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testUpload();
