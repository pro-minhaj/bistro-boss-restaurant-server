const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
const port = process.env.POST || 5000;
require("dotenv").config();

// Middle Were
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xevudqv.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    client.connect();

    const productsDB = client.db("bistroBossRestodant").collection("products");
    const reviewsDB = client.db("bistroBossRestodant").collection("reviews");

    app.get("/", (req, res) => {
      res.send("Hello World!");
    });

    app.get("/menu", async (req, res) => {
      const { category, limit } = req.query;
      const query = { category: category };
      const defaultLimit = parseInt(limit);
      const result = await productsDB
        .find(category && query)
        .limit(defaultLimit)
        .toArray();
      res.send(result);
    });

    app.get("/totalProducts", async (req, res) => {
      const { category } = req.query;
      const query = { category: category };
      const result = await productsDB.countDocuments(query);
      res.send({ result });
    });

    app.get("/allMenu", async (req, res) => {
      const { category, limit } = req.query;
      const query = { category: category };
      const defaultLimit = parseInt(limit);
      const countProduct = await productsDB.countDocuments();
      if (defaultLimit > countProduct) {
        return;
      }
      const result = await productsDB
        .find(category && query)
        .limit(defaultLimit)
        .toArray();
      res.send(result);
    });

    app.get("/shopMenu", async (req, res) => {
      const { page, category, limit } = req.query;
      const currentPage = parseInt(page) || 1;
      const currentLimit = parseInt(limit) || 6;
      const query = { category: category };
      const result = await productsDB
        .find(query)
        .skip((currentPage - 1) * limit)
        .limit(currentLimit)
        .toArray();
      res.send(result);
    });

    app.get("/reviews", async (req, res) => {
      const result = await reviewsDB.find().toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port);
