from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

app = FastAPI(
    title="RelocationHub API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:3000",
        "https://relocation-hub.vercel.app",
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

@app.get("/")
def root():
    return {"message": "RelocationHub API is running"}