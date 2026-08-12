import urllib.request
import json
url = 'http://localhost:8080/api/auth/login'
data = json.dumps({"username":"jefe@vivero.com","password":"jefe123"}).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req) as response:
        resp_data = response.read()
        print("LOGIN SUCCESS:")
        print(resp_data.decode('utf-8'))
        token = json.loads(resp_data.decode('utf-8')).get('token')
        print("TESTING GET /api/usuarios")
        req2 = urllib.request.Request('http://localhost:8080/api/usuarios', headers={'Authorization': 'Bearer ' + token, 'X-Unidad-Negocio': '1'})
        with urllib.request.urlopen(req2) as resp2:
            print("GET /api/usuarios SUCCESS")
            print(resp2.read().decode('utf-8')[:100] + "...")
except urllib.error.HTTPError as e:
    print("HTTP ERROR:", e.code, e.reason)
    print(e.read().decode('utf-8'))
except Exception as e:
    print("ERROR:", e)
