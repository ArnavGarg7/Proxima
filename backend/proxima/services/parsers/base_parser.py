from abc import ABC, abstractmethod

class DocumentParser(ABC):
    """
    Abstract base class for document parsers.
    """
    @abstractmethod
    def extract_text(self, file_path: str) -> str:
        """
        Extracts and normalizes text from a document.
        
        Args:
            file_path (str): The path to the file to parse.
            
        Returns:
            str: The extracted and normalized text.
            
        Raises:
            Exception: If extraction fails due to formatting/corruption.
        """
        pass
        
    def normalize_text(self, text: str) -> str:
        import re
        # Collapse 3+ newlines into exactly 2 (to preserve paragraphs)
        text = re.sub(r'\n{3,}', '\n\n', text)
        # Collapse multiple spaces
        text = re.sub(r'[ \t]+', ' ', text)
        # Remove common artifacts like repeated underscores or dashes
        text = re.sub(r'_{4,}', '___', text)
        text = re.sub(r'-{4,}', '---', text)
        return text.strip()
