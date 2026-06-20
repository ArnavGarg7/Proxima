"""
Storage Service.

Provides an abstraction for file persistence. Initially handles local
storage, with future capabilities for S3 compatibility.
"""

import os
import aiofiles
import uuid
from typing import BinaryIO

class StorageService:
    def __init__(self, base_storage_path: str = "./storage"):
        """
        Initialize the StorageService.
        
        Args:
            base_storage_path (str): The root directory for local file persistence.
        """
        self.base_storage_path = base_storage_path
        if not os.path.exists(self.base_storage_path):
            os.makedirs(self.base_storage_path)

    def generate_storage_uri(self, file_id: str, original_filename: str) -> str:
        """
        Generates a storage URI/path for a file.
        """
        ext = os.path.splitext(original_filename)[1]
        return os.path.join(self.base_storage_path, f"{file_id}{ext}")

    async def save_file(self, file_id: str, file_stream: BinaryIO, original_filename: str) -> str:
        """
        Saves a file stream to the storage backend.
        
        Args:
            file_id (str): Unique identifier for the file (e.g. UUID).
            file_stream (BinaryIO): The binary stream of the file to save.
            original_filename (str): The original name of the file.
            
        Returns:
            str: The URI or relative path where the file is stored.
        """
        file_path = self.generate_storage_uri(file_id, original_filename)
        
        # Reset stream if possible
        try:
            file_stream.seek(0)
        except Exception:
            pass

        async with aiofiles.open(file_path, 'wb') as f:
            while chunk := file_stream.read(1024 * 1024): # read 1MB chunks
                await f.write(chunk)
                
        return file_path

    async def get_file(self, file_path_or_uri: str) -> BinaryIO:
        """
        Retrieves a file stream from the storage backend.
        
        Args:
            file_path_or_uri (str): The path or URI returned by save_file.
            
        Returns:
            BinaryIO: A readable stream of the file contents.
        """
        if not os.path.exists(file_path_or_uri):
            raise FileNotFoundError(f"File not found: {file_path_or_uri}")
        return open(file_path_or_uri, 'rb')

    async def delete_file(self, file_path_or_uri: str) -> bool:
        """
        Deletes a file from the storage backend.
        
        Args:
            file_path_or_uri (str): The path or URI of the file to delete.
            
        Returns:
            bool: True if deletion was successful, False otherwise.
        """
        if os.path.exists(file_path_or_uri):
            os.remove(file_path_or_uri)
            return True
        return False
