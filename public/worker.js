// public/worker.js

function generateCustomers(count, offset = 0) {
  const first = ["Aarav", "Meera", "Kiran", "Ravi", "Priya", "Rahul"];
  const last = ["Patel", "Sharma", "Reddy", "Iyer", "Kumar", "Singh"];
  const now = Date.now();
  const customers = new Array(count);

  for (let i = 0; i < count; i++) {
    const id = offset + i + 1;
    const fName = first[Math.floor(Math.random() * first.length)];
    const lName = last[Math.floor(Math.random() * last.length)];

    customers[i] = {
      id,
      name: `${fName} ${lName}`,
      phone: `+91${Math.floor(6000000000 + Math.random() * 4000000000)}`,
      email: `${fName.toLowerCase()}.${lName.toLowerCase()}${id}@example.com`,
      score: Math.floor(Math.random() * 100),
      lastMessageAt: new Date(now - Math.random() * 1000 * 3600 * 24 * 30),
      addedBy: "System",
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${fName}+${lName}`,
    };
  }
  return customers;
}

onmessage = async (e) => {
  const { start, total } = e.data;
  const BATCH_SIZE = 5000; // smaller batches
  const DB_NAME = "customerDB";
  const STORE_NAME = "customers";
  const DB_VERSION = 1;

  const request = indexedDB.open(DB_NAME, DB_VERSION);

  request.onerror = (event) => {
    postMessage({ error: "DB open error: " + event.target.errorCode });
  };

  request.onsuccess = (event) => {
    const db = event.target.result;

    const processBatches = async () => {
      try {
        for (let i = start; i < total; i += BATCH_SIZE) {
          const batch = generateCustomers(Math.min(BATCH_SIZE, total - i), i);
          const tx = db.transaction(STORE_NAME, "readwrite");
          const store = tx.objectStore(STORE_NAME);

          for (const customer of batch) {
            store.add(customer);
          }

          await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
          });

          postMessage({ added: i + batch.length });

          // Yield to avoid blocking
          await new Promise((r) => setTimeout(r, 0));
        }

        postMessage({ done: true });
      } catch (err) {
        postMessage({ error: "Batch processing failed: " + err.message });
      } finally {
        db.close();
      }
    };

    processBatches();
  };
};
