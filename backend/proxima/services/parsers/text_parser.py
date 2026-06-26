from proxima.services.parsers.base_parser import DocumentParser

class TextParser(DocumentParser):
    def extract_text(self, file_path: str) -> str:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            return self.normalize_text(f.read())
