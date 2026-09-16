"""Main FastAPI application."""
import logging
import traceback

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import get_settings
from app.api.v1.api import api_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Everything Digital. One Platform.",
    debug=settings.debug,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Temporary debug exception handler — returns traceback in 500 responses
@app.exception_handler(Exception)
async def debug_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exception(type(exc), exc, exc.__traceback__)
    logger.error("Unhandled exception: %s", "".join(tb))
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": type(exc).__name__, "traceback": "".join(tb)[-2000:]},
    )

# Static files for uploads (downloadable via signed/guarded routes in production)
import os
os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"message": settings.app_name, "docs": "/docs", "health": "/api/v1/health"}
