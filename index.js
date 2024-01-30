const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.POST || 5000;
require("dotenv").config();

// Middle Were
app.use(cors());
app.use(express.json());

// VerifyJWT
const VerifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

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

    const usersDB = client.db("bistroBossRestodant").collection("users");
    const productsDB = client.db("bistroBossRestodant").collection("products");
    const reviewsDB = client.db("bistroBossRestodant").collection("reviews");
    const cartsDB = client.db("bistroBossRestodant").collection("carts");

    // jWT
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // VerifyAdmin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersDB.findOne(query);
      if (user?.role !== "admin") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden message" });
      }
      next();
    };

    // Users Admin Apis
    app.get("/users", VerifyJWT, verifyAdmin, async (req, res) => {
      const result = await usersDB.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const { name, email } = req.body;
      const doc = {
        name,
        email,
      };
      const filter = { email: email };
      const user = await usersDB.findOne(filter);
      if (user) {
        return res.status(401).send({ message: "User Already Exit" });
      }
      const result = await usersDB.insertOne(doc);
      res.send(result);
    });

    app.get("/users/admin/:email", VerifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }

      const query = { email: email };
      const user = await usersDB.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersDB.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.get("/menu", async (req, res) => {
      const result = await productsDB.find().toArray();
      res.send(result);
    });

    app.get("/menuCategory", async (req, res) => {
      const { category, limit } = req.query;
      const query = { category: category };
      const defaultLimit = parseInt(limit);
      const result = await productsDB
        .find(category && query)
        .limit(defaultLimit)
        .toArray();
      res.send(result);
    });

    app.post("/menu", VerifyJWT, verifyAdmin, async (req, res) => {
      const item = req.body;
      const result = await productsDB.insertOne(item);
      res.send(result);
    });

    app.delete("/menu/:id", VerifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsDB.deleteOne(query);
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

    // Carts
    app.get("/carts", VerifyJWT, async (req, res) => {
      const { email } = req.query;
      if (!email) {
        res.send([]);
      }

      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }

      const query = { email: email };
      const result = await cartsDB.find(query).toArray();
      res.send(result);
    });

    app.post("/carts", async (req, res) => {
      const { email } = req.query;
      const { name, recipe, image, category, price, _id } = req.body;
      const doc = {
        itemId: _id,
        name,
        recipe,
        image,
        category,
        price,
        email: email,
      };
      const result = await cartsDB.insertOne(doc);
      res.send(result);
    });

    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartsDB.deleteOne(query);
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
