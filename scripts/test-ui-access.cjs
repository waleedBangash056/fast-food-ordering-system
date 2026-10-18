async function testUI() {
  const base = "http://localhost:3000";
  try {
    const loginStaff = await fetch(base + "/api/v1/auth/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "staff@smashsizzle.com", secret: "3333" })
    });
    if (!loginStaff.ok) {
      console.error(`Login failed with HTTP ${loginStaff.status}`);
      process.exit(1);
    }
    const staffCookie = loginStaff.headers.get("set-cookie");
    
    const pageRes = await fetch(base + "/admin/kitchen", {
      headers: { "Cookie": staffCookie || "" }
    });
    const html = await pageRes.text();
    console.log("HTML HTTP Status:", pageRes.status);

    const hasClearance = html.includes("Kitchen Terminal Station Clearance Required");
    const hasMenuLink = html.includes('href="/admin/menu"');
    const hasKitchenLink = html.includes('href="/admin/kitchen"');
    const hasAuditLink = html.includes('href="/admin/audit"');
    const hasOrdersLink = html.includes('href="/admin/orders"');

    console.log("Has 'Kitchen Terminal Station Clearance Required':", hasClearance);
    console.log("Has 'Menu Management' link in navbar (should be FALSE for STAFF):", hasMenuLink);
    console.log("Has 'Kitchen (KDS)' link in navbar (should be FALSE for STAFF):", hasKitchenLink);
    console.log("Has 'Audit Ledger' link in navbar (should be FALSE for STAFF):", hasAuditLink);
    console.log("Has 'All Orders' link in navbar (should be TRUE for STAFF):", hasOrdersLink);

    let failed = false;
    if (!hasClearance) {
      console.error("FAIL: Expected clearance required warning for staff role.");
      failed = true;
    }
    if (hasMenuLink) {
      console.error("FAIL: Staff should not see Menu Management link.");
      failed = true;
    }
    if (hasKitchenLink) {
      console.error("FAIL: Staff should not see Kitchen link.");
      failed = true;
    }
    if (hasAuditLink) {
      console.error("FAIL: Staff should not see Audit Ledger link.");
      failed = true;
    }
    if (!hasOrdersLink) {
      console.error("FAIL: Staff should see All Orders link.");
      failed = true;
    }

    if (failed) {
      process.exit(1);
    }
    console.log("All UI access assertions PASSED.");
  } catch (err) {
    console.error("Test execution failed:", err);
    process.exit(1);
  }
}
testUI();
