// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";

import shopify from "./shopify.js";
import productCreator from "./product-creator.js";
import GDPRWebhookHandlers from "./gdpr.js";

const PORT = parseInt(
  process.env.BACKEND_PORT || process.env.PORT || "3000",
  10
);

const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

const app = express();

// Set up Shopify authentication and webhook handling
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  shopify.redirectToShopifyOrAppRoot()
);
app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: GDPRWebhookHandlers })
);

// If you are adding routes outside of the /api path, remember to
// also add a proxy rule for them in web/frontend/vite.config.js

app.use("/api/*", shopify.validateAuthenticatedSession());

app.use(express.json());

app.get("/api/products/count", async (_req, res) => {
  const countData = await shopify.api.rest.Product.count({
    session: res.locals.shopify.session,
  });
  res.status(200).send(countData);
});

app.get("/api/products/create", async (_req, res) => {
  let status = 200;
  let error = null;

  try {
    await productCreator(res.locals.shopify.session);
  } catch (e) {
    console.log(`Failed to process products/create: ${e.message}`);
    status = 500;
    error = e.message;
  }
  res.status(status).send({ success: status === 200, error });
});

app.get("/api/carrier-service", async (_req,res) =>{
  const carrierService = await shopify.api.rest.CarrierService.all({
    session: res.locals.shopify.session,
  });
  res.status(200).send(carrierService);
})

app.post("/calculate-rates", async (req, res) => {
  const { origin, destination, weight, dimensions } = req.body;

  const rates = calculateRates(origin, destination, weight, dimensions);

  const formattedRates = rates.map((rate) => {
    return {
      service_name: rate.service_name,
      service_code: rate.service_code,
      total_price: rate.total_price.toFixed(2),
      currency: "INR",
      min_delivery_date: new Date().toISOString(),
      max_delivery_date: new Date().toISOString(),
      description: rate.description,
    };
  });

  res.json({ rates: formattedRates });
});

// Example rate calculation logic
const calculateRates = (origin, destination, weight, dimensions) => {
  return [
    {
      service_name: "Standard Shipping",
      service_code: "STANDARD",
      total_price: 10.99,
      description: "Delivery within 5-7 business days",
    },
    {
      service_name: "Express Shipping",
      service_code: "EXPRESS",
      total_price: 15.99,
      description: "Next-day delivery",
    },
  ];
};


app.use(shopify.cspHeaders());
app.use(serveStatic(STATIC_PATH, { index: false }));

app.use("/*", shopify.ensureInstalledOnShop(), async (_req, res, _next) => {
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(readFileSync(join(STATIC_PATH, "index.html")));
});

app.listen(PORT);
