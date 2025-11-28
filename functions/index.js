const functions = require("firebase-functions");
const fetch = require("node-fetch");

// ⚠️ CONFIGURA TUS CREDENCIALES AQUÍ
const API_KEY_KHIPU = "AQUÍ_TU_API_KEY";
const SECRET_KHIPU = "AQUÍ_TU_SECRET";

exports.generarPago = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).send("Método no permitido");
    }

    const { monto, nombreCliente, servicio } = req.body;

    if (!monto || !nombreCliente || !servicio) {
      return res.status(400).send({
        error: "Faltan campos obligatorios"
      });
    }

    // Llamada a API de Khipu / Flow / Webpay
    const response = await fetch("https://khipu.com/api/2.0/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization":
          "Basic " + Buffer.from(API_KEY_KHIPU + ":" + SECRET_KHIPU).toString("base64"),
      },
      body: JSON.stringify({
        amount: monto,
        description: `Reserva: ${servicio}`,
        payer_name: nombreCliente,
        return_url: "https://reverenciamajestad.com/pago-exitoso",
        cancel_url: "https://reverenciamajestad.com/pago-fallido",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error API:", data);
      return res.status(500).send({ error: "Error al generar el pago" });
    }

    // Devuelvo URL al front
    return res.send({
      paymentUrl: data.payment_url,
      idTransaccion: data.payment_id
    });

  } catch (error) {
    console.error("Error servidor:", error);
    return res.status(500).send({ error: "Error interno del servidor" });
  }
});
