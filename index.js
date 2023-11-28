const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const app = express();
const port = process.env.PORT || 5001;

// Parsers
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Middlewares
// Token Verification
const verifyToken = (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = req.headers.authorization.split(" ")[1];
  jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.gef2z8f.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  const usersCollection = client.db("FitSync").collection("users");
  const blogsCollection = client.db("FitSync").collection("blogs");
  const newsletterCollection = client.db("FitSync").collection("newsletter");
  const trainersCollection = client.db("FitSync").collection("trainers");
  const pricingCollection = client.db("FitSync").collection("pricing");
  const classesCollection = client.db("FitSync").collection("classes");
  const forumsCollection = client.db("FitSync").collection("forums");
  const votesCollection = client.db("FitSync").collection("votes");

  try {
    // Token generation API
    app.post("/access-token", async (req, res) => {
      let user = req.body;
      const token = jwt.sign(user, process.env.TOKEN_SECRET, {
        expiresIn: "365d",
      });
      res.send({ token });
    });

    // Creating a payment intent
    app.post("/create-payment-intent", async (req, res) => {
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

    // Admin verification
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // Store user info in the database
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const isExists = await usersCollection.findOne(query);
      if (isExists) {
        return res.send({ message: "User already exists" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // Get specific user data filtered by email
    app.get("/users", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    // Get blog details
    app.get("/blog/details/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await blogsCollection.findOne(query);
      res.send(result);
    });

    //Post Newsletter
    app.post("/newsletter", async (req, res) => {
      const { name, email } = req.body;
      const existingSubscriber = await newsletterCollection.findOne({
        email,
      });
      if (existingSubscriber) {
        return res.send("Email already subscribed");
      }
      await newsletterCollection.insertOne({ name, email });
      res.send("Successfully Subscribed");
    });

    // Post API to store become a trainer requests
    app.post("/trainers", async (req, res) => {
      const { formData, uploadedImage } = req.body;

      const newTrainer = {
        name: formData.name,
        email: formData.email,
        age: formData.age,
        experience: formData.experience,
        status: formData.status,
        image: uploadedImage,
        skills: formData.skills,
        availableDays: formData.availableDays,
        availableTime: formData.availableTime,
      };

      const result = await trainersCollection.insertOne(newTrainer);

      res.send(result);
    });

    // Get all trainer data
    app.get("/all-trainers", async (req, res) => {
      const filter = "accepted";
      const trainers = await trainersCollection
        .find({ status: filter })
        .toArray();
      res.send(trainers);
    });

    // Get single trainer data by email
    app.get("/trainers", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await trainersCollection.findOne(query);
      res.send(result);
    });

    // Get single trainer data by id
    app.get("/trainers/single/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await trainersCollection.findOne(query);
      res.send(result);
    });

    // Post Pricing data to db
    app.post("/package/subscribed", async (req, res) => {
      let data = req.body;
      const result = await pricingCollection.insertOne(data);
      res.send(result);
    });

    // Post New Class data to db
    app.post("/classes", async (req, res) => {
      let data = req.body;
      const result = await classesCollection.insertOne(data);
      res.send(result);
    });

    // Get all classes
    app.get("/classes", async (req, res) => {
      const classes = await classesCollection.find().toArray();
      res.send(classes);
    });

    // Get single class by id
    app.get("/classes/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classesCollection.findOne(query);
      res.send(result);
    });

    // Post New forum data to db
    app.post("/forums", async (req, res) => {
      let data = req.body;
      const result = await forumsCollection.insertOne(data);
      res.send(result);
    });

    // Get all forum posts
    app.get("/forums", async (req, res) => {
      const query = req.query;
      const page = query.page;

      const pageNumber = parseInt(page);
      const perPage = 6;

      const skip = pageNumber * perPage;
      const forums = forumsCollection.find().skip(skip).limit(perPage);
      const result = await forums.toArray();
      const forumsCounts = await forumsCollection.countDocuments();

      res.json({ result, forumsCounts });
    });

    // Get forum details
    app.get("/forum/details/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await forumsCollection.findOne(query);
      res.send(result);
    });

    // Post vote details
    app.post("/forum/vote", async (req, res) => {
      const { id, type, user } = req.body;
      const result = await votesCollection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        {
          $inc: {
            upvoteCount: type === "up" ? 1 : 0,
            downvoteCount: type === "down" ? 1 : 0,
          },
          $addToSet: { votedUsers: user },
        },
        { upsert: true, returnDocument: "after" }
      );

      res.send({ success: true });
    });

    // Get vote counts details
    app.get("/forum/vote/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await votesCollection.findOne(query);
      res.send(result);
    });
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is up and running");
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
