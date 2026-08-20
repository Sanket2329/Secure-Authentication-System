/**
 * appwrite-adapter.js
 * -------------------
 * This file connects the provided index.html directly to Appwrite Cloud/Self-Hosted
 * via the Appwrite Web SDK, acting as the second "Backend" implementation.
 */

const { Client, Account, Databases, Storage, ID, Query } = Appwrite;

// Configuration variables populated from the UI
let client, account, databases, storage;
let DATABASE_ID, FILES_COLLECTION_ID, BUCKET_ID;

// Wait for UI to initialize
setTimeout(() => {
  const endpoint = document.getElementById('awEndpoint').value;
  const project = document.getElementById('awProjectId').value;
  DATABASE_ID = document.getElementById('awDatabaseId').value;
  FILES_COLLECTION_ID = document.getElementById('awFilesCollectionId').value;
  BUCKET_ID = document.getElementById('awBucketId').value;

  client = new Client().setEndpoint(endpoint).setProject(project);
  account = new Account(client);
  databases = new Databases(client);
  storage = new Storage(client);
}, 500); // Hack to let the DOM load since this script is loaded sync in index.html

// Override the request function in index.html when backendMode === 'appwrite'
const originalRequest = window.request;

window.request = async function(path, options = {}) {
  const mode = document.querySelector('input[name="backendMode"]:checked').value;
  
  if (mode !== 'appwrite') {
    return originalRequest(path, options);
  }

  try {
    if (path === '/register' && options.method === 'POST') {
      const { email, password } = JSON.parse(options.body);
      // Create user
      const user = await account.create(ID.unique(), email, password);
      // Wait to create a session automatically
      return { status: 201, body: { success: true, user } };
    }

    if (path === '/login' && options.method === 'POST') {
      const { email, password } = JSON.parse(options.body);
      const session = await account.createEmailPasswordSession(email, password);
      return { status: 200, body: { success: true, token: session.secret } };
    }

    if (path === '/logout' && options.method === 'POST') {
      await account.deleteSession('current');
      return { status: 200, body: { success: true, message: 'Logged out' } };
    }

    if (path === '/me' && options.method === 'GET') {
      const user = await account.get();
      return { status: 200, body: { success: true, user } };
    }

    if (path === '/files' && options.method === 'GET') {
      // Because of Document Level Security (Role: Users), 
      // Appwrite inherently only returns documents the user owns!
      const docs = await databases.listDocuments(DATABASE_ID, FILES_COLLECTION_ID);
      return { status: 200, body: { success: true, files: docs.documents } };
    }

    // Match /files/:id
    const fileMatch = path.match(/^\/files\/([^/]+)$/);
    if (fileMatch && options.method === 'GET') {
      const docId = fileMatch[1];
      try {
        const file = await databases.getDocument(DATABASE_ID, FILES_COLLECTION_ID, docId);
        return { status: 200, body: { success: true, file } };
      } catch (err) {
        // In Appwrite, trying to access a document you don't own throws a 404 naturally 
        // to prevent data leakage (zero-trust model).
        return { status: err.code || 404, body: { error: err.message } };
      }
    }

    // Match /files/:id/download
    const downloadMatch = path.match(/^\/files\/([^/]+)\/download$/);
    if (downloadMatch && options.method === 'GET') {
      const docId = downloadMatch[1];
      const doc = await databases.getDocument(DATABASE_ID, FILES_COLLECTION_ID, docId);
      
      const fileUrl = storage.getFileDownload(BUCKET_ID, doc.file_id);
      
      return { status: 200, body: { success: true, downloadUrl: fileUrl.href } };
    }

    return { status: 404, body: { error: "Route not supported in adapter" } };

  } catch (error) {
    console.error("Appwrite Error:", error);
    return { status: error.code || 500, body: { error: error.message } };
  }
};
