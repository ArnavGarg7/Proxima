from proxima.services.parsers.base_parser import DocumentParser

class DocxParser(DocumentParser):
    def extract_text(self, file_path: str) -> str:
        import docx
        doc_obj = docx.Document(file_path)
        text = "\n\n".join([para.text for para in doc_obj.paragraphs if para.text.strip()])
        return self.normalize_text(text)
