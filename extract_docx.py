import zipfile
import re
import sys

path = sys.argv[1]
with zipfile.ZipFile(path) as z:
    xml = z.read('word/document.xml').decode('utf-8')

xml = xml.replace('</w:p>', '\n')
text = re.sub(r'<[^>]+>', '', xml)
text = re.sub(r'\n{2,}', '\n', text)
print(text)
