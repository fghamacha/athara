from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database import create_pool, close_pool
from routers import persons, marriages, relationships, attachments, tree


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_pool()
    yield
    await close_pool()


app = FastAPI(
    title="Athara API",
    description="API pour l'arbre généalogique de la famille",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(persons.router,       prefix="/api/persons",       tags=["persons"])
app.include_router(marriages.router,     prefix="/api/marriages",     tags=["marriages"])
app.include_router(relationships.router, prefix="/api/relationships", tags=["relationships"])
app.include_router(attachments.router,   prefix="/api/attachments",   tags=["attachments"])
app.include_router(tree.router,          prefix="/api/tree",          tags=["tree"])


@app.get("/api/health", tags=["health"])
async def health():
    return {"status": "ok", "project": "athara"}
