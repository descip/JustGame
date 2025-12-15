from uuid import uuid4


def create_payment(amount: float) -> dict:
    """
    Имитация платёжного провайдера
    """
    provider_payment_id = str(uuid4())
    payment_url = f"https://fake-payments.local/pay/{provider_payment_id}"

    return {
        "provider_payment_id": provider_payment_id,
        "payment_url": payment_url,
    }
