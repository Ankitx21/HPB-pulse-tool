from pypdf import PdfReader, PdfWriter
from pypdf.generic import ContentStream
import pypdfium2 as pdfium
from pathlib import Path
Path('tmp/pdfs').mkdir(parents=True, exist_ok=True)
r=PdfReader('ASSURE_HPB Pulse - Downlodable Report Template.pdf')
w=PdfWriter(); w.add_page(r.pages[0]); p=w.pages[0]
c=ContentStream(p.get_contents(),w)
# These text blocks are the date, placeholders and example result interpretations.
remove={1,2,4,6,10,12,14,16,17,18,19,21,22,24,25,27,28,30}
idx=-1
ops=[]
for args,op in c.operations:
    if op==b'BT': idx+=1
    if idx in remove and op in (b'Tj',b'TJ',b"'",b'"'): continue
    ops.append((args,op))
c.operations=ops
p.replace_contents(c)

with open('tmp/pdfs/blank-scorecard.pdf','wb') as f: w.write(f)
d=pdfium.PdfDocument('tmp/pdfs/blank-scorecard.pdf')
im=d[0].render(scale=3).to_pil().convert('RGB')
from PIL import ImageDraw
paint=ImageDraw.Draw(im)
# The supplied PDF also contains a flattened artwork image; clear its sample values.
for x,y,x2,y2 in [(33,142,575,164),(43,207,199,232),(218,207,380,232),(394,207,565,232),(42,422,205,465),(217,422,383,465),(394,422,565,465),(42,522,161,574),(173,522,294,574),(306,522,428,574),(439,522,562,574)]:
    paint.rectangle((x*3,y*3,x2*3,y2*3), fill='white')
im.save('buildinge_health_tool_asset/report-background.jpg',quality=95,subsampling=0)
im.resize((893,1263)).save('tmp/pdfs/blank-preview.png')

