import axios from 'axios';

async function test() {
  try {
    const res = await axios.post('http://localhost:8080/api/auth/login', {
      username: 'jefe@vivero.com',
      password: 'jefe123'
    });
    const token = res.data.token;
    console.log('Token:', token ? 'OK' : 'FAIL');

    const chequesRes = await axios.get('http://localhost:8080/api/cheques?page=0&size=10', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(JSON.stringify(chequesRes.data, null, 2));
  } catch (e) {
    console.error(e.message);
    if (e.response) console.error(e.response.data);
  }
}
test();
