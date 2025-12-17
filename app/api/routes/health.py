from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

router = APIRouter(tags=["health"])

@router.get("/health")
async def health():
    """Простая проверка здоровья API"""
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"ok": True}
    )
