import { Client, Account, ID, Databases, Storage, Query } from 'appwrite';

const client = new Client();

client
    .setEndpoint('https://cloud.appwrite.io/v1') 
    .setProject('67f24d850034f2ef954e');

const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);

const DATABASE_ID = '67f24da7001676ada8e0';
const COLLECTION_ID = '67f24db0001b5afe08ac';
const STORAGE_BUCKET_ID = '67f24ebb0026525f483a';

export { client, account, databases, storage, ID, DATABASE_ID, COLLECTION_ID, STORAGE_BUCKET_ID, Query };