"""Referral reward issuing + wallet credit helper."""
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.referral import ReferralProgram, ReferralCode, ReferralSignup, ReferralReward
from app.models.finance import Wallet, WalletTransaction, Transaction
from app.models.enums import PaymentStatus, PaymentMethod
from app.models.order import Order, OrderItem
from app.services.order_number import generate_reference
from app.services.notifications import create_notification


def make_referral_code(user_id: UUID) -> str:
    """Build a referral code like DP-PRINCE-XXXXXX from a user id."""
    import uuid as _uuid
    short = _uuid.uuid5(_uuid.NAMESPACE_DNS, str(user_id)).hex[:6].upper()
    return f"DP-PRINCE-{short}"


async def get_or_create_code(db: AsyncSession, user_id: UUID) -> ReferralCode:
    row = (await db.execute(select(ReferralCode).where(ReferralCode.user_id == user_id))).scalar_one_or_none()
    if row:
        return row
    row = ReferralCode(user_id=user_id, code=make_referral_code(user_id))
    db.add(row)
    await db.flush()
    return row


async def maybe_reward_referral(db: AsyncSession, order: Order) -> bool:
    """Issue a referral reward for an eligible order of a referred customer.

    Idempotent: a reward is created at most once per order (ReferralReward.order_id
    is unique). Returns True when a reward was issued.
    """
    if order.status.value not in ("paid", "completed"):
        return False
    existing = (await db.execute(select(ReferralReward).where(ReferralReward.order_id == order.id))).scalar_one_or_none()
    if existing:
        return False
    program = (await db.execute(select(ReferralProgram).order_by(ReferralProgram.created_at.desc()))).scalars().first()
    if not program or not program.is_active:
        return False
    signup = (await db.execute(select(ReferralSignup).where(ReferralSignup.referred_user_id == order.customer_id))).scalar_one_or_none()
    if not signup:
        return False
    if order.total < program.minimum_order_amount:
        return False
    if program.eligible_service_ids:
        item_ids = [str(i.service_id) for i in (await db.execute(
            select(OrderItem).where(OrderItem.order_id == order.id))).scalars().all()]
        allowed = {str(s) for s in program.eligible_service_ids}
        if not (set(item_ids) & allowed):
            return False
    if program.reward_type == "percentage":
        amount = order.total * (program.reward_value / 100.0)
    else:
        amount = program.reward_value
    if program.maximum_reward is not None and amount > program.maximum_reward:
        amount = program.maximum_reward
    amount = round(amount, 2)
    if amount <= 0:
        return False
    wallet = (await db.execute(select(Wallet).where(Wallet.user_id == signup.referrer_id))).scalar_one_or_none()
    if not wallet:
        wallet = Wallet(user_id=signup.referrer_id, balance=0)
        db.add(wallet)
        await db.flush()
    reference = generate_reference("REF")
    wallet.balance = round(wallet.balance + amount, 2)
    db.add(WalletTransaction(wallet_id=wallet.id, type="credit", amount=amount, reference=reference))
    db.add(Transaction(user_id=signup.referrer_id, reference=reference, type="referral_reward",
                       amount=amount, status=PaymentStatus.COMPLETED,
                       payment_method=PaymentMethod.WALLET, gateway="wallet",
                       meta={"order_id": str(order.id), "referred_user_id": str(signup.referred_user_id)}))
    reward = ReferralReward(referrer_id=signup.referrer_id, referred_user_id=signup.referred_user_id,
                            order_id=order.id, amount=amount, reward_type=program.reward_type)
    db.add(reward)
    await create_notification(db, signup.referrer_id, "Referral reward earned",
                              f"You earned {amount:,.0f} from a referred order reward.",
                              type="system", data={"order_id": str(order.id)})
    return True