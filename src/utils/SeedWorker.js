importScripts('https://cdn.jsdelivr.net/npm/idb/build/iife/index-min.js');

// Same customer generator as main thread
function generateCustomers(count, offset = 0) {
  const first = ["Aarav", "Meera", "Kiran", "Ravi", "Priya", "Rahul"];
  const last = ["Patel", "Sharma", "Reddy", "Iyer", "Kumar", "Singh"];
  const customers = [];

  for (let i = 0; i < count; i++) {
    const id = offset + i + 1;
    const fName = first[Math.floor(Math.random() * first.length)];
    const lName = last[Math.floor(Math.random() * last.length)];
    customers.push({
      id,
      name: `${fName} ${lName}`,
      phone: `+91${Math.floor(6000000000 + Math.random() * 4000000000)}`,
      email: `${fName.toLowerCase()}.${lName.toLowerCase()}${id}@example.com`,
      score: Math.floor(Math.random() * 100),
      lastMessageAt: new Date(Date.now() - Math.random() * 1000 * 3600 * 24 * 30),
      addedBy: "System",
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${fName}+${lName}`,
    });
  }
  return customers;
}

onmessage = async (e) => {
  const { start, total } = e.data;
  // Increased batch size for faster processing
  const BATCH_SIZE = 50000;

  const db = await idb.openDB("customerDB", 1);
  for (let i = start; i < total; i += BATCH_SIZE) {
    const batch = generateCustomers(Math.min(BATCH_SIZE, total - i), i);
    const tx = db.transaction("customers", "readwrite");
    const store = tx.objectStore("customers");
    // Add each customer in the batch to the store
    batch.forEach((c) => store.add(c));
    await tx.done;
    console.log(`Inserted ${i + batch.length} / ${total} customers`);
    // Post progress per batch
    postMessage({ added: i + batch.length });
  }

  // Signal that the process is complete
  postMessage({ done: true });
};
