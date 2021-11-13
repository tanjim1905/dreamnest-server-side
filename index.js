const express = require('express');
const { MongoClient } = require('mongodb');
const admin = require("firebase-admin");
const ObjectId = require('mongodb').ObjectId;
require('dotenv').config();
const cors = require('cors');
const app = express();
const port = process.env.PORT || 7000;

// dreamnest-firebase-adminsdk.json

const serviceAccount = require('./dreamnest-firebase-adminsdk.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// midleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vj9mo.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

// console.log(uri);

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];

        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }
    }
    next();
}

async function run() {
    try {
        await client.connect();
        // console.log('Database Connected');

        const database = client.db("dreamNestDB");
        // console.log(database);
        const apartmentsCollection = database.collection("apartments");
        const buyAparthmentsCollection = database.collection("buyApartments");
        const customarReviewCollection = database.collection("customarReview");
        const usersCollection = database.collection("users");

        // get apartments
        app.get('/apartments', async (req, res) => {
            const result = await apartmentsCollection.find({}).toArray();
            res.send(result);
        });

        // get single apartment
        app.get('/singleapartment/:id', async (req, res) => {
            const id = req.params.id;
            const result = await apartmentsCollection.findOne({ _id: ObjectId(id) });
            // console.log(result);
            res.send(result);
        })

        // buy apartments post
        app.post('/buyapartments', async (req, res) => {
            const result = await buyAparthmentsCollection.insertOne(req.body);
            res.send(result);
        });

        
        // apartment delete
        app.delete('/apartments/:id', async(req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await apartmentsCollection.deleteOne(query);

            console.log(result);
            res.send(result);
        })

        // get buy apartments info
        app.get('/buyapartments', async (req, res) => {
            const result = await buyAparthmentsCollection.find({}).toArray();
            res.send(result);
        })

        // single person order
        app.get('/buyapartments', async (req, res) => {
            const email = req.query.email;
            // console.log(email);
            const query = { email: email }
            // console.log(query);
            const cursor = buyAparthmentsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        // delete order
        app.delete('/buyapartments/:id', async(req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await apartmentsCollection.deleteOne(query);

            console.log(result);
            res.send(result);
        })


        // customar review get
        app.get('/customarreview', async (req, res) => {
            const result = await customarReviewCollection.find({}).toArray();
            res.send(result);
            // console.log(result);
        });

        // customar review post
        app.post('/customarreview', async (req, res) => {
            const result = await customarReviewCollection.insertOne(req.body);
            res.send(result);
        });

        // search admin
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.send({ admin: isAdmin });

            // console.log(user);
        })
        // user post
        app.post('/users', async (req, res) => {
            const result = await usersCollection.insertOne(req.body);
            res.send(result);
        });

        // upsert user
        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);

            res.send(result);
        })

        // make admin
        app.put('/users/makeadmin', verifyToken, async (req, res) => {
            const user = req.body;
            console.log('put', req.decodedEmail);

            const requester = req.decodedEmail;

            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester });

                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc);

                    res.send(result);

                }
                else{
                    res.status(403).json({message:'you do not have access to make admin'})
                }
            }


        });

        // add product
        app.post('/apartments', async(req, res) => {
            const result = await apartmentsCollection.insertOne(req.body);
            res.send(result);
        })
    } finally {
        // client.close();
    }

}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})