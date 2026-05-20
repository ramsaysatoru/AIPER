async function test() {
  try {
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'anil@acropolis.in', password: 'anil123' })
    });
    const loginData = await loginRes.json();
    console.log('Login Response:', loginData);
    const token = loginData.token;
    
    if(!token) return console.log('Login failed');

    const bpRes = await fetch('http://localhost:5000/api/tests/blueprints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ 
        name: 'Automated Soil Test',
        department: 'Micro',
        parameters: [{ name: 'pH', referenceRange: '6.5-7.5', unit: 'pH' }]
      })
    });
    const bpData = await bpRes.json();
    console.log('Blueprint created status:', bpRes.status);
    console.log('Blueprint data:', bpData);
  } catch(err) {
    console.log('Fetch error:', err);
  }
}
test();
