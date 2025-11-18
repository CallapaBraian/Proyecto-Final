const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { PrismaClient } = require("@prisma/client");
const authenticateToken = require("../middlewares/authenticate");

const router = express.Router();
const prisma = new PrismaClient();

// POST: Crear sesión de checkout
router.post("/create-checkout-session", authenticateToken, async (req, res) => {
  try {
    const { reservationId } = req.body;

    // Obtener reserva
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { room: true },
    });

    if (!reservation) {
      return res.status(404).json({ error: "Reserva no encontrada" });
    }

    // Crear sesión Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Reserva ${reservation.code} - ${reservation.room.name}`,
              description: `Check-in: ${reservation.checkIn.toLocaleDateString()} | Check-out: ${reservation.checkOut.toLocaleDateString()}`,
            },
            unit_amount: Math.round(reservation.total * 100), // En centavos
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/reserva-confirmada?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/pago-cancelado`,
      customer_email: reservation.guestEmail,
      metadata: {
        reservationId: reservation.id,
        reservationCode: reservation.code,
      },
    });

    // Actualizar reserva con sessionId
    await prisma.reservation.update({
      where: { id: reservationId },
      data: { paymentId: session.id },
    });

    res.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ error: "Error al crear sesión de pago" });
  }
});

// GET: Verificar estado de pago
router.get("/verify-session/:sessionId", authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return res.status(404).json({ error: "Sesión no encontrada" });
    }

    // Obtener reserva asociada
    const reservation = await prisma.reservation.findUnique({
      where: { paymentId: sessionId },
    });

    res.json({
      status: session.payment_status,
      paymentStatus: session.payment_status === "paid" ? "SUCCEEDED" : "PENDING",
      reservation: {
        id: reservation?.id,
        code: reservation?.code,
        total: reservation?.total,
      },
    });
  } catch (error) {
    console.error("Error verifying session:", error);
    res.status(500).json({ error: "Error al verificar pago" });
  }
});

// POST: Webhook de Stripe
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return res.sendStatus(400);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object;

        // Actualizar reserva
        const reservation = await prisma.reservation.findUnique({
          where: { paymentId: session.id },
        });

        if (reservation) {
          await prisma.reservation.update({
            where: { id: reservation.id },
            data: {
              paymentStatus: "SUCCEEDED",
              paymentMethod: "CARD",
              paymentAmount: session.amount_total / 100,
              paymentDate: new Date(),
              status: "CONFIRMED",
            },
          });

          console.log(`✅ Pago confirmado para reserva: ${reservation.code}`);
        }
        break;

      case "checkout.session.async_payment_failed":
        const failedSession = event.data.object;

        const failedReservation = await prisma.reservation.findUnique({
          where: { paymentId: failedSession.id },
        });

        if (failedReservation) {
          await prisma.reservation.update({
            where: { id: failedReservation.id },
            data: {
              paymentStatus: "FAILED",
            },
          });

          console.log(`❌ Pago fallido para reserva: ${failedReservation.code}`);
        }
        break;
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.sendStatus(500);
  }
});

module.exports = router;
