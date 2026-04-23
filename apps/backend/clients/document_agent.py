import pdfplumber
from .model_router import router, TaskType

class DocumentAgent:
    def _extract_text(self, pdf_path: str) -> str:
        chunks = []
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    chunks.append(text)
        text = "\n\n".join(chunks)
        # NIM context window safety: truncate if too long, though qwen/llama usually handle 32k+
        return text[:15000]

    async def doc_to_requirements(self, pdf_path: str) -> str:
        raw_text = self._extract_text(pdf_path)
        
        messages = [
            {
                "role": "system",
                "content": (
                    "Extract a numbered list of technical requirements from this document. "
                    "Each requirement must be specific and implementable. "
                    "Include: API endpoints, data models, UI components, auth, and integrations."
                ),
            },
            {"role": "user", "content": f"Document content:\n\n{raw_text}"},
        ]
        return await router.route(task=TaskType.REASONING, messages=messages)

document_agent = DocumentAgent()
