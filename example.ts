import { getGtmService } from "./src/gtm_v2";

try {
  const service = await getGtmService();
  const res = await service.accounts.list();
  const accounts = res.data.account || [];

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