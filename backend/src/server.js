const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const { Client, Databases, ID, Query } = require('node-appwrite');
require('dotenv').config();

// Initialize Express
const app = express();
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize Appwrite
const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY); 

const databases = new Databases(client, process.env.APPWRITE_API_KEY);
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const EMERGENCY_COLLECTION_ID = process.env.APPWRITE_EMERGENCY_COLLECTION_ID;

// Initialize Twilio
const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// API Endpoints
app.post('/api/create-emergency-request', async (req, res) => {
    try {
        const { requestId, userId, status, timestamp, location } = req.body;
        
        // Add validation
        if (!requestId || !userId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Create document with proper structure
        const response = await databases.createDocument(
            DATABASE_ID,
            EMERGENCY_COLLECTION_ID,
            ID.unique(),
            {
                requestId,
                userId,
                status: status || 'pending',
                timestamp: timestamp || new Date().toISOString(),
                ...(location && {
                    latitude: location.latitude,
                    longitude: location.longitude
                })
            }
        );
        
        console.log('Document created:', response); // Debug log
        res.status(200).json({ success: true, data: response });
    } catch (error) {
        console.error('Error creating emergency request:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Failed to create emergency request'
        });
    }
});

app.post('/api/send-sms', async (req, res) => {
    try {
        const { to, message } = req.body;
        
        // Send SMS via Twilio
        const response = await twilioClient.messages.create({
            body: message,
            from: twilioPhoneNumber,
            to: to
        });
        
        res.status(200).json({ success: true, data: response });
    } catch (error) {
        console.error('Error sending SMS:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send SMS'
        });
    }
});

app.get('/api/check-emergency-status', async (req, res) => {
    try {
        const { requestId } = req.query;
        
        // Query the emergency_requests collection for the specific request
        const response = await databases.listDocuments(
            DATABASE_ID,
            EMERGENCY_COLLECTION_ID,
            [Query.equal('requestId', requestId)]
        );
        
        if (response.documents && response.documents.length > 0) {
            const document = response.documents[0];
            res.status(200).json({ 
                success: true, 
                status: document.status,
                timestamp: document.timestamp
            });
        } else {
            res.status(404).json({ 
                success: false, 
                message: 'Emergency request not found'
            });
        }
    } catch (error) {
        console.error('Error checking emergency status:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to check emergency status'
        });
    }
});


app.post('/api/update-emergency-status', async (req, res) => {
    try {
        const { requestId, status } = req.body;
        
        // Find the document by requestId
        const documents = await databases.listDocuments(
            DATABASE_ID,
            EMERGENCY_COLLECTION_ID,
            [Query.equal('requestId', requestId)]
        );
        
        if (documents.documents.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Emergency request not found' 
            });
        }
        
        const document = documents.documents[0];
        
        // Update the document with the new status
        const response = await databases.updateDocument(
            DATABASE_ID,
            EMERGENCY_COLLECTION_ID,
            document.$id,
            {
                status
            }
        );
        
        res.status(200).json({ success: true, data: response });
    } catch (error) {
        console.error('Error updating emergency status:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update emergency status'
        });
    }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});