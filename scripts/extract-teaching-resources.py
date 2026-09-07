"""Extract text for local editorial review; never publish the supplied source files."""
import argparse
import json
from pathlib import Path
import re
import zipfile
import xml.etree.ElementTree as ET

def office_text(data, kind):
    import io
    with zipfile.ZipFile(io.BytesIO(data)) as source:
        if kind == '.pptx':
            names = sorted((n for n in source.namelist() if re.fullmatch(r'ppt/slides/slide\d+\.xml', n)),
                           key=lambda n: int(re.search(r'slide(\d+)', n).group(1)))
        else:
            names = ['word/document.xml']
        sections = []
        for name in names:
            root = ET.fromstring(source.read(name))
            paragraphs = [' '.join(n.text or '' for n in p.iter() if n.tag.endswith('}t'))
                          for p in root.iter() if p.tag.endswith('}p')]
            sections.append(name + '\n' + '\n'.join(p for p in paragraphs if p.strip()))
        return '\n\n'.join(sections)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('archive', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    manifest = []
    with zipfile.ZipFile(args.archive) as archive:
        for index, entry in enumerate(archive.infolist()):
            suffix = Path(entry.filename).suffix.lower()
            if suffix not in {'.pptx', '.docx', '.pdf'} or '__MACOSX' in entry.filename:
                continue
            record = {'source': entry.filename, 'bytes': entry.file_size}
            try:
                data = archive.read(entry)
                if suffix == '.pdf':
                    import io
                    from pypdf import PdfReader
                    text = '\n\n'.join(f'Page {i + 1}\n{page.extract_text() or ""}'
                                       for i, page in enumerate(PdfReader(io.BytesIO(data)).pages))
                else:
                    text = office_text(data, suffix)
                filename = f'{index:03d}-{re.sub(r"[^a-zA-Z0-9.-]", "_", Path(entry.filename).stem)}.txt'
                (args.output / filename).write_text(text, encoding='utf-8')
                record.update(text_file=filename, characters=len(text))
            except Exception as error:
                record['error'] = str(error)
            manifest.append(record)
    (args.output / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    print(json.dumps({'files': len(manifest), 'errors': [r for r in manifest if 'error' in r]}))

if __name__ == '__main__':
    main()
