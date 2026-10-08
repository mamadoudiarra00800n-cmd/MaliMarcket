const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({
  origin: "https://mamadoudiarra00800n-cmd.github.io"
}));

app.use(express.json());

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
        error: "Montant invalide"
      });
    }

    const invoiceItems = {};

    if (Array.isArray(items)) {
      items.forEach((item, index) => {
        invoiceItems[`item_${index}`] = {
          name: String(item.name || "Produit"),
          quantity: Number(item.quantity || 1),
          unit_price: String(item.price || 0),
          total_price: String(
            Number(item.price || 0) * Number(item.quantity || 1)
          ),
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
            website_url:
              "https://mamadoudiarra00800n-cmd.github.io/MaliMarcket/"
          },
          actions: {
            cancel_url:
              "https://mamadoudiarra00800n-cmd.github.io/MaliMarcket/",
            return_url:
              "https://mamadoudiarra00800n-cmd.github.io/MaliMarcket/"
          }
        })
      }
    );

    const data = await response.json();

    if (data.response_code !== "00") {
      return res.status(400).json(data);
    }

    res.json({
      success: true,
      payment_url: data.response_text,
      token: data.token
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Erreur serveur",
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`MaliMarcket API démarrée sur le port ${PORT}`);
});
