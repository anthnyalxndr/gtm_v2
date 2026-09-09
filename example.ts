import { GtmClient } from "./src/gtm_v2";

try {
  const client = new GtmClient();
  await client.init();
  const accounts = await client.listAccounts();

  if (accounts.length > 0) {
    for (const account of accounts) {
      console.log(account);
    }
  } else {
    console.log("No accounts found.");
  }
} catch (error) {
  console.error("Error:", error);
  process.exit(1);
}