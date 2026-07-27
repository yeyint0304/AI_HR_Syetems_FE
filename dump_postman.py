import json
with open('/home/office/AI_HR_System_FE/docs/HR_System_BE.postman_collection.json') as f:
    data = json.load(f)

out = open('/home/office/AI_HR_System_FE/AI_HR_Systems_FE/postman_dump.txt', 'w')

def walk(items, path=''):
    for item in items:
        name = item.get('name','')
        if 'item' in item:
            walk(item['item'], path + '/' + name)
        else:
            req = item.get('request', {})
            url = req.get('url', {})
            raw = url.get('raw', '') if isinstance(url, dict) else url
            method = req.get('method','')
            auth = req.get('auth', None)
            out.write(f'{path}/{name} | {method} {raw} | auth={auth}\n')

walk(data['item'])
out.close()
