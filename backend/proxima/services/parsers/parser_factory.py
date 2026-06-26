class UnsupportedFormatError(Exception):
    """Raised when a document format is not supported."""
    pass

from proxima.services.parsers.base_parser import DocumentParser
from proxima.services.parsers.text_parser import TextParser
from proxima.services.parsers.docx_parser import DocxParser
from proxima.services.parsers.pdf_parser import PdfParser

class ParserFactory:
    @staticmethod
    def get_parser(extension: str) -> DocumentParser:
        ext = extension.lower()
        if ext in [".txt", ".md", ".markdown"]:
            return TextParser()
        elif ext == ".docx":
            return DocxParser()
        elif ext == ".pdf":
            return PdfParser()
        else:
            raise UnsupportedFormatError(f"Unsupported document format: {extension}")
