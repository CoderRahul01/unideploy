from .model_router import router, TaskType

SCREENSHOT_TO_SPEC = """
Analyze this UI screenshot or wireframe. Extract as a technical spec:
1. LAYOUT: Page structure (sidebar, header, grid, etc.)
2. COMPONENTS: Every UI element visible (buttons, forms, tables, modals)
3. DATA: What data is displayed or collected?
4. INTERACTIONS: What actions can the user take?
5. STACK: Recommended tech stack for implementation
Be specific. Use developer terminology.
"""

ERROR_READ = """
Read this error screenshot. Extract:
1. ERROR TYPE: Exact error name/code
2. MESSAGE: Full error message text
3. LOCATION: File path and line number if visible
4. CONTEXT: Surrounding code or state visible
Output only the extracted information.
"""

class VisionAgent:
    async def screenshot_to_spec(self, image_path: str) -> str:
        return await router.route(
            task=TaskType.VISION,
            messages=[{"role": "user", "content": SCREENSHOT_TO_SPEC}],
            image_path=image_path,
        )

    async def error_screenshot_to_text(self, image_path: str) -> str:
        return await router.route(
            task=TaskType.VISION,
            messages=[{"role": "user", "content": ERROR_READ}],
            image_path=image_path,
        )

vision_agent = VisionAgent()
