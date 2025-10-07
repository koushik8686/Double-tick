self.onmessage = (e) => {
  const { start, total, dbName, storeName } = e.data;
  const BATCH_SIZE = 50000;

  const request = indexedDB.open(dbName, 1);
  request.onsuccess = async (event) => {
    const db = event.target.result;
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);

    for (let i = start; i < total; i++) {
      const c = generateCustomer(i);
      store.put(c);

      if (i % BATCH_SIZE === 0 && i !== start) {
        self.postMessage({ added: i });
        await new Promise(r => setTimeout(r)); // yield briefly
      }
    }

    tx.oncomplete = () => {
      self.postMessage({ done: true });
      self.close();
    };
  };
};

function generateCustomers(count, offset = 0) {
  const first = ["Aarav", "Meera", "Kiran", "Ravi", "Priya", "Rahul"];
  const last = ["Patel", "Sharma", "Reddy", "Iyer", "Kumar", "Singh"];
  const customers = new Array(count);
  
  for (let i = 0; i < count; i++) {
    const id = offset + i + 1;
    const fName = first[Math.floor(Math.random() * first.length)];
    const lName = last[Math.floor(Math.random() * last.length)];
    
    // Precompute avatar URL string only once per record
    const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${fName}+${lName}`;
    
    customers[i] = {
      id,
      name: `${fName} ${lName}`,
      phone: `+91${Math.floor(6000000000 + Math.random() * 4000000000)}`,
      email: `${fName.toLowerCase()}.${lName.toLowerCase()}${id}@example.com`,
      score: Math.floor(Math.random() * 100),
      lastMessageAt: new Date(Date.now() - Math.random() * 1000 * 3600 * 24 * 30),
      addedBy: "System",
      avatar: avatarUrl, // assign precomputed URL
    };
  }
  return customers;
}
