import fs from 'fs';
import axios from 'axios';

async function uploadDatabase() {
  try {
    const projectId = 'cwe1ghjjiz';
    const apiKey = '19IsDopsrFMDbpY6g0AwlaVRd4misiQ46IgY9XvwJwQ';
    const databaseName = 'pokemon_data';
    const filePath = './data.sqlite';

    const apiEndpoint = `https://cwe1ghjjiz.sqlite.cloud:8090/v2/weblite/${databaseName}.sqlite`;

    const fileStream = fs.createReadStream(filePath);

    const response = await axios.post(apiEndpoint, fileStream, {
      headers: {
        'Authorization': `Bearer sqlitecloud://cwe1ghjjiz.sqlite.cloud:8860?apikey=${apiKey}`,
        'Content-Type': 'application/octet-stream',
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 3600000, // 1 hour timeout
    });

    console.log('Database uploaded successfully!');
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error uploading database:', error.response ? error.response.data : error.message);
  }
}

uploadDatabase();


