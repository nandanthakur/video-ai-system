beforeAll(async () => {
  process.env.NODE_ENV = "e2e";
  process.env.BASE_URL = "http://localhost:8000";
  
  const waitForServices = async () => {
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        await Promise.all([
          fetch("http://localhost:8000/health").then((r) => r.ok),
          fetch("http://localhost:8001/health").then((r) => r.ok),
        ]);
        return true;
      } catch {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    throw new Error("Services not available");
  };
  
  await waitForServices();
});

afterAll(async () => {
  delete process.env.NODE_ENV;
});