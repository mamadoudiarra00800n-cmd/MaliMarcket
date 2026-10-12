
const express = require("express");
const cors = require("cors");

const app = express();

const SHOP_URL =
  "https://mamadoudiarra00800n-cmd.github.io/MaliMarcket/";

app.use(cors({
  origin: "https://mamadoudiarra00800n-cmd.github.io"
}));

app.use(express.json());
app.use((req, res, next) => {
  console.log("Demande reçue :", req.method, req.url);
  next();
});
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "MaliMarcket API"
  });
});

app.post("/api/create-checkout", async (req, res) => {
  try {
    const { total, items } = req.body;
    const amount = Number(total);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Montant invalide"
      });
    }

    const invoiceItems = {};

    if (Array.isArray(items)) {
      items.forEach((item, index) => {
        const price = Number(item.price || 0);
        const quantity = Number(item.quantity || 1);

        invoiceItems[`item_${index}`] = {
          name: String(item.name || "Produit"),
          quantity,
          unit_price: String(price),
          total_price: String(price * quantity),
          description: ""
        };
      });
    }

    const response = await fetch(
      "https://app.paydunya.com/sandbox-api/v1/checkout-invoice/create",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "PAYDUNYA-MASTER-KEY": process.env.PAYDUNYA_MASTER_KEY,
          "PAYDUNYA-PRIVATE-KEY": process.env.PAYDUNYA_PRIVATE_KEY,
          "PAYDUNYA-TOKEN": process.env.PAYDUNYA_TOKEN
        },
        body: JSON.stringify({
          invoice: {
            items: invoiceItems,
            total_amount: amount,
            description: "Commande MaliMarcket"
          },
          store: {
            name: "MaliMarcket",
            tagline: "Marketplace du Mali",
            website_url: SHOP_URL
          },
          actions: {
            cancel_url: SHOP_URL,
            return_url: SHOP_URL + "?payment=return"
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok || data.response_code !== "00") {
      return res.status(400).json({
        success: false,
        error: "PayDunya n'a pas créé la facture"
      });
    }

    return res.json({
      success: true,
      payment_url: data.response_text,
      token: data.token
    });
  } catch (error) {
    console.error("Erreur création paiement:", error.message);

    return res.status(500).json({
      success: false,
      error: "Erreur serveur"
    });
  }
});

app.get("/api/confirm-checkout", async (req, res) => {
  try {
    const token = req.query.token;

    if (!token || typeof token !== "string") {
      return res.status(400).json({
        success: false,
        error: "Token de paiement manquant"
      });
    }

    const response = await fetch(
      "https://app.paydunya.com/sandbox-api/v1/checkout-invoice/confirm/" +
        encodeURIComponent(token),
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "PAYDUNYA-MASTER-KEY": process.env.PAYDUNYA_MASTER_KEY,
          "PAYDUNYA-PRIVATE-KEY": process.env.PAYDUNYA_PRIVATE_KEY,
          "PAYDUNYA-TOKEN": process.env.PAYDUNYA_TOKEN
        }
      }
    );

    const data = await response.json();
    console.log("Confirmation PayDunya :", {
  httpStatus: response.status,
  responseCode: data.response_code,
  invoiceStatus: data.invoice?.status
});
    const status = String(data.invoice?.status || "").toLowerCase();

    return res.json({
      success:
        response.ok &&
        data.response_code === "00" &&
        status === "completed",
      status: status || "unknown"
    });
  } catch (error) {
    console.error("Erreur de confirmation:", error.message);

    return res.status(500).json({
      success: false,
      error: "Impossible de vérifier le paiement"
    });
  }
});

app.listen(PORT, () => {
  console.log(`MaliMarcket API démarrée sur le port ${PORT}`);
});

