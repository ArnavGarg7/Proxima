from proxima.services.parsers.base_parser import DocumentParser

class PdfParser(DocumentParser):
    def extract_text(self, file_path: str) -> str:
        import fitz
        text_blocks = []
        with fitz.open(file_path) as doc:
            for page in doc:
                text_blocks.append(page.get_text())
        
        raw_text = "\n\n".join([b.strip() for b in text_blocks if b.strip()])
        return self.normalize_text(raw_text)
