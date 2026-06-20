"""
Upload Security Service.

Responsible for validating file uploads before they are persisted or processed.
Capabilities include MIME validation, magic-byte inspection, file size constraints,
and malware scan hooking.
"""

import os
import magic
from fastapi import UploadFile, HTTPException, status
from typing import IO

# Common allowed documents
ALLOWED_MIMES = {
    "text/plain": [b"", b"\xef\xbb\xbf"], # text files don't always have reliable magic bytes
    "application/pdf": [b"%PDF-"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [b"PK\x03\x04"],
    "application/msword": [b"\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1"],
}

ALLOWED_EXTENSIONS = {".txt", ".pdf", ".docx", ".doc"}

class UploadSecurityService:
    def __init__(self, max_file_size_bytes: int = 50 * 1024 * 1024):
        """
        Initialize the UploadSecurityService.
        
        Args:
            max_file_size_bytes (int): Maximum allowed file size in bytes. Defaults to 50MB.
        """
        self.max_file_size_bytes = max_file_size_bytes

    async def validate_upload(self, file: UploadFile) -> bool:
        """
        Validates the uploaded file by checking its size, MIME type, and magic bytes.
        """
        # 1. Extension Validation
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Unsupported file extension: {ext}"
            )

        # 2. Size Validation
        file.file.seek(0, 2)
        size = file.file.tell()
        file.file.seek(0)
        
        if size > self.max_file_size_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds maximum size of {self.max_file_size_bytes} bytes."
            )

        if size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty file uploaded."
            )

        # Read beginning of file for magic bytes
        header = file.file.read(2048)
        file.file.seek(0)

        # 3. MIME Validation
        mime_type = magic.from_buffer(header, mime=True)
        # Note: Sometimes magic returns text/plain for pdf if very small or weird, but usually accurate.
        # For security, we validate against allowed MIMEs
        if mime_type not in ALLOWED_MIMES and mime_type != file.content_type:
            # Fallback if python-magic has a slight mismatch but extension & manual magic check matches
            # Let's check if the content_type from the request is allowed.
            if file.content_type not in ALLOWED_MIMES:
                raise HTTPException(
                    status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                    detail=f"Unsupported MIME type: {file.content_type or mime_type}"
                )

        target_mime = mime_type if mime_type in ALLOWED_MIMES else file.content_type

        # 4. Magic Bytes Validation
        if not self._check_magic_bytes(header, target_mime):
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="File content does not match its stated type (magic byte mismatch)."
            )

        # 5. Archive Inspection Hook
        if target_mime in ["application/zip", "application/x-tar"]:
            self._inspect_archive(header)

        # 6. Malware Scan Hook
        self._scan_malware(header)

        return True

    def _check_magic_bytes(self, header: bytes, mime_type: str) -> bool:
        """
        Validates the file signature (magic bytes) against an allowed list.
        """
        allowed_signatures = ALLOWED_MIMES.get(mime_type, [])
        if not allowed_signatures:
            return False
            
        # Text files might not have magic bytes, or just BOM
        if mime_type == "text/plain":
            return True

        for sig in allowed_signatures:
            if header.startswith(sig):
                return True
        return False

    def _inspect_archive(self, header: bytes) -> None:
        """
        Hook for inspecting archives (zip bombs, excessive depth).
        Minimal implementation for now.
        """
        pass

    def _scan_malware(self, header: bytes) -> None:
        """
        Hook for external malware scanning APIs (e.g. ClamAV).
        Stubbed for now.
        """
        pass
