const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()


const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ohovvoi.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const userCollection = client.db("mappifyMindDB").collection("users");

        // USER related APIs

        app.get('/users', async(req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        })

        app.post('/users', async(req, res) => {
            const user = req.body;
            // console.log(user);
            const query = {email: user.email}
            const isUserExists = await userCollection.findOne(query);
            // console.log("existing user", isUserExists);
            if(isUserExists){
                return res.send({message: "user already exists"})
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        })

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params;
            console.log("found:", id)
            const filter = {_id: new ObjectId(id)}
            const updatedDoc = { 
                $set: { role: 'admin'}
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            console.log(result);
            res.send(result);
        })

        app.patch('/users/instructor/:id', async(req, res) => {
            const id = req.params;
            console.log(id)
            const filter = { _id: new ObjectId(id)};
            const updatedDoc = {
                $set: { role: 'instructor'}
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            console.log(result);
            res.send(result);
        })

        app.delete('/users/:id', async(req, res) => {
            const id = req.params;
            const filter = {_id: new ObjectId(id)};
            const result = await userCollection.deleteOne(filter);
            console.log(result);
            res.send(result);
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);





app.get('/', (req, res) => {
    res.send('mind is mapping')
})

app.listen(port, () => {
    console.log('mindMap server is runnin on port:', port)
})