
const DB_NAME = 'CustomerDatabase', STORE_NAME = 'customers', DB_VERSION = 2;
const ROW_HEIGHT = 55, OVERSCAN_COUNT = 5, PAGE_SIZE = 30;
let dbPromise = null;

const getDb = () => {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = (e) => reject(new Error(`Database error: ${e.target.errorCode}`));
            request.onsuccess = (e) => resolve(e.target.result);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                const transaction = e.currentTarget.transaction;
                let store;

                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                } else {
                    store = transaction.objectStore(STORE_NAME);
                }
                
                if (e.oldVersion < 1) {
                    if (!store.indexNames.contains('name')) store.createIndex('name', 'name', { unique: false });
                    if (!store.indexNames.contains('email')) store.createIndex('email', 'email', { unique: true });
                    if (!store.indexNames.contains('phone')) store.createIndex('phone', 'phone', { unique: false });
                }
                if (e.oldVersion < 2) {
                    if (!store.indexNames.contains('score')) store.createIndex('score', 'score', { unique: false });
                    if (!store.indexNames.contains('lastMessageAt')) store.createIndex('lastMessageAt', 'lastMessageAt', { unique: false });
                }
            };
        });
    }
    return dbPromise;
};

export default getDb;