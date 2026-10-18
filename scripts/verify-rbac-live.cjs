async function runVerification() {
  const base = "http://localhost:3000";

  console.log("--- 1. Testing Unauthenticated Access ---");
  const resUnauth = await fetch(base + "/api/v1/admin/orders/ord-test-101/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "PREPARING" })
  });
  console.log("Unauthenticated status transition HTTP:", resUnauth.status);
  const unauthJson = await resUnauth.json();
  console.log("Response:", JSON.stringify(unauthJson));
  if (resUnauth.status !== 401) throw new Error("Expected 401 for unauthenticated request");

  console.log("\n--- 2. Authenticating as STAFF ---");
  const loginStaff = await fetch(base + "/api/v1/auth/admin-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "staff@smashsizzle.com", secret: "3333" })
  });
  console.log("STAFF login HTTP:", loginStaff.status);
  const staffCookie = loginStaff.headers.get("set-cookie");
  console.log("STAFF session cookie received:", !!staffCookie);

  console.log("\n--- 3. Testing STAFF attempting Kitchen PREPARING transition ---");
  const resStaffPrep = await fetch(base + "/api/v1/admin/orders/ord-test-101/status", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": staffCookie || ""
    },
    body: JSON.stringify({ status: "PREPARING" })
  });
  console.log("STAFF kitchen transition HTTP:", resStaffPrep.status);
  const staffPrepJson = await resStaffPrep.json();
  console.log("Response:", JSON.stringify(staffPrepJson));
  if (resStaffPrep.status !== 403) throw new Error("Expected 403 for STAFF attempting PREPARING");

  console.log("\n--- 4. Testing STAFF attempting Menu Creation ---");
  const resStaffMenu = await fetch(base + "/api/v1/admin/menu", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": staffCookie || ""
    },
    body: JSON.stringify({
      name: "Illegal Staff Burger",
      description: "Should be rejected",
      basePriceMinor: 1599,
      categoryId: "cat-1"
    })
  });
  console.log("STAFF menu creation HTTP:", resStaffMenu.status);
  const staffMenuJson = await resStaffMenu.json();
  console.log("Response:", JSON.stringify(staffMenuJson));
  if (resStaffMenu.status !== 403) throw new Error("Expected 403 for STAFF attempting menu write");

  console.log("\n--- 5. Authenticating as KITCHEN_OPERATOR ---");
  const loginChef = await fetch(base + "/api/v1/auth/admin-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "chef@smashsizzle.com", secret: "1111" })
  });
  console.log("Chef login HTTP:", loginChef.status);
  const chefCookie = loginChef.headers.get("set-cookie");

  console.log("\n--- 6. Testing KITCHEN_OPERATOR advancing to PREPARING ---");
  const resChefPrep = await fetch(base + "/api/v1/admin/orders/ord-test-101/status", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": chefCookie || ""
    },
    body: JSON.stringify({ status: "PREPARING" })
  });
  console.log("Chef kitchen transition HTTP:", resChefPrep.status);
  const chefPrepJson = await resChefPrep.json();
  console.log("Response:", JSON.stringify(chefPrepJson));
  if (resChefPrep.status !== 200) throw new Error("Expected 200 for KITCHEN_OPERATOR");

  console.log("\n--- ALL LIVE HTTP RBAC VERIFICATIONS PASSED 100% ---");
}

runVerification().catch(e => {
  console.error("VERIFICATION ERROR:", e);
  process.exit(1);
});
