from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.api.deps import get_db, get_current_user
from app.schemas.user import UserCreate, UserOut
from app.schemas.auth import LoginIn, TokenOut, UserProfileOut
from app.models.user import User, Role
from app.models.payment import Payment, PaymentStatus as PaymentStatusEnum
from app.models.session_model import Session
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserOut)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    try:
        exists = await db.execute(select(User).where(User.email == payload.email))
        if exists.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Используем роль из payload, если указана, иначе по умолчанию user
        # payload.role уже является строкой из enum, конвертируем в Role enum модели
        if payload.role:
            user_role = Role(payload.role.value if hasattr(payload.role, 'value') else payload.role)
        else:
            user_role = Role.user
        
        user = User(
            email=payload.email,
            password_hash=get_password_hash(payload.password),
            role=user_role
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return UserOut.model_validate(user, from_attributes=True)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        import traceback
        error_detail = f"Error creating user: {str(e)}"
        # Log full traceback for debugging (remove in production)
        print(f"Registration error: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_detail
        )

@router.post("/login", response_model=TokenOut)
async def login(payload: LoginIn, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.email == payload.email))
    user = res.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect credentials")
    token = create_access_token({"sub": user.email, "role": user.role.value}, settings.secret_key, settings.access_token_expire_minutes)
    return TokenOut(access_token=token)

@router.get("/me", response_model=UserProfileOut)
async def get_current_user_profile(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Получить профиль текущего пользователя с балансом"""
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    
    # Рассчитываем баланс: сумма успешных платежей - сумма завершенных сессий
    # Сумма успешных платежей
    payments_sum = await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0))
        .where(Payment.user_id == user.id)
        .where(Payment.status == PaymentStatusEnum.succeeded)
    )
    total_payments = float(payments_sum.scalar() or 0)
    
    # Сумма завершенных сессий
    sessions_sum = await db.execute(
        select(func.coalesce(func.sum(Session.amount), 0))
        .where(Session.user_id == user.id)
        .where(Session.ended_at.isnot(None))
    )
    total_sessions = float(sessions_sum.scalar() or 0)
    
    balance = total_payments - total_sessions
    
    return UserProfileOut(
        id=user.id,
        email=user.email,
        role=user.role,
        balance=balance
    )
