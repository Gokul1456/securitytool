const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

async function testClean() {
  const filePath = path.join(__dirname, '..', 'virus_sample.exe');
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*');
  
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  
  const headers = form.getHeaders();
  try {
    const res = await axios.post('http://127.0.0.1:3000/api/upload', form, { headers });
    console.log('Success:', res.data);
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}
testClean();
