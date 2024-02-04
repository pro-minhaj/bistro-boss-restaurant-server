const express = require("express");
require("dotenv").config();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.PAYMENT_GATEWAY_TOKEN);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.POST || 5000;

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
    const paymentsDB = client.db("bistroBossRestodant").collection("payments");

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
        return res.send({ admin: false });
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

    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await usersDB.deleteOne(filter);
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

    app.get("/menu-item/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsDB.findOne(query);
      res.send(result);
    });

    app.put("/menu-update/:id", async (req, res) => {
      const id = req.params.id;
      const { name, category, price, recipe } = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          name,
          category,
          price: parseFloat(price),
          recipe,
        },
      };
      const result = await productsDB.updateOne(filter, updateDoc, options);
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

    // Payment APIS
    app.post("/create-payment-intent", VerifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post("/payments", VerifyJWT, async (req, res) => {
      const payment = req.body;
      const insertResult = await paymentsDB.insertOne(payment);
      // Delete Carts
      const query = {
        _id: { $in: payment.cartItems.map((id) => new ObjectId(id)) },
      };
      const deleteResult = await cartsDB.deleteMany(query);

      res.send({ insertResult, deleteResult });
    });

    // Admin DashBoard APIs
    app.get("/admin-stats", VerifyJWT, verifyAdmin, async (req, res) => {
      const total = await paymentsDB
        .aggregate([
          {
            $group: {
              _id: null,
              totalPrice: { $sum: "$price" },
            },
          },
        ])
        .toArray();
      const users = await usersDB.estimatedDocumentCount();
      const products = await productsDB.estimatedDocumentCount();
      const orders = await paymentsDB.estimatedDocumentCount();

      res.send({
        total: total[0].totalPrice,
        users,
        products,
        orders,
      });
    });

    app.get("/order-stats", VerifyJWT, verifyAdmin, async (req, res) => {
      const result = await paymentsDB
        .aggregate([
          {
            $unwind: "$menuItems",
          },
          {
            $lookup: {
              from: "products",
              let: { menuItemId: { $toObjectId: "$menuItems" } },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$_id", "$$menuItemId"],
                    },
                  },
                },
              ],
              as: "menuItemsData",
            },
          },
          {
            $unwind: "$menuItemsData",
          },
          {
            $group: {
              _id: "$menuItemsData.category",
              quantity: { $sum: 1 },
              revenue: { $sum: "$menuItemsData.price" },
            },
          },
          {
            $project: {
              _id: 0,
              category: "$_id",
              quantity: "$quantity",
              total: "$revenue",
            },
          },
        ])
        .toArray();
      res.send(result);
    });

    app.get(
      "/all-payment-history",
      VerifyJWT,
      verifyAdmin,
      async (req, res) => {
        const result = await paymentsDB.find().toArray();
        res.send(result);
      }
    );

    app.patch(
      "/payment-status/:id",
      VerifyJWT,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            status: "Done",
          },
        };
        const result = await paymentsDB.updateOne(filter, updateDoc);
        res.send(result);
      }
    );

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
