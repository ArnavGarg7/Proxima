"""
Chunking Service.

Responsible for taking raw text documents and splitting them into
manageable chunks suitable for retrieval and prompt assembly.
"""

from typing import List

class ChunkingService:
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 100):
        """
        Initialize the ChunkingService.
        
        Args:
            chunk_size (int): The target character limit per chunk.
            chunk_overlap (int): The amount of character overlap between consecutive chunks.
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def chunk_text(self, text: str) -> List[str]:
        """
        Splits a single body of text into multiple chunks.
        
        Args:
            text (str): The raw extracted text from a document.
            
        Returns:
            List[str]: A list of text chunks.
        """
        if not text:
            return []

        chunks = self.chunk_text_with_metadata(text)
        return [c["content"] for c in chunks]

    def chunk_text_with_metadata(self, text: str) -> List[dict]:
        """
        Splits a single body of text into multiple chunks, tracking page numbers.
        
        Args:
            text (str): The raw extracted text from a document.
            
        Returns:
            List[dict]: A list of dictionaries containing 'content' and 'page_number'.
        """
        if not text:
            return []

        chunks = []
        start = 0
        text_length = len(text)

        while start < text_length:
            end = start + self.chunk_size
            
            # If we're not at the end of the text, try to find a nice breaking point
            # like a space or newline so we don't cut words in half.
            if end < text_length:
                # Look backwards for a space or newline within the last 100 characters of the chunk
                search_limit = max(start, end - 100)
                last_space = text.rfind(' ', search_limit, end)
                last_newline = text.rfind('\n', search_limit, end)
                
                break_point = max(last_space, last_newline)
                
                if break_point != -1:
                    end = break_point + 1 # Include the space/newline
            
            chunk_content = text[start:end]
            
            # Page number is count of \f characters up to the start of this chunk + 1
            page_number = text.count('\f', 0, start) + 1
            
            # Clean content by removing \f page breaks
            clean_content = chunk_content.replace('\f', '\n').strip()
            
            if clean_content:
                chunks.append({
                    "content": clean_content,
                    "page_number": page_number
                })
                
            start = end - self.chunk_overlap

            # Prevent infinite loops if overlap is bigger than chunk advance
            if start <= 0 or start >= end:
                start = end

        return chunks
