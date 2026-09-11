"""Referral endpoints: program config, customer codes, signups, rewards.

Flow (spec §31):
  - A customer receives a referral code (DP-PRINCE-XXXXXX) via GET /referrals/my.
  - A newly-registered customer applies the referrer's code (POST /referrals/apply).
  - When the referred customer's order reaches PAID or COMPLETED, the referrer
    earns a configurable reward (percentage or fixed, min-order / max / eligible
    services). Rewards are credited to the referrer's wallet.
  - Admin configures the programme via /referrals/program and reviews rewards.
"""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user, require_admin
from app.models.user import User
from app.models.order import Order
from app.models.referral import (
    ReferralProgram, ReferralCode, ReferralSignup, ReferralReward,
)
from app.schemas.referral import (
    ReferralProgramUpdate, ReferralProgramOut, ReferralApply,
    ReferralRewardOut, ReferralSignupOut, MyReferralOut,
)
from app.services.referral import get_or_create_code, maybe_reward_referral
from app.services.notifications import create_notification
from app.services.audit import log_action

router = APIRouter(prefix="/referrals", tags=["referrals"])

STAFF_ROLES = ("super_admin", "business_owner", "admin", "manager", "staff")


def _is_staff(user: User) -> bool:
    return user.role in STAFF_ROLES


async def _program(db: AsyncSession, create: bool = False) -> Optional[ReferralProgram]:
    prog = (await db.execute(select(ReferralProgram).order_by(ReferralProgram.created_at.desc()))).scalars().first()
    if not prog and create:
        prog = ReferralProgram(is_active=False, reward_type="fixed", reward_value=200.0)
        db.add(prog)
        await db.flush()
    return prog


@router.get("/program", response_model=ReferralProgramOut)
async def get_program(db: AsyncSession = Depends(get_db)):
    prog = await _program(db, create=True)
    await db.commit()
    await db.refresh(prog)
    return prog


@router.put("/program", response_model=ReferralProgramOut)
async def update_program(payload: ReferralProgramUpdate,
                         db: AsyncSession = Depends(get_db),
                         _: User = Depends(require_admin)):
    if payload.reward_type not in ("percentage", "fixed"):
        raise HTTPException(status_code=400, detail="reward_type must be percentage or fixed")
    prog = await _program(db, create=True)
    prog.is_active = payload.is_active
    prog.reward_type = payload.reward_type
    prog.reward_value = payload.reward_value
    prog.minimum_order_amount = payload.minimum_order_amount
    prog.maximum_reward = payload.maximum_reward
    prog.eligible_service_ids = [str(s) for s in (payload.eligible_service_ids or [])]
    await db.commit()
    await db.refresh(prog)
    await log_action(db, "referral_program_updated", None, "referral_program", prog.id)
    return prog


@router.get("/my", response_model=MyReferralOut)
async def my_referral(db: AsyncSession = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    code = await get_or_create_code(db, current_user.id)
    signups = (await db.execute(select(ReferralSignup).where(ReferralSignup.referrer_id == current_user.id))).scalars().all()
    rewards = (await db.execute(select(ReferralReward)
               .where(ReferralReward.referrer_id == current_user.id)
               .order_by(desc(ReferralReward.created_at)))).scalars().all()
    await db.commit()
    total = round(sum(r.amount for r in rewards), 2)
    return MyReferralOut(code=code.code, signups=len(signups), rewards_total=total,
                         rewards=[ReferralRewardOut.model_validate(r) for r in rewards])


@router.post("/apply", response_model=dict, status_code=201)
async def apply_code(payload: ReferralApply, db: AsyncSession = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    row = (await db.execute(select(ReferralCode).where(ReferralCode.code == payload.code.strip().upper()))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Invalid referral code")
    if row.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot refer yourself")
    existing = (await db.execute(select(ReferralSignup).where(ReferralSignup.referred_user_id == current_user.id))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Referral code already applied")
    signup = ReferralSignup(referrer_id=row.user_id, referred_user_id=current_user.id, code=row.code)
    db.add(signup)
    await db.flush()
    await create_notification(db, row.user_id, "New referral",
                              "Someone you referred just joined the platform.",
                              type="system", data={"referred_user_id": str(current_user.id)})
    await db.commit()
    return {"ok": True, "referrer_id": str(row.user_id), "code": row.code}


@router.get("/signups", response_model=List[ReferralSignupOut])
async def list_signups(db: AsyncSession = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    q = select(ReferralSignup)
    if not _is_staff(current_user):
        q = q.where(ReferralSignup.referrer_id == current_user.id)
    q = q.order_by(desc(ReferralSignup.referred_at))
    rows = (await db.execute(q)).scalars().all()
    user_map = {}
    ids = {r.referred_user_id for r in rows} | {r.referrer_id for r in rows}
    if ids:
        users = (await db.execute(select(User).where(User.id.in_(ids)))).scalars().all()
        user_map = {u.id: u for u in users}
    out = []
    for r in rows:
        d = ReferralSignupOut.model_validate(r)
        referred = user_map.get(r.referred_user_id)
        if referred:
            d.referred_name = ((getattr(referred, "first_name", "") or "") + " " + (getattr(referred, "last_name", "") or "")).strip() or str(referred.email)
        out.append(d)
    return out


@router.get("/rewards", response_model=List[ReferralRewardOut])
async def list_rewards(db: AsyncSession = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    q = select(ReferralReward).order_by(desc(ReferralReward.created_at))
    if not _is_staff(current_user):
        q = q.where(ReferralReward.referrer_id == current_user.id)
    rows = (await db.execute(q)).scalars().all()
    return rows


@router.post("/orders/{order_id}/reward", response_model=dict)
async def reward_order(order_id: UUID, db: AsyncSession = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    if not _is_staff(current_user):
        raise HTTPException(status_code=403, detail="Staff only")
    order = (await db.execute(select(Order).where(Order.id == order_id))).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    issued = await maybe_reward_referral(db, order)
    if issued:
        await db.commit()
        return {"issued": True, "order_id": str(order.id)}
    return {"issued": False, "order_id": str(order.id), "detail": "Order is not eligible (e.g. not paid/completed, order below minimum, or already rewarded)"}