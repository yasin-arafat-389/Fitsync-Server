const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const app = express();
const port = process.env.PORT || 5001;
const nodemailer = require("nodemailer");
const {
  sendRequestAcceptedEmail,
} = require("./Utils/RequestAcceptedEmail/SendRequestAcceptedEmail");
const {
  sendRequestRejectedEmail,
} = require("./Utils/RequestRejectedEmail/SendRequestRejectedEmail");
const {
  sendInstructionEmail,
} = require("./Utils/SendInstructionEmail/SendInstructionEmail");
const {
  slotCancelledEmail,
} = require("./Utils/SlotCancelledEmail/SlotCancelledEmail");

// Parsers
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://fitsync-be2e6.web.app",
      "https://fitsync-be2e6.firebaseapp.com",
    ],
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

// Node mailer
const sendMail = (to, subject, text) => {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_MAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  transporter.sendMail({
    from: {
      name: "FitSync",
      address: process.env.SMTP_MAIL,
    },
    to: to,
    subject: subject,
    text: text,
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
  const adminBalanceCollection = client
    .db("FitSync")
    .collection("adminBalance");

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

    //Get Newsletter
    app.get("/all-Subscribers", async (req, res) => {
      const subscribers = await newsletterCollection.find().toArray();
      res.send(subscribers);
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

    // Update trainer status (Accept)
    app.post("/update-trainer-status/accept", async (req, res) => {
      const { trainerId, status, email, role, salary, name } = req.body;

      sendRequestAcceptedEmail(email, "Request Accepted", name);

      if (!ObjectId.isValid(trainerId)) {
        return res.status(400).json({ error: "Invalid trainerId format" });
      }

      const result1 = await trainersCollection.updateOne(
        { _id: new ObjectId(trainerId) },
        { $set: { status: status, salary: salary } }
      );
      let result2 = await usersCollection.updateOne(
        { email: email },
        { $set: { role: role } }
      );

      if (result1.modifiedCount && result2.modifiedCount === 1) {
        return res.json({
          success: true,
          message: "Trainer status updated successfully",
        });
      } else {
        return res.status(404).json({ error: "Trainer not found" });
      }
    });

    // Update trainer status (Reject)
    app.post("/update-trainer-status/reject", async (req, res) => {
      const { trainerId, status, email, name } = req.body;

      sendRequestRejectedEmail(email, "Request Rejected", name);

      if (!ObjectId.isValid(trainerId)) {
        return res.status(400).json({ error: "Invalid trainerId format" });
      }

      const result = await trainersCollection.updateOne(
        { _id: new ObjectId(trainerId) },
        { $set: { status } }
      );

      if (result.modifiedCount === 1) {
        return res.json({
          success: true,
          message: "Trainer status updated successfully",
        });
      } else {
        return res.status(404).json({ error: "Trainer not found" });
      }
    });

    // Get all trainer data (Accepted)
    app.get("/all-trainers", async (req, res) => {
      const filter = "accepted";
      const trainers = await trainersCollection
        .find({ status: filter })
        .toArray();
      res.send(trainers);
    });

    // Get all trainer data (requested)
    app.get("/all-trainers/requested", async (req, res) => {
      const filter = "requested";
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
      const subscriptionPrice = parseInt(data.price);
      const adminBalance = await adminBalanceCollection.findOne();

      const newTotalBalance =
        (adminBalance.totalBalance || 0) + subscriptionPrice;

      await adminBalanceCollection.updateOne(
        {},
        { $set: { totalBalance: newTotalBalance } }
      );

      const result = await pricingCollection.insertOne(data);
      res.send(result);
    });

    // Get all members who paid
    app.get("/package/subscribed", async (req, res) => {
      const result = await pricingCollection.find().toArray();
      res.send(result);
    });

    // Get all members filtered by choosen trainer
    app.get("/booked/trainer", async (req, res) => {
      const email = req.query.email;
      const query = { trainerEmail: email };
      const result = await pricingCollection.find(query).toArray();
      res.send(result);
    });

    // Get admin balance
    app.get("/balance", async (req, res) => {
      const result = await adminBalanceCollection.findOne();
      res.send(result);
    });

    // Update salary status
    app.put("/update-salary-status/:id", async (req, res) => {
      const { id } = req.params;
      const { status } = req.body;

      try {
        const result = await trainersCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { salary: status } }
        );

        const adminBalance = await adminBalanceCollection.findOne();

        const newTotalBalance = (adminBalance.totalBalance || 0) - 20;
        const newTotalPaid = (adminBalance.totalPaid || 0) + 20;

        await adminBalanceCollection.updateOne(
          {},
          { $set: { totalBalance: newTotalBalance, totalPaid: newTotalPaid } }
        );

        if (result.modifiedCount > 0) {
          res.json({ success: true, message: "Status updated successfully." });
        } else {
          res
            .status(404)
            .json({ success: false, message: "Resource not found." });
        }
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .json({ success: false, message: "Internal Server Error." });
      }
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

    // API endpoint to send email
    app.post("/send-instruction", (req, res) => {
      const { to, subject, message, receiverName, trainer, slot } = req.body;

      if (!to || !subject || !message || !receiverName || !trainer || !slot) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      try {
        sendInstructionEmail(to, subject, message, receiverName, trainer, slot);
        res
          .status(200)
          .json({ success: true, message: "Email sent successfully" });
      } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // API endpoint to cancel a slot and send mail to members
    app.post("/cancel-slot", async (req, res) => {
      let { message, slot, trainer } = req.body;

      try {
        const emails = await pricingCollection
          .aggregate([
            { $match: { trainer: trainer, slot: slot } },
            { $group: { _id: null, emails: { $push: "$email" } } },
            { $project: { _id: 0, emails: 1 } },
          ])
          .toArray();

        const emailArray = emails.length > 0 ? emails[0].emails : [];

        slotCancelledEmail(
          emailArray,
          "Slot Cancelled",
          message,
          trainer,
          slot
        );

        res.send(emailArray);
      } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // API endpoint to prevent a user from booking same slot twice
    app.get("/prevent-booking", async (req, res) => {
      let email = req.query.email;

      const pricingData = await pricingCollection
        .find({ email: email })
        .toArray();

      const slots = pricingData.map((item) => item.slot);

      res.json({ slots: slots });
    });

    // Get member activity data
    app.get("/my-activity", async (req, res) => {
      const userEmail = req.query.email;

      // Find pricing data for the user
      const pricingData = await pricingCollection
        .find({ email: userEmail })
        .toArray();

      // Extract unique trainer names
      const uniqueTrainers = Array.from(
        new Set(pricingData.map((item) => item.trainer))
      );

      // Find trainer details and images
      const trainerDetails = await Promise.all(
        uniqueTrainers.map(async (trainerName) => {
          const trainer = await trainersCollection.findOne({
            name: trainerName,
          });
          return {
            name: trainerName,
            image: trainer ? trainer.image : null,
          };
        })
      );

      // Bind images to pricingData
      const pricingDataWithImages = pricingData.map((item) => {
        const trainerDetail = trainerDetails.find(
          (trainer) => trainer.name === item.trainer
        );
        return {
          ...item,
          image: trainerDetail ? trainerDetail.image : null,
        };
      });

      res.json({ pricingData: pricingDataWithImages, trainerDetails });
    });

    // API endpoint to reject a member
    app.post("/reject-member", (req, res) => {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      try {
        sendMail(
          email,
          "Slot Rejected",
          "We are very sorry to inform you that your slot has been rejected by the trainer"
        );
        res
          .status(200)
          .json({ success: true, message: "Email sent successfully" });
      } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("FitSync server is up and running");
});

app.listen(port, () => {
  console.log(`FitSync listening on port ${port}`);
});
