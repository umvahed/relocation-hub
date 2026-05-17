import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
from app.config import settings
from app.routes.health import router as health_router
from app.routes.auth import router as auth_router
from app.routes.checklist import router as checklist_router
from app.routes.notifications import router as notifications_router
from app.routes.reminders import router as reminders_router
from app.routes.calendar import router as calendar_router
from app.routes.documents import router as documents_router
from app.routes.validation import router as validation_router
from app.routes.risk_score import router as risk_score_router
from app.routes.ind_monitor import router as ind_monitor_router
from app.routes.docpack import router as docpack_router
from app.routes.allowance import router as allowance_router
from app.routes.share import router as share_router
from app.routes.billing import router as billing_router

import os

_is_dev = os.getenv("ENVIRONMENT", "production").lower() in ("development", "dev", "local")

app = FastAPI(
    title="Valryn API",
    version="1.0.0",
    docs_url="/docs" if _is_dev else None,
    redoc_url="/redoc" if _is_dev else None,
    openapi_url="/openapi.json" if _is_dev else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:3000",
        "https://valryn.nl",
        "https://www.valryn.nl",
        "https://relocation-hub.vercel.app",  # keep during DNS transition
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(checklist_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(reminders_router, prefix="/api")
app.include_router(calendar_router, prefix="/api")
app.include_router(documents_router, prefix="/api")
app.include_router(validation_router, prefix="/api")
app.include_router(risk_score_router, prefix="/api")
app.include_router(ind_monitor_router, prefix="/api")
app.include_router(docpack_router, prefix="/api")
app.include_router(allowance_router, prefix="/api")
app.include_router(share_router, prefix="/api")
app.include_router(billing_router, prefix="/api")

@app.get("/")
def root():
    return {"message": "Valryn API is running"}